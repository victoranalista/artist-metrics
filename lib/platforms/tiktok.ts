import type { PlatformConnection } from "@prisma/client";
import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { refreshTikTokToken } from "@/lib/oauth/tiktok";
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
    throw new Error("No refresh token available for TikTok connection");
  }

  const refreshToken = decrypt(connection.refreshToken);
  const tokenData = await refreshTikTokToken(refreshToken);

  if (tokenData.error || !tokenData.access_token) {
    await prisma.platformConnection.update({
      where: { id: connection.id },
      data: { status: "ERROR" },
    });
    throw new Error(`TikTok token refresh failed: ${tokenData.error_description || tokenData.error}`);
  }

  // Update stored tokens
  const updateData: {
    accessToken: string;
    tokenExpiry: Date;
    status: "ACTIVE";
    refreshToken?: string;
  } = {
    accessToken: encrypt(tokenData.access_token),
    tokenExpiry: new Date(Date.now() + (tokenData.expires_in ?? 86400) * 1000),
    status: "ACTIVE",
  };

  // TikTok may return a new refresh token
  if (tokenData.refresh_token) {
    updateData.refreshToken = encrypt(tokenData.refresh_token);
  }

  await prisma.platformConnection.update({
    where: { id: connection.id },
    data: updateData,
  });

  return tokenData.access_token;
}

async function fetchUserInfo(accessToken: string) {
  const fields = "open_id,display_name,avatar_url,avatar_large_url,bio_description,follower_count,following_count,likes_count,video_count,username,is_verified";
  const res = await fetch(
    `https://open.tiktokapis.com/v2/user/info/?fields=${fields}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();

  if (data.error?.code) {
    throw new Error(`TikTok user info failed: ${data.error.message || data.error.code}`);
  }

  return data.data;
}

interface TikTokVideo {
  id: string;
  title?: string;
  video_description?: string;
  cover_image_url?: string;
  create_time?: number;
  share_url?: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  save_count?: number;
  duration?: number;
}

async function fetchVideos(accessToken: string): Promise<TikTokVideo[]> {
  const fields = "id,title,video_description,cover_image_url,create_time,share_url,view_count,like_count,comment_count,share_count,duration";
  const videos: TikTokVideo[] = [];
  let cursor: string | undefined;
  let hasMore = true;
  let pages = 0;

  // Paginate up to 5 pages (100 videos max)
  while (hasMore && pages < 5) {
    const params = new URLSearchParams({
      fields,
      max_count: "20",
    });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(
      `https://open.tiktokapis.com/v2/video/list/?${params}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    const data = await res.json();

    if (data.error?.code) {
      console.error("TikTok video list error:", data.error);
      break;
    }

    if (data.data?.videos) {
      videos.push(...data.data.videos);
    }

    hasMore = data.data?.has_more ?? false;
    cursor = data.data?.cursor;
    pages++;
  }

  return videos;
}

export async function collectTikTokMetrics(
  connection: PlatformConnection
): Promise<CollectedMetrics> {
  try {
    const accessToken = await getValidAccessToken(connection);

    // Fetch user stats
    const user = await fetchUserInfo(accessToken);
    const followers = user?.follower_count ?? null;
    const totalLikes = user?.likes_count ?? null;
    const videoCount = user?.video_count ?? null;

    // Fetch recent videos
    const videos = await fetchVideos(accessToken);

    // Map to ContentItem
    const content: ContentItem[] = videos.map((v) => ({
      contentId: v.id,
      contentType: "video",
      title: v.title || v.video_description?.substring(0, 100) || null,
      thumbnailUrl: v.cover_image_url ?? null,
      publishedAt: v.create_time ? new Date(v.create_time * 1000) : null,
      url: v.share_url ?? `https://www.tiktok.com/@${user?.username}/video/${v.id}`,
      views: v.view_count ?? null,
      likes: v.like_count ?? null,
      comments: v.comment_count ?? null,
      shares: v.share_count ?? null,
      saves: v.save_count ?? null,
      platformData: {
        duracao: v.duration ?? null,
      },
    }));

    // Calculate aggregated metrics from videos
    const totalVideoViews = content.reduce((s, c) => s + (c.views ?? 0), 0);
    const totalVideoLikes = content.reduce((s, c) => s + (c.likes ?? 0), 0);
    const totalVideoComments = content.reduce((s, c) => s + (c.comments ?? 0), 0);
    const totalVideoShares = content.reduce((s, c) => s + (c.shares ?? 0), 0);
    const totalVideoSaves = content.reduce((s, c) => s + (c.saves ?? 0), 0);

    // Engagement rate: (likes + comments + shares) / views
    let engagementRate: number | null = null;
    if (totalVideoViews > 0) {
      engagementRate = (totalVideoLikes + totalVideoComments + totalVideoShares) / totalVideoViews;
    }

    // Best video
    const bestVideo = content.length > 0
      ? content.reduce((best, item) =>
          (item.views ?? 0) > (best.views ?? 0) ? item : best
        )
      : null;

    return {
      followers,
      totalViews: totalVideoViews || null,
      totalLikes: totalVideoLikes || totalLikes,
      totalComments: totalVideoComments || null,
      totalShares: totalVideoShares || null,
      engagementRate,
      platformData: {
        username: user?.username,
        displayName: user?.display_name,
        avatarUrl: user?.avatar_large_url ?? user?.avatar_url,
        bio: user?.bio_description,
        isVerified: user?.is_verified ?? false,
        totalVideos: videoCount,
        totalLikesProfile: totalLikes,
        followingCount: user?.following_count ?? null,
        videosAnalisados: content.length,
        totalViewsVideos: totalVideoViews,
        totalSaves: totalVideoSaves,
        taxaEngajamento: engagementRate ? Math.round(engagementRate * 10000) / 100 : null,
        ...(bestVideo ? {
          melhorVideo: {
            titulo: bestVideo.title,
            views: bestVideo.views,
            likes: bestVideo.likes,
            shares: bestVideo.shares,
            url: bestVideo.url,
          },
        } : {}),
      },
      content,
      audience: null, // TikTok API doesn't provide demographics without Research API
    };
  } catch (error) {
    console.error("TikTok metrics collection failed:", error);

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
