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

    const input = `Analyze this YouTube channel and provide a structured analysis in Portuguese (PT-BR):

Channel: ${channelData.title}
Description: ${channelData.description}
Subscribers: ${channelData.subscriberCount.toLocaleString()}
Total Videos: ${channelData.videoCount}
Total Views: ${channelData.viewCount.toLocaleString()}

${videoList ? `Recent Videos:\n${videoList}` : ""}

Provide your analysis with the following sections:
1. Estilo Musical e Identidade Artistica
2. Perfil do Publico-Alvo
3. Analise de Conteudo (o que funciona e o que nao funciona)
4. Estrategia de Crescimento Recomendada
5. Oportunidades Identificadas
6. Pontos de Atencao`;

    const response = await openai.responses.create({
      model: "gpt-4o",
      instructions:
        "You are a music industry analyst specialized in digital marketing for independent artists. Always respond in Portuguese (PT-BR). Be specific and data-driven in your analysis. Provide actionable insights.",
      input,
    });

    return response.output_text;
  } catch (error) {
    console.error("Artist research failed:", error);
    throw new Error(
      `Failed to research artist: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
