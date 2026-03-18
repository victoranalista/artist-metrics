import { getChatHistory } from "@/lib/actions";
import { ChatClient } from "./chat-client";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const messages = await getChatHistory();

  return (
    <>
      {/* Hero Section */}
      <div className="mb-8 sm:mb-12">
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-12">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              MARKETING IA
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              Sua equipe de marketing
            </h1>
            <p className="max-w-md text-base leading-relaxed text-zinc-400">
              Sua equipe de marketing dedicada. Análises, estratégias e planos de ação personalizados para sua carreira, Débora.
            </p>
          </div>
          <div className="relative overflow-hidden rounded-xl">
            <img
              src="/artist/singing.webp"
              alt="Debora Kailany"
              className="h-[280px] w-full object-cover sm:h-[350px] md:h-[400px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 to-transparent" />
          </div>
        </div>
      </div>
      <ChatClient initialMessages={messages} />
    </>
  );
}
