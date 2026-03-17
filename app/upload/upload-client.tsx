"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

        // Add to local list
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
    <div className="space-y-8">
      {/* Upload Form */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-white/5 bg-zinc-900/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Plus className="size-4 text-violet-400" />
              Adicionar Metricas
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Preencha os campos abaixo para registrar metricas manualmente
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* Platform and Date row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">
                    Plataforma
                  </label>
                  <Select
                    value={platform}
                    onValueChange={(val) => setPlatform(val as string)}
                  >
                    <SelectTrigger className="w-full">
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
                  <label className="text-sm font-medium text-zinc-300">
                    Data
                  </label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-zinc-800/50 border-white/10 text-white"
                    />
                  </div>
                </div>
              </div>

              <Separator className="bg-white/5" />

              {/* Metric fields */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">
                    Seguidores
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={seguidores}
                    onChange={(e) => setSeguidores(e.target.value)}
                    className="bg-zinc-800/50 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">
                    Views
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={views}
                    onChange={(e) => setViews(e.target.value)}
                    className="bg-zinc-800/50 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">
                    Likes
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={likes}
                    onChange={(e) => setLikes(e.target.value)}
                    className="bg-zinc-800/50 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">
                    Comentarios
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={comentarios}
                    onChange={(e) => setComentarios(e.target.value)}
                    className="bg-zinc-800/50 border-white/10 text-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  Observacoes (opcional)
                </label>
                <Textarea
                  placeholder="Adicione notas ou contexto sobre essas metricas..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[80px] bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-600"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-violet-600 text-white hover:bg-violet-700"
              >
                <Upload className="mr-2 size-4" />
                {isPending ? "Enviando..." : "Enviar Metricas"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>

      {/* Existing Metrics Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border-white/5 bg-zinc-900/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <FileSpreadsheet className="size-4 text-violet-400" />
              Historico de Uploads
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Metricas enviadas manualmente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="mb-3 size-10 text-zinc-600" />
                <p className="text-sm text-zinc-500">
                  Nenhuma metrica manual registrada ainda
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-zinc-400">Plataforma</TableHead>
                    <TableHead className="text-zinc-400">Data</TableHead>
                    <TableHead className="text-zinc-400">Seguidores</TableHead>
                    <TableHead className="text-zinc-400">Views</TableHead>
                    <TableHead className="text-zinc-400">Likes</TableHead>
                    <TableHead className="text-zinc-400">
                      Comentarios
                    </TableHead>
                    <TableHead className="text-zinc-400">
                      Observacoes
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map((metric) => {
                    const data = metric.data as Record<string, number>;
                    return (
                      <TableRow
                        key={metric.id}
                        className="border-white/5 hover:bg-zinc-800/40"
                      >
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="text-xs"
                            style={{
                              backgroundColor: `${platformColors[metric.platform] || "#8b5cf6"}20`,
                              color:
                                platformColors[metric.platform] || "#8b5cf6",
                            }}
                          >
                            {platformNames[metric.platform] || metric.platform}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          {new Date(metric.date + "T00:00:00").toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          {data.seguidores != null
                            ? formatNumber(data.seguidores)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          {data.views != null
                            ? formatNumber(data.views)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          {data.likes != null
                            ? formatNumber(data.likes)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          {data.comentarios != null
                            ? formatNumber(data.comentarios)
                            : "-"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-zinc-500">
                          {metric.notes || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
