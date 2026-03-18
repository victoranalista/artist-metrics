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
  Search,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  disconnectPlatform,
  collectAllMetrics,
  connectByProfile,
} from "@/lib/actions";
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
    placeholder: "Cole a URL do canal, @handle ou ID (ex: @MeuCanal)",
  },
  {
    key: "INSTAGRAM",
    label: "Instagram",
    icon: Instagram,
    color: "bg-pink-500/20",
    iconColor: "text-pink-400",
    authUrl: "/api/auth/instagram",
    placeholder: "Nome de usuario do Instagram",
  },
  {
    key: "SPOTIFY",
    label: "Spotify",
    icon: Music2,
    color: "bg-green-500/20",
    iconColor: "text-green-400",
    authUrl: "/api/auth/spotify",
    placeholder: "Cole o link do Spotify ou nome do artista",
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
      return <Badge variant="secondary">{status}</Badge>;
  }
}

interface ProfileResult {
  success?: boolean;
  error?: string;
  name?: string;
  followers?: number | null;
  [key: string]: unknown;
}

export function ConnectionsClient({ connections }: ConnectionsClientProps) {
  const searchParams = useSearchParams();
  const [isCollecting, startCollecting] = useTransition();
  const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null);
  const [isDisconnecting, startDisconnecting] = useTransition();

  // Profile connection state per platform
  const [profileInputs, setProfileInputs] = useState<Record<string, string>>(
    {}
  );
  const [profileLoading, setProfileLoading] = useState<Record<string, boolean>>(
    {}
  );
  const [profileResults, setProfileResults] = useState<
    Record<string, ProfileResult>
  >({});
  const [showOAuth, setShowOAuth] = useState<Record<string, boolean>>({});

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
      const platform =
        platformNames[parts[0]?.toUpperCase() ?? ""] ?? parts[0];
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
        // Clear profile result for this platform
        setProfileResults((prev) => {
          const next = { ...prev };
          delete next[platform];
          return next;
        });
      } catch {
        toast.error("Erro ao desconectar plataforma");
      }
    });
  }

  async function handleProfileConnect(platformKey: string) {
    const input = profileInputs[platformKey]?.trim();
    if (!input) {
      toast.error("Digite a URL ou nome do perfil.");
      return;
    }

    setProfileLoading((prev) => ({ ...prev, [platformKey]: true }));
    setProfileResults((prev) => {
      const next = { ...prev };
      delete next[platformKey];
      return next;
    });

    try {
      const result = await connectByProfile(platformKey, input);
      setProfileResults((prev) => ({ ...prev, [platformKey]: result }));

      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        toast.success(
          `${result.name ?? platformNames[platformKey]} conectado com sucesso!`
        );
      }
    } catch {
      toast.error("Erro ao buscar dados do perfil.");
    } finally {
      setProfileLoading((prev) => ({ ...prev, [platformKey]: false }));
    }
  }

  function formatNumber(n: number | null | undefined): string {
    if (n == null) return "N/A";
    return n.toLocaleString("pt-BR");
  }

  const connectionMap = new Map(connections.map((c) => [c.platform, c]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/20">
            <Link2 className="size-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">Conexoes</h1>
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
          const isLoading = profileLoading[platform.key] ?? false;
          const result = profileResults[platform.key];

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
                    <div className="space-y-4">
                      {/* Profile Connection - Primary */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                          <User className="size-3.5" />
                          Conectar por Perfil
                        </div>
                        <p className="text-xs text-zinc-500">
                          Cole a URL ou digite o nome do perfil para buscar
                          dados publicos.
                        </p>
                        <div className="flex gap-2">
                          <Input
                            placeholder={platform.placeholder}
                            value={profileInputs[platform.key] ?? ""}
                            onChange={(e) =>
                              setProfileInputs((prev) => ({
                                ...prev,
                                [platform.key]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !isLoading) {
                                handleProfileConnect(platform.key);
                              }
                            }}
                            disabled={isLoading}
                            className="flex-1 border-zinc-700 bg-zinc-800/50 text-zinc-200 placeholder:text-zinc-600"
                          />
                          <Button
                            onClick={() => handleProfileConnect(platform.key)}
                            disabled={isLoading}
                            size="sm"
                            className="shrink-0 bg-violet-600 text-white hover:bg-violet-500"
                          >
                            {isLoading ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Search className="size-4" />
                            )}
                          </Button>
                        </div>

                        {/* Result feedback */}
                        {result && (
                          <div
                            className={`rounded-lg p-3 text-xs ${
                              result.error
                                ? "border border-red-500/20 bg-red-500/10 text-red-300"
                                : "border border-green-500/20 bg-green-500/10 text-green-300"
                            }`}
                          >
                            {result.error ? (
                              <div className="flex items-start gap-2">
                                <XCircle className="mt-0.5 size-3.5 shrink-0" />
                                <span>{result.error}</span>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                                <div>
                                  <p className="font-medium">
                                    {result.name} conectado!
                                  </p>
                                  {result.followers != null && (
                                    <p className="mt-0.5 text-green-400/80">
                                      {formatNumber(
                                        result.followers as number | null
                                      )}{" "}
                                      seguidores
                                    </p>
                                  )}
                                  {result.totalViews != null && (
                                    <p className="text-green-400/80">
                                      {formatNumber(
                                        result.totalViews as number | null
                                      )}{" "}
                                      visualizacoes
                                    </p>
                                  )}
                                  {result.popularity != null && (
                                    <p className="text-green-400/80">
                                      Popularidade:{" "}
                                      {result.popularity as number}/100
                                    </p>
                                  )}
                                  {Array.isArray(result.genres) &&
                                    result.genres.length > 0 && (
                                      <p className="text-green-400/80">
                                        Generos:{" "}
                                        {(result.genres as string[]).join(", ")}
                                      </p>
                                    )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <Separator className="bg-zinc-800" />

                      {/* OAuth Connection - Secondary */}
                      <div className="space-y-2">
                        <button
                          onClick={() =>
                            setShowOAuth((prev) => ({
                              ...prev,
                              [platform.key]: !prev[platform.key],
                            }))
                          }
                          className="flex w-full items-center justify-between text-xs text-zinc-500 hover:text-zinc-400"
                        >
                          <span>Conexao Avancada (OAuth)</span>
                          <span>{showOAuth[platform.key] ? "-" : "+"}</span>
                        </button>

                        {showOAuth[platform.key] && (
                          <div className="space-y-2">
                            <p className="text-xs text-zinc-600">
                              Acesso completo via autorizacao OAuth. Necessario
                              para metricas detalhadas e dados privados.
                            </p>
                            <a
                              href={platform.authUrl}
                              className="inline-flex h-7 w-full items-center justify-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-zinc-200"
                            >
                              <Link2 className="mr-2 size-4" />
                              Conectar via OAuth
                            </a>
                          </div>
                        )}
                      </div>
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
              onClick={() =>
                disconnectTarget && handleDisconnect(disconnectTarget)
              }
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
