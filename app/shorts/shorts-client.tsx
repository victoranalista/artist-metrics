"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Video,
  Calendar,
  Play,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface ShortsStatus {
  totalReels: number;
  posted: number;
  remaining: number;
  daysRemaining: number;
}

interface SchedulePreview {
  dryRun: boolean;
  totalVideos: number;
  totalDays: number;
  startDate: string;
  endDate: string;
  videosPerDay: number;
  schedule: string;
}

interface ScheduleResult {
  success?: boolean;
  uploaded?: number;
  batchSize?: number;
  totalRemaining?: number;
  quotaExceeded?: boolean;
  message?: string;
  error?: string;
}

export function ShortsClient() {
  const [status, setStatus] = useState<ShortsStatus | null>(null);
  const [preview, setPreview] = useState<SchedulePreview | null>(null);
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isScheduling, setIsScheduling] = useState(false);

  const [reelsFromDate, setReelsFromDate] = useState("2020-04-01");
  const [startPostingDate, setStartPostingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/shorts/status");
      const data = await res.json();
      setStatus(data);
    } catch {
      toast.error("Erro ao carregar status");
    }
  }

  function handlePreview() {
    if (!reelsFromDate || !startPostingDate) {
      toast.error("Selecione ambas as datas");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/shorts/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reelsFromDate, startPostingDate, dryRun: true }),
        });
        const data = await res.json();
        if (data.error) {
          toast.error(data.error);
          return;
        }
        setPreview(data);
        setResult(null);
      } catch {
        toast.error("Erro ao calcular preview");
      }
    });
  }

  async function handleSchedule() {
    if (!startPostingDate) return;

    setIsScheduling(true);
    setResult(null);

    try {
      const res = await fetch("/api/shorts/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reelsFromDate, startPostingDate, dryRun: false }),
      });
      const data = await res.json();

      setResult(data);
      if (data.success) {
        toast.success(data.message);
        fetchStatus();
      } else if (data.error) {
        toast.error(data.error);
      } else if (data.quotaExceeded) {
        toast.warning(data.message);
        fetchStatus();
      }
    } catch {
      toast.error("Erro ao agendar shorts");
    } finally {
      setIsScheduling(false);
    }
  }

  const progressPercent = status
    ? Math.round((status.posted / Math.max(status.totalReels, 1)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatusCard
          icon={Video}
          label="Total de Reels"
          value={status?.totalReels ?? "-"}
          color="text-blue-400"
        />
        <StatusCard
          icon={CheckCircle2}
          label="Já Postados"
          value={status?.posted ?? "-"}
          color="text-emerald-400"
        />
        <StatusCard
          icon={Clock}
          label="Restantes"
          value={status?.remaining ?? "-"}
          color="text-amber-400"
        />
        <StatusCard
          icon={Calendar}
          label="Dias Restantes"
          value={status?.daysRemaining ?? "-"}
          color="text-violet-400"
        />
      </div>

      {/* Progress */}
      {status && status.totalReels > 0 && (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-zinc-400">Progresso geral</span>
              <span className="font-medium text-white">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <p className="mt-2 text-xs text-zinc-500">
              {status.posted} de {status.totalReels} reels postados como Shorts
            </p>
          </CardContent>
        </Card>
      )}

      {/* Schedule Form */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Zap className="size-4 text-amber-500" />
            Agendar Shorts
          </CardTitle>
          <CardDescription className="text-zinc-500">
            Selecione o período dos reels e quando começar a postar no YouTube
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Reels a partir de
              </label>
              <Input
                type="date"
                value={reelsFromDate}
                onChange={(e) => setReelsFromDate(e.target.value)}
                className="border-zinc-800 bg-zinc-800/50 text-white"
              />
              <p className="text-xs text-zinc-600">
                Data mínima dos reels no Instagram
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Começar postagens em
              </label>
              <Input
                type="date"
                value={startPostingDate}
                onChange={(e) => setStartPostingDate(e.target.value)}
                className="border-zinc-800 bg-zinc-800/50 text-white"
              />
              <p className="text-xs text-zinc-600">
                Data de início no YouTube (3 por dia)
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3 border-t border-zinc-800 pt-4">
          <Button
            onClick={handlePreview}
            disabled={isPending}
            variant="outline"
            className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
          >
            {isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Calendar className="mr-2 size-4" />
            )}
            Calcular Preview
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={isScheduling || !preview}
            className="bg-emerald-600 text-white hover:bg-emerald-500"
          >
            {isScheduling ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Play className="mr-2 size-4" />
            )}
            {isScheduling ? "Agendando..." : "Agendar Lote (10 videos)"}
          </Button>
          <Button
            onClick={fetchStatus}
            variant="outline"
            className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
          >
            <RefreshCw className="mr-2 size-4" />
            Atualizar
          </Button>
        </CardFooter>
      </Card>

      {/* Preview */}
      {preview && (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Calendar className="size-4 text-blue-400" />
              Preview do Agendamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <PreviewItem label="Videos" value={String(preview.totalVideos)} />
              <PreviewItem label="Dias" value={String(preview.totalDays)} />
              <PreviewItem
                label="Início"
                value={new Date(preview.startDate + "T00:00:00").toLocaleDateString("pt-BR")}
              />
              <PreviewItem
                label="Fim"
                value={new Date(preview.endDate + "T00:00:00").toLocaleDateString("pt-BR")}
              />
            </div>
            <Separator className="my-4 bg-zinc-800" />
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                {preview.videosPerDay} videos/dia
              </Badge>
              <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                {preview.schedule}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card
          className={`border-zinc-800 ${
            result.success
              ? "bg-emerald-950/20"
              : result.quotaExceeded
                ? "bg-amber-950/20"
                : "bg-red-950/20"
          }`}
        >
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-400" />
              ) : result.quotaExceeded ? (
                <Clock className="mt-0.5 size-5 shrink-0 text-amber-400" />
              ) : (
                <Video className="mt-0.5 size-5 shrink-0 text-red-400" />
              )}
              <div>
                <p className="font-medium text-white">
                  {result.message || result.error}
                </p>
                {result.uploaded !== undefined && (
                  <p className="mt-1 text-sm text-zinc-400">
                    {result.uploaded} videos enviados
                    {result.totalRemaining !== undefined &&
                      ` · ${result.totalRemaining} restantes`}
                  </p>
                )}
                {result.quotaExceeded && (
                  <p className="mt-2 text-xs text-amber-400/70">
                    A quota do YouTube reseta à meia-noite (horário do Pacífico). Tente
                    novamente amanhã às 4h BRT.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardContent className="pt-6">
          <h3 className="mb-3 text-sm font-medium text-zinc-300">
            Como funciona
          </h3>
          <ul className="space-y-2 text-sm text-zinc-500">
            <li className="flex items-start gap-2">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-zinc-600" />
              Os reels são baixados do Instagram via yt-dlp
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-zinc-600" />
              Legendas virais são geradas com IA (max 100 caracteres + 3 hashtags)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-zinc-600" />
              Cada Short é agendado no YouTube nos horários 12h, 18h e 21h BRT
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-zinc-600" />
              Videos são deletados do disco após upload para economizar espaço
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-zinc-600" />
              Limite: ~6 uploads por quota diária do YouTube (10.000 unidades/dia)
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-800">
            <Icon className={`size-5 ${color}`} />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-zinc-500">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-800/50 p-3 text-center">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}
