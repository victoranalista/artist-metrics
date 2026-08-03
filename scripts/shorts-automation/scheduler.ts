/**
 * Scheduler que reabastece a campanha de Shorts todo dia.
 *
 * Roda `run-batch` as 08:00 BRT, que sobe o maximo que a quota da YouTube Data
 * API permitir naquele dia. Como o canal publica 3/dia e a quota costuma dar
 * mais que isso, a fila agendada cresce sozinha ate cobrir 31/12/2027.
 *
 * Este processo precisa ficar vivo. Na maquina do dia a dia, prefira o Agendador
 * de Tarefas do Windows (sobrevive a reboot e nao exige terminal aberto):
 *
 *   schtasks /Create /TN "ShortsKailany" /SC DAILY /ST 08:00 /F ^
 *     /TR "cmd /c cd /d <repo> && pnpm shorts:batch >> data\\shorts-cron.log 2>&1"
 *
 * Em servidor, use PM2:
 *   pm2 start "pnpm tsx scripts/shorts-automation/scheduler.ts" --name shorts-scheduler
 */

import "dotenv/config";
import cron from "node-cron";
import { execSync } from "child_process";
import { join } from "path";

const SCRIPT_PATH = join(__dirname, "run-batch.ts");

function runAutomation() {
  console.log(`[${new Date().toISOString()}] Reabastecendo a campanha...`);
  try {
    execSync(`pnpm tsx "${SCRIPT_PATH}"`, {
      cwd: join(__dirname, "../.."),
      stdio: "inherit",
      timeout: 3_600_000, // 1h: o lote vai ate a quota estourar
    });
    console.log(`[${new Date().toISOString()}] Concluido.`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro na automacao:`, err);
  }
}

// Todo dia as 08:00 BRT
cron.schedule("0 8 * * *", runAutomation, { timezone: "America/Sao_Paulo" });

console.log(`
╔══════════════════════════════════════════════════════════════╗
║  SHORTS SCHEDULER ATIVO                                      ║
║  Proxima execucao: todo dia as 08:00 BRT                     ║
║  Sobe o maximo que a quota permitir por dia                  ║
║                                                              ║
║  Executar agora:  pnpm shorts:batch                          ║
║  Simular:         pnpm shorts:batch:dry                      ║
║  Ver progresso:   pnpm shorts:status                         ║
╚══════════════════════════════════════════════════════════════╝
`);

process.on("SIGINT", () => {
  console.log("\nScheduler encerrado.");
  process.exit(0);
});
