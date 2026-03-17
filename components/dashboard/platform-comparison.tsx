"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Youtube, Instagram, Music2, LinkIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  formatNumber,
  platformColors,
  platformNames,
} from "@/lib/utils";

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

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

function ProgressBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
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
    <motion.div
      className="grid grid-cols-1 gap-4 md:grid-cols-3"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {platforms.map((platform) => {
        const Icon = platformIcons[platform.platform] || Music2;
        const color = platformColors[platform.platform] || "#8b5cf6";
        const name = platformNames[platform.platform] || platform.platform;

        return (
          <motion.div key={platform.platform} variants={item}>
            <Card className="border-white/5 bg-zinc-900/60 backdrop-blur-sm">
              <CardContent className="pt-0">
                {/* Platform header */}
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <Icon
                      className="size-5"
                      style={{ color }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{name}</p>
                    <p className="text-xs text-zinc-500">
                      {platform.connected ? "Conectado" : "Nao conectado"}
                    </p>
                  </div>
                </div>

                {platform.connected ? (
                  <div className="mt-5 space-y-4">
                    {/* Followers */}
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs text-zinc-400">
                          Seguidores
                        </span>
                        <span className="text-xs font-medium text-zinc-200">
                          {formatNumber(platform.followers)}
                        </span>
                      </div>
                      <ProgressBar
                        value={platform.followers}
                        max={maxFollowers}
                        color={color}
                      />
                    </div>

                    {/* Views */}
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs text-zinc-400">
                          Visualizacoes
                        </span>
                        <span className="text-xs font-medium text-zinc-200">
                          {formatNumber(platform.views)}
                        </span>
                      </div>
                      <ProgressBar
                        value={platform.views}
                        max={maxViews}
                        color={color}
                      />
                    </div>

                    {/* Engagement */}
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs text-zinc-400">
                          Engajamento
                        </span>
                        <span className="text-xs font-medium text-zinc-200">
                          {platform.engagement.toFixed(1)}%
                        </span>
                      </div>
                      <ProgressBar
                        value={platform.engagement}
                        max={100}
                        color={color}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 flex flex-col items-center rounded-lg border border-dashed border-zinc-700 py-6">
                    <LinkIcon className="size-5 text-zinc-600" />
                    <p className="mt-2 text-xs text-zinc-500">
                      Nao conectado
                    </p>
                    <Link
                      href="/connections"
                      className="mt-3 inline-flex h-7 items-center justify-center gap-1 rounded-lg border border-zinc-700 bg-transparent px-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                    >
                      Conectar
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
