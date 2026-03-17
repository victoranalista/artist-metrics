import type { PlatformConnection } from "@prisma/client";
import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { refreshYouTubeToken } from "@/lib/oauth/youtube";
import type { CollectedMetrics, ContentItem } from "./types";

async function getValidAccessToken(connection: PlatformConnection): Promise<string> {
  const now = new Date();
  const tokenExpiry = connection.tokenExpiry;

  // If token is still valid, return it
  if (tokenExpiry && tokenExpiry > now) {
    return decrypt(connection.accessToken);
  }

  // Token expired - refresh it
  if (!connection.refreshToken) {
    throw new Error("No refresh token available for YouTube connection");
  }

  const refreshToken = decrypt(connection.refreshToken);
  const tokenData = await refreshYouTubeToken(refreshToken);

  if (tokenData.error) {
    await prisma.platformConnection.update({
      where: { id: connection.id },
      data: { status: "ERROR" },
    });
    throw new Error(`YouTube token refresh failed: ${tokenData.error_description || tokenData.error}`);
  }

  // Update stored tokens
  await prisma.platformConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: encrypt(tokenData.access_token),
      tokenExpiry: new Date(Date.now() + tokenData.expires_in * 1000),
      status: "ACTIVE",
    },
  });

  return tokenData.access_token;
}

async function fetchChannelStats(accessToken: string) {
  const res = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();

  if (!data.items || data.items.length === 0) {
    throw new Error("No YouTube channel found for this account");
  }

  return data.items[0];
}

async function fetchRecentVideos(
  accessToken: string,
  uploadsPlaylistId: string
): Promise<ContentItem[]> {
  // Get playlist items (recent uploads)
  const playlistRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const playlistData = await playlistRes.json();

  if (!playlistData.items || playlistData.items.length === 0) {
    return [];
  }

  // Get video IDs for stats
  const videoIds = playlistData.items
    .map((item: { contentDetails?: { videoId?: string } }) => item.contentDetails?.videoId)
    .filter(Boolean)
    .join(",");

  const statsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const statsData = await statsRes.json();

  if (!statsData.items) {
    return [];
  }

  return statsData.items.map(
    (video: {
      id: string;
      snippet: {
        title: string;
        thumbnails?: { medium?: { url: string } };
        publishedAt: string;
      };
      statistics: {
        viewCount?: string;
        likeCount?: string;
        commentCount?: string;
      };
    }): ContentItem => ({
      contentId: video.id,
      contentType: "video",
      title: video.snippet.title,
      thumbnailUrl: video.snippet.thumbnails?.medium?.url ?? null,
      publishedAt: new Date(video.snippet.publishedAt),
      url: `https://www.youtube.com/watch?v=${video.id}`,
      views: video.statistics.viewCount ? parseInt(video.statistics.viewCount, 10) : null,
      likes: video.statistics.likeCount ? parseInt(video.statistics.likeCount, 10) : null,
      comments: video.statistics.commentCount
        ? parseInt(video.statistics.commentCount, 10)
        : null,
      shares: null,
      saves: null,
      platformData: { statistics: video.statistics },
    })
  );
}

export async function collectYouTubeMetrics(
  connection: PlatformConnection
): Promise<CollectedMetrics> {
  try {
    const accessToken = await getValidAccessToken(connection);
    const channel = await fetchChannelStats(accessToken);

    const stats = channel.statistics;
    const uploadsPlaylistId =
      channel.contentDetails?.relatedPlaylists?.uploads;

    const content = uploadsPlaylistId
      ? await fetchRecentVideos(accessToken, uploadsPlaylistId)
      : [];

    const subscribers = stats.subscriberCount
      ? parseInt(stats.subscriberCount, 10)
      : null;
    const totalViews = stats.viewCount
      ? parseInt(stats.viewCount, 10)
      : null;
    const videoCount = stats.videoCount
      ? parseInt(stats.videoCount, 10)
      : null;

    // Calculate engagement rate from recent videos
    let engagementRate: number | null = null;
    if (content.length > 0 && subscribers && subscribers > 0) {
      const totalEngagement = content.reduce((sum, item) => {
        return sum + (item.likes ?? 0) + (item.comments ?? 0);
      }, 0);
      engagementRate = totalEngagement / (content.length * subscribers);
    }

    return {
      followers: subscribers,
      totalViews,
      totalLikes: null,
      totalComments: null,
      totalShares: null,
      engagementRate,
      platformData: {
        channelId: channel.id,
        channelTitle: channel.snippet?.title,
        videoCount,
        hiddenSubscriberCount: stats.hiddenSubscriberCount,
      },
      content,
      audience: null,
    };
  } catch (error) {
    console.error("YouTube metrics collection failed:", error);

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
