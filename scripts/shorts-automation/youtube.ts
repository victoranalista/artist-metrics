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

export function getScheduleTimes(date: Date): Date[] {
  // 12:00, 18:00, 21:00 BRT (UTC-3)
  const hours = [12, 18, 21];
  return hours.map((h) => {
    const d = new Date(date);
    d.setHours(h + 3, 0, 0, 0); // Convert BRT to UTC
    return d;
  });
}

export function getScheduleTimesForDays(startDate: Date, days: number): Date[] {
  const times: Date[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(startDate);
    day.setDate(day.getDate() + i);
    times.push(...getScheduleTimes(day));
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
