/**
 * Estado da campanha de Shorts.
 *
 * A campanha e uma fila continua de slots (3 por dia: 12:00, 18:00 e 21:00 BRT)
 * que vai de `startDate` ate `endDate`. Como o catalogo de reels e menor que o
 * numero de slots, os videos se repetem ciclicamente.
 *
 * Quais slots ja estao ocupados NAO fica aqui: vem do proprio canal, via
 * getOccupiedSlots(). Contador local quebrava com crash, upload que falhava ou
 * execucao concorrente, e cada caso desses deixava buraco silencioso na agenda.
 *
 * Quando a fila enche ate `endDate`, o horizonte avanca sozinho um ano e a
 * campanha recomeca — sem reagendar nada do que ja existe.
 */

import { readFile, writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(__dirname, "../../data");
const CAMPAIGN_FILE = join(DATA_DIR, "shorts-campaign.json");
const LOCK_FILE = join(DATA_DIR, "shorts-batch.lock");

/** Ate onde a campanha e planejada na primeira vez que roda. */
const HORIZONTE_INICIAL = "2027-12-31";

export interface Campaign {
  /** YYYY-MM-DD no fuso de Sao Paulo */
  startDate: string;
  /** YYYY-MM-DD no fuso de Sao Paulo, inclusive */
  endDate: string;
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
    const campaign: Campaign = { startDate: todayInSaoPaulo(), endDate: HORIZONTE_INICIAL };
    await writeFile(CAMPAIGN_FILE, JSON.stringify(campaign, null, 2));
    return campaign;
  }

  const salvo = JSON.parse(await readFile(CAMPAIGN_FILE, "utf-8")) as Partial<Campaign>;
  // endDate pode faltar em arquivos gravados por versoes antigas.
  return {
    startDate: salvo.startDate ?? todayInSaoPaulo(),
    endDate: salvo.endDate ?? HORIZONTE_INICIAL,
  };
}

export async function saveCampaign(campaign: Campaign): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CAMPAIGN_FILE, JSON.stringify(campaign, null, 2));
}

/** Meia-noite BRT do dia inicial, base para o calculo dos slots. */
export function campaignStartDate(campaign: Campaign): Date {
  return new Date(`${campaign.startDate}T00:00:00-03:00`);
}

/** Fim do ultimo dia da campanha, em BRT. */
export function campaignEndDate(campaign: Campaign): Date {
  return new Date(`${campaign.endDate}T23:59:59-03:00`);
}

/** Quantos slots cabem entre o inicio e o fim da campanha. */
export function totalSlots(campaign: Campaign, slotsPerDay: number): number {
  const start = campaignStartDate(campaign);
  const days = Math.floor((campaignEndDate(campaign).getTime() - start.getTime()) / 86_400_000) + 1;
  return days * slotsPerDay;
}

/**
 * Empurra o horizonte um ano adiante e devolve a campanha atualizada.
 *
 * Nao mexe em startDate: os indices de slot continuam valendo, entao tudo que
 * ja esta agendado permanece exatamente onde esta e a fila so ganha slots novos
 * no fim.
 */
export async function extendCampaign(campaign: Campaign, anos = 1): Promise<Campaign> {
  const [ano, mes, dia] = campaign.endDate.split("-").map(Number);
  const novo: Campaign = { ...campaign, endDate: `${ano + anos}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}` };
  await saveCampaign(novo);
  return novo;
}

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
