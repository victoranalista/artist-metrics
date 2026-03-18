import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const url = new URL(process.env.DATABASE_URL!);
url.searchParams.set("sslmode", "verify-full");
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });

async function main() {
  // YouTube
  const ytSnaps = await p.metricsSnapshot.findMany({
    where: { artistId: "default-artist", platform: "YOUTUBE" },
    orderBy: { date: "asc" },
    select: { date: true, followers: true, totalViews: true, platformData: true },
  });
  console.log("=== YOUTUBE (" + ytSnaps.length + " dias) ===");
  console.log("date          | inscritos | viewsTotal  | viewsDIA");
  for (const s of ytSnaps.slice(-14)) {
    const pd = s.platformData as Record<string, number>;
    const d = s.date.toISOString().split("T")[0];
    console.log(`${d} | ${s.followers?.toString().padStart(5)} | ${s.totalViews?.toString().padStart(9)} | ${(pd?.dailyViews ?? 0).toString().padStart(6)}`);
  }

  // Instagram
  const igSnaps = await p.metricsSnapshot.findMany({
    where: { artistId: "default-artist", platform: "INSTAGRAM" },
    orderBy: { date: "asc" },
    select: { date: true, followers: true, totalViews: true, platformData: true },
  });
  console.log("\n=== INSTAGRAM (" + igSnaps.length + " dias) ===");
  console.log("date          | seguidores | alcanceDIA");
  for (const s of igSnaps.slice(-14)) {
    const pd = s.platformData as Record<string, number>;
    const d = s.date.toISOString().split("T")[0];
    console.log(`${d} | ${s.followers?.toString().padStart(6)} | ${(pd?.alcanceDiario ?? s.totalViews ?? 0).toString().padStart(8)}`);
  }

  // O que o gráfico recebe
  console.log("\n=== O QUE O GRAFICO VE (chart data) ===");
  console.log("O gráfico usa: date, platform, followers, views (=totalViews)");
  console.log("YouTube totalViews é CUMULATIVO (434K), não diário!");
  console.log("Instagram totalViews é o alcance DIÁRIO");

  await p.$disconnect();
}
main().catch(console.error);
