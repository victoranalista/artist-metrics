/**
 * Cache de legendas por reel.
 *
 * O catalogo tem 60 reels para 1.548 slots, entao cada video reaparece ~26
 * vezes. Sem cache seriam 1.548 chamadas de IA para gerar 60 textos distintos.
 * A legenda de um reel e gerada uma vez e reusada em todas as repeticoes dele.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { generateShortCaption } from "./captions";

const DATA_DIR = join(__dirname, "../../data");
const CACHE_FILE = join(DATA_DIR, "captions-cache.json");

type Cache = Record<string, string>;

let memo: Cache | null = null;

async function load(): Promise<Cache> {
  if (memo) return memo;
  await mkdir(DATA_DIR, { recursive: true });
  memo = existsSync(CACHE_FILE)
    ? (JSON.parse(await readFile(CACHE_FILE, "utf-8")) as Cache)
    : {};
  return memo;
}

/** Legenda derivada do texto do proprio reel, quando a IA nao esta disponivel. */
function daLegendaOriginal(originalCaption: string): string {
  const base = (originalCaption || "Louvor gospel emocionante").split("\n")[0].trim();
  const tags = " #gospel #louvor #shorts";
  return `${base.slice(0, 100 - tags.length)}${tags}`;
}

/**
 * Legenda do reel, gerada uma vez e reusada em toda repeticao dele.
 *
 * Sem IA disponivel cai na legenda original do Instagram — texto da propria
 * artista, aprovado pelo usuario para esse uso — e grava no cache mesmo assim.
 * Deixar a execucao abortar aqui travaria a renovacao automatica: todo reel
 * novo que aparecesse no perfil pararia a campanha ate alguem por credito na
 * conta da OpenAI, e o objetivo e justamente nao depender de ninguem.
 */
export async function getCaption(reelId: string, originalCaption: string): Promise<{ caption: string; fromCache: boolean; fromAI: boolean }> {
  const cache = await load();

  if (cache[reelId]) return { caption: cache[reelId], fromCache: true, fromAI: false };

  let caption: string;
  let fromAI = true;
  try {
    caption = await generateShortCaption(originalCaption || "Louvor gospel emocionante");
  } catch {
    caption = daLegendaOriginal(originalCaption);
    fromAI = false;
  }

  cache[reelId] = caption;
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
  return { caption, fromCache: false, fromAI };
}

/** Quantos reels ja tem legenda definitiva. */
export async function cachedCount(): Promise<number> {
  return Object.keys(await load()).length;
}
