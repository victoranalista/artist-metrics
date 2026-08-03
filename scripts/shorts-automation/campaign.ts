/**
 * Estado da campanha de Shorts.
 *
 * A campanha e uma fila continua de slots (3 por dia: 12:00, 18:00 e 21:00 BRT)
 * que vai de `startDate` ate `CAMPAIGN_END`. Como o catalogo de reels e menor que
 * o numero de slots, os videos se repetem ciclicamente.
 *
 * `slotsFilled` e o que permite retomar: a quota da YouTube Data API so deixa
 * subir ~6 videos por dia, entao a campanha inteira e enviada ao longo de varias
 * execucoes. Guardar quantos slots ja foram preenchidos faz a proxima execucao
 * continuar exatamente de onde parou, sem buraco nem sobreposicao.
 */

import { readFile, writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(__dirname, "../../data");
const CAMPAIGN_FILE = join(DATA_DIR, "shorts-campaign.json");

/**
 * Ultimo dia da campanha (inclusive), em BRT.
 *
 * Estender e so trocar o ano: os slots ocupados sao lidos do proprio canal,
 * entao nada ja agendado e reagendado — a fila apenas ganha mais slots no fim.
 */
export const CAMPAIGN_END = new Date("2027-12-31T23:59:59-03:00");

export interface Campaign {
  /** YYYY-MM-DD no fuso de Sao Paulo */
  startDate: string;
  /** Quantos slots ja foram preenchidos desde o inicio */
  slotsFilled: number;
}

function todayInSaoPaulo(): string {
  const [day, month, year] = new Date()
    .toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
    .split("/");
  return `${year}-${month}-${day}`;
}

export async function getCampaign(): Promise<Campaign> {
  await mkdir(DATA_DIR, { recursive: true });

  if (!existsSync(CAMPAIGN_FILE)) {
    const campaign: Campaign = { startDate: todayInSaoPaulo(), slotsFilled: 0 };
    await writeFile(CAMPAIGN_FILE, JSON.stringify(campaign, null, 2));
    return campaign;
  }

  return JSON.parse(await readFile(CAMPAIGN_FILE, "utf-8")) as Campaign;
}

const LOCK_FILE = join(DATA_DIR, "shorts-batch.lock");

/**
 * Impede duas execucoes ao mesmo tempo.
 *
 * Duas rodadas simultaneas agendam por cima uma da outra e deixam a agenda
 * cheia de buracos — aconteceu de fato: tres processos vivos ao mesmo tempo
 * abriram 147 buracos. O lock guarda o PID e e ignorado se o dono ja morreu,
 * entao um crash nao deixa a automacao travada para sempre.
 */
export async function acquireLock(): Promise<boolean> {
  await mkdir(DATA_DIR, { recursive: true });

  if (existsSync(LOCK_FILE)) {
    const pid = Number((await readFile(LOCK_FILE, "utf-8")).trim());
    if (pid && pid !== process.pid && isAlive(pid)) return false;
  }

  await writeFile(LOCK_FILE, String(process.pid));
  return true;
}

export async function releaseLock(): Promise<void> {
  try {
    if (existsSync(LOCK_FILE)) await unlink(LOCK_FILE);
  } catch {
    // Nao critico
  }
}

function isAlive(pid: number): boolean {
  try {
    // Sinal 0 nao mata: so testa se o processo existe.
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function saveCampaign(campaign: Campaign): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CAMPAIGN_FILE, JSON.stringify(campaign, null, 2));
}

/** Meia-noite BRT do dia inicial, base para o calculo dos slots. */
export function campaignStartDate(campaign: Campaign): Date {
  return new Date(`${campaign.startDate}T00:00:00-03:00`);
}

/** Quantos slots cabem entre o inicio da campanha e `CAMPAIGN_END`. */
export function totalSlots(campaign: Campaign, slotsPerDay: number): number {
  const start = new Date(`${campaign.startDate}T00:00:00-03:00`);
  const days = Math.floor((CAMPAIGN_END.getTime() - start.getTime()) / 86_400_000) + 1;
  return days * slotsPerDay;
}
