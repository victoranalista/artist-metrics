import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const url = new URL(process.env.DATABASE_URL!);
url.searchParams.set("sslmode", "verify-full");
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });

async function main() {
  for (const plat of ["YOUTUBE", "INSTAGRAM", "SPOTIFY"] as const) {
    const s = await p.metricsSnapshot.findFirst({
      where: { artistId: "default-artist", platform: plat },
      orderBy: { date: "desc" },
      include: { contentMetrics: { take: 5 }, audienceMetrics: true },
    });
    if (!s) { console.log(plat + ": SEM DADOS\n"); continue; }
    const pd = s.platformData as Record<string, unknown>;
    console.log(`\n=== ${plat} (${s.date.toISOString().split("T")[0]}) ===`);
    console.log(`followers: ${s.followers} | totalViews: ${s.totalViews}`);
    console.log(`likes: ${s.totalLikes} | comments: ${s.totalComments} | shares: ${s.totalShares}`);
    console.log(`engagement: ${s.engagementRate}`);
    console.log(`platformData:`, JSON.stringify(pd, null, 2).substring(0, 500));
    console.log(`content: ${s.contentMetrics.length} items`);
    for (const c of s.contentMetrics.slice(0, 3)) {
      console.log(`  - ${c.contentType}: "${c.title?.substring(0, 40)}" views:${c.views} likes:${c.likes}`);
    }
    console.log(`audience: ${s.audienceMetrics ? "SIM" : "NAO"}`);
    if (s.audienceMetrics) {
      console.log(`  age:`, JSON.stringify(s.audienceMetrics.ageRanges)?.substring(0, 100));
      console.log(`  gender:`, JSON.stringify(s.audienceMetrics.genderSplit)?.substring(0, 100));
      console.log(`  countries:`, JSON.stringify(s.audienceMetrics.topCountries)?.substring(0, 100));
      console.log(`  cities/traffic:`, JSON.stringify(s.audienceMetrics.topCities)?.substring(0, 100));
    }
  }

  // Count totals
  const snaps = await p.metricsSnapshot.count({ where: { artistId: "default-artist" } });
  const content = await p.contentMetrics.count();
  console.log(`\n=== TOTAIS: ${snaps} snapshots | ${content} content items ===`);

  // Count per platform
  for (const plat of ["YOUTUBE", "INSTAGRAM", "SPOTIFY"]) {
    const c = await p.metricsSnapshot.count({ where: { artistId: "default-artist", platform: plat } });
    console.log(`${plat}: ${c} snapshots`);
  }

  await p.$disconnect();
}
main().catch(console.error);
