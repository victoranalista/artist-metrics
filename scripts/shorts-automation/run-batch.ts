/**
 * Upload em lotes de 10 videos - continua de onde parou.
 * Agenda 3 videos/dia nos horarios 12:00, 18:00, 21:00 BRT.
 *
 * Uso:
 *   pnpm tsx scripts/shorts-automation/run-batch.ts              # Próximo lote de 10
 *   pnpm tsx scripts/shorts-automation/run-batch.ts --batch 20   # Lote de 20
 *   pnpm tsx scripts/shorts-automation/run-batch.ts --dry-run    # Simular
 *   pnpm tsx scripts/shorts-automation/run-batch.ts --status     # Ver progresso
 */

import "dotenv/config";
import { getReelsList, getPostedReels, markAsPosted, downloadReel, deleteVideo, type Reel } from "./instagram";
import { generateShortCaption } from "./captions";
import { uploadShort, getScheduleTimesForDays, checkQuota } from "./youtube";

const VIDEOS_PER_DAY = 3;

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const statusOnly = args.includes("--status");
  const batchIdx = args.indexOf("--batch");
  const batchSize = batchIdx !== -1 ? parseInt(args[batchIdx + 1]) : 10;

  const allReels = await getReelsList();
  const posted = await getPostedReels();
  const remaining = allReels.filter((r) => !posted.includes(r.id));

  if (statusOnly) {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  STATUS - Shorts Automation                                  ║
╠══════════════════════════════════════════════════════════════╣
║  Total reels:     ${String(allReels.length).padEnd(39)}║
║  Já postados:     ${String(posted.length).padEnd(39)}║
║  Restantes:       ${String(remaining.length).padEnd(39)}║
║  Dias restantes:  ${String(Math.ceil(remaining.length / VIDEOS_PER_DAY)).padEnd(39)}║
╚══════════════════════════════════════════════════════════════╝
    `);
    return;
  }

  const batch = remaining.slice(0, batchSize);
  const daysNeeded = Math.ceil(batch.length / VIDEOS_PER_DAY);

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  SHORTS BATCH UPLOAD                                         ║
║  ${dryRun ? "MODO SIMULAÇÃO" : "MODO PRODUÇÃO"}                                           ║
╠══════════════════════════════════════════════════════════════╣
║  Lote: ${String(batch.length).padEnd(3)} videos | ${String(daysNeeded).padEnd(2)} dias                              ║
║  Já postados: ${String(posted.length).padEnd(3)} | Restantes: ${String(remaining.length).padEnd(3)}                   ║
╚══════════════════════════════════════════════════════════════╝
  `);

  if (batch.length === 0) {
    console.log("Todos os reels já foram postados!");
    return;
  }

  // 1. Check YouTube API
  if (!dryRun) {
    console.log("[1/5] Verificando YouTube API...");
    const ok = await checkQuota();
    if (!ok) { console.error("YouTube API indisponível."); process.exit(1); }
    console.log("  OK\n");
  }

  // 2. Calculate schedule times starting after last posted
  // Find the next available date (after 10/04/2026 or tomorrow, whichever is later)
  const minDate = new Date("2026-04-11T00:00:00-03:00");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const startDate = minDate > tomorrow ? minDate : tomorrow;

  // Offset by number of already scheduled days (posted / 3)
  const daysOffset = Math.ceil(posted.length / VIDEOS_PER_DAY);
  const scheduleStart = new Date(startDate);
  // Only offset past the 10 already posted
  const alreadyScheduledDays = Math.ceil(10 / VIDEOS_PER_DAY); // 10 videos = ~4 days (07-10/04)
  if (daysOffset > alreadyScheduledDays) {
    scheduleStart.setDate(scheduleStart.getDate() + (daysOffset - alreadyScheduledDays));
  }

  const scheduleTimes = getScheduleTimesForDays(scheduleStart, daysNeeded);

  console.log(`[2/5] Periodo: ${scheduleStart.toLocaleDateString("pt-BR")} em diante\n`);

  // 3. Generate captions
  console.log("[3/5] Gerando legendas...");
  const captions = new Map<string, string>();
  for (const reel of batch) {
    try {
      const caption = await generateShortCaption(reel.caption || "Louvor gospel emocionante");
      captions.set(reel.id, caption);
      console.log(`  ${reel.id}: ${caption} (${caption.length})`);
      // Gentle delay between AI calls
      await sleep(1000);
    } catch (err) {
      captions.set(reel.id, `Louvor que toca a alma 🎶 #gospel #louvor #shorts`);
    }
  }

  // 4. Download, upload, delete - one at a time
  console.log("\n[4/5] Download + Upload + Cleanup...");
  const uploadedIds: string[] = [];
  let schedIdx = 0;

  for (const reel of batch) {
    const schedTime = scheduleTimes[schedIdx];
    if (!schedTime) break;

    const caption = captions.get(reel.id) || "Louvor gospel 🎶 #gospel #louvor #shorts";
    const dayStr = schedTime.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const timeStr = schedTime.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

    if (dryRun) {
      console.log(`  [DRY] ${dayStr} ${timeStr} | ${reel.id} | "${caption}"`);
      uploadedIds.push(reel.id);
      schedIdx++;
      continue;
    }

    try {
      // Download
      const filePath = await downloadReel(reel);

      // Upload
      const videoId = await uploadShort({
        filePath,
        title: caption,
        description: buildDescription(reel, caption),
        scheduledAt: schedTime,
      });

      // Delete video immediately
      await deleteVideo(filePath);

      uploadedIds.push(reel.id);
      console.log(`  ${dayStr} ${timeStr} | ${videoId} | "${caption}"`);

      // Gentle delay between uploads (5s) to avoid quota issues
      await sleep(5000);
    } catch (err: any) {
      console.error(`  ERRO ${reel.id}: ${err.message}`);
      if (err.code === 403 || err.message?.includes("quota")) {
        console.error("  Quota excedida! Parando.");
        break;
      }
      // Continue with next on other errors
      await sleep(3000);
    }

    schedIdx++;
  }

  // 5. Mark as posted
  if (uploadedIds.length > 0 && !dryRun) {
    await markAsPosted(uploadedIds);
  }

  const newTotal = posted.length + uploadedIds.length;
  const stillRemaining = allReels.length - newTotal;

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  RESULTADO DO LOTE                                           ║
║  ${uploadedIds.length}/${batch.length} videos ${dryRun ? "simulados" : "agendados"}                                 ║
║  Total postados: ${String(newTotal).padEnd(3)} / ${String(allReels.length).padEnd(3)}                              ║
║  Ainda restam:   ${String(stillRemaining).padEnd(3)} videos                              ║
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
