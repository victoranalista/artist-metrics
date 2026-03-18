import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createDecipheriv, createCipheriv, randomBytes } from "crypto";

const dbUrl = new URL(process.env.DATABASE_URL!);
dbUrl.searchParams.set("sslmode", "verify-full");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: dbUrl.toString() }),
});

function decrypt(data: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");
  const [ivHex, tagHex, encHex] = data.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

async function refreshToken(refreshTokenEnc: string): Promise<string> {
  const refreshToken = decrypt(refreshTokenEnc);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error("Token refresh failed: " + JSON.stringify(data));
  }
  return data.access_token;
}

async function main() {
  const ARTIST_ID = "default-artist";

  // Get YouTube connection
  const conn = await prisma.platformConnection.findFirst({
    where: { artistId: ARTIST_ID, platform: "YOUTUBE", status: "ACTIVE" },
  });

  if (!conn) {
    console.log("Nenhuma conexão YouTube ativa encontrada");
    return;
  }

  // Get valid access token
  let accessToken: string;
  try {
    accessToken = decrypt(conn.accessToken);
    // Test if token works
    const testRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!testRes.ok) throw new Error("Token expired");
  } catch {
    if (!conn.refreshToken) {
      console.log("Sem refresh token, não é possível renovar");
      return;
    }
    console.log("Renovando token...");
    accessToken = await refreshToken(conn.refreshToken);
  }

  console.log("Token válido. Buscando dados...\n");

  // ── YouTube Analytics: daily data for last 90 days ──
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const metrics = "views,estimatedMinutesWatched,subscribersGained,subscribersLost,likes,comments,shares";

  console.log(`Buscando Analytics de ${startDate} a ${endDate}...`);

  const analyticsRes = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}&metrics=${metrics}&dimensions=day&sort=day`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const analyticsData = await analyticsRes.json();

  if (analyticsData.error) {
    console.error("Erro Analytics:", JSON.stringify(analyticsData.error, null, 2));
    return;
  }

  if (!analyticsData.rows || analyticsData.rows.length === 0) {
    console.log("Nenhum dado de analytics encontrado");
    return;
  }

  console.log(`${analyticsData.rows.length} dias de dados encontrados\n`);

  // Get current channel stats for base subscriber count
  const channelRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const channelData = await channelRes.json();
  const currentSubs = parseInt(channelData.items?.[0]?.statistics?.subscriberCount ?? "0", 10);
  const currentViews = parseInt(channelData.items?.[0]?.statistics?.viewCount ?? "0", 10);

  console.log(`Canal: ${currentSubs} inscritos, ${currentViews} views totais\n`);

  // Calculate daily subscriber count by working backwards from current
  // analyticsData.rows = [date, views, minutesWatched, subsGained, subsLost, likes, comments, shares]
  const rows = analyticsData.rows as (string | number)[][];

  // First pass: calculate net subscribers change per day
  const dailyData: {
    date: string;
    views: number;
    minutesWatched: number;
    subsGained: number;
    subsLost: number;
    likes: number;
    comments: number;
    shares: number;
  }[] = [];

  let totalNetSubs = 0;
  for (const row of rows) {
    const gained = (row[3] as number) || 0;
    const lost = (row[4] as number) || 0;
    totalNetSubs += gained - lost;
    dailyData.push({
      date: row[0] as string,
      views: (row[1] as number) || 0,
      minutesWatched: (row[2] as number) || 0,
      subsGained: gained,
      subsLost: lost,
      likes: (row[5] as number) || 0,
      comments: (row[6] as number) || 0,
      shares: (row[7] as number) || 0,
    });
  }

  // Calculate estimated subscribers for each day (working backwards from current)
  const baseSubs = currentSubs - totalNetSubs;

  let runningSubs = baseSubs;
  let runningViews = currentViews;
  // Calculate total views in period to work backwards
  const totalPeriodViews = dailyData.reduce((s, d) => s + d.views, 0);
  const baseViews = currentViews - totalPeriodViews;
  let cumulativeViews = 0;

  // Save each day as a snapshot
  let saved = 0;
  for (const day of dailyData) {
    runningSubs += day.subsGained - day.subsLost;
    cumulativeViews += day.views;

    const date = new Date(day.date);
    date.setHours(0, 0, 0, 0);

    const engagementRate = day.views > 0
      ? (day.likes + day.comments) / day.views
      : 0;

    try {
      await prisma.metricsSnapshot.upsert({
        where: {
          artistId_platform_date: {
            artistId: ARTIST_ID,
            platform: "YOUTUBE",
            date,
          },
        },
        update: {
          followers: runningSubs,
          totalViews: baseViews + cumulativeViews,
          totalLikes: day.likes,
          totalComments: day.comments,
          totalShares: day.shares,
          engagementRate,
          platformData: {
            dailyViews: day.views,
            minutesWatched: day.minutesWatched,
            hoursWatched: Math.round(day.minutesWatched / 60),
            subsGained: day.subsGained,
            subsLost: day.subsLost,
            netSubs: day.subsGained - day.subsLost,
          },
        },
        create: {
          artistId: ARTIST_ID,
          platform: "YOUTUBE",
          date,
          followers: runningSubs,
          totalViews: baseViews + cumulativeViews,
          totalLikes: day.likes,
          totalComments: day.comments,
          totalShares: day.shares,
          engagementRate,
          platformData: {
            dailyViews: day.views,
            minutesWatched: day.minutesWatched,
            hoursWatched: Math.round(day.minutesWatched / 60),
            subsGained: day.subsGained,
            subsLost: day.subsLost,
            netSubs: day.subsGained - day.subsLost,
          },
        },
      });
      saved++;
    } catch (e) {
      console.error(`Erro ao salvar ${day.date}:`, e);
    }
  }

  console.log(`${saved} snapshots YouTube salvos (${startDate} a ${endDate})`);

  // Show some stats
  const totalViews = dailyData.reduce((s, d) => s + d.views, 0);
  const totalLikes = dailyData.reduce((s, d) => s + d.likes, 0);
  const totalComments = dailyData.reduce((s, d) => s + d.comments, 0);
  const totalMinutes = dailyData.reduce((s, d) => s + d.minutesWatched, 0);

  console.log(`\n=== RESUMO 90 DIAS ===`);
  console.log(`Views: ${totalViews.toLocaleString()}`);
  console.log(`Likes: ${totalLikes.toLocaleString()}`);
  console.log(`Comentários: ${totalComments.toLocaleString()}`);
  console.log(`Horas assistidas: ${Math.round(totalMinutes / 60).toLocaleString()}`);
  console.log(`Inscritos ganhos: ${dailyData.reduce((s, d) => s + d.subsGained, 0).toLocaleString()}`);
  console.log(`Inscritos perdidos: ${dailyData.reduce((s, d) => s + d.subsLost, 0).toLocaleString()}`);
  console.log(`Saldo: +${totalNetSubs}`);
  console.log(`Inscritos estimados: ${baseSubs} → ${currentSubs}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
