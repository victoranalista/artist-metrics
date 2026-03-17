"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Youtube,
  Instagram,
  Music2,
  Unplug,
  RefreshCw,
  Loader2,
  Link2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { disconnectPlatform, collectAllMetrics } from "@/lib/actions";
import { platformNames } from "@/lib/utils";

interface Connection {
  id: string;
  platform: string;
  displayName: string | null;
  status: string;
  connectedAt: Date | string;
  metadata: unknown;
}

interface ConnectionsClientProps {
  connections: Connection[];
}

const PLATFORMS = [
  {
    key: "YOUTUBE",
    label: "YouTube",
    icon: Youtube,
    color: "bg-red-500/20",
    iconColor: "text-red-400",
    authUrl: "/api/auth/youtube",
  },
  {
    key: "INSTAGRAM",
    label: "Instagram",
    icon: Instagram,
    color: "bg-pink-500/20",
    iconColor: "text-pink-400",
    authUrl: "/api/auth/instagram",
  },
  {
    key: "SPOTIFY",
    label: "Spotify",
    icon: Music2,
    color: "bg-green-500/20",
    iconColor: "text-green-400",
    authUrl: "/api/auth/spotify",
  },
] as const;

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge className="border-green-500/30 bg-green-500/20 text-green-400">
          <CheckCircle2 className="mr-1 size-3" />
          Ativo
        </Badge>
      );
    case "ERROR":
      return (
        <Badge className="border-red-500/30 bg-red-500/20 text-red-400">
          <XCircle className="mr-1 size-3" />
          Erro
        </Badge>
      );
    case "EXPIRED":
      return (
        <Badge className="border-yellow-500/30 bg-yellow-500/20 text-yellow-400">
          <AlertTriangle className="mr-1 size-3" />
          Expirado
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">{status}</Badge>
      );
  }
}

export function ConnectionsClient({ connections }: ConnectionsClientProps) {
  const searchParams = useSearchParams();
  const [isCollecting, startCollecting] = useTransition();
  const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null);
  const [isDisconnecting, startDisconnecting] = useTransition();

  // Handle URL search params for success/error toasts
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected) {
      const name = platformNames[connected.toUpperCase()] ?? connected;
      toast.success(`${name} conectado com sucesso!`);
    }
    if (error) {
      const parts = error.split("_");
      const platform = platformNames[parts[0]?.toUpperCase() ?? ""] ?? parts[0];
      toast.error(`Erro ao conectar ${platform}: ${parts.slice(1).join(" ")}`);
    }
  }, [searchParams]);

  function handleCollect() {
    startCollecting(async () => {
      try {
        const result = await collectAllMetrics();
        if ("error" in result) {
          toast.error(result.error as string);
          return;
        }
        if (result.results) {
          for (const r of result.results) {
            const name = platformNames[r.platform] ?? r.platform;
            if (r.status === "success") {
              toast.success(`${name}: ${r.message}`);
            } else {
              toast.error(`${name}: ${r.message}`);
            }
          }
        }
      } catch {
        toast.error("Erro ao coletar metricas");
      }
    });
  }

  function handleDisconnect(platform: string) {
    startDisconnecting(async () => {
      try {
        await disconnectPlatform(platform);
        toast.success(
          `${platformNames[platform] ?? platform} desconectado com sucesso`
        );
        setDisconnectTarget(null);
        // Page will revalidate via the server action
      } catch {
        toast.error("Erro ao desconectar plataforma");
      }
    });
  }

  const connectionMap = new Map(
    connections.map((c) => [c.platform, c])
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/20">
            <Link2 className="size-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">
              Conexoes
            </h1>
            <p className="text-sm text-zinc-400">
              Gerencie suas plataformas conectadas
            </p>
          </div>
        </div>

        <Button
          onClick={handleCollect}
          disabled={isCollecting}
          className="bg-violet-600 text-white hover:bg-violet-500"
        >
          {isCollecting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 size-4" />
          )}
          Atualizar Metricas
        </Button>
      </div>

      <Separator className="bg-zinc-800" />

      {/* Platform cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLATFORMS.map((platform, index) => {
          const connection = connectionMap.get(platform.key);
          const isConnected = !!connection;
          const Icon = platform.icon;

          return (
            <motion.div
              key={platform.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="border-zinc-800 bg-zinc-900">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex size-10 items-center justify-center rounded-xl ${platform.color}`}
                      >
                        <Icon className={`size-5 ${platform.iconColor}`} />
                      </div>
                      <div>
                        <CardTitle>{platform.label}</CardTitle>
                        {isConnected && connection.displayName && (
                          <CardDescription>
                            {connection.displayName}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    {isConnected && <StatusBadge status={connection.status} />}
                  </div>
                </CardHeader>

                <CardContent>
                  {isConnected ? (
                    <div className="space-y-3">
                      <p className="text-xs text-zinc-500">
                        Conectado em{" "}
                        {new Date(connection.connectedAt).toLocaleDateString(
                          "pt-BR",
                          {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          }
                        )}
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => setDisconnectTarget(platform.key)}
                      >
                        <Unplug className="mr-2 size-4" />
                        Desconectar
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-zinc-500">Nao conectado</p>
                      <a
                        href={platform.authUrl}
                        className="inline-flex h-7 w-full items-center justify-center gap-1 rounded-lg bg-violet-600 px-2.5 text-sm font-medium text-white hover:bg-violet-500"
                      >
                        <Link2 className="mr-2 size-4" />
                        Conectar {platform.label}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Disconnect confirmation dialog */}
      <Dialog
        open={!!disconnectTarget}
        onOpenChange={(open) => {
          if (!open) setDisconnectTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desconectar plataforma</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja desconectar{" "}
              {platformNames[disconnectTarget ?? ""] ?? disconnectTarget}? Voce
              precisara reconectar para continuar coletando metricas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDisconnectTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => disconnectTarget && handleDisconnect(disconnectTarget)}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Unplug className="mr-2 size-4" />
              )}
              Desconectar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
