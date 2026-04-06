/**
 * Scheduler que roda em background e reabastece os Shorts automaticamente.
 * Executa toda segunda-feira as 08:00 BRT para agendar a semana inteira.
 *
 * Uso:
 *   pnpm tsx scripts/shorts-automation/scheduler.ts
 *
 * Para rodar como serviço, use PM2:
 *   pm2 start "pnpm tsx scripts/shorts-automation/scheduler.ts" --name shorts-scheduler
 */

import "dotenv/config";
import cron from "node-cron";
import { execSync } from "child_process";
import { join } from "path";

const SCRIPT_PATH = join(__dirname, "run.ts");

function runAutomation() {
  console.log(`[${new Date().toISOString()}] Iniciando automacao semanal...`);
  try {
    execSync(`pnpm tsx "${SCRIPT_PATH}" --days 7`, {
      cwd: join(__dirname, "../.."),
      stdio: "inherit",
      timeout: 600_000, // 10 min max
    });
    console.log(`[${new Date().toISOString()}] Automacao concluida com sucesso!`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro na automacao:`, err);
  }
}

// Toda segunda-feira as 08:00 BRT (11:00 UTC)
cron.schedule("0 11 * * 1", () => {
  runAutomation();
}, {
  timezone: "America/Sao_Paulo",
});

console.log(`
╔══════════════════════════════════════════════════════════════╗
║  SHORTS SCHEDULER ATIVO                                      ║
║  Proxima execucao: Segunda-feira 08:00 BRT                   ║
║  Agenda 21 videos por semana (3/dia)                         ║
║                                                              ║
║  Para executar agora: pnpm shorts:run                        ║
║  Para simular: pnpm shorts:dry-run                           ║
╚══════════════════════════════════════════════════════════════╝
`);

// Keep alive
process.on("SIGINT", () => {
  console.log("\nScheduler encerrado.");
  process.exit(0);
});
