import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const url = new URL(process.env.DATABASE_URL!);
url.searchParams.set("sslmode", "verify-full");
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });

// Dados reais do Instagram Graph API (reach + saved + shares)
const insights: Record<string, { reach: number; saved: number; shares: number }> = {
  "18103061626918585": { reach: 5802, saved: 58, shares: 32 },
  "18055478300466247": { reach: 6595, saved: 50, shares: 37 },
  "18220903186311034": { reach: 14485, saved: 85, shares: 102 },
  "18082574840365078": { reach: 40365, saved: 371, shares: 397 },
  "17970616983000965": { reach: 23512, saved: 128, shares: 44 },
  "18092390311854488": { reach: 21178, saved: 222, shares: 189 },
  "18097732894943619": { reach: 11771, saved: 52, shares: 39 },
  "18071136716540557": { reach: 103792, saved: 1271, shares: 1345 },
  "18087925496329008": { reach: 216457, saved: 1904, shares: 2335 },
  "17917619901275269": { reach: 10095, saved: 67, shares: 23 },
};

async function main() {
  let updated = 0;

  for (const [contentId, data] of Object.entries(insights)) {
    const items = await p.contentMetrics.findMany({
      where: { contentId },
    });

    for (const item of items) {
      await p.contentMetrics.update({
        where: { id: item.id },
        data: {
          views: data.reach,
          shares: data.shares,
          saves: data.saved,
          platformData: {
            alcance: data.reach,
            salvos: data.saved,
            compartilhamentos: data.shares,
          },
        },
      });
      updated++;
    }
  }

  console.log(`${updated} content metrics atualizados com reach/saves/shares`);

  // Também atualizar o snapshot de Instagram de hoje com totais corretos
  const totalReach = Object.values(insights).reduce((s, d) => s + d.reach, 0);
  const totalSaves = Object.values(insights).reduce((s, d) => s + d.saved, 0);
  const totalShares = Object.values(insights).reduce((s, d) => s + d.shares, 0);

  console.log(`\nTotais dos 10 posts:`);
  console.log(`Alcance total: ${totalReach.toLocaleString()}`);
  console.log(`Salvos total: ${totalSaves.toLocaleString()}`);
  console.log(`Compartilhamentos total: ${totalShares.toLocaleString()}`);

  // Atualizar snapshot de hoje com engagement correto
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await p.metricsSnapshot.upsert({
    where: { artistId_platform_date: { artistId: "default-artist", platform: "INSTAGRAM", date: today } },
    update: {
      totalLikes: 67593,
      totalComments: 627,
      totalShares: totalShares,
      engagementRate: 34081 > 0 ? (67593 + 627 + totalSaves) / (10 * 34081) : 0,
    },
    create: {
      artistId: "default-artist",
      platform: "INSTAGRAM",
      date: today,
      followers: 34081,
      totalLikes: 67593,
      totalComments: 627,
      totalShares: totalShares,
      engagementRate: (67593 + 627 + totalSaves) / (10 * 34081),
    },
  });

  console.log("Snapshot Instagram atualizado com totais corretos");
  await p.$disconnect();
}

main().catch(console.error);
