"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
    authUrl: "/api/auth/youtube",
    placeholder: "Cole a URL do canal, @handle ou ID (ex: @MeuCanal)",
  },
  {
    key: "INSTAGRAM",
    label: "Instagram",
    icon: Instagram,
    authUrl: "/api/auth/instagram",
    placeholder: "Nome de usuario do Instagram",
  },
  {
    key: "SPOTIFY",
    label: "Spotify",
    icon: Music2,
    authUrl: "/api/auth/spotify",
    placeholder: "Cole o link do Spotify ou nome do artista",
  },
] as const;

function StatusIndicator({ status }: { status: string }) {
  switch (status) {
    case "ACTIVE":
      return (
        <span className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Ativo
        </span>
      );
    case "ERROR":
      return (
        <span className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="size-1.5 rounded-full bg-red-500" />
          Erro
        </span>
      );
    case "EXPIRED":
      return (
        <span className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="size-1.5 rounded-full bg-yellow-500" />
          Expirado
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1.5 text-xs text-zinc-500">
          <span className="size-1.5 rounded-full bg-zinc-600" />
          {status}
        </span>
      );
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

  const [profileInputs, setProfileInputs] = useState<Record<string, string>>(
    {}
  );
  const [profileLoading, setProfileLoading] = useState<
    Record<string, boolean>
  >({});
  const [profileResults, setProfileResults] = useState<
    Record<string, ProfileResult>
  >({});
  const [showOAuth, setShowOAuth] = useState<Record<string, boolean>>({});

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

  function fmtNumber(n: number | null | undefined): string {
    if (n == null) return "N/A";
    return n.toLocaleString("pt-BR");
  }

  const connectionMap = new Map(connections.map((c) => [c.platform, c]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Conexoes</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Gerencie suas plataformas conectadas
          </p>
        </div>

        <Button
          onClick={handleCollect}
          disabled={isCollecting}
          className="bg-zinc-100 text-zinc-900 hover:bg-white"
        >
          {isCollecting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 size-4" />
          )}
          Atualizar Metricas
        </Button>
      </div>

      {/* Platform cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const connection = connectionMap.get(platform.key);
          const isConnected = !!connection;
          const Icon = platform.icon;
          const isLoading = profileLoading[platform.key] ?? false;
          const result = profileResults[platform.key];

          return (
            <Card
              key={platform.key}
              className="border-zinc-800 bg-zinc-900"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-800">
                      <Icon className="size-5 text-zinc-400" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium text-white">
                        {platform.label}
                      </CardTitle>
                      {isConnected && connection.displayName && (
                        <CardDescription className="text-zinc-500">
                          {connection.displayName}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  {isConnected && (
                    <StatusIndicator status={connection.status} />
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {isConnected ? (
                  <div className="space-y-3">
                    <p className="text-xs text-zinc-600">
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
                      variant="outline"
                      size="sm"
                      className="w-full border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      onClick={() => setDisconnectTarget(platform.key)}
                    >
                      <Unplug className="mr-2 size-3.5" />
                      Desconectar
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Profile Connection */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                        <User className="size-3" />
                        Conectar por Perfil
                      </div>
                      <p className="text-xs text-zinc-600">
                        Cole a URL ou digite o nome do perfil para buscar dados
                        publicos.
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
                          className="flex-1 border-zinc-800 bg-zinc-800/50 text-zinc-200 placeholder:text-zinc-700"
                        />
                        <Button
                          onClick={() => handleProfileConnect(platform.key)}
                          disabled={isLoading}
                          size="sm"
                          className="shrink-0 bg-zinc-100 text-zinc-900 hover:bg-white"
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
                          className={`rounded-lg border p-3 text-xs ${
                            result.error
                              ? "border-zinc-800 bg-zinc-800/50 text-zinc-400"
                              : "border-zinc-800 bg-zinc-800/50 text-zinc-300"
                          }`}
                        >
                          {result.error ? (
                            <div className="flex items-start gap-2">
                              <XCircle className="mt-0.5 size-3.5 shrink-0 text-red-400" />
                              <span>{result.error}</span>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2">
                              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
                              <div>
                                <p className="font-medium text-white">
                                  {result.name} conectado!
                                </p>
                                {result.followers != null && (
                                  <p className="mt-0.5 text-zinc-400">
                                    {fmtNumber(
                                      result.followers as number | null
                                    )}{" "}
                                    seguidores
                                  </p>
                                )}
                                {result.totalViews != null && (
                                  <p className="text-zinc-400">
                                    {fmtNumber(
                                      result.totalViews as number | null
                                    )}{" "}
                                    visualizacoes
                                  </p>
                                )}
                                {result.popularity != null && (
                                  <p className="text-zinc-400">
                                    Popularidade:{" "}
                                    {result.popularity as number}/100
                                  </p>
                                )}
                                {Array.isArray(result.genres) &&
                                  result.genres.length > 0 && (
                                    <p className="text-zinc-400">
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

                    {/* Separator */}
                    <div className="border-t border-zinc-800" />

                    {/* OAuth Connection */}
                    <div className="space-y-2">
                      <button
                        onClick={() =>
                          setShowOAuth((prev) => ({
                            ...prev,
                            [platform.key]: !prev[platform.key],
                          }))
                        }
                        className="flex w-full items-center justify-between text-xs text-zinc-600 hover:text-zinc-400"
                      >
                        <span>Conexao Avancada (OAuth)</span>
                        <span>{showOAuth[platform.key] ? "-" : "+"}</span>
                      </button>

                      {showOAuth[platform.key] && (
                        <div className="space-y-2">
                          <p className="text-xs text-zinc-700">
                            Acesso completo via autorizacao OAuth. Necessario
                            para metricas detalhadas e dados privados.
                          </p>
                          <a
                            href={platform.authUrl}
                            className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-800/50 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                          >
                            <Link2 className="size-3.5" />
                            Conectar via OAuth
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
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
        <DialogContent className="border-zinc-800 bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-white">
              Desconectar plataforma
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem certeza que deseja desconectar{" "}
              {platformNames[disconnectTarget ?? ""] ?? disconnectTarget}? Voce
              precisara reconectar para continuar coletando metricas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDisconnectTarget(null)}
              className="border-zinc-800 text-zinc-400 hover:bg-zinc-800"
            >
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
