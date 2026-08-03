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
