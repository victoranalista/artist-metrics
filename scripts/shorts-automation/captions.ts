import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateShortCaption(originalCaption: string): Promise<string> {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.9,
    max_tokens: 100,
    messages: [
      {
        role: "system",
        content: `Voce e um especialista em YouTube Shorts virais do nicho gospel/musica crista.
Crie uma legenda curta e impactante para um Short de uma cantora gospel cantando.
REGRAS OBRIGATORIAS:
- Maximo 100 caracteres TOTAL (legenda + hashtags)
- Exatamente 3 hashtags virais do nicho gospel
- Legenda emocional e que gere engajamento
- Use emojis com moderacao (max 1-2)
- Hashtags populares: #gospel #adoracao #louvor #musicagospel #jesuscristo #deusefiel #shorts
- Responda APENAS a legenda final, nada mais`,
      },
      {
        role: "user",
        content: `Legenda original do Instagram: "${originalCaption || "Louvor gospel emocionante"}"
Crie a legenda para YouTube Shorts (max 100 chars total):`,
      },
    ],
  });

  let caption = res.choices[0]?.message?.content?.trim() || "";

  // Ensure max 100 chars
  if (caption.length > 100) {
    // Try to cut at last space before 100
    const cut = caption.lastIndexOf(" ", 97);
    caption = caption.substring(0, cut > 50 ? cut : 97) + "...";
  }

  // Ensure it has hashtags
  if (!caption.includes("#")) {
    const hashtags = " #gospel #louvor #shorts";
    const maxCaption = 100 - hashtags.length;
    if (caption.length > maxCaption) {
      caption = caption.substring(0, maxCaption - 3) + "...";
    }
    caption += hashtags;
  }

  return caption.substring(0, 100);
}

export async function generateBatchCaptions(
  reels: { id: string; caption: string }[],
): Promise<Map<string, string>> {
  const captions = new Map<string, string>();

  for (const reel of reels) {
    try {
      const caption = await generateShortCaption(reel.caption);
      captions.set(reel.id, caption);
      console.log(`Caption [${reel.id}]: ${caption} (${caption.length} chars)`);
    } catch (err) {
      console.error(`Failed caption for ${reel.id}:`, err);
      const fallback = `${reel.caption.substring(0, 70)} #gospel #louvor #shorts`;
      captions.set(reel.id, fallback.substring(0, 100));
    }
  }

  return captions;
}
