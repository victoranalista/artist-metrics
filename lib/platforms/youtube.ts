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
    `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${videoIds}`,
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
        description?: string;
        thumbnails?: { medium?: { url: string }; high?: { url: string } };
        publishedAt: string;
        tags?: string[];
        categoryId?: string;
      };
      statistics: {
        viewCount?: string;
        likeCount?: string;
        commentCount?: string;
        favoriteCount?: string;
      };
      contentDetails?: {
        duration?: string;
        definition?: string;
      };
    }): ContentItem => {
      const views = video.statistics.viewCount ? parseInt(video.statistics.viewCount, 10) : null;
      const likes = video.statistics.likeCount ? parseInt(video.statistics.likeCount, 10) : null;
      const comments = video.statistics.commentCount ? parseInt(video.statistics.commentCount, 10) : null;

      return {
        contentId: video.id,
        contentType: "video",
        title: video.snippet.title,
        thumbnailUrl: video.snippet.thumbnails?.high?.url ?? video.snippet.thumbnails?.medium?.url ?? null,
        publishedAt: new Date(video.snippet.publishedAt),
        url: `https://www.youtube.com/watch?v=${video.id}`,
        views,
        likes,
        comments,
        shares: null,
        saves: null,
        platformData: {
          duracao: video.contentDetails?.duration ?? null,
          definicao: video.contentDetails?.definition ?? null,
          tags: video.snippet.tags?.slice(0, 10) ?? [],
          descricaoCurta: video.snippet.description?.substring(0, 200) ?? null,
          taxaEngajamento: views && views > 0 ? ((likes ?? 0) + (comments ?? 0)) / views : null,
        },
      };
    }
  );
}

// ── YouTube Analytics API (métricas profundas) ──

async function fetchAnalyticsOverview(accessToken: string) {
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const metrics = [
    "views",
    "estimatedMinutesWatched",
    "averageViewDuration",
    "averageViewPercentage",
    "subscribersGained",
    "subscribersLost",
    "likes",
    "dislikes",
    "comments",
    "shares",
  ].join(",");

  try {
    const res = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}&metrics=${metrics}&dimensions=day&sort=day`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();
    if (data.error) return null;
    return data;
  } catch {
    return null;
  }
}

async function fetchAnalyticsDemographics(accessToken: string) {
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  try {
    // Faixa etária e gênero
    const ageRes = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}&metrics=viewerPercentage&dimensions=ageGroup,gender&sort=gender,ageGroup`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const ageData = await ageRes.json();

    // Países
    const countryRes = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}&metrics=views,estimatedMinutesWatched&dimensions=country&sort=-views&maxResults=10`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const countryData = await countryRes.json();

    // Fontes de tráfego
    const trafficRes = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}&metrics=views&dimensions=insightTrafficSourceType&sort=-views&maxResults=10`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const trafficData = await trafficRes.json();

    return { ageData, countryData, trafficData };
  } catch {
    return null;
  }
}

function parseAnalytics(analyticsData: Record<string, unknown> | null) {
  if (!analyticsData || !Array.isArray((analyticsData as { rows?: unknown }).rows)) return null;

  const rows = (analyticsData as { rows: (string | number)[][] }).rows;
  let totalViews = 0;
  let totalMinutesWatched = 0;
  let totalAvgDuration = 0;
  let totalAvgPercentage = 0;
  let totalSubsGained = 0;
  let totalSubsLost = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;

  for (const row of rows) {
    totalViews += (row[1] as number) || 0;
    totalMinutesWatched += (row[2] as number) || 0;
    totalAvgDuration += (row[3] as number) || 0;
    totalAvgPercentage += (row[4] as number) || 0;
    totalSubsGained += (row[5] as number) || 0;
    totalSubsLost += (row[6] as number) || 0;
    totalLikes += (row[7] as number) || 0;
    totalComments += (row[9] as number) || 0;
    totalShares += (row[10] as number) || 0;
  }

  const days = rows.length || 1;

  return {
    periodo28dias: {
      visualizacoes: totalViews,
      minutosAssistidos: Math.round(totalMinutesWatched),
      horasAssistidas: Math.round(totalMinutesWatched / 60),
      duracaoMediaSegundos: Math.round(totalAvgDuration / days),
      retencaoMedia: Math.round((totalAvgPercentage / days) * 100) / 100,
      inscritosGanhos: totalSubsGained,
      inscritosPerdidos: totalSubsLost,
      saldoInscritos: totalSubsGained - totalSubsLost,
      curtidas: totalLikes,
      comentarios: totalComments,
      compartilhamentos: totalShares,
    },
  };
}

function parseDemographics(demoData: {
  ageData?: Record<string, unknown>;
  countryData?: Record<string, unknown>;
  trafficData?: Record<string, unknown>;
} | null) {
  if (!demoData) return null;

  const ageRanges: Record<string, number> = {};
  const genderSplit: Record<string, number> = {};
  const topCountries: Record<string, number> = {};

  // Faixa etária e gênero
  if (demoData.ageData && Array.isArray((demoData.ageData as { rows?: unknown }).rows)) {
    for (const row of (demoData.ageData as { rows: (string | number)[][] }).rows) {
      const ageGroup = row[0] as string;
      const gender = row[1] as string;
      const pct = row[2] as number;

      ageRanges[ageGroup] = (ageRanges[ageGroup] || 0) + pct;
      const gLabel = gender === "male" ? "Masculino" : gender === "female" ? "Feminino" : "Outro";
      genderSplit[gLabel] = (genderSplit[gLabel] || 0) + pct;
    }
  }

  // Países
  if (demoData.countryData && Array.isArray((demoData.countryData as { rows?: unknown }).rows)) {
    for (const row of (demoData.countryData as { rows: (string | number)[][] }).rows) {
      topCountries[row[0] as string] = row[1] as number;
    }
  }

  // Fontes de tráfego
  const trafficSources: Record<string, number> = {};
  if (demoData.trafficData && Array.isArray((demoData.trafficData as { rows?: unknown }).rows)) {
    for (const row of (demoData.trafficData as { rows: (string | number)[][] }).rows) {
      trafficSources[row[0] as string] = row[1] as number;
    }
  }

  return {
    ageRanges: Object.keys(ageRanges).length > 0 ? ageRanges : null,
    genderSplit: Object.keys(genderSplit).length > 0 ? genderSplit : null,
    topCountries: Object.keys(topCountries).length > 0 ? topCountries : null,
    topCities: trafficSources, // usando campo topCities pra guardar fontes de tráfego
  };
}

// ── Coletor principal ──

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

    // YouTube Analytics API - métricas profundas
    const analyticsRaw = await fetchAnalyticsOverview(accessToken);
    const analytics = parseAnalytics(analyticsRaw);
    const demoRaw = await fetchAnalyticsDemographics(accessToken);
    const audience = parseDemographics(demoRaw);

    // Calcular métricas agregadas dos vídeos
    const totalVideoLikes = content.reduce((sum, item) => sum + (item.likes ?? 0), 0);
    const totalVideoComments = content.reduce((sum, item) => sum + (item.comments ?? 0), 0);
    const totalVideoViews = content.reduce((sum, item) => sum + (item.views ?? 0), 0);

    // Taxa de engajamento: (likes + comments) / views dos vídeos recentes
    let engagementRate: number | null = null;
    if (totalVideoViews > 0) {
      engagementRate = (totalVideoLikes + totalVideoComments) / totalVideoViews;
    }

    // Média de views por vídeo
    const avgViewsPerVideo = content.length > 0
      ? Math.round(totalVideoViews / content.length)
      : null;

    // Melhor vídeo
    const bestVideo = content.length > 0
      ? content.reduce((best, item) =>
          (item.views ?? 0) > (best.views ?? 0) ? item : best
        )
      : null;

    // Frequência de upload (dias entre vídeos)
    let uploadFrequencyDays: number | null = null;
    if (content.length >= 2) {
      const dates = content
        .filter((c) => c.publishedAt)
        .map((c) => c.publishedAt!.getTime())
        .sort((a, b) => b - a);
      if (dates.length >= 2) {
        const totalDays = (dates[0] - dates[dates.length - 1]) / (1000 * 60 * 60 * 24);
        uploadFrequencyDays = Math.round(totalDays / (dates.length - 1));
      }
    }

    return {
      followers: subscribers,
      totalViews,
      totalLikes: analytics?.periodo28dias?.curtidas ?? (totalVideoLikes || null),
      totalComments: analytics?.periodo28dias?.comentarios ?? (totalVideoComments || null),
      totalShares: analytics?.periodo28dias.compartilhamentos ?? null,
      engagementRate,
      platformData: {
        // Dados do canal
        canalId: channel.id,
        canalNome: channel.snippet?.title,
        canalDescricao: channel.snippet?.description?.substring(0, 500),
        canalImagem: channel.snippet?.thumbnails?.high?.url ?? channel.snippet?.thumbnails?.default?.url,
        canalCriado: channel.snippet?.publishedAt,
        totalVideos: videoCount,
        totalInscritos: subscribers,
        totalVisualizacoes: totalViews,

        // Métricas calculadas dos vídeos recentes
        videosAnalisados: content.length,
        mediaViewsPorVideo: avgViewsPerVideo,
        totalCurtidasVideos: totalVideoLikes,
        totalComentariosVideos: totalVideoComments,
        taxaEngajamento: engagementRate ? Math.round(engagementRate * 10000) / 100 : null,
        frequenciaUploadDias: uploadFrequencyDays,

        // Melhor vídeo
        ...(bestVideo ? {
          melhorVideo: {
            titulo: bestVideo.title,
            views: bestVideo.views,
            likes: bestVideo.likes,
            url: bestVideo.url,
          },
        } : {}),

        // YouTube Analytics (últimos 28 dias)
        ...(analytics ? { analytics: analytics.periodo28dias } : {}),
      },
      content,
      audience,
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
