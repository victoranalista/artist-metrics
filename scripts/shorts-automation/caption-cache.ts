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

/**
 * Legenda do reel, gerada pela IA na primeira vez e reusada em toda repeticao.
 *
 * Deixa o erro da IA subir de proposito. Cair num fallback generico aqui
 * gravaria uma legenda ruim no cache e ela seria reusada nas ~26 repeticoes
 * daquele reel — e o pedido era legenda viral. Melhor a execucao parar e o
 * agendador tentar de novo amanha: o que ja foi gerado esta no cache, entao
 * nada se perde.
 */
export async function getCaption(reelId: string, originalCaption: string): Promise<{ caption: string; fromCache: boolean }> {
  const cache = await load();

  if (cache[reelId]) return { caption: cache[reelId], fromCache: true };

  const caption = await generateShortCaption(originalCaption || "Louvor gospel emocionante");
  cache[reelId] = caption;
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
  return { caption, fromCache: false };
}

/** Quantos reels ja tem legenda definitiva. */
export async function cachedCount(): Promise<number> {
  return Object.keys(await load()).length;
}
