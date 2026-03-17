import { getChatHistory } from "@/lib/actions";
import { ChatClient } from "./chat-client";

export default async function ChatPage() {
  const messages = await getChatHistory();

  return <ChatClient initialMessages={messages} />;
}
