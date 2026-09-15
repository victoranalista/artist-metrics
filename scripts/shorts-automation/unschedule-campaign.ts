/**
 * Desfaz o agendamento de todos os Shorts da campanha.
 *
 * Deixa cada video como rascunho privado sem publishAt: ele para de publicar,
 * mas continua no canal e pode ser reagendado depois. Nada e apagado.
 *
 * So toca video com a assinatura da campanha — descricao apontando para o reel
 * de origem no Instagram. Conteudo proprio do canal nunca entra na lista.
 *
 * A cota da API e o gargalo: videos.update custa 50 unidades e o teto diario e
 * 10.000, entao cabem ~198 por execucao. O progresso fica em disco e a execucao
 * seguinte continua de onde parou.
 *
 * Uso:
 *   pnpm shorts:unschedule            # ate a cota acabar
 *   pnpm shorts:unschedule --dry-run  # so lista o que faria
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

interface Agendado {
  id: string;
  titulo: string;
  at: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const br = (d: string) => new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

/** Varre o canal e devolve os agendados que vieram da campanha. */
async function levantar(): Promise<Agendado[]> {
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

  const encontrados: Agendado[] = [];
  const unicos = [...new Set(ids)];
  for (let i = 0; i < unicos.length; i += 50) {
    const lote = await yt.videos.list({ part: ["status", "snippet"], id: unicos.slice(i, i + 50).join(",") });
    for (const v of lote.data.items ?? []) {
      if (!v.status?.publishAt) continue;
      const desc = v.snippet?.description ?? "";
      const titulo = v.snippet?.title ?? "";
      // Assinatura da campanha + salvaguarda por titulo
      if (!/instagram\.com\/reel\//.test(desc)) continue;
      if (NUNCA_TOCAR.test(titulo)) continue;
      encontrados.push({ id: v.id!, titulo, at: v.status.publishAt });
    }
  }

  return encontrados.sort((a, b) => a.at.localeCompare(b.at));
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  await mkdir(DATA_DIR, { recursive: true });

  const feitos = new Set<string>(
    existsSync(FEITOS_FILE) ? (JSON.parse(await readFile(FEITOS_FILE, "utf-8")) as string[]) : [],
  );

  console.log("Levantando agendamentos no canal...");
  const agendados = await levantar();
  const alvos = agendados.filter((v) => !feitos.has(v.id));

  console.log(`  ${agendados.length} Shorts da campanha ainda agendados`);
  if (alvos.length === 0) {
    console.log("Nada a fazer: nenhum Short da campanha continua agendado.");
    return;
  }
  console.log(`  próximo a publicar: ${br(alvos[0].at)}`);
  console.log("");

  if (dryRun) {
    console.log(`[DRY] desagendaria ${alvos.length} vídeo(s).`);
    return;
  }

  let ok = 0;
  for (const v of alvos) {
    try {
      await yt.videos.update({
        part: ["status"],
        requestBody: { id: v.id, status: { privacyStatus: "private", selfDeclaredMadeForKids: false } },
      });
      feitos.add(v.id);
      ok++;
      if (ok % 50 === 0) {
        await writeFile(FEITOS_FILE, JSON.stringify([...feitos], null, 2));
        console.log(`  ${ok} desagendados...`);
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
  console.log(`\n${ok} desagendados nesta execução | ${alvos.length - ok} restantes`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
