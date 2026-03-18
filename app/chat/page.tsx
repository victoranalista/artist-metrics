import { getChatSessions } from "@/lib/actions";
import { ChatClient } from "./chat-client";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const sessions = await getChatSessions();

  return (
    <ChatClient
      sessions={sessions}
      currentSessionId={null}
      initialMessages={[]}
    />
  );
}
