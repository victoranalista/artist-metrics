import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = new URL(process.env.DATABASE_URL!);
url.searchParams.set("sslmode", "verify-full");
const adapter = new PrismaPg({ connectionString: url.toString() });
const prisma = new PrismaClient({ adapter });

async function main() {
  const conns = await prisma.platformConnection.findMany({
    where: { artistId: "default-artist" },
  });
  console.log("=== CONEXOES ===");
  console.log("Total:", conns.length);
  for (const c of conns) {
    console.log(`- ${c.platform} | Status: ${c.status} | Nome: ${c.displayName} | ID: ${c.externalId} | Token: ${c.accessToken.substring(0, 20)}...`);
  }

  const snaps = await prisma.metricsSnapshot.findMany({
    where: { artistId: "default-artist" },
    include: { contentMetrics: { take: 3 } },
  });
  console.log("\n=== SNAPSHOTS ===");
  console.log("Total:", snaps.length);
  for (const s of snaps) {
    console.log(`- ${s.platform} | ${s.date} | Followers: ${s.followers} | Views: ${s.totalViews}`);
    for (const c of s.contentMetrics) {
      console.log(`  > ${c.contentType}: ${c.title} (views: ${c.views})`);
    }
  }

  const artist = await prisma.artist.findUnique({ where: { id: "default-artist" } });
  console.log("\n=== ARTISTA ===");
  console.log(artist);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
