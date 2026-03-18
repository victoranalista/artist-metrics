"use client";

import Link from "next/link";
import { Youtube, Instagram, Music2, LinkIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { MotionStagger, MotionItem } from "@/components/ui/motion-section";

interface PlatformData {
  platform: string;
  followers: number;
  views: number;
  engagement: number;
  connected: boolean;
}

interface PlatformComparisonProps {
  data: PlatformData[];
}

const platformIcons: Record<string, typeof Youtube> = {
  YOUTUBE: Youtube,
  INSTAGRAM: Instagram,
  SPOTIFY: Music2,
};

const platformNames: Record<string, string> = {
  YOUTUBE: "YouTube",
  INSTAGRAM: "Instagram",
  SPOTIFY: "Spotify",
};

function ProgressBar({ value, max }: { value: number; max: number }) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
      <div
        className="h-full rounded-full bg-zinc-500 transition-all duration-700 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function PlatformComparison({ data }: PlatformComparisonProps) {
  const maxFollowers = Math.max(...data.map((d) => d.followers), 1);
  const maxViews = Math.max(...data.map((d) => d.views), 1);

  // Ensure all 3 platforms are represented
  const allPlatforms = ["YOUTUBE", "INSTAGRAM", "SPOTIFY"];
  const platformMap = new Map(data.map((d) => [d.platform, d]));
  const platforms = allPlatforms.map(
    (p) =>
      platformMap.get(p) || {
        platform: p,
        followers: 0,
        views: 0,
        engagement: 0,
        connected: false,
      }
  );

  return (
    <MotionStagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {platforms.map((platform) => {
        const Icon = platformIcons[platform.platform] || Music2;
        const name = platformNames[platform.platform] || platform.platform;

        return (
          <MotionItem key={platform.platform}>
            <Card className="border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700">
              <CardContent className="pt-0">
                {/* Platform header */}
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-800">
                    <Icon className="size-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{name}</p>
                    <p className="text-xs text-zinc-500">
                      {platform.connected ? "Conectado" : "Não conectado"}
                    </p>
                  </div>
                </div>

                {platform.connected ? (
                  <div className="mt-5 space-y-4">
                    {/* Followers */}
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Seguidores</span>
                        <span className="text-xs font-medium text-zinc-200">
                          {formatNumber(platform.followers)}
                        </span>
                      </div>
                      <ProgressBar
                        value={platform.followers}
                        max={maxFollowers}
                      />
                    </div>

                    {/* Views */}
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs text-zinc-400">
                          Visualizações
                        </span>
                        <span className="text-xs font-medium text-zinc-200">
                          {formatNumber(platform.views)}
                        </span>
                      </div>
                      <ProgressBar value={platform.views} max={maxViews} />
                    </div>

                    {/* Engagement */}
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Engajamento</span>
                        <span className="text-xs font-medium text-zinc-200">
                          {platform.engagement.toFixed(1)}%
                        </span>
                      </div>
                      <ProgressBar value={platform.engagement} max={100} />
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 flex flex-col items-center rounded-lg border border-dashed border-zinc-800 py-6">
                    <LinkIcon className="size-4 text-zinc-600" />
                    <p className="mt-2 text-xs text-zinc-500">Não conectado</p>
                    <Link
                      href="/connections"
                      className="mt-3 inline-flex h-7 items-center justify-center rounded-md border border-zinc-800 bg-transparent px-3 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
                    >
                      Conectar
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </MotionItem>
        );
      })}
    </MotionStagger>
  );
}
