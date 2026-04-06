import { ShortsClient } from "./shorts-client";

export const dynamic = "force-dynamic";

export default function ShortsPage() {
  return (
    <>
      <div className="mb-8 sm:mb-12">
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-12">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              SHORTS
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
              YouTube Shorts
            </h1>
            <p className="max-w-md text-base leading-relaxed text-zinc-400">
              Agende automaticamente os Reels do Instagram como YouTube Shorts.
              3 por dia nos horários 12h, 18h e 21h.
            </p>
          </div>
          <div className="relative overflow-hidden rounded-xl">
            <img
              src="/artist/studio.webp"
              alt="Debora Kailany"
              className="h-[200px] w-full object-cover sm:h-[280px] md:h-[350px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 to-transparent" />
          </div>
        </div>
      </div>
      <ShortsClient />
    </>
  );
}
