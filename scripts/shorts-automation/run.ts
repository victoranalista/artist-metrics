/**
 * Orquestrador principal - Baixa reels do Instagram e agenda no YouTube como Shorts
 *
 * Uso:
 *   pnpm tsx scripts/shorts-automation/run.ts              # Agenda 7 dias (21 videos)
 *   pnpm tsx scripts/shorts-automation/run.ts --days 14    # Agenda 14 dias (42 videos)
 *   pnpm tsx scripts/shorts-automation/run.ts --dry-run    # Simula sem enviar
 */

import "dotenv/config";
import { selectRandomReels, downloadReel, markAsPosted, deleteVideo, cleanupVideos, type Reel } from "./instagram";
import { generateBatchCaptions } from "./captions";
import { uploadShort, getScheduleTimesForDays, checkQuota } from "./youtube";

const VIDEOS_PER_DAY = 3;

async function main() {
  const args = process.argv.slice(2);
  const daysIndex = args.indexOf("--days");
  const days = daysIndex !== -1 ? parseInt(args[daysIndex + 1]) : 7;
  const dryRun = args.includes("--dry-run");

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  SHORTS AUTOMATION - Kailany Gospel                          ║
║  ${dryRun ? "MODO SIMULAÇÃO" : "MODO PRODUÇÃO"}                                           ║
╚══════════════════════════════════════════════════════════════╝
  `);

  const totalVideos = days * VIDEOS_PER_DAY;
  console.log(`Planejando: ${totalVideos} videos para ${days} dias\n`);

  // 1. Check YouTube API access
  if (!dryRun) {
    console.log("[1/5] Verificando acesso YouTube API...");
    const hasAccess = await checkQuota();
    if (!hasAccess) {
      console.error("Sem acesso ao YouTube. Execute setup-youtube.ts primeiro.");
      process.exit(1);
    }
    console.log("  YouTube API OK\n");
  } else {
    console.log("[1/5] YouTube API check (SKIP - dry run)\n");
  }

  // 2. Fetch reels from Instagram
  console.log("[2/5] Buscando reels do Instagram...");
  const reels = await selectRandomReels(totalVideos);
  console.log(`  ${reels.length} reels selecionados\n`);

  if (reels.length === 0) {
    console.error("Nenhum reel disponivel!");
    process.exit(1);
  }

  // 3. Generate captions
  console.log("[3/5] Gerando legendas virais com IA...");
  const captions = await generateBatchCaptions(reels);
  console.log();

  // 4. Download videos
  console.log("[4/5] Baixando videos...");
  const downloads = new Map<string, string>();
  for (const reel of reels) {
    try {
      const path = await downloadReel(reel);
      downloads.set(reel.id, path);
    } catch (err) {
      console.error(`  Falha ao baixar ${reel.id}:`, err);
    }
  }
  console.log(`  ${downloads.size}/${reels.length} baixados\n`);

  // 5. Upload and schedule
  console.log("[5/5] Fazendo upload e agendando...");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const scheduleTimes = getScheduleTimesForDays(tomorrow, days);
  const uploadedIds: string[] = [];
  let uploadIndex = 0;

  for (const reel of reels) {
    const filePath = downloads.get(reel.id);
    if (!filePath) continue;

    const caption = captions.get(reel.id) || `${reel.caption.substring(0, 70)} #gospel #louvor #shorts`;
    const scheduleTime = scheduleTimes[uploadIndex];

    if (!scheduleTime) break;

    const dayStr = scheduleTime.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const timeStr = scheduleTime.toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    });

    if (dryRun) {
      console.log(`  [DRY] ${dayStr} ${timeStr} | "${caption}"`);
      uploadedIds.push(reel.id);
    } else {
      try {
        const videoId = await uploadShort({
          filePath,
          title: caption,
          description: buildDescription(reel, caption),
          scheduledAt: scheduleTime,
        });
        uploadedIds.push(reel.id);
        console.log(`  ${dayStr} ${timeStr} | ${videoId} | "${caption}"`);
      } catch (err: any) {
        console.error(`  ERRO upload ${reel.id}: ${err.message}`);
        if (err.code === 403 && err.message?.includes("quota")) {
          console.error("  Quota YouTube excedida! Parando uploads.");
          break;
        }
      }
    }

    uploadIndex++;
  }

  // Mark posted reels
  if (uploadedIds.length > 0 && !dryRun) {
    await markAsPosted(uploadedIds);
  }

  // 6. Cleanup - delete downloaded videos to free disk space
  if (!dryRun && downloads.size > 0) {
    console.log("\n[6/6] Limpando videos baixados...");
    for (const [, filePath] of downloads) {
      await deleteVideo(filePath);
    }
    console.log(`  ${downloads.size} videos removidos do disco`);
  }

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  RESULTADO                                                   ║
║  ${uploadedIds.length}/${totalVideos} videos ${dryRun ? "simulados" : "agendados"}                              ║
║  Periodo: ${tomorrow.toLocaleDateString("pt-BR")} a ${new Date(tomorrow.getTime() + (days - 1) * 86400000).toLocaleDateString("pt-BR")}                  ║
║  Horarios: 12:00, 18:00, 21:00 (BRT)                        ║
║  Disco: limpo (videos removidos apos upload)                 ║
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

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
