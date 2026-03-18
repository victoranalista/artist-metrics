import type { ChatMessage } from "@prisma/client";

export type ChatCommand =
  | { type: "regular"; content: string }
  | { type: "artist-preferences"; content: string }
  | { type: "production-artist"; content: string };

export type ChatMode = "artist-preferences" | "production-artist" | null;

export function parseCommand(message: string): ChatCommand {
  const trimmed = message.trim();

  if (trimmed.startsWith("/artist-preferences")) {
    return {
      type: "artist-preferences",
      content: trimmed.replace(/^\/artist-preferences\s*/, "").trim(),
    };
  }

  if (trimmed.startsWith("/production-artist")) {
    return {
      type: "production-artist",
      content: trimmed.replace(/^\/production-artist\s*/, "").trim(),
    };
  }

  return { type: "regular", content: trimmed };
}

export function getActiveMode(recentMessages: ChatMessage[]): ChatMode {
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const meta = recentMessages[i].metadata as Record<string, unknown> | null;
    if (!meta?.mode) continue;

    if (meta.status === "completed") return null;
    if (meta.mode === "artist-preferences" || meta.mode === "production-artist") {
      return meta.mode as ChatMode;
    }
  }
  return null;
}
