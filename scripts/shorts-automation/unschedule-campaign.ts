/**
 * Tira do ar todos os videos da campanha.
 *
 * Deixa cada um como rascunho privado sem publishAt. Video privado some do
 * canal, para de aparecer e nao pesa mais no alcance — mas continua na conta e
 * pode voltar. Nada e apagado: exclusao no YouTube e irreversivel e leva junto
 * visualizacoes e comentarios.
 *
 * So toca video com a assinatura da campanha (descricao apontando para o reel
 * de origem no Instagram). Conteudo proprio do canal nunca entra na lista.
 *
 * Ordem importa: os PUBLICOS saem primeiro. Sao eles que afetam o alcance hoje;
 * os agendados ainda estao privados e so fariam mal quando publicassem.
 *
 * A cota e o gargalo: videos.update custa 50 unidades e o teto diario e 10.000,
 * entao cabem ~198 por execucao. O progresso fica em disco e a execucao seguinte
 * continua de onde parou.
 *
 * Uso:
 *   pnpm shorts:unschedule            # ate a cota acabar
 *   pnpm shorts:unschedule --dry-run  # so mostra o plano
 */

import "dotenv/config";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { google } from "googleapis";

const DATA_DIR = join(__dirname, "../../data");
const FEITOS_FILE = join(DATA_DIR, "shorts-desagendados.json");

/** Titulos que nunca devem ser tocados, mesmo se algo escapar do filtro. */
const NUNCA_TOCAR = /ezequiel|ezeq/i;

const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:3000/oauth2callback",
);
auth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
const yt = google.youtube({ version: "v3", auth });

interface Alvo {
  id: string;
  titulo: string;
  publico: boolean;
  agendadoPara?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const br = (d: string) => new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

async function levantar(): Promise<Alvo[]> {
  const ch = await yt.channels.list({ part: ["contentDetails"], mine: true });
  const uploads = ch.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) return [];

  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const page = await yt.playlistItems.list({ part: ["contentDetails"], playlistId: uploads, maxResults: 50, pageToken });
    ids.push(...(page.data.items ?? []).map((i) => i.contentDetails!.videoId!));
    pageToken = page.data.nextPageToken ?? undefined;
  } while (pageToken);

  const alvos: Alvo[] = [];
  const unicos = [...new Set(ids)];
  for (let i = 0; i < unicos.length; i += 50) {
    const lote = await yt.videos.list({ part: ["status", "snippet"], id: unicos.slice(i, i + 50).join(",") });
    for (const v of lote.data.items ?? []) {
      const desc = v.snippet?.description ?? "";
      const titulo = v.snippet?.title ?? "";
      if (!/instagram\.com\/reel\//.test(desc)) continue;
      if (NUNCA_TOCAR.test(titulo)) continue;

      const publico = v.status?.privacyStatus === "public";
      const agendado = v.status?.publishAt ?? undefined;
      // Privado e sem agendamento ja esta resolvido.
      if (!publico && !agendado) continue;

      alvos.push({ id: v.id!, titulo, publico, agendadoPara: agendado });
    }
  }

  // Publicos primeiro; depois os agendados, do mais proximo para o mais distante.
  return alvos.sort((a, b) => {
    if (a.publico !== b.publico) return a.publico ? -1 : 1;
    return (a.agendadoPara ?? "").localeCompare(b.agendadoPara ?? "");
  });
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  await mkdir(DATA_DIR, { recursive: true });

  const feitos = new Set<string>(
    existsSync(FEITOS_FILE) ? (JSON.parse(await readFile(FEITOS_FILE, "utf-8")) as string[]) : [],
  );

  console.log("Levantando vídeos da campanha no canal...");
  const todos = await levantar();
  const alvos = todos.filter((v) => !feitos.has(v.id));
  const publicos = alvos.filter((v) => v.publico);

  console.log(`  ${alvos.length} a tirar do ar  (${publicos.length} públicos, ${alvos.length - publicos.length} agendados)`);
  if (alvos.length === 0) {
    console.log("Nada a fazer: nenhum vídeo da campanha está público ou agendado.");
    return;
  }
  const proximo = alvos.find((v) => v.agendadoPara);
  if (proximo) console.log(`  próximo agendado a publicar: ${br(proximo.agendadoPara!)}`);
  console.log("");

  if (dryRun) {
    console.log(`[DRY] tornaria privados ${alvos.length} vídeo(s); os ${publicos.length} públicos sairiam primeiro.`);
    return;
  }

  let ok = 0, okPublicos = 0;
  for (const v of alvos) {
    try {
      await yt.videos.update({
        part: ["status"],
        requestBody: { id: v.id, status: { privacyStatus: "private", selfDeclaredMadeForKids: false } },
      });
      feitos.add(v.id);
      ok++;
      if (v.publico) okPublicos++;
      if (ok % 50 === 0) {
        await writeFile(FEITOS_FILE, JSON.stringify([...feitos], null, 2));
        console.log(`  ${ok} tirados do ar (${okPublicos} eram públicos)...`);
      }
    } catch (err: any) {
      if (/quota/i.test(err?.message ?? "")) {
        console.error(`  Cota diária esgotada após ${ok}. A próxima execução continua daqui.`);
        break;
      }
      console.error(`  ERRO ${v.id}: ${err.message}`);
    }
    await sleep(150);
  }

  await writeFile(FEITOS_FILE, JSON.stringify([...feitos], null, 2));
  console.log(`\n${ok} tirados do ar nesta execução (${okPublicos} públicos) | ${alvos.length - ok} restantes`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
