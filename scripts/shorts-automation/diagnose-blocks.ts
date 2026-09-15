/**
 * Mede o estrago da campanha nos videos que ja publicaram.
 *
 * Os reels sao performances de musicas de terceiros, entao o Content ID do
 * YouTube reclama. Este script separa o que foi bloqueado, em quais paises, e
 * quanto do canal e conteudo da campanha — os numeros que decidem se vale
 * despublicar o que ja esta no ar.
 *
 * Custa ~45 unidades de cota (contra 50 de um unico videos.update).
 *
 * Uso: pnpm shorts:diagnose
 */

import "dotenv/config";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { google } from "googleapis";

const DATA_DIR = join(__dirname, "../../data");

const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:3000/oauth2callback",
);
auth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
const yt = google.youtube({ version: "v3", auth });

interface Diagnostico {
  id: string;
  titulo: string;
  privacidade: string;
  uploadStatus: string;
  motivoRejeicao?: string;
  paisesBloqueados?: string[];
  bloqueadoNoBrasil: boolean;
  publicadoEm?: string;
}

async function main() {
  const ch = await yt.channels.list({ part: ["contentDetails", "statistics"], mine: true });
  const canal = ch.data.items?.[0];
  const uploads = canal?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) { console.error("Canal sem playlist de uploads."); return; }

  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const page = await yt.playlistItems.list({ part: ["contentDetails"], playlistId: uploads, maxResults: 50, pageToken });
    ids.push(...(page.data.items ?? []).map((i) => i.contentDetails!.videoId!));
    pageToken = page.data.nextPageToken ?? undefined;
  } while (pageToken);

  const daCampanha: Diagnostico[] = [];
  const doCanal: Diagnostico[] = [];
  const unicos = [...new Set(ids)];

  for (let i = 0; i < unicos.length; i += 50) {
    const lote = await yt.videos.list({
      part: ["status", "snippet", "contentDetails"],
      id: unicos.slice(i, i + 50).join(","),
    });
    for (const v of lote.data.items ?? []) {
      // So interessa o que ja esta no ar; agendado nao afeta alcance.
      if (v.status?.publishAt) continue;

      const bloqueados = v.contentDetails?.regionRestriction?.blocked ?? undefined;
      const d: Diagnostico = {
        id: v.id!,
        titulo: v.snippet?.title ?? "",
        privacidade: v.status?.privacyStatus ?? "?",
        uploadStatus: v.status?.uploadStatus ?? "?",
        motivoRejeicao: v.status?.rejectionReason ?? undefined,
        paisesBloqueados: bloqueados,
        bloqueadoNoBrasil: !!bloqueados?.includes("BR"),
        publicadoEm: v.snippet?.publishedAt ?? undefined,
      };
      if (/instagram\.com\/reel\//.test(v.snippet?.description ?? "")) daCampanha.push(d);
      else doCanal.push(d);
    }
  }

  const publicos = (l: Diagnostico[]) => l.filter((v) => v.privacidade === "public");
  const bloqueados = (l: Diagnostico[]) => l.filter((v) => v.paisesBloqueados?.length || v.motivoRejeicao);

  console.log("=".repeat(58));
  console.log("  DIAGNOSTICO DA CAMPANHA");
  console.log("=".repeat(58));
  console.log(`Videos publicos no canal (contador oficial): ${canal?.statistics?.videoCount}`);
  console.log("");
  console.log(`Da campanha, ja no ar:  ${daCampanha.length}  (publicos: ${publicos(daCampanha).length})`);
  console.log(`Conteudo proprio no ar: ${doCanal.length}  (publicos: ${publicos(doCanal).length})`);
  console.log("");

  const campBloq = bloqueados(daCampanha);
  const canalBloq = bloqueados(doCanal);
  console.log(`BLOQUEADOS da campanha:  ${campBloq.length} de ${daCampanha.length}`);
  console.log(`BLOQUEADOS proprios:     ${canalBloq.length} de ${doCanal.length}`);
  console.log("");

  const motivos: Record<string, number> = {};
  for (const v of campBloq) motivos[v.motivoRejeicao ?? "restricao regional"] = (motivos[v.motivoRejeicao ?? "restricao regional"] ?? 0) + 1;
  if (Object.keys(motivos).length) console.log("Motivos:", JSON.stringify(motivos));

  const noBrasil = campBloq.filter((v) => v.bloqueadoNoBrasil).length;
  console.log(`Bloqueados no Brasil (campanha): ${noBrasil}`);
  console.log("");

  if (daCampanha.length > 0) {
    const pct = ((campBloq.length / daCampanha.length) * 100).toFixed(1);
    console.log(`Taxa de bloqueio da campanha: ${pct}%`);
  }

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(join(DATA_DIR, "shorts-diagnostico.json"), JSON.stringify({ daCampanha, doCanal }, null, 2));
  console.log("\nDetalhe completo em data/shorts-diagnostico.json");
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
