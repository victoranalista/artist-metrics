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
      model: "gpt-5.4-mini",
      instructions:
        "Voce e um diretor de marketing musical experiente liderando uma equipe completa (social media, analista de dados, estrategista de conteudo, especialista em Spotify). Responda SEMPRE em Portugues (PT-BR). USE A BUSCA WEB para encontrar TODOS os dados reais e atualizados sobre o artista em TODAS as plataformas (YouTube, Instagram, Spotify, TikTok). Traga numeros exatos de seguidores, views, streams, playlists. Analise o conteudo postado e identifique padroes do que funciona. Compare com benchmarks de artistas do mesmo porte e nicho. Seja direto e profissional. De um diagnostico completo e um plano de acao concreto com prioridades. Nunca diga que nao pode pesquisar.",
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
