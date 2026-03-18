import { getChatSessions, getChatSessionMessages } from "@/lib/actions";
import { ChatClient } from "../chat-client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ChatSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const [sessions, messages] = await Promise.all([
    getChatSessions(),
    getChatSessionMessages(sessionId),
  ]);

  // If session doesn't exist (no messages and not in sessions list), redirect
  if (messages.length === 0 && !sessions.some((s) => s.id === sessionId)) {
    redirect("/chat");
  }

  return (
    <ChatClient
      sessions={sessions}
      currentSessionId={sessionId}
      initialMessages={messages}
    />
  );
}
