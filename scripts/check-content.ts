import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const url = new URL(process.env.DATABASE_URL!);
url.searchParams.set("sslmode", "verify-full");
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });

async function main() {
  const snaps = await p.metricsSnapshot.findMany({
    where: { artistId: "default-artist" },
    include: { contentMetrics: { select: { contentId: true, title: true, views: true } } },
    orderBy: { date: "desc" },
  });
  console.log("Total snapshots:", snaps.length);
  for (const s of snaps) {
    console.log(`\n${s.platform} | ${s.date.toISOString().split("T")[0]} | followers:${s.followers} views:${s.totalViews} | videos:${s.contentMetrics.length}`);
    for (const c of s.contentMetrics.slice(0, 5)) {
      console.log(`  - [${c.contentId}] ${c.title} (${c.views} views)`);
    }
  }
  await p.$disconnect();
}
main().catch(console.error);
