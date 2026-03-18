import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const url = new URL(process.env.DATABASE_URL!);
url.searchParams.set("sslmode", "verify-full");
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fix Instagram snapshot de hoje
  await p.metricsSnapshot.upsert({
    where: { artistId_platform_date: { artistId: "default-artist", platform: "INSTAGRAM", date: today } },
    update: {
      followers: 34081,
      totalViews: 18596,
      totalLikes: 67593,
      totalComments: 627,
      engagementRate: 0.20,
      platformData: {
        alcanceDiario: 18596,
        novosSeguidores: 79,
        username: "deborakaillany",
        mediaCount: 138,
        followsCount: 183,
      },
    },
    create: {
      artistId: "default-artist",
      platform: "INSTAGRAM",
      date: today,
      followers: 34081,
      totalViews: 18596,
      totalLikes: 67593,
      totalComments: 627,
      engagementRate: 0.20,
      platformData: {
        alcanceDiario: 18596,
        novosSeguidores: 79,
        username: "deborakaillany",
        mediaCount: 138,
        followsCount: 183,
      },
    },
  });
  console.log("Instagram hoje corrigido: 34.081 seguidores");

  await p.$disconnect();
}
main().catch(console.error);
