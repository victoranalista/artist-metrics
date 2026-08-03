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
import { getReelsList, downloadReel, deleteVideo, type Reel } from "./instagram";
import { generateShortCaption } from "./captions";
import { uploadShort, getSlotTime, checkQuota, PUBLISH_HOURS_BRT } from "./youtube";
import { getCampaign, saveCampaign, campaignStartDate, totalSlots, CAMPAIGN_END } from "./campaign";

const SLOTS_PER_DAY = PUBLISH_HOURS_BRT.length;

/** 10.000 unidades de quota / 1.600 por videos.insert = 6 uploads por dia. */
const MAX_UPLOADS_PER_RUN = 6;

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
  const batchSize = batchIdx !== -1 ? parseInt(args[batchIdx + 1]) : MAX_UPLOADS_PER_RUN;

  checkEnv(dryRun || statusOnly);

  const catalog = await getReelsList();
  const campaign = await getCampaign();
  const start = campaignStartDate(campaign);
  const total = totalSlots(campaign, SLOTS_PER_DAY);
  const remaining = total - campaign.slotsFilled;

  if (catalog.length === 0) {
    console.error("Catalogo de reels vazio. Rode o scraper antes.");
    process.exit(1);
  }

  if (statusOnly) {
    const nextSlot = getSlotTime(start, campaign.slotsFilled);
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  STATUS - Campanha de Shorts                                 ║
╠══════════════════════════════════════════════════════════════╣
║  Reels no catálogo: ${String(catalog.length).padEnd(37)}║
║  Slots totais:      ${String(total).padEnd(37)}║
║  Já agendados:      ${String(campaign.slotsFilled).padEnd(37)}║
║  Faltam:            ${String(remaining).padEnd(37)}║
║  Próximo slot:      ${nextSlot.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }).padEnd(37)}║
║  Execuções restantes: ${String(Math.ceil(remaining / MAX_UPLOADS_PER_RUN)).padEnd(35)}║
╚══════════════════════════════════════════════════════════════╝
    `);
    return;
  }

  if (remaining <= 0) {
    console.log(`Campanha completa: ${total} slots agendados até ${CAMPAIGN_END.toLocaleDateString("pt-BR")}.`);
    return;
  }

  // Slots vencidos: mantem so o mais recente para publicar agora, pula o resto.
  const now = new Date();
  let cursor = campaign.slotsFilled;
  let skipped = 0;
  while (cursor + 1 < total && getSlotTime(start, cursor + 1) <= now) {
    cursor++;
    skipped++;
  }

  const count = Math.min(batchSize, MAX_UPLOADS_PER_RUN, total - cursor);

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  SHORTS - PREENCHIMENTO DA CAMPANHA                          ║
║  ${dryRun ? "MODO SIMULAÇÃO" : "MODO PRODUÇÃO"}                                           ║
╠══════════════════════════════════════════════════════════════╣
║  Lote: ${String(count).padEnd(3)} vídeos | 3/dia às 12:00, 18:00, 21:00 BRT     ║
║  Agendados: ${String(cursor).padEnd(4)} / ${String(total).padEnd(4)} | Catálogo: ${String(catalog.length).padEnd(3)} reels        ║
╚══════════════════════════════════════════════════════════════╝
  `);

  if (skipped > 0) {
    console.log(`${skipped} slot(s) vencido(s) pulado(s) para realinhar a campanha.\n`);
  }

  // 1. Check YouTube API
  if (!dryRun) {
    console.log("[1/4] Verificando YouTube API...");
    const ok = await checkQuota();
    if (!ok) { console.error("YouTube API indisponível."); process.exit(1); }
    console.log("  OK\n");
  }

  // 2. O catalogo cicla: slot N usa o reel N % catalogo.
  const slots = Array.from({ length: count }, (_, k) => {
    const index = cursor + k;
    return { index, time: getSlotTime(start, index), reel: catalog[index % catalog.length] };
  });

  // 3. Generate captions
  console.log(`[2/4] ${dryRun ? "Legendas (simuladas, sem chamar a IA)" : "Gerando legendas..."}`);
  const captions = new Map<number, string>();
  for (const slot of slots) {
    const caption = dryRun
      ? `[IA] ${(slot.reel.caption || "Louvor gospel emocionante").slice(0, 55)} #gospel #louvor #shorts`
      : await generateShortCaption(slot.reel.caption || "Louvor gospel emocionante");
    captions.set(slot.index, caption);
    console.log(`  slot ${slot.index} (${slot.reel.id}): ${caption} (${caption.length})`);
    // Gentle delay between AI calls
    if (!dryRun) await sleep(1000);
  }

  // 4. Download, upload, delete - one at a time
  console.log("\n[3/4] Download + Upload + Cleanup...");
  let filled = cursor;

  for (const slot of slots) {
    const isImmediate = slot.time <= new Date();
    const caption = captions.get(slot.index)!;
    const when = isImmediate
      ? "AGORA"
      : slot.time.toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo",
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        });

    if (dryRun) {
      console.log(`  [DRY] ${when} | ${slot.reel.id} | "${caption}"`);
      filled = slot.index + 1;
      continue;
    }

    try {
      const filePath = await downloadReel(slot.reel);

      const videoId = await uploadShort({
        filePath,
        title: caption,
        description: buildDescription(slot.reel, caption),
        scheduledAt: isImmediate ? undefined : slot.time,
      });

      // Delete video immediately
      await deleteVideo(filePath);

      filled = slot.index + 1;
      console.log(`  ${when} | ${videoId} | "${caption}"`);

      // Gentle delay between uploads (5s) to avoid quota issues
      await sleep(5000);
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

  // 5. Persist progress
  if (filled > campaign.slotsFilled && !dryRun) {
    await saveCampaign({ ...campaign, slotsFilled: filled });
  }

  const stillRemaining = total - filled;

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  RESULTADO                                                   ║
║  ${String(filled - cursor)}/${String(count)} vídeos ${dryRun ? "simulados" : "agendados"}                                   ║
║  Total agendado: ${String(filled).padEnd(4)} / ${String(total).padEnd(4)}                           ║
║  Ainda faltam:   ${String(stillRemaining).padEnd(4)} slots                            ║
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

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
