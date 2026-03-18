import { prisma, ARTIST_ID } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

// ── YouTube Analytics: daily data ──

async function refreshYouTubeToken(refreshTokenEnc: string): Promise<string> {
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
  if (!data.access_token) throw new Error("Token refresh failed");
  return data.access_token;
}

export async function fetchYouTubeHistory(days: number = 28) {
  const conn = await prisma.platformConnection.findFirst({
    where: { artistId: ARTIST_ID, platform: "YOUTUBE", status: "ACTIVE" },
  });
  if (!conn) return { saved: 0, error: "Sem conexão YouTube" };
  if (conn.accessToken === "public-api") return { saved: 0, error: "Conexão pública sem Analytics" };

  let accessToken: string;
  try {
    accessToken = decrypt(conn.accessToken);
    const test = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!test.ok) throw new Error("expired");
  } catch {
    if (!conn.refreshToken) return { saved: 0, error: "Sem refresh token" };
    accessToken = await refreshYouTubeToken(conn.refreshToken);
  }

  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

  const metrics = "views,estimatedMinutesWatched,subscribersGained,subscribersLost,likes,comments,shares";
  const res = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}&metrics=${metrics}&dimensions=day&sort=day`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  if (data.error || !data.rows?.length) return { saved: 0, error: data.error?.message ?? "Sem dados" };

  // Current channel stats
  const chRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const chData = await chRes.json();
  const currentSubs = parseInt(chData.items?.[0]?.statistics?.subscriberCount ?? "0", 10);
  const currentViews = parseInt(chData.items?.[0]?.statistics?.viewCount ?? "0", 10);

  const rows = data.rows as (string | number)[][];
  let totalNetSubs = 0;
  for (const r of rows) totalNetSubs += ((r[3] as number) || 0) - ((r[4] as number) || 0);

  const baseSubs = currentSubs - totalNetSubs;
  const totalPeriodViews = rows.reduce((s, r) => s + ((r[1] as number) || 0), 0);
  const baseViews = currentViews - totalPeriodViews;

  let runningSubs = baseSubs;
  let cumViews = 0;
  let saved = 0;

  for (const row of rows) {
    const dayViews = (row[1] as number) || 0;
    const mins = (row[2] as number) || 0;
    const gained = (row[3] as number) || 0;
    const lost = (row[4] as number) || 0;
    const likes = (row[5] as number) || 0;
    const comments = (row[6] as number) || 0;
    const shares = (row[7] as number) || 0;

    runningSubs += gained - lost;
    cumViews += dayViews;

    const date = new Date(row[0] as string);
    date.setHours(0, 0, 0, 0);

    await prisma.metricsSnapshot.upsert({
      where: { artistId_platform_date: { artistId: ARTIST_ID, platform: "YOUTUBE", date } },
      update: {
        followers: runningSubs,
        totalViews: baseViews + cumViews,
        totalLikes: likes,
        totalComments: comments,
        totalShares: shares,
        engagementRate: dayViews > 0 ? (likes + comments) / dayViews : 0,
        platformData: { dailyViews: dayViews, minutesWatched: mins, hoursWatched: Math.round(mins / 60), subsGained: gained, subsLost: lost, netSubs: gained - lost },
      },
      create: {
        artistId: ARTIST_ID, platform: "YOUTUBE", date,
        followers: runningSubs,
        totalViews: baseViews + cumViews,
        totalLikes: likes, totalComments: comments, totalShares: shares,
        engagementRate: dayViews > 0 ? (likes + comments) / dayViews : 0,
        platformData: { dailyViews: dayViews, minutesWatched: mins, hoursWatched: Math.round(mins / 60), subsGained: gained, subsLost: lost, netSubs: gained - lost },
      },
    });
    saved++;
  }

  return { saved, days: rows.length, subs: currentSubs, views: totalPeriodViews };
}

// ── Instagram Insights: daily data ──

export async function fetchInstagramHistory() {
  const conn = await prisma.platformConnection.findFirst({
    where: { artistId: ARTIST_ID, platform: "INSTAGRAM", status: "ACTIVE" },
  });
  if (!conn) return { saved: 0, error: "Sem conexão Instagram" };
  if (conn.accessToken === "public-api") return { saved: 0, error: "Conexão pública sem Insights" };

  const accessToken = decrypt(conn.accessToken);
  const igId = conn.externalId;
  if (!igId) return { saved: 0, error: "Sem Instagram ID" };

  // Buscar perfil atual
  const profileRes = await fetch(
    `https://graph.facebook.com/v21.0/${igId}?fields=followers_count,media_count&access_token=${accessToken}`
  );
  const profile = await profileRes.json();
  if (profile.error) return { saved: 0, error: profile.error.message };
  const currentFollowers = profile.followers_count ?? 34081;

  // Buscar insights diários (últimos 28 dias)
  const since = new Date(Date.now() - 28 * 86400000).toISOString().split("T")[0];
  const until = new Date().toISOString().split("T")[0];

  const insightsRes = await fetch(
    `https://graph.facebook.com/v21.0/${igId}/insights?metric=reach,follower_count&period=day&since=${since}&until=${until}&access_token=${accessToken}`
  );
  const insights = await insightsRes.json();
  if (insights.error) return { saved: 0, error: insights.error.message };

  const reachData: { date: string; value: number }[] = [];
  const followerData: { date: string; value: number }[] = [];

  for (const metric of insights.data ?? []) {
    const target = metric.name === "reach" ? reachData : followerData;
    for (const v of metric.values ?? []) {
      target.push({ date: v.end_time.split("T")[0], value: v.value });
    }
  }

  // Calcular seguidores cumulativos
  const totalGained = followerData.reduce((s, d) => s + d.value, 0);
  const baseFollowers = currentFollowers - totalGained;

  let runningFollowers = baseFollowers;
  let saved = 0;

  for (let i = 0; i < reachData.length; i++) {
    const reach = reachData[i];
    const gained = followerData[i]?.value ?? 0;
    runningFollowers += gained;

    const date = new Date(reach.date);
    date.setHours(0, 0, 0, 0);

    await prisma.metricsSnapshot.upsert({
      where: { artistId_platform_date: { artistId: ARTIST_ID, platform: "INSTAGRAM", date } },
      update: {
        followers: runningFollowers,
        totalViews: reach.value,
        platformData: { alcanceDiario: reach.value, novosSeguidores: gained },
      },
      create: {
        artistId: ARTIST_ID, platform: "INSTAGRAM", date,
        followers: runningFollowers,
        totalViews: reach.value,
        platformData: { alcanceDiario: reach.value, novosSeguidores: gained },
      },
    });
    saved++;
  }

  return { saved, followers: currentFollowers, totalReach: reachData.reduce((s, d) => s + d.value, 0) };
}
