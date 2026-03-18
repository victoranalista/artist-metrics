import type { Artist, MetricsSnapshot } from "@prisma/client";
import type { AudienceData, ContentItem } from "@/lib/platforms/types";

interface MetricsSummary {
  platform: string;
  followers: number | null;
  totalViews: number | null;
  engagementRate: number | null;
  totalLikes: number | null;
  totalComments: number | null;
}

export function buildSystemPrompt(
  artist: Artist,
  metrics: MetricsSummary[],
  content: ContentItem[],
  audience: AudienceData | null
): string {
  const sections: string[] = [];

  // Base instructions
  sections.push(`Voce e o assistente pessoal de marketing musical do artista. Voce e como um parceiro de confianca que entende de musica, redes sociais e crescimento de carreira. Sempre responda em Portugues (PT-BR).

## Sua personalidade
- Fale de forma natural, calorosa e motivadora, como um amigo que entende do assunto
- Use uma linguagem acessivel e descontraida, sem ser excessivamente formal ou robotico
- Comemore as conquistas do artista, por menores que sejam
- Quando der feedback construtivo, seja gentil mas honesto
- Use emojis com moderacao para deixar a conversa mais leve (1-3 por mensagem no maximo)
- Chame o artista pelo nome quando possivel
- Evite listas enormes e blocos de texto - prefira respostas conversacionais e organizadas
- Quando fizer analises, destaque o que esta indo bem ANTES de apontar melhorias

## Seu papel
- Analisar metricas de plataformas digitais (YouTube, Instagram, Spotify)
- Identificar tendencias e padroes nos dados de forma simples e clara
- Sugerir estrategias de conteudo e crescimento com exemplos praticos
- Dar recomendacoes especificas que o artista consiga aplicar HOJE
- Motivar e inspirar, mostrando que o crescimento e possivel
- Pesquisar na internet sobre o artista, concorrentes e tendencias

## Busca na web
Voce tem acesso a busca na web. USE SEMPRE que precisar para trazer dados reais:
- Dados atuais sobre o artista (seguidores, views, streams, playlists)
- Cenario musical do artista (genero, nicho, concorrentes)
- Noticias, entrevistas, colaboracoes
- Tendencias de marketing musical e redes sociais
- Benchmarks de artistas similares
- Playlists do Spotify, rankings e posicionamento

IMPORTANTE: Quando perguntarem sobre um artista, SEMPRE pesquise na web e traga dados reais. Nunca diga que nao pode pesquisar. Traga numeros concretos e fontes.

## Formato das respostas
- Seja conciso mas completo - ninguem quer ler um textao
- Use paragrafos curtos e quebre o texto visualmente
- Destaque numeros importantes em negrito
- Quando listar acoes, limite a 3-5 itens prioritarios
- Termine com uma pergunta ou proximo passo claro para manter o dialogo fluindo`);

  // Artist profile
  sections.push(`## Perfil do Artista
- Nome: ${artist.name}
- Estilo: ${artist.style ?? "Nao definido"}
- Objetivos: ${artist.goals ?? "Nao definidos"}
- Bio: ${artist.bio ?? "Nao disponivel"}`);

  // Metrics per platform
  if (metrics.length > 0) {
    const metricsLines = metrics.map((m) => {
      const parts = [`### ${m.platform}`];
      if (m.followers != null) parts.push(`- Seguidores: ${m.followers.toLocaleString("pt-BR")}`);
      if (m.totalViews != null) parts.push(`- Visualizacoes totais: ${m.totalViews.toLocaleString("pt-BR")}`);
      if (m.engagementRate != null) parts.push(`- Taxa de engajamento: ${(m.engagementRate * 100).toFixed(2)}%`);
      if (m.totalLikes != null) parts.push(`- Total de likes: ${m.totalLikes.toLocaleString("pt-BR")}`);
      if (m.totalComments != null) parts.push(`- Total de comentarios: ${m.totalComments.toLocaleString("pt-BR")}`);
      return parts.join("\n");
    });

    sections.push(`## Metricas Atuais\n${metricsLines.join("\n\n")}`);
  }

  // Content performance
  if (content.length > 0) {
    const topContent = content
      .filter((c) => c.views != null || c.likes != null)
      .sort((a, b) => (b.views ?? b.likes ?? 0) - (a.views ?? a.likes ?? 0))
      .slice(0, 10);

    if (topContent.length > 0) {
      const contentLines = topContent.map((c, i) => {
        const stats = [];
        if (c.views != null) stats.push(`${c.views.toLocaleString("pt-BR")} views`);
        if (c.likes != null) stats.push(`${c.likes.toLocaleString("pt-BR")} likes`);
        if (c.comments != null) stats.push(`${c.comments.toLocaleString("pt-BR")} comments`);
        return `${i + 1}. "${c.title ?? "Sem titulo"}" (${c.contentType}) - ${stats.join(", ")}`;
      });

      sections.push(`## Top Conteudos Recentes\n${contentLines.join("\n")}`);
    }
  }

  // Audience demographics
  if (audience) {
    const audienceLines: string[] = [];

    if (audience.topCountries) {
      const countries = Object.entries(audience.topCountries)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([country, count]) => `  - ${country}: ${count}`)
        .join("\n");
      audienceLines.push(`- Paises:\n${countries}`);
    }

    if (audience.genderSplit) {
      const genders = Object.entries(audience.genderSplit)
        .map(([gender, count]) => `  - ${gender}: ${count}`)
        .join("\n");
      audienceLines.push(`- Genero:\n${genders}`);
    }

    if (audience.ageRanges) {
      const ages = Object.entries(audience.ageRanges)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([range, count]) => `  - ${range}: ${count}`)
        .join("\n");
      audienceLines.push(`- Faixas etarias:\n${ages}`);
    }

    if (audienceLines.length > 0) {
      sections.push(`## Demografia do Publico\n${audienceLines.join("\n")}`);
    }
  }

  return sections.join("\n\n");
}

export function buildMetricsSummaryFromSnapshots(
  snapshots: MetricsSnapshot[]
): MetricsSummary[] {
  return snapshots.map((s) => ({
    platform: s.platform,
    followers: s.followers,
    totalViews: s.totalViews,
    engagementRate: s.engagementRate,
    totalLikes: s.totalLikes,
    totalComments: s.totalComments,
  }));
}
