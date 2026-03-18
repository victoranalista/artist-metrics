"use client";

import { useState, useTransition } from "react";
import { Upload, Plus, FileSpreadsheet, Calendar } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { uploadManualMetrics } from "@/lib/actions";
import { formatNumber, platformColors, platformNames } from "@/lib/utils";

interface ManualMetric {
  id: string;
  platform: string;
  date: string;
  data: Record<string, unknown>;
  notes: string | null;
  createdAt: string;
}

interface UploadClientProps {
  existingMetrics: ManualMetric[];
}

const PLATFORM_OPTIONS = [
  { value: "YOUTUBE", label: "YouTube" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "SPOTIFY", label: "Spotify" },
  { value: "OUTRO", label: "Outro" },
];

export function UploadClient({ existingMetrics }: UploadClientProps) {
  const [isPending, startTransition] = useTransition();
  const [metrics, setMetrics] = useState(existingMetrics);

  const [platform, setPlatform] = useState("YOUTUBE");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [seguidores, setSeguidores] = useState("");
  const [views, setViews] = useState("");
  const [likes, setLikes] = useState("");
  const [comentarios, setComentarios] = useState("");
  const [notes, setNotes] = useState("");

  function resetForm() {
    setSeguidores("");
    setViews("");
    setLikes("");
    setComentarios("");
    setNotes("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!platform || !date) {
      toast.error("Selecione uma plataforma e uma data");
      return;
    }

    const metricsData: Record<string, unknown> = {};
    if (seguidores) metricsData.seguidores = Number(seguidores);
    if (views) metricsData.views = Number(views);
    if (likes) metricsData.likes = Number(likes);
    if (comentarios) metricsData.comentarios = Number(comentarios);

    if (Object.keys(metricsData).length === 0) {
      toast.error("Preencha pelo menos uma metrica");
      return;
    }

    startTransition(async () => {
      try {
        const result = await uploadManualMetrics({
          platform,
          date,
          metrics: metricsData,
          notes: notes || undefined,
        });

        toast.success("Metricas enviadas com sucesso!");

        setMetrics((prev) => [
          {
            id: result.id,
            platform,
            date,
            data: metricsData,
            notes: notes || null,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);

        resetForm();
      } catch {
        toast.error("Erro ao enviar metricas. Tente novamente.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Upload Manual</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Adicione metricas manualmente para plataformas que nao possuem integracao automatica
        </p>
      </div>

      {/* Upload Form */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Plus className="size-4 text-zinc-500" />
            Adicionar Metricas
          </CardTitle>
          <CardDescription className="text-zinc-500">
            Preencha os campos abaixo para registrar metricas manualmente
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5">
            {/* Platform and Date */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  Plataforma
                </label>
                <Select
                  value={platform}
                  onValueChange={(val) => setPlatform(val as string)}
                >
                  <SelectTrigger className="w-full border-zinc-800 bg-zinc-800/50 text-white">
                    <SelectValue placeholder="Selecione a plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORM_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  Data
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="border-zinc-800 bg-zinc-800/50 text-white"
                />
              </div>
            </div>

            {/* Metric fields */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  Seguidores
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={seguidores}
                  onChange={(e) => setSeguidores(e.target.value)}
                  className="border-zinc-800 bg-zinc-800/50 text-white placeholder:text-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  Views
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={views}
                  onChange={(e) => setViews(e.target.value)}
                  className="border-zinc-800 bg-zinc-800/50 text-white placeholder:text-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  Likes
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={likes}
                  onChange={(e) => setLikes(e.target.value)}
                  className="border-zinc-800 bg-zinc-800/50 text-white placeholder:text-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  Comentarios
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  className="border-zinc-800 bg-zinc-800/50 text-white placeholder:text-zinc-700"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Observacoes (opcional)
              </label>
              <Textarea
                placeholder="Adicione notas ou contexto sobre essas metricas..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px] border-zinc-800 bg-zinc-800/50 text-white placeholder:text-zinc-700"
              />
            </div>
          </CardContent>
          <CardFooter className="border-t border-zinc-800 pt-4">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-zinc-100 text-zinc-900 hover:bg-white"
            >
              <Upload className="mr-2 size-4" />
              {isPending ? "Enviando..." : "Enviar Metricas"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* History Table */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <FileSpreadsheet className="size-4 text-zinc-500" />
            Historico de Uploads
          </CardTitle>
          <CardDescription className="text-zinc-500">
            Metricas enviadas manualmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="mb-3 size-10 text-zinc-700" />
              <p className="text-sm text-zinc-600">
                Nenhuma metrica manual registrada ainda
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-500">Plataforma</TableHead>
                    <TableHead className="text-zinc-500">Data</TableHead>
                    <TableHead className="text-zinc-500">Seguidores</TableHead>
                    <TableHead className="text-zinc-500">Views</TableHead>
                    <TableHead className="text-zinc-500">Likes</TableHead>
                    <TableHead className="text-zinc-500">Comentarios</TableHead>
                    <TableHead className="text-zinc-500">Observacoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map((metric) => {
                    const data = metric.data as Record<string, number>;
                    return (
                      <TableRow
                        key={metric.id}
                        className="border-zinc-800 hover:bg-zinc-800/40"
                      >
                        <TableCell>
                          <span className="flex items-center gap-2 text-sm text-zinc-300">
                            <span
                              className="size-2 rounded-full"
                              style={{
                                backgroundColor:
                                  platformColors[metric.platform] || "#71717a",
                              }}
                            />
                            {platformNames[metric.platform] || metric.platform}
                          </span>
                        </TableCell>
                        <TableCell className="text-zinc-400">
                          {new Date(
                            metric.date + "T00:00:00"
                          ).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-white">
                          {data.seguidores != null
                            ? formatNumber(data.seguidores)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-white">
                          {data.views != null ? formatNumber(data.views) : "-"}
                        </TableCell>
                        <TableCell className="text-white">
                          {data.likes != null ? formatNumber(data.likes) : "-"}
                        </TableCell>
                        <TableCell className="text-white">
                          {data.comentarios != null
                            ? formatNumber(data.comentarios)
                            : "-"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-zinc-600">
                          {metric.notes || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
