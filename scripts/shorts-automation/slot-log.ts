/**
 * Registro local de qual video ocupou cada slot.
 *
 * Complementa getOccupiedSlots(), que le do canal. A playlist de uploads do
 * YouTube demora a indexar: depois de 96 uploads num dia, ela ainda mostrava
 * 358 videos quando o canal ja tinha 446. Enquanto o slot recem-preenchido nao
 * aparece la, o lote seguinte o considera livre e agenda outro video no mesmo
 * horario — foi assim que nasceu a duplicata de 17/08 21:00.
 *
 * Os dois se cobrem: este arquivo sabe dos uploads recentes que a API ainda nao
 * mostra, e o canal sabe de tudo caso este arquivo se perca.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(__dirname, "../../data");
const SLOTS_FILE = join(DATA_DIR, "shorts-slots.json");

/** slot -> videoId */
type SlotLog = Record<string, string>;

let memo: SlotLog | null = null;

async function load(): Promise<SlotLog> {
  if (memo) return memo;
  await mkdir(DATA_DIR, { recursive: true });
  memo = existsSync(SLOTS_FILE) ? (JSON.parse(await readFile(SLOTS_FILE, "utf-8")) as SlotLog) : {};
  return memo;
}

/** Grava logo apos o upload, para o proximo lote nao reagendar o mesmo slot. */
export async function recordSlot(index: number, videoId: string): Promise<void> {
  const log = await load();
  log[String(index)] = videoId;
  await writeFile(SLOTS_FILE, JSON.stringify(log, null, 2));
}

export async function recordedSlots(): Promise<Set<number>> {
  return new Set(Object.keys(await load()).map(Number));
}

/** Remove um slot do registro — usado quando o agendamento e desfeito. */
export async function forgetSlot(index: number): Promise<void> {
  const log = await load();
  delete log[String(index)];
  await writeFile(SLOTS_FILE, JSON.stringify(log, null, 2));
}
