import { prisma, ARTIST_ID } from "@/lib/db";
import { openai } from "@/lib/ai/client";
import { buildPreferencesPrompt } from "@/lib/ai/prompts-preferences";
import type { ChatMessage } from "@prisma/client";

const COMPLETION_REGEX = /\[PREFERENCES_COMPLETE\]\s*([\s\S]*?)\s*\[\/PREFERENCES_COMPLETE\]/;

export async function handleArtistPreferences(
  content: string,
  recentMessages: ChatMessage[]
) {
  // Save user message with mode metadata
  await prisma.chatMessage.create({
    data: {
      artistId: ARTIST_ID,
      role: "USER",
      content,
      metadata: { mode: "artist-preferences" },
    },
  });

  // Load artist data
  const artist = await prisma.artist.findUniqueOrThrow({
    where: { id: ARTIST_ID },
  });

  // Build specialized prompt
  const systemPrompt = buildPreferencesPrompt(artist);

  // Filter to only preference-mode messages for focused context
  const preferenceMessages = recentMessages
    .filter((m) => {
      const meta = m.metadata as Record<string, unknown> | null;
      return meta?.mode === "artist-preferences";
    });

  // Add the current message
  const allMessages = [
    ...preferenceMessages.map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    })),
    { role: "user" as const, content },
  ];

  // Call OpenAI
  const response = await openai.responses.create({
    model: "gpt-5.4-mini",
    instructions: systemPrompt,
    input: allMessages,
    tools: [
      {
        type: "web_search_preview",
        search_context_size: "medium",
      },
    ],
  });

  let displayContent = response.output_text;
  let messageMetadata: { mode: string; status: string } = {
    mode: "artist-preferences",
    status: "active",
  };

  // Check if AI signaled completion
  const match = displayContent.match(COMPLETION_REGEX);
  if (match) {
    try {
      const preferencesJson = JSON.parse(match[1]);

      // Save preferences to Artist
      await prisma.artist.update({
        where: { id: ARTIST_ID },
        data: { preferences: preferencesJson },
      });

      // Strip markers from displayed content
      displayContent = displayContent.replace(COMPLETION_REGEX, "").trim();
      messageMetadata = { mode: "artist-preferences", status: "completed" };
    } catch {
      // If JSON parsing fails, keep as active and let conversation continue
      displayContent = displayContent.replace(COMPLETION_REGEX, "").trim();
      displayContent +=
        "\n\n*Tive um problema ao salvar as preferencias. Pode confirmar novamente?*";
    }
  }

  // Save assistant message
  const assistantMessage = await prisma.chatMessage.create({
    data: {
      artistId: ARTIST_ID,
      role: "ASSISTANT",
      content: displayContent,
      metadata: messageMetadata,
    },
  });

  return assistantMessage;
}
