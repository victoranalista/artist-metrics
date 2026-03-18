import { openai } from "./client";

interface ChannelData {
  title: string;
  description: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  recentVideos?: { title: string; views: number; likes: number }[];
}

export async function researchArtist(channelData: ChannelData): Promise<string> {
  try {
    const videoList = channelData.recentVideos
      ?.slice(0, 20)
      .map(
        (v, i) =>
          `${i + 1}. "${v.title}" - ${v.views.toLocaleString()} views, ${v.likes.toLocaleString()} likes`
      )
      .join("\n");

    const input = `Pesquise na internet e analise o canal/artista "${channelData.title}" em detalhes. Use os dados abaixo como base, mas BUSQUE INFORMACOES ADICIONAIS na web sobre este artista (redes sociais, Spotify, noticias, colaboracoes, etc).

Dados do Canal YouTube:
- Canal: ${channelData.title}
- Descricao: ${channelData.description}
- Inscritos: ${channelData.subscriberCount.toLocaleString()}
- Total de Videos: ${channelData.videoCount}
- Total de Views: ${channelData.viewCount.toLocaleString()}

${videoList ? `Videos Recentes:\n${videoList}` : ""}

Faca uma analise COMPLETA com dados reais da internet, incluindo:
1. Estilo Musical e Identidade Artistica (pesquise genero, influencias, nicho)
2. Presenca Digital Completa (YouTube, Instagram, Spotify, TikTok - busque os numeros reais)
3. Perfil do Publico-Alvo (baseado no conteudo e engajamento)
4. Analise de Conteudo (o que funciona, o que pode melhorar)
5. Posicionamento no Mercado (compare com artistas similares do mesmo nicho)
6. Estrategia de Crescimento Recomendada (acoes especificas e praticas)
7. Oportunidades Identificadas (playlists, colaboracoes, tendencias)
8. Pontos de Atencao`;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      instructions:
        "You are a music industry analyst specialized in digital marketing for independent artists. Always respond in Portuguese (PT-BR). Be specific and data-driven. USE THE WEB SEARCH TOOL to find real, current data about the artist across all platforms (YouTube, Instagram, Spotify, TikTok, etc). Bring actual numbers, links, and concrete information. Never say you cannot search - you have web search capabilities.",
      input,
      tools: [
        {
          type: "web_search_preview",
          search_context_size: "high",
        },
      ],
    });

    return response.output_text;
  } catch (error) {
    console.error("Artist research failed:", error);
    throw new Error(
      `Failed to research artist: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
