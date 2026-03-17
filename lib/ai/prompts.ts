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
  sections.push(`Voce e um consultor de marketing musical especializado em ajudar artistas independentes a crescerem suas carreiras. Voce da conselhos praticos, baseados em dados, e sempre responde em Portugues (PT-BR).

Seu papel:
- Analisar metricas de plataformas digitais (YouTube, Instagram, Spotify)
- Identificar tendencias e padroes nos dados
- Sugerir estrategias de conteudo e crescimento
- Dar recomendacoes especificas e acionaveis
- Ser direto e pratico nas respostas

Sempre base suas recomendacoes nos dados reais do artista quando disponiveis.`);

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
