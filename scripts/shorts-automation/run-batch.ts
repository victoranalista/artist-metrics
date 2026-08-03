/**
 * Preenche a campanha de Shorts - continua de onde parou.
 *
 * Agenda 3 videos/dia as 12:00, 18:00 e 21:00 BRT, do inicio da campanha ate
 * 31/12/2027. Como o catalogo de reels e menor que o numero de slots, os videos
 * se repetem ciclicamente.
 *
 * A quota padrao da YouTube Data API e 10.000 unidades/dia e cada upload custa
 * 1.600, entao cabem ~6 uploads por execucao. Rodando todo dia, sobem 6 e o
 * publico consome 3 - a fila cresce sozinha e sempre fica a frente.
 *
 * Slot no passado publica na hora. Se varios ficaram para tras (script parado
 * por dias), so o mais recente sai imediatamente; os demais sao pulados para a
 * campanha voltar a se alinhar com o futuro.
 *
 * Uso:
 *   pnpm tsx scripts/shorts-automation/run-batch.ts              # Proximos 6 slots
 *   pnpm tsx scripts/shorts-automation/run-batch.ts --batch 3    # Limita a 3
 *   pnpm tsx scripts/shorts-automation/run-batch.ts --dry-run    # Simular
 *   pnpm tsx scripts/shorts-automation/run-batch.ts --status     # Ver progresso
 */

import "dotenv/config";
import { getReelsList, downloadReel, type Reel } from "./instagram";
import { getCaption, cachedCount } from "./caption-cache";
import { uploadShort, getSlotTime, checkQuota, getOccupiedSlots, PUBLISH_HOURS_BRT } from "./youtube";
import {
  getCampaign, campaignStartDate, totalSlots, CAMPAIGN_END, acquireLock, releaseLock,
} from "./campaign";

const SLOTS_PER_DAY = PUBLISH_HOURS_BRT.length;

/**
 * Nao ha teto fixo aqui de proposito: a execucao vai ate a API recusar.
 *
 * A conta "10.000 unidades / 1.600 por videos.insert = 6 uploads/dia" e o que a
 * documentacao sugere, mas na pratica este projeto passou de 24 uploads numa
 * unica execucao sem 403. Fixar 6 estaria jogando fora a maior parte da quota.
 */

/**
 * Falha cedo e com nome, em vez de estourar no meio do lote com um erro opaco
 * da API. O dry-run nao precisa de credencial nenhuma: simula offline.
 */
function checkEnv(dryRun: boolean): void {
  if (dryRun) return;

  const required = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "YOUTUBE_REFRESH_TOKEN",
    "OPENAI_API_KEY",
  ];
  const missing = required.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    console.error(`Faltando no .env: ${missing.join(", ")}`);
    if (missing.includes("YOUTUBE_REFRESH_TOKEN")) {
      console.error("  YOUTUBE_REFRESH_TOKEN: rode 'pnpm shorts:setup-yt'");
    }
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const statusOnly = args.includes("--status");
  const batchIdx = args.indexOf("--batch");
  // Sem --batch, tenta o maximo: quem para a execucao e o 403 de quota da API.
  const batchSize = batchIdx !== -1 ? parseInt(args[batchIdx + 1]) : Infinity;

  checkEnv(dryRun || statusOnly);

  // Simulacao e status nao escrevem nada, entao nao disputam o lock.
  if (!dryRun && !statusOnly) {
    if (!(await acquireLock())) {
      console.error("Já existe uma execução em andamento. Abortando para não duplicar agendamentos.");
      process.exit(1);
    }
    const soltar = () => { void releaseLock(); process.exit(130); };
    process.on("SIGINT", soltar);
    process.on("SIGTERM", soltar);
  }

  const catalog = await getReelsList();
  const campaign = await getCampaign();
  const start = campaignStartDate(campaign);
  const total = totalSlots(campaign, SLOTS_PER_DAY);

  if (catalog.length === 0) {
    console.error("Catalogo de reels vazio. Rode o scraper antes.");
    process.exit(1);
  }

  // Fonte de verdade e o canal, nao um contador local.
  const occupied = dryRun ? new Set<number>() : await getOccupiedSlots(start);
  const now = new Date();

  // Slots livres e ainda no futuro — inclui buracos deixados por falhas
  // anteriores, que assim voltam a ser preenchidos.
  const pending: number[] = [];
  for (let i = 0; i < total; i++) {
    if (occupied.has(i)) continue;
    if (getSlotTime(start, i) <= now) continue;
    pending.push(i);
  }

  if (statusOnly) {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  STATUS - Campanha de Shorts                                 ║
╠══════════════════════════════════════════════════════════════╣
║  Reels no catálogo: ${String(catalog.length).padEnd(37)}║
║  Slots totais:      ${String(total).padEnd(37)}║
║  Já agendados:      ${String(occupied.size).padEnd(37)}║
║  Faltam:            ${String(pending.length).padEnd(37)}║
║  Próximo slot:      ${(pending[0] !== undefined ? getSlotTime(start, pending[0]).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—").padEnd(37)}║
║  Último slot:       ${CAMPAIGN_END.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }).padEnd(37)}║
╚══════════════════════════════════════════════════════════════╝
    `);
    return;
  }

  if (pending.length === 0) {
    console.log(`Campanha completa: ${occupied.size} slots agendados até ${CAMPAIGN_END.toLocaleDateString("pt-BR")}.`);
    return;
  }

  const count = Math.min(batchSize, pending.length);

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  SHORTS - PREENCHIMENTO DA CAMPANHA                          ║
║  ${dryRun ? "MODO SIMULAÇÃO" : "MODO PRODUÇÃO"}                                           ║
╠══════════════════════════════════════════════════════════════╣
║  Lote: ${String(count).padEnd(3)} vídeos | 3/dia às 12:00, 18:00, 21:00 BRT     ║
║  Agendados: ${String(occupied.size).padEnd(4)} / ${String(total).padEnd(4)} | Catálogo: ${String(catalog.length).padEnd(3)} reels        ║
╚══════════════════════════════════════════════════════════════╝
  `);

  const buracos = pending.filter((i) => i < Math.max(...occupied, 0)).length;
  if (buracos > 0) {
    console.log(`${buracos} buraco(s) de execuções anteriores serão reocupados primeiro.\n`);
  }

  // 1. Check YouTube API
  if (!dryRun) {
    console.log("[1/3] Verificando YouTube API...");
    const ok = await checkQuota();
    if (!ok) { console.error("YouTube API indisponível."); process.exit(1); }
    console.log("  OK\n");
  }

  // 2. O catalogo cicla: slot N usa o reel N % catalogo.
  const slots = pending.slice(0, count).map((index) => ({
    index,
    time: getSlotTime(start, index),
    reel: catalog[index % catalog.length],
  }));

  // 3. Legenda + download + upload, um slot por vez.
  //
  // A legenda sai logo antes do upload de proposito: como a execucao vai ate a
  // quota estourar, gerar todas de uma vez queimaria centenas de chamadas de IA
  // para slots que a quota nunca alcancaria nesta execucao.
  console.log(`[2/3] ${dryRun ? "Simulando" : "Legenda + download + upload"}...`);
  console.log(`  ${await cachedCount()}/${catalog.length} reels ja tem legenda no cache\n`);
  let done = 0;
  let newCaptions = 0;

  for (const slot of slots) {
    // Slots do passado ja foram filtrados: aqui tudo e agendamento futuro.
    const original = slot.reel.caption || "Louvor gospel emocionante";

    let caption: string;
    if (dryRun) {
      caption = `[IA] ${original.slice(0, 55)} #gospel #louvor #shorts`;
    } else {
      try {
        const result = await getCaption(slot.reel.id, original);
        caption = result.caption;
        if (!result.fromCache) newCaptions++;
      } catch (err: any) {
        // Sem legenda boa nao ha upload: os videos ja agendados continuam
        // valendo e o agendador retoma na proxima execucao.
        console.error(`\nIA indisponivel: ${err.message}`);
        console.error(`Parando com ${done} upload(s) feitos nesta execucao.`);
        break;
      }
    }
    const when = slot.time.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    if (dryRun) {
      console.log(`  [DRY] slot ${slot.index} | ${when} | ${slot.reel.id} | "${caption}"`);
      done++;
      continue;
    }

    try {
      // O arquivo fica em disco de proposito. O catalogo cicla, entao cada reel
      // reaparece varias vezes na campanha; apagar apos o upload forcava um
      // download novo a cada repeticao. 60 reels ocupam poucas centenas de MB e
      // `pnpm tsx ...instagram.ts` expoe cleanupVideos() para limpar no fim.
      const filePath = await downloadReel(slot.reel);

      const videoId = await uploadShort({
        filePath,
        title: caption,
        description: buildDescription(slot.reel, caption),
        scheduledAt: slot.time,
      });

      done++;
      console.log(`  slot ${slot.index} | ${when} | ${videoId} | "${caption}"`);

      // Respiro curto entre uploads. A quota da YouTube API e por unidades/dia,
      // nao por taxa, entao 5s so somavam tempo morto (~35% da execucao).
      await sleep(1000);
    } catch (err: any) {
      console.error(`  ERRO slot ${slot.index} (${slot.reel.id}): ${err.message}`);
      if (err.code === 403 || err.message?.includes("quota")) {
        console.error("  Quota excedida! Parando.");
        break;
      }
      // Continue with next on other errors
      await sleep(3000);
    }
  }

  const agendadoAgora = occupied.size + done;

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  RESULTADO                                                   ║
║  ${String(done)}/${String(count)} vídeos ${dryRun ? "simulados" : "agendados"}                                   ║
║  Legendas novas da IA: ${String(newCaptions).padEnd(4)}                              ║
║  Total agendado: ${String(agendadoAgora).padEnd(4)} / ${String(total).padEnd(4)}                           ║
║  Ainda faltam:   ${String(total - agendadoAgora).padEnd(4)} slots                            ║
║  Próximo lote:   pnpm shorts:batch                           ║
╚══════════════════════════════════════════════════════════════╝
  `);
}

function buildDescription(reel: Reel, caption: string): string {
  return `${caption}

Kailany - Ministra de Louvor
Inscreva-se no canal e ative o sininho!

#gospel #louvor #adoracao #musicagospel #shorts #jesuscristo #deusefiel #musicacrista #louvorgospel

Original: ${reel.permalink}`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

main()
  .catch((err) => {
    console.error("Fatal:", err);
    process.exitCode = 1;
  })
  .finally(releaseLock);
