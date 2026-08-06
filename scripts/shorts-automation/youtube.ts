import "dotenv/config";
import { google } from "googleapis";
import { readFileSync, createReadStream } from "fs";

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  "http://localhost:3000/oauth2callback",
);

if (REFRESH_TOKEN) {
  oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
}

const youtube = google.youtube({ version: "v3", auth: oauth2Client });

export interface UploadOptions {
  filePath: string;
  title: string;
  description: string;
  scheduledAt?: Date; // ISO date for scheduled publish
  tags?: string[];
  categoryId?: string; // 10 = Music
}

export async function uploadShort(options: UploadOptions): Promise<string> {
  const {
    filePath,
    title,
    description,
    scheduledAt,
    tags = ["gospel", "louvor", "adoracao", "musica gospel", "shorts", "Jesus"],
    categoryId = "10", // Music
  } = options;

  const isScheduled = scheduledAt && scheduledAt > new Date();

  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: title.substring(0, 100),
        description,
        tags,
        categoryId,
        defaultLanguage: "pt-BR",
        defaultAudioLanguage: "pt-BR",
      },
      status: {
        privacyStatus: isScheduled ? "private" : "public",
        publishAt: isScheduled ? scheduledAt.toISOString() : undefined,
        selfDeclaredMadeForKids: false,
        embeddable: true,
      },
    },
    media: {
      body: createReadStream(filePath),
    },
  });

  const videoId = res.data.id!;
  const videoUrl = `https://youtube.com/shorts/${videoId}`;

  console.log(`Uploaded: ${videoUrl}`);
  if (isScheduled) {
    console.log(`  Scheduled for: ${scheduledAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`);
  }

  return videoId;
}

/** Tres publicacoes por dia, em horario de Brasilia. */
export const PUBLISH_HOURS_BRT = [12, 18, 21];

/** Brasil nao usa horario de verao desde 2019, entao BRT e sempre UTC-3. */
const BRT_OFFSET_HOURS = 3;

/**
 * Converte "dia D as H horas em Sao Paulo" no instante absoluto correspondente.
 *
 * O Y/M/D e lido no fuso de Sao Paulo e a hora e montada direto em UTC, para o
 * resultado nao depender do fuso da maquina que executa o script. Hora 24
 * (21h BRT) rola sozinha para o dia seguinte em UTC, que e o mesmo instante.
 */
export function getPublishTime(date: Date, hourBRT: number): Date {
  const [day, month, year] = date
    .toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
    .split("/")
    .map(Number);
  return new Date(Date.UTC(year, month - 1, day, hourBRT + BRT_OFFSET_HOURS, 0, 0));
}

/** Os 3 horarios do dia que contem `date`. */
export function getScheduleTimes(date: Date): Date[] {
  return PUBLISH_HOURS_BRT.map((h) => getPublishTime(date, h));
}

/** Slot global `index` da campanha (3 por dia) contado a partir de `startDate`. */
export function getSlotTime(startDate: Date, index: number): Date {
  const dayOffset = Math.floor(index / PUBLISH_HOURS_BRT.length);
  const hour = PUBLISH_HOURS_BRT[index % PUBLISH_HOURS_BRT.length];
  return getPublishTime(new Date(startDate.getTime() + dayOffset * 86_400_000), hour);
}

export function getScheduleTimesForDays(startDate: Date, days: number): Date[] {
  const times: Date[] = [];
  for (let i = 0; i < days; i++) {
    times.push(...getScheduleTimes(new Date(startDate.getTime() + i * 86_400_000)));
  }
  return times;
}

/**
 * Em que slot da campanha cai `date`, ou null se nao cair em nenhum.
 * Inverso de getSlotTime.
 */
function slotIndexOf(startDate: Date, date: Date): number | null {
  const hour = Number(
    date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }),
  );
  const slotOfDay = PUBLISH_HOURS_BRT.indexOf(hour);
  if (slotOfDay < 0) return null;

  const ymd = (d: Date) =>
    d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }).split("/").map(Number);
  const [d1, m1, y1] = ymd(date);
  const [d0, m0, y0] = ymd(startDate);
  const days = Math.round((Date.UTC(y1, m1 - 1, d1) - Date.UTC(y0, m0 - 1, d0)) / 86_400_000);
  if (days < 0) return null;

  return days * PUBLISH_HOURS_BRT.length + slotOfDay;
}

/**
 * Slots que ja tem video agendado, lidos do proprio canal.
 *
 * O YouTube e a fonte de verdade em vez de um contador local: contador quebra
 * se o processo morrer no meio, se duas execucoes rodarem juntas ou se um
 * upload falhar — e cada um desses casos deixa buraco silencioso na agenda.
 * Custa ~12 unidades de quota por execucao, irrelevante perto das 1.600 de um
 * upload, e permite reocupar buracos automaticamente.
 */
export async function getOccupiedSlots(startDate: Date): Promise<Set<number>> {
  const ch = await youtube.channels.list({ part: ["contentDetails"], mine: true });
  const uploads = ch.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) return new Set();

  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const page = await youtube.playlistItems.list({
      part: ["contentDetails"],
      playlistId: uploads,
      maxResults: 50,
      pageToken,
    });
    ids.push(...(page.data.items ?? []).map((i) => i.contentDetails!.videoId!));
    pageToken = page.data.nextPageToken ?? undefined;
  } while (pageToken);

  const occupied = new Set<number>();
  const colisoes: number[] = [];

  for (let i = 0; i < ids.length; i += 50) {
    const batch = await youtube.videos.list({ part: ["status"], id: ids.slice(i, i + 50).join(",") });
    for (const v of batch.data.items ?? []) {
      if (!v.status?.publishAt) continue;
      const slot = slotIndexOf(startDate, new Date(v.status.publishAt));
      if (slot === null) continue;
      if (occupied.has(slot)) colisoes.push(slot);
      occupied.add(slot);
    }
  }

  // A varredura ja passou por tudo, entao avisar sai de graca. Duas duplicatas
  // reais ja escaparam por falta desse aviso: quando o indice do YouTube esta
  // atrasado, dois videos acabam no mesmo horario sem nada reclamar.
  if (colisoes.length > 0) {
    console.warn(`ATENÇÃO: ${colisoes.length} horário(s) com mais de um vídeo agendado (slots ${colisoes.join(", ")}).`);
    console.warn("  Desagende os extras no YouTube Studio antes que publiquem.");
  }

  return occupied;
}

export async function checkQuota(): Promise<boolean> {
  try {
    await youtube.channels.list({ part: ["snippet"], mine: true });
    return true;
  } catch (err: any) {
    if (err.code === 403) {
      console.error("YouTube API quota exceeded or no access");
      return false;
    }
    throw err;
  }
}
