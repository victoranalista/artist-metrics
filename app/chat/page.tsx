import { getChatHistory } from "@/lib/actions";
import { ChatClient } from "./chat-client";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const messages = await getChatHistory();

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(/artist/singing.webp)" }} />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />
        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <h1 className="text-xl font-bold text-white sm:text-2xl">Sua Equipe de Marketing</h1>
          <p className="mt-1 max-w-md text-sm text-zinc-400">Analises e estrategias personalizadas para sua carreira</p>
        </div>
      </div>
      <ChatClient initialMessages={messages} />
    </>
  );
}
