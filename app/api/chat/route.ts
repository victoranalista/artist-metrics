import { prisma, ARTIST_ID } from "@/lib/db";
import { openai } from "@/lib/ai/client";
import {
  buildSystemPrompt,
  buildMetricsSummaryFromSnapshots,
} from "@/lib/ai/prompts";
import { parseCommand, getActiveMode } from "@/lib/ai/commands";
import { handleArtistPreferences } from "@/lib/ai/handlers/artist-preferences";
import { handleProductionArtist } from "@/lib/ai/handlers/production-artist";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── Parallel version of getLatestSnapshots ──

async function getLatestSnapshotsParallel() {
  const platforms = ["YOUTUBE", "INSTAGRAM", "SPOTIFY", "TIKTOK"] as const;
  const results = await Promise.all(
    platforms.map((platform) =>
      prisma.metricsSnapshot.findFirst({
        where: { artistId: ARTIST_ID, platform },
        orderBy: { date: "desc" },
        include: {
          contentMetrics: { orderBy: { views: "desc" }, take: 10 },
          audienceMetrics: true,
        },
      })
    )
  );
  return results.filter(Boolean) as NonNullable<(typeof results)[number]>[];
}

// ── Build full context (parallel DB fetches) ──

async function buildChatContext(sessionId: string) {
  // ALL queries in parallel
  const [artist, connections, latestSnapshots, history28d, activePlan, chatHistory] =
    await Promise.all([
      prisma.artist.findUniqueOrThrow({ where: { id: ARTIST_ID } }),
      prisma.platformConnection.findMany({
        where: { artistId: ARTIST_ID },
        select: {
          platform: true,
          status: true,
          displayName: true,
          metadata: true,
          connectedAt: true,
        },
      }),
      getLatestSnapshotsParallel(),
      prisma.metricsSnapshot.findMany({
        where: {
          artistId: ARTIST_ID,
          date: { gte: new Date(Date.now() - 28 * 86400000) },
        },
        orderBy: { date: "asc" },
        select: {
          platform: true,
          date: true,
          followers: true,
          totalViews: true,
          totalLikes: true,
          totalComments: true,
          engagementRate: true,
          platformData: true,
        },
      }),
      prisma.productionPlan.findFirst({
        where: { artistId: ARTIST_ID, status: "ACTIVE" },
        include: { stages: { orderBy: { orderIndex: "asc" } } },
      }),
      prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

  const metricsSummary = buildMetricsSummaryFromSnapshots(latestSnapshots);

  // De-duplicate content
  const contentMap = new Map<
    string,
    {
      platform: string;
      contentId: string;
      type: string;
      title: string | null;
      views: number | null;
      likes: number | null;
      comments: number | null;
      url: string | null;
      date: string | null;
    }
  >();
  for (const s of latestSnapshots) {
    for (const c of s.contentMetrics) {
      const existing = contentMap.get(c.contentId);
      if (
        !existing ||
        (c.views ?? 0) + (c.likes ?? 0) >
          (existing.views ?? 0) + (existing.likes ?? 0)
      ) {
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
  const allContent = Array.from(contentMap.values()).sort(
    (a, b) => (b.likes ?? 0) + (b.views ?? 0) - ((a.likes ?? 0) + (a.views ?? 0))
  );

  // Audience
  const audienceSnapshot = latestSnapshots.find((s) => s.audienceMetrics);
  const audience = audienceSnapshot?.audienceMetrics
    ? {
        ageRanges: (audienceSnapshot.audienceMetrics.ageRanges ?? null) as Record<string, number> | null,
        genderSplit: (audienceSnapshot.audienceMetrics.genderSplit ?? null) as Record<string, number> | null,
        topCountries: (audienceSnapshot.audienceMetrics.topCountries ?? null) as Record<string, number> | null,
        topCities: (audienceSnapshot.audienceMetrics.topCities ?? null) as Record<string, number> | null,
      }
    : null;

  // Base system prompt
  const systemPrompt = buildSystemPrompt(
    artist,
    metricsSummary,
    allContent.map((c) => ({
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
    })),
    audience
  );

  // Extra context sections
  const extraContext: string[] = [];

  // Artist preferences
  if (artist.preferences) {
    const prefs = artist.preferences as Record<string, Record<string, unknown>>;
    extraContext.push(`## Preferencias do Artista (coletadas em conversa)`);
    if (prefs.identity) {
      if (prefs.identity.genre) extraContext.push(`- Genero: ${prefs.identity.genre}`);
      if (Array.isArray(prefs.identity.subgenres) && prefs.identity.subgenres.length > 0)
        extraContext.push(`- Subgeneros: ${prefs.identity.subgenres.join(", ")}`);
      if (prefs.identity.description) extraContext.push(`- Descricao: ${prefs.identity.description}`);
      if (Array.isArray(prefs.identity.themes) && prefs.identity.themes.length > 0)
        extraContext.push(`- Temas: ${prefs.identity.themes.join(", ")}`);
    }
    if (prefs.influences) {
      if (Array.isArray(prefs.influences.artists) && prefs.influences.artists.length > 0)
        extraContext.push(`- Influencias: ${prefs.influences.artists.join(", ")}`);
      if (Array.isArray(prefs.influences.currentlyListening) && prefs.influences.currentlyListening.length > 0)
        extraContext.push(`- Ouvindo agora: ${prefs.influences.currentlyListening.join(", ")}`);
    }
    if (prefs.contentCreation) {
      if (prefs.contentCreation.style) extraContext.push(`- Estilo de conteudo: ${prefs.contentCreation.style}`);
      if (Array.isArray(prefs.contentCreation.preferredFormats) && prefs.contentCreation.preferredFormats.length > 0)
        extraContext.push(`- Formatos preferidos: ${prefs.contentCreation.preferredFormats.join(", ")}`);
      if (prefs.contentCreation.postingFrequency)
        extraContext.push(`- Frequencia de postagem: ${prefs.contentCreation.postingFrequency}`);
      if (prefs.contentCreation.hasTeam)
        extraContext.push(
          `- Tem equipe: Sim${prefs.contentCreation.teamDetails ? ` (${prefs.contentCreation.teamDetails})` : ""}`
        );
    }
    if (prefs.audience) {
      if (prefs.audience.idealFan) extraContext.push(`- Fa ideal: ${prefs.audience.idealFan}`);
      if (prefs.audience.connectionStyle) extraContext.push(`- Estilo de conexao: ${prefs.audience.connectionStyle}`);
    }
    if (prefs.goals) {
      if (prefs.goals.sixMonths) extraContext.push(`- Meta 6 meses: ${prefs.goals.sixMonths}`);
      if (prefs.goals.oneYear) extraContext.push(`- Meta 1 ano: ${prefs.goals.oneYear}`);
      if (prefs.goals.successDefinition) extraContext.push(`- Definicao de sucesso: ${prefs.goals.successDefinition}`);
    }
    if (prefs.personality) {
      if (Array.isArray(prefs.personality.coreValues) && prefs.personality.coreValues.length > 0)
        extraContext.push(`- Valores: ${prefs.personality.coreValues.join(", ")}`);
    }
    extraContext.push(
      `\nUse estas preferencias para personalizar TODAS as suas recomendacoes. Adapte sugestoes de conteudo ao estilo preferido do artista.`
    );
  }

  // Active production plan
  if (activePlan) {
    const completed = activePlan.stages.filter((s) => s.status === "COMPLETED").length;
    const total = activePlan.stages.length;
    const currentStage =
      activePlan.stages.find((s) => s.status === "IN_PROGRESS") ??
      activePlan.stages.find((s) => s.status === "PENDING");
    extraContext.push(`\n## Plano de Carreira Ativo: "${activePlan.title}"`);
    extraContext.push(
      `- Periodo: ${activePlan.startDate.toISOString().split("T")[0]} a ${activePlan.endDate.toISOString().split("T")[0]}`
    );
    extraContext.push(`- Progresso: ${completed}/${total} etapas completas`);
    if (currentStage) extraContext.push(`- Etapa atual: ${currentStage.title} (${currentStage.status})`);
    extraContext.push(`(Para detalhes ou atualizar progresso, use /production-artist)`);
  }

  // Connections
  extraContext.push(`\n## Plataformas Conectadas`);
  for (const conn of connections) {
    const meta = (conn.metadata ?? {}) as Record<string, unknown>;
    extraContext.push(
      `- ${conn.platform}: ${conn.displayName ?? "conectado"} (${conn.status}) — desde ${conn.connectedAt?.toISOString().split("T")[0] ?? "?"}`
    );
    if (meta.monthlyListeners) extraContext.push(`  Ouvintes mensais: ${meta.monthlyListeners}`);
    if (meta.genres) extraContext.push(`  Gêneros: ${(meta.genres as string[]).join(", ")}`);
    if (meta.biography) extraContext.push(`  Bio: ${(meta.biography as string).substring(0, 200)}`);
    if (meta.spotifyUrl) extraContext.push(`  Spotify: ${meta.spotifyUrl}`);
  }

  // 28-day trends
  extraContext.push(`\n## Tendências dos Últimos 28 Dias`);
  for (const plat of ["YOUTUBE", "INSTAGRAM", "SPOTIFY"] as const) {
    const platData = history28d.filter((s) => s.platform === plat);
    if (platData.length < 2) continue;

    const first = platData[0];
    const last = platData[platData.length - 1];
    const firstFollowers = first.followers ?? 0;
    const lastFollowers = last.followers ?? 0;
    const followerChange = lastFollowers - firstFollowers;

    const totalDailyViews = platData.reduce((s, d) => {
      const pd = (d.platformData ?? {}) as Record<string, number>;
      return s + (pd.dailyViews ?? pd.dailyStreams ?? pd.alcanceDiario ?? d.totalViews ?? 0);
    }, 0);

    const totalLikes = platData.reduce((s, d) => s + (d.totalLikes ?? 0), 0);
    const totalComments = platData.reduce((s, d) => s + (d.totalComments ?? 0), 0);

    let peakDay = platData[0];
    let peakViews = 0;
    for (const d of platData) {
      const pd = (d.platformData ?? {}) as Record<string, number>;
      const dv = pd.dailyViews ?? pd.dailyStreams ?? pd.alcanceDiario ?? 0;
      if (dv > peakViews) {
        peakViews = dv;
        peakDay = d;
      }
    }

    extraContext.push(`### ${plat}`);
    extraContext.push(
      `- Período: ${first.date.toISOString().split("T")[0]} a ${last.date.toISOString().split("T")[0]} (${platData.length} dias)`
    );
    extraContext.push(
      `- Seguidores: ${firstFollowers.toLocaleString("pt-BR")} → ${lastFollowers.toLocaleString("pt-BR")} (${followerChange >= 0 ? "+" : ""}${followerChange})`
    );
    extraContext.push(`- Views/alcance total no período: ${totalDailyViews.toLocaleString("pt-BR")}`);
    extraContext.push(`- Média diária: ${Math.round(totalDailyViews / platData.length).toLocaleString("pt-BR")}`);
    if (totalLikes > 0) extraContext.push(`- Curtidas totais: ${totalLikes.toLocaleString("pt-BR")}`);
    if (totalComments > 0) extraContext.push(`- Comentários totais: ${totalComments.toLocaleString("pt-BR")}`);
    extraContext.push(
      `- Dia de pico: ${peakDay.date.toISOString().split("T")[0]} com ${peakViews.toLocaleString("pt-BR")} views/alcance`
    );

    if (plat === "YOUTUBE") {
      const ytLast = (last.platformData ?? {}) as Record<string, unknown>;
      const analytics = (ytLast.analytics ??
        (latestSnapshots.find((s) => s.platform === "YOUTUBE")?.platformData as Record<string, unknown>)
          ?.analytics) as Record<string, number> | undefined;
      if (analytics) {
        extraContext.push(`- Horas assistidas (28d): ${analytics.horasAssistidas ?? 0}`);
        extraContext.push(`- Retenção média: ${analytics.retencaoMedia ?? 0}%`);
        extraContext.push(`- Duração média de visualização: ${analytics.duracaoMediaSegundos ?? 0}s`);
        extraContext.push(
          `- Inscritos ganhos: +${analytics.inscritosGanhos ?? 0} / perdidos: -${analytics.inscritosPerdidos ?? 0}`
        );
        extraContext.push(`- Compartilhamentos: ${analytics.compartilhamentos ?? 0}`);
      }
    }
  }

  // Top content
  extraContext.push(`\n## Top 15 Conteúdos por Engajamento`);
  for (const c of allContent.slice(0, 15)) {
    const stats = [];
    if (c.views) stats.push(`${c.views.toLocaleString("pt-BR")} views`);
    if (c.likes) stats.push(`${c.likes.toLocaleString("pt-BR")} curtidas`);
    if (c.comments) stats.push(`${c.comments.toLocaleString("pt-BR")} comentários`);
    extraContext.push(
      `- [${c.platform}] "${c.title ?? "Sem título"}" (${c.type}) — ${stats.join(", ")}${c.date ? ` — ${c.date}` : ""}${c.url ? ` — ${c.url}` : ""}`
    );
  }

  // Audience details
  if (audience) {
    extraContext.push(`\n## Audiência Detalhada`);
    if (audience.topCountries) {
      extraContext.push(`### Países (por views)`);
      for (const [country, views] of Object.entries(audience.topCountries)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)) {
        extraContext.push(`- ${country}: ${views.toLocaleString("pt-BR")} views`);
      }
    }
    if (audience.topCities) {
      extraContext.push(`### Fontes de Tráfego`);
      const trafficLabels: Record<string, string> = {
        SHORTS: "YouTube Shorts",
        YT_SEARCH: "Busca no YouTube",
        SUBSCRIBER: "Inscritos",
        YT_CHANNEL: "Página do canal",
        EXT_URL: "Links externos",
        PLAYLIST: "Playlists",
        BROWSE_FEATURES: "Explorar",
        NOTIFICATION: "Notificações",
      };
      for (const [source, views] of Object.entries(audience.topCities)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)) {
        extraContext.push(
          `- ${trafficLabels[source] ?? source}: ${(views as number).toLocaleString("pt-BR")} views`
        );
      }
    }
  }

  const fullSystemPrompt = systemPrompt + "\n\n" + extraContext.join("\n");

  const messages = chatHistory.reverse().map((m) => ({
    role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));

  return { fullSystemPrompt, messages };
}

// ── POST handler with streaming ──

export async function POST(req: Request) {
  const { content, sessionId } = (await req.json()) as {
    content: string;
    sessionId: string;
  };

  if (!content || !sessionId) {
    return Response.json({ error: "Missing content or sessionId" }, { status: 400 });
  }

  // Check for special modes
  const command = parseCommand(content);
  const recentMessages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const reversed = recentMessages.reverse();
  const activeMode = getActiveMode(reversed);
  const effectiveMode = command.type !== "regular" ? command.type : activeMode;

  // Special modes use non-streaming (they parse structured JSON from response)
  if (effectiveMode === "artist-preferences" || effectiveMode === "production-artist") {
    const result =
      effectiveMode === "artist-preferences"
        ? await handleArtistPreferences(content, reversed, sessionId)
        : await handleProductionArtist(content, reversed, sessionId);

    return Response.json(result);
  }

  // Auto-generate session title from first user message
  if (reversed.length === 0) {
    const title =
      content.length > 50 ? content.slice(0, 50) + "..." : content;
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { title },
    });
  }

  // Save user message + build context in parallel
  const [, context] = await Promise.all([
    prisma.chatMessage.create({
      data: {
        artistId: ARTIST_ID,
        sessionId,
        role: "USER",
        content,
      },
    }),
    buildChatContext(sessionId),
  ]);

  // Stream the OpenAI response
  const stream = await openai.responses.create({
    model: "gpt-5.4-mini",
    instructions: context.fullSystemPrompt,
    input: [
      ...context.messages,
      { role: "user" as const, content },
    ],
    tools: [
      {
        type: "web_search_preview",
        search_context_size: "medium",
      },
    ],
    stream: true,
  });

  // Create a TransformStream to convert OpenAI events to SSE
  const encoder = new TextEncoder();
  let fullContent = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "response.output_text.delta") {
            const delta = (event as { delta?: string }).delta ?? "";
            fullContent += delta;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "delta", content: delta })}\n\n`)
            );
          } else if (event.type === "response.completed") {
            // Save assistant message to DB
            const assistantMessage = await prisma.chatMessage.create({
              data: {
                artistId: ARTIST_ID,
                sessionId,
                role: "ASSISTANT",
                content: fullContent,
              },
            });

            // Touch session updatedAt
            await prisma.chatSession.update({
              where: { id: sessionId },
              data: { updatedAt: new Date() },
            });

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "done", message: assistantMessage })}\n\n`
              )
            );
            controller.close();
          }
        }
      } catch (error) {
        console.error("Stream error:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: "Erro ao gerar resposta" })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
