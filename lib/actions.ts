"use server";

import { prisma, ARTIST_ID } from "@/lib/db";
import { collectYouTubeMetrics } from "@/lib/platforms/youtube";
import { collectInstagramMetrics } from "@/lib/platforms/instagram";
import { collectSpotifyMetrics } from "@/lib/platforms/spotify";
import {
  fetchYouTubePublicData,
  fetchSpotifyPublicData,
  fetchInstagramPublicData,
} from "@/lib/platforms/public-fetch";
import { openai } from "@/lib/ai/client";
import {
  buildSystemPrompt,
  buildMetricsSummaryFromSnapshots,
} from "@/lib/ai/prompts";
import type { PlatformConnection } from "@prisma/client";
import type { CollectedMetrics, ContentItem } from "@/lib/platforms/types";
import { revalidatePath } from "next/cache";

// ── Artist ──

export async function getArtistData() {
  return prisma.artist.findUnique({ where: { id: ARTIST_ID } });
}

export async function updateArtist(data: {
  name?: string;
  style?: string;
  goals?: string;
  bio?: string;
  imageUrl?: string;
}) {
  const artist = await prisma.artist.update({
    where: { id: ARTIST_ID },
    data,
  });
  revalidatePath("/");
  return artist;
}

// ── Connections ──

export async function getConnections() {
  return prisma.platformConnection.findMany({
    where: { artistId: ARTIST_ID },
    select: {
      id: true,
      platform: true,
      displayName: true,
      status: true,
      connectedAt: true,
      metadata: true,
    },
  });
}

export async function disconnectPlatform(platform: string) {
  await prisma.platformConnection.delete({
    where: {
      artistId_platform: {
        artistId: ARTIST_ID,
        platform: platform.toUpperCase() as "YOUTUBE" | "INSTAGRAM" | "SPOTIFY",
      },
    },
  });
  revalidatePath("/connections");
}

// ── Connect by Profile (Public API) ──

export async function connectByProfile(platform: string, profileInput: string) {
  const platformKey = platform.toUpperCase() as "YOUTUBE" | "INSTAGRAM" | "SPOTIFY";

  try {
    if (platformKey === "INSTAGRAM") {
      const result = await fetchInstagramPublicData(profileInput);
      return { error: result.error };
    }

    if (platformKey === "YOUTUBE") {
      const data = await fetchYouTubePublicData(profileInput);

      // Upsert PlatformConnection
      await prisma.platformConnection.upsert({
        where: {
          artistId_platform: { artistId: ARTIST_ID, platform: "YOUTUBE" },
        },
        update: {
          accessToken: "public-api",
          refreshToken: null,
          tokenExpiry: null,
          externalId: data.channelId,
          displayName: data.name,
          status: "ACTIVE",
          metadata: {
            method: "public-api",
            thumbnailUrl: data.thumbnailUrl,
            description: data.description,
          },
        },
        create: {
          artistId: ARTIST_ID,
          platform: "YOUTUBE",
          accessToken: "public-api",
          externalId: data.channelId,
          displayName: data.name,
          status: "ACTIVE",
          metadata: {
            method: "public-api",
            thumbnailUrl: data.thumbnailUrl,
            description: data.description,
          },
        },
      });

      // Save MetricsSnapshot
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const snapshot = await prisma.metricsSnapshot.upsert({
        where: {
          artistId_platform_date: {
            artistId: ARTIST_ID,
            platform: "YOUTUBE",
            date: today,
          },
        },
        update: {
          followers: data.subscribers,
          totalViews: data.totalViews,
          platformData: {
            videoCount: data.videoCount,
            channelId: data.channelId,
            method: "public-api",
          },
        },
        create: {
          artistId: ARTIST_ID,
          platform: "YOUTUBE",
          date: today,
          followers: data.subscribers,
          totalViews: data.totalViews,
          platformData: {
            videoCount: data.videoCount,
            channelId: data.channelId,
            method: "public-api",
          },
        },
      });

      // Save content metrics (recent videos)
      if (data.recentVideos.length > 0) {
        await prisma.contentMetrics.deleteMany({
          where: { snapshotId: snapshot.id },
        });
        await prisma.contentMetrics.createMany({
          data: data.recentVideos.map((v) => ({
            snapshotId: snapshot.id,
            contentId: v.videoId,
            contentType: "video",
            title: v.title,
            url: `https://www.youtube.com/watch?v=${v.videoId}`,
            views: v.views,
            likes: v.likes,
          })),
        });
      }

      revalidatePath("/connections");
      revalidatePath("/");

      return {
        success: true,
        name: data.name,
        followers: data.subscribers,
        totalViews: data.totalViews,
        videoCount: data.videoCount,
        thumbnailUrl: data.thumbnailUrl,
      };
    }

    if (platformKey === "SPOTIFY") {
      const data = await fetchSpotifyPublicData(profileInput);

      // Upsert PlatformConnection
      await prisma.platformConnection.upsert({
        where: {
          artistId_platform: { artistId: ARTIST_ID, platform: "SPOTIFY" },
        },
        update: {
          accessToken: "public-api",
          refreshToken: null,
          tokenExpiry: null,
          externalId: data.artistId,
          displayName: data.name,
          status: "ACTIVE",
          metadata: {
            method: "public-api",
            imageUrl: data.imageUrl,
            genres: data.genres,
            popularity: data.popularity,
          },
        },
        create: {
          artistId: ARTIST_ID,
          platform: "SPOTIFY",
          accessToken: "public-api",
          externalId: data.artistId,
          displayName: data.name,
          status: "ACTIVE",
          metadata: {
            method: "public-api",
            imageUrl: data.imageUrl,
            genres: data.genres,
            popularity: data.popularity,
          },
        },
      });

      // Save MetricsSnapshot
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const snapshot = await prisma.metricsSnapshot.upsert({
        where: {
          artistId_platform_date: {
            artistId: ARTIST_ID,
            platform: "SPOTIFY",
            date: today,
          },
        },
        update: {
          followers: data.followers,
          platformData: {
            popularity: data.popularity,
            genres: data.genres,
            artistId: data.artistId,
            method: "public-api",
          },
        },
        create: {
          artistId: ARTIST_ID,
          platform: "SPOTIFY",
          date: today,
          followers: data.followers,
          platformData: {
            popularity: data.popularity,
            genres: data.genres,
            artistId: data.artistId,
            method: "public-api",
          },
        },
      });

      // Save content metrics (top tracks + albums)
      const contentData = [
        ...data.topTracks.map((t, i) => ({
          snapshotId: snapshot.id,
          contentId: `track-${i}`,
          contentType: "track" as const,
          title: t.name,
          platformData: {
            popularity: t.popularity,
            previewUrl: t.previewUrl,
          },
        })),
        ...data.albums.map((a, i) => ({
          snapshotId: snapshot.id,
          contentId: `album-${i}`,
          contentType: a.type,
          title: a.name,
          publishedAt: a.releaseDate ? new Date(a.releaseDate) : undefined,
          platformData: { totalTracks: a.totalTracks },
        })),
      ];

      if (contentData.length > 0) {
        await prisma.contentMetrics.deleteMany({
          where: { snapshotId: snapshot.id },
        });
        await prisma.contentMetrics.createMany({ data: contentData });
      }

      revalidatePath("/connections");
      revalidatePath("/");

      return {
        success: true,
        name: data.name,
        followers: data.followers,
        popularity: data.popularity,
        genres: data.genres,
        imageUrl: data.imageUrl,
      };
    }

    return { error: `Plataforma "${platform}" não suportada para conexão por perfil.` };
  } catch (err) {
    console.error(`connectByProfile(${platform}) failed:`, err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Erro desconhecido ao buscar dados do perfil.",
    };
  }
}

// ── Metrics ──

export async function getLatestSnapshots() {
  const platforms = ["YOUTUBE", "INSTAGRAM", "SPOTIFY"] as const;
  const snapshots = [];

  for (const platform of platforms) {
    const snapshot = await prisma.metricsSnapshot.findFirst({
      where: { artistId: ARTIST_ID, platform },
      orderBy: { date: "desc" },
      include: {
        contentMetrics: { orderBy: { views: "desc" }, take: 10 },
        audienceMetrics: true,
      },
    });
    if (snapshot) snapshots.push(snapshot);
  }

  return snapshots;
}

export async function getMetricsHistory(
  platform?: string,
  days: number = 30
) {
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);

  return prisma.metricsSnapshot.findMany({
    where: {
      artistId: ARTIST_ID,
      ...(platform ? { platform: platform.toUpperCase() as "YOUTUBE" | "INSTAGRAM" | "SPOTIFY" } : {}),
      date: { gte: dateFrom },
    },
    orderBy: { date: "asc" },
  });
}

export async function getAllContent() {
  // Pegar último snapshot por plataforma (sem duplicar)
  const platforms = ["YOUTUBE", "INSTAGRAM", "SPOTIFY"] as const;
  const content: (Awaited<ReturnType<typeof prisma.contentMetrics.findMany>>[number] & { platform: string })[] = [];

  for (const platform of platforms) {
    const snapshot = await prisma.metricsSnapshot.findFirst({
      where: { artistId: ARTIST_ID, platform },
      orderBy: { date: "desc" },
      include: {
        contentMetrics: {
          orderBy: { views: "desc" },
        },
      },
    });
    if (snapshot) {
      for (const c of snapshot.contentMetrics) {
        content.push({ ...c, platform: snapshot.platform });
      }
    }
  }

  // De-duplicar por contentId (manter o com mais views)
  const seen = new Map<string, typeof content[number]>();
  for (const item of content) {
    const existing = seen.get(item.contentId);
    if (!existing || (item.views ?? 0) > (existing.views ?? 0)) {
      seen.set(item.contentId, item);
    }
  }

  return Array.from(seen.values()).sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
}

export async function getAudienceData() {
  const snapshots = await prisma.metricsSnapshot.findMany({
    where: { artistId: ARTIST_ID },
    orderBy: { date: "desc" },
    include: { audienceMetrics: true },
  });

  // Get latest audience data per platform
  const audienceByPlatform: Record<string, unknown> = {};
  for (const s of snapshots) {
    if (s.audienceMetrics && !audienceByPlatform[s.platform]) {
      audienceByPlatform[s.platform] = s.audienceMetrics;
    }
  }

  return audienceByPlatform;
}

// ── Collect Metrics ──

const collectors: Record<
  string,
  (conn: PlatformConnection) => Promise<CollectedMetrics>
> = {
  YOUTUBE: collectYouTubeMetrics,
  INSTAGRAM: collectInstagramMetrics,
  SPOTIFY: collectSpotifyMetrics,
};

export async function collectAllMetrics() {
  // Buscar dados históricos primeiro (YouTube Analytics + Instagram Insights)
  const { fetchYouTubeHistory, fetchInstagramHistory } = await import("@/lib/platforms/fetch-history");
  try {
    const [ytHistory, igHistory] = await Promise.allSettled([
      fetchYouTubeHistory(90),
      fetchInstagramHistory(),
    ]);
    if (ytHistory.status === "fulfilled" && ytHistory.value.saved > 0) {
      console.log(`YouTube: ${ytHistory.value.saved} dias de histórico atualizados`);
    }
    if (igHistory.status === "fulfilled" && igHistory.value.saved > 0) {
      console.log(`Instagram: ${igHistory.value.saved} dias de histórico atualizados`);
    }
  } catch (e) {
    console.error("Erro ao buscar histórico:", e);
  }

  const connections = await prisma.platformConnection.findMany({
    where: { artistId: ARTIST_ID, status: "ACTIVE" },
  });

  if (connections.length === 0) {
    return { error: "Nenhuma plataforma conectada" };
  }

  const results: { platform: string; status: string; message?: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const connection of connections) {
    const collector = collectors[connection.platform];
    if (!collector) continue;

    try {
      const metrics = await collector(connection);

      const snapshot = await prisma.metricsSnapshot.upsert({
        where: {
          artistId_platform_date: {
            artistId: ARTIST_ID,
            platform: connection.platform,
            date: today,
          },
        },
        update: {
          followers: metrics.followers,
          totalViews: metrics.totalViews,
          totalLikes: metrics.totalLikes,
          totalComments: metrics.totalComments,
          totalShares: metrics.totalShares,
          engagementRate: metrics.engagementRate,
          platformData: metrics.platformData as object,
        },
        create: {
          artistId: ARTIST_ID,
          platform: connection.platform,
          date: today,
          followers: metrics.followers,
          totalViews: metrics.totalViews,
          totalLikes: metrics.totalLikes,
          totalComments: metrics.totalComments,
          totalShares: metrics.totalShares,
          engagementRate: metrics.engagementRate,
          platformData: metrics.platformData as object,
        },
      });

      if (metrics.content.length > 0) {
        await prisma.contentMetrics.deleteMany({
          where: { snapshotId: snapshot.id },
        });
        await prisma.contentMetrics.createMany({
          data: metrics.content.map((c) => ({
            snapshotId: snapshot.id,
            contentId: c.contentId,
            contentType: c.contentType,
            title: c.title,
            thumbnailUrl: c.thumbnailUrl,
            publishedAt: c.publishedAt,
            url: c.url,
            views: c.views,
            likes: c.likes,
            comments: c.comments,
            shares: c.shares,
            saves: c.saves,
            platformData: c.platformData as object,
          })),
        });
      }

      if (metrics.audience) {
        const audienceData = {
          ageRanges: (metrics.audience.ageRanges ?? undefined) as object | undefined,
          genderSplit: (metrics.audience.genderSplit ?? undefined) as object | undefined,
          topCountries: (metrics.audience.topCountries ?? undefined) as object | undefined,
          topCities: (metrics.audience.topCities ?? undefined) as object | undefined,
        };
        await prisma.audienceMetrics.upsert({
          where: { snapshotId: snapshot.id },
          update: audienceData,
          create: { snapshotId: snapshot.id, ...audienceData },
        });
      }

      results.push({
        platform: connection.platform,
        status: "success",
        message: `${metrics.followers?.toLocaleString("pt-BR") ?? "?"} seguidores`,
      });
    } catch (error) {
      results.push({
        platform: connection.platform,
        status: "error",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }

  revalidatePath("/");
  return { results };
}

// ── Manual Metrics Upload ──

export async function uploadManualMetrics(data: {
  platform: string;
  date: string;
  metrics: object;
  notes?: string;
}) {
  const record = await prisma.manualMetrics.create({
    data: {
      artistId: ARTIST_ID,
      platform: data.platform,
      date: new Date(data.date),
      data: data.metrics as object,
      notes: data.notes,
    },
  });

  revalidatePath("/upload");
  return record;
}

export async function getManualMetrics() {
  return prisma.manualMetrics.findMany({
    where: { artistId: ARTIST_ID },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

// ── Chat ──

export async function getChatHistory() {
  return prisma.chatMessage.findMany({
    where: { artistId: ARTIST_ID },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
}

export async function sendChatMessage(content: string) {
  // Save user message
  await prisma.chatMessage.create({
    data: {
      artistId: ARTIST_ID,
      role: "USER",
      content,
    },
  });

  // ── Buscar TODOS os dados do banco para contexto do chat ──

  const artist = await prisma.artist.findUniqueOrThrow({
    where: { id: ARTIST_ID },
  });

  // Conexões ativas
  const connections = await prisma.platformConnection.findMany({
    where: { artistId: ARTIST_ID },
    select: { platform: true, status: true, displayName: true, metadata: true, connectedAt: true },
  });

  // Últimos snapshots por plataforma (com conteúdo e audiência)
  const latestSnapshots = await getLatestSnapshots();
  const metricsSummary = buildMetricsSummaryFromSnapshots(latestSnapshots);

  // Histórico de 28 dias por plataforma para tendências
  const history28d = await prisma.metricsSnapshot.findMany({
    where: {
      artistId: ARTIST_ID,
      date: { gte: new Date(Date.now() - 28 * 86400000) },
    },
    orderBy: { date: "asc" },
    select: { platform: true, date: true, followers: true, totalViews: true, totalLikes: true, totalComments: true, engagementRate: true, platformData: true },
  });

  // Todo o conteúdo (de-duplicado)
  const contentMap = new Map<string, { platform: string; contentId: string; type: string; title: string | null; views: number | null; likes: number | null; comments: number | null; url: string | null; date: string | null }>();
  for (const s of latestSnapshots) {
    for (const c of s.contentMetrics) {
      if (!contentMap.has(c.contentId) || ((c.views ?? 0) + (c.likes ?? 0)) > ((contentMap.get(c.contentId)?.views ?? 0) + (contentMap.get(c.contentId)?.likes ?? 0))) {
        contentMap.set(c.contentId, {
          platform: s.platform,
          contentId: c.contentId,
          type: c.contentType,
          title: c.title,
          views: c.views,
          likes: c.likes,
          comments: c.comments,
          url: c.url,
          date: c.publishedAt?.toISOString().split("T")[0] ?? null,
        });
      }
    }
  }
  const allContent = Array.from(contentMap.values()).sort((a, b) => ((b.likes ?? 0) + (b.views ?? 0)) - ((a.likes ?? 0) + (a.views ?? 0)));

  // Audiência
  const audienceSnapshot = latestSnapshots.find((s) => s.audienceMetrics);
  const audience = audienceSnapshot?.audienceMetrics
    ? {
        ageRanges: (audienceSnapshot.audienceMetrics.ageRanges ?? null) as Record<string, number> | null,
        genderSplit: (audienceSnapshot.audienceMetrics.genderSplit ?? null) as Record<string, number> | null,
        topCountries: (audienceSnapshot.audienceMetrics.topCountries ?? null) as Record<string, number> | null,
        topCities: (audienceSnapshot.audienceMetrics.topCities ?? null) as Record<string, number> | null,
      }
    : null;

  // ── Construir contexto completo para o AI ──

  const systemPrompt = buildSystemPrompt(artist, metricsSummary, allContent.map((c) => ({
    contentId: c.contentId,
    contentType: c.type,
    title: c.title,
    thumbnailUrl: null,
    publishedAt: c.date ? new Date(c.date) : null,
    url: c.url,
    views: c.views,
    likes: c.likes,
    comments: c.comments,
    shares: null,
    saves: null,
    platformData: {} as Record<string, unknown>,
  })), audience);

  // Dados extras que o prompt padrão não inclui
  const extraContext: string[] = [];

  // Conexões
  extraContext.push(`## Plataformas Conectadas`);
  for (const conn of connections) {
    const meta = (conn.metadata ?? {}) as Record<string, unknown>;
    extraContext.push(`- ${conn.platform}: ${conn.displayName ?? "conectado"} (${conn.status}) — desde ${conn.connectedAt?.toISOString().split("T")[0] ?? "?"}`);
    if (meta.monthlyListeners) extraContext.push(`  Ouvintes mensais: ${meta.monthlyListeners}`);
    if (meta.genres) extraContext.push(`  Gêneros: ${(meta.genres as string[]).join(", ")}`);
    if (meta.biography) extraContext.push(`  Bio: ${(meta.biography as string).substring(0, 200)}`);
    if (meta.spotifyUrl) extraContext.push(`  Spotify: ${meta.spotifyUrl}`);
  }

  // Tendências dos últimos 28 dias por plataforma
  extraContext.push(`\n## Tendências dos Últimos 28 Dias`);
  for (const plat of ["YOUTUBE", "INSTAGRAM", "SPOTIFY"] as const) {
    const platData = history28d.filter((s) => s.platform === plat);
    if (platData.length < 2) continue;

    const first = platData[0];
    const last = platData[platData.length - 1];
    const firstFollowers = first.followers ?? 0;
    const lastFollowers = last.followers ?? 0;
    const followerChange = lastFollowers - firstFollowers;

    // Views/alcance diário
    const totalDailyViews = platData.reduce((s, d) => {
      const pd = (d.platformData ?? {}) as Record<string, number>;
      return s + (pd.dailyViews ?? pd.dailyStreams ?? pd.alcanceDiario ?? d.totalViews ?? 0);
    }, 0);

    const totalLikes = platData.reduce((s, d) => s + (d.totalLikes ?? 0), 0);
    const totalComments = platData.reduce((s, d) => s + (d.totalComments ?? 0), 0);

    // Picos
    let peakDay = platData[0];
    let peakViews = 0;
    for (const d of platData) {
      const pd = (d.platformData ?? {}) as Record<string, number>;
      const dv = pd.dailyViews ?? pd.dailyStreams ?? pd.alcanceDiario ?? 0;
      if (dv > peakViews) { peakViews = dv; peakDay = d; }
    }

    extraContext.push(`### ${plat}`);
    extraContext.push(`- Período: ${first.date.toISOString().split("T")[0]} a ${last.date.toISOString().split("T")[0]} (${platData.length} dias)`);
    extraContext.push(`- Seguidores: ${firstFollowers.toLocaleString("pt-BR")} → ${lastFollowers.toLocaleString("pt-BR")} (${followerChange >= 0 ? "+" : ""}${followerChange})`);
    extraContext.push(`- Views/alcance total no período: ${totalDailyViews.toLocaleString("pt-BR")}`);
    extraContext.push(`- Média diária: ${Math.round(totalDailyViews / platData.length).toLocaleString("pt-BR")}`);
    if (totalLikes > 0) extraContext.push(`- Curtidas totais: ${totalLikes.toLocaleString("pt-BR")}`);
    if (totalComments > 0) extraContext.push(`- Comentários totais: ${totalComments.toLocaleString("pt-BR")}`);
    extraContext.push(`- Dia de pico: ${peakDay.date.toISOString().split("T")[0]} com ${peakViews.toLocaleString("pt-BR")} views/alcance`);

    // YouTube Analytics extras
    if (plat === "YOUTUBE") {
      const ytLast = (last.platformData ?? {}) as Record<string, unknown>;
      const analytics = (ytLast.analytics ?? (latestSnapshots.find(s => s.platform === "YOUTUBE")?.platformData as Record<string, unknown>)?.analytics) as Record<string, number> | undefined;
      if (analytics) {
        extraContext.push(`- Horas assistidas (28d): ${analytics.horasAssistidas ?? 0}`);
        extraContext.push(`- Retenção média: ${analytics.retencaoMedia ?? 0}%`);
        extraContext.push(`- Duração média de visualização: ${analytics.duracaoMediaSegundos ?? 0}s`);
        extraContext.push(`- Inscritos ganhos: +${analytics.inscritosGanhos ?? 0} / perdidos: -${analytics.inscritosPerdidos ?? 0}`);
        extraContext.push(`- Compartilhamentos: ${analytics.compartilhamentos ?? 0}`);
      }
    }
  }

  // Top conteúdos
  extraContext.push(`\n## Top 15 Conteúdos por Engajamento`);
  for (const c of allContent.slice(0, 15)) {
    const stats = [];
    if (c.views) stats.push(`${c.views.toLocaleString("pt-BR")} views`);
    if (c.likes) stats.push(`${c.likes.toLocaleString("pt-BR")} curtidas`);
    if (c.comments) stats.push(`${c.comments.toLocaleString("pt-BR")} comentários`);
    extraContext.push(`- [${c.platform}] "${c.title ?? "Sem título"}" (${c.type}) — ${stats.join(", ")}${c.date ? ` — ${c.date}` : ""}${c.url ? ` — ${c.url}` : ""}`);
  }

  // Audiência detalhada
  if (audience) {
    extraContext.push(`\n## Audiência Detalhada`);
    if (audience.topCountries) {
      extraContext.push(`### Países (por views)`);
      for (const [country, views] of Object.entries(audience.topCountries).sort(([, a], [, b]) => b - a).slice(0, 10)) {
        extraContext.push(`- ${country}: ${views.toLocaleString("pt-BR")} views`);
      }
    }
    if (audience.topCities) {
      extraContext.push(`### Fontes de Tráfego`);
      const trafficLabels: Record<string, string> = {
        SHORTS: "YouTube Shorts", YT_SEARCH: "Busca no YouTube", SUBSCRIBER: "Inscritos",
        YT_CHANNEL: "Página do canal", EXT_URL: "Links externos", PLAYLIST: "Playlists",
        BROWSE_FEATURES: "Explorar", NOTIFICATION: "Notificações",
      };
      for (const [source, views] of Object.entries(audience.topCities).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 10)) {
        extraContext.push(`- ${trafficLabels[source] ?? source}: ${(views as number).toLocaleString("pt-BR")} views`);
      }
    }
  }

  const fullSystemPrompt = systemPrompt + "\n\n" + extraContext.join("\n");

  // Get recent chat history for context
  const chatHistory = await prisma.chatMessage.findMany({
    where: { artistId: ARTIST_ID },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const messages = chatHistory.reverse().map((m) => ({
    role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));

  const response = await openai.responses.create({
    model: "gpt-5.4-mini",
    instructions: fullSystemPrompt,
    input: messages,
    tools: [
      {
        type: "web_search_preview",
        search_context_size: "medium",
      },
    ],
  });

  const assistantContent = response.output_text;

  // Save assistant message
  const assistantMessage = await prisma.chatMessage.create({
    data: {
      artistId: ARTIST_ID,
      role: "ASSISTANT",
      content: assistantContent,
    },
  });

  return assistantMessage;
}

export async function clearChatHistory() {
  await prisma.chatMessage.deleteMany({
    where: { artistId: ARTIST_ID },
  });
  revalidatePath("/chat");
}
