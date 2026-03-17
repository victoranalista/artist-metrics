import type { PlatformConnection } from "@prisma/client";
import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { refreshInstagramToken } from "@/lib/oauth/instagram";
import type { AudienceData, CollectedMetrics, ContentItem } from "./types";

const GRAPH_API = "https://graph.facebook.com/v21.0";

async function getValidAccessToken(connection: PlatformConnection): Promise<string> {
  const now = new Date();
  const tokenExpiry = connection.tokenExpiry;

  if (tokenExpiry && tokenExpiry > now) {
    return decrypt(connection.accessToken);
  }

  const currentToken = decrypt(connection.accessToken);
  const tokenData = await refreshInstagramToken(currentToken);

  if (tokenData.error) {
    await prisma.platformConnection.update({
      where: { id: connection.id },
      data: { status: "ERROR" },
    });
    throw new Error(
      `Instagram token refresh failed: ${tokenData.error?.message || tokenData.error}`
    );
  }

  await prisma.platformConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: encrypt(tokenData.access_token),
      tokenExpiry: new Date(Date.now() + (tokenData.expires_in ?? 5_184_000) * 1000),
      status: "ACTIVE",
    },
  });

  return tokenData.access_token;
}

async function fetchProfile(accessToken: string, igUserId: string) {
  const res = await fetch(
    `${GRAPH_API}/${igUserId}?fields=id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography&access_token=${accessToken}`
  );
  return res.json();
}

async function fetchRecentMedia(
  accessToken: string,
  igUserId: string
): Promise<ContentItem[]> {
  const res = await fetch(
    `${GRAPH_API}/${igUserId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=50&access_token=${accessToken}`
  );
  const data = await res.json();

  if (!data.data || data.data.length === 0) {
    return [];
  }

  const items: ContentItem[] = [];

  for (const media of data.data) {
    // Fetch insights per media item
    let insights: Record<string, number> = {};
    try {
      const metricsToFetch =
        media.media_type === "VIDEO"
          ? "impressions,reach,saved,video_views"
          : "impressions,reach,saved";

      const insightsRes = await fetch(
        `${GRAPH_API}/${media.id}/insights?metric=${metricsToFetch}&access_token=${accessToken}`
      );
      const insightsData = await insightsRes.json();

      if (insightsData.data) {
        for (const metric of insightsData.data) {
          insights[metric.name] = metric.values?.[0]?.value ?? 0;
        }
      }
    } catch {
      // Insights may not be available for all media types
    }

    items.push({
      contentId: media.id,
      contentType: media.media_type?.toLowerCase() ?? "image",
      title: media.caption?.substring(0, 200) ?? null,
      thumbnailUrl: media.thumbnail_url ?? media.media_url ?? null,
      publishedAt: media.timestamp ? new Date(media.timestamp) : null,
      url: media.permalink ?? null,
      views: insights.impressions ?? insights.video_views ?? null,
      likes: media.like_count ?? null,
      comments: media.comments_count ?? null,
      shares: null,
      saves: insights.saved ?? null,
      platformData: {
        mediaType: media.media_type,
        reach: insights.reach ?? null,
        impressions: insights.impressions ?? null,
      },
    });
  }

  return items;
}

async function fetchAudienceDemographics(
  accessToken: string,
  igUserId: string
): Promise<AudienceData | null> {
  try {
    const res = await fetch(
      `${GRAPH_API}/${igUserId}/insights?metric=audience_city,audience_country,audience_gender_age&period=lifetime&access_token=${accessToken}`
    );
    const data = await res.json();

    if (!data.data) return null;

    const demographics: AudienceData = {
      ageRanges: null,
      genderSplit: null,
      topCountries: null,
      topCities: null,
    };

    for (const metric of data.data) {
      const values = metric.values?.[0]?.value;
      if (!values) continue;

      switch (metric.name) {
        case "audience_city":
          demographics.topCities = values;
          break;
        case "audience_country":
          demographics.topCountries = values;
          break;
        case "audience_gender_age": {
          // Parse gender-age format like "M.25-34": count
          const genderSplit: Record<string, number> = {};
          const ageRanges: Record<string, number> = {};

          for (const [key, value] of Object.entries(values)) {
            const [gender, age] = key.split(".");
            const count = value as number;

            genderSplit[gender] = (genderSplit[gender] ?? 0) + count;
            ageRanges[age] = (ageRanges[age] ?? 0) + count;
          }

          demographics.genderSplit = genderSplit;
          demographics.ageRanges = ageRanges;
          break;
        }
      }
    }

    return demographics;
  } catch {
    return null;
  }
}

export async function collectInstagramMetrics(
  connection: PlatformConnection
): Promise<CollectedMetrics> {
  try {
    const accessToken = await getValidAccessToken(connection);
    const igUserId = connection.externalId;

    if (!igUserId) {
      throw new Error("No Instagram user ID stored in connection");
    }

    const profile = await fetchProfile(accessToken, igUserId);
    const content = await fetchRecentMedia(accessToken, igUserId);
    const audience = await fetchAudienceDemographics(accessToken, igUserId);

    const followers = profile.followers_count ?? null;

    // Calculate engagement rate
    let engagementRate: number | null = null;
    if (content.length > 0 && followers && followers > 0) {
      const totalEngagement = content.reduce((sum, item) => {
        return sum + (item.likes ?? 0) + (item.comments ?? 0) + (item.saves ?? 0);
      }, 0);
      engagementRate = totalEngagement / (content.length * followers);
    }

    return {
      followers,
      totalViews: null,
      totalLikes: content.reduce((sum, item) => sum + (item.likes ?? 0), 0),
      totalComments: content.reduce((sum, item) => sum + (item.comments ?? 0), 0),
      totalShares: null,
      engagementRate,
      platformData: {
        username: profile.username,
        name: profile.name,
        biography: profile.biography,
        mediaCount: profile.media_count,
        followsCount: profile.follows_count,
        profilePictureUrl: profile.profile_picture_url,
      },
      content,
      audience,
    };
  } catch (error) {
    console.error("Instagram metrics collection failed:", error);

    return {
      followers: null,
      totalViews: null,
      totalLikes: null,
      totalComments: null,
      totalShares: null,
      engagementRate: null,
      platformData: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      content: [],
      audience: null,
    };
  }
}
