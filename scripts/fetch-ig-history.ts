import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const dbUrl = new URL(process.env.DATABASE_URL!);
dbUrl.searchParams.set("sslmode", "verify-full");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: dbUrl.toString() }),
});

const ARTIST_ID = "default-artist";
const CURRENT_FOLLOWERS = 34081;

// Dados reais do Instagram Insights API
const reachData = [
  { date: "2026-02-18", value: 30266 },
  { date: "2026-02-19", value: 64800 },
  { date: "2026-02-20", value: 27744 },
  { date: "2026-02-21", value: 18477 },
  { date: "2026-02-22", value: 12649 },
  { date: "2026-02-23", value: 14411 },
  { date: "2026-02-24", value: 17483 },
  { date: "2026-02-25", value: 37853 },
  { date: "2026-02-26", value: 118075 },
  { date: "2026-02-27", value: 108603 },
  { date: "2026-02-28", value: 43147 },
  { date: "2026-03-01", value: 29865 },
  { date: "2026-03-02", value: 34751 },
  { date: "2026-03-03", value: 32958 },
  { date: "2026-03-04", value: 31455 },
  { date: "2026-03-05", value: 23864 },
  { date: "2026-03-06", value: 20904 },
  { date: "2026-03-07", value: 25106 },
  { date: "2026-03-08", value: 19538 },
  { date: "2026-03-09", value: 28380 },
  { date: "2026-03-10", value: 34856 },
  { date: "2026-03-11", value: 19567 },
  { date: "2026-03-12", value: 19588 },
  { date: "2026-03-13", value: 22382 },
  { date: "2026-03-14", value: 20004 },
  { date: "2026-03-15", value: 20315 },
  { date: "2026-03-16", value: 19246 },
  { date: "2026-03-17", value: 18596 },
];

const followerGainData = [
  { date: "2026-02-18", value: 124 },
  { date: "2026-02-19", value: 371 },
  { date: "2026-02-20", value: 167 },
  { date: "2026-02-21", value: 106 },
  { date: "2026-02-22", value: 65 },
  { date: "2026-02-23", value: 78 },
  { date: "2026-02-24", value: 85 },
  { date: "2026-02-25", value: 184 },
  { date: "2026-02-26", value: 574 },
  { date: "2026-02-27", value: 483 },
  { date: "2026-02-28", value: 211 },
  { date: "2026-03-01", value: 176 },
  { date: "2026-03-02", value: 170 },
  { date: "2026-03-03", value: 169 },
  { date: "2026-03-04", value: 129 },
  { date: "2026-03-05", value: 127 },
  { date: "2026-03-06", value: 119 },
  { date: "2026-03-07", value: 120 },
  { date: "2026-03-08", value: 108 },
  { date: "2026-03-09", value: 127 },
  { date: "2026-03-10", value: 137 },
  { date: "2026-03-11", value: 85 },
  { date: "2026-03-12", value: 101 },
  { date: "2026-03-13", value: 105 },
  { date: "2026-03-14", value: 97 },
  { date: "2026-03-15", value: 105 },
  { date: "2026-03-16", value: 79 },
  { date: "2026-03-17", value: 0 },
];

async function main() {
  // Calcular seguidores cumulativos (trabalhar de trás pra frente)
  const totalGained = followerGainData.reduce((s, d) => s + d.value, 0);
  const baseFollowers = CURRENT_FOLLOWERS - totalGained;

  let runningFollowers = baseFollowers;
  let saved = 0;

  for (let i = 0; i < reachData.length; i++) {
    const reach = reachData[i];
    const gained = followerGainData[i]?.value ?? 0;
    runningFollowers += gained;

    const date = new Date(reach.date);
    date.setHours(0, 0, 0, 0);

    try {
      await prisma.metricsSnapshot.upsert({
        where: {
          artistId_platform_date: {
            artistId: ARTIST_ID,
            platform: "INSTAGRAM",
            date,
          },
        },
        update: {
          followers: runningFollowers,
          totalViews: reach.value,
          platformData: {
            alcanceDiario: reach.value,
            novosSeguidores: gained,
            seguidoresAcumulados: runningFollowers,
          },
        },
        create: {
          artistId: ARTIST_ID,
          platform: "INSTAGRAM",
          date,
          followers: runningFollowers,
          totalViews: reach.value,
          platformData: {
            alcanceDiario: reach.value,
            novosSeguidores: gained,
            seguidoresAcumulados: runningFollowers,
          },
        },
      });
      saved++;
    } catch (e) {
      console.error(`Erro ${reach.date}:`, e);
    }
  }

  console.log(`${saved} snapshots Instagram salvos`);
  console.log(`Seguidores: ${baseFollowers.toLocaleString()} → ${CURRENT_FOLLOWERS.toLocaleString()} (+${totalGained})`);
  console.log(`Alcance total (28 dias): ${reachData.reduce((s, d) => s + d.value, 0).toLocaleString()}`);
  console.log(`Pico de alcance: ${Math.max(...reachData.map(d => d.value)).toLocaleString()} (${reachData.find(d => d.value === Math.max(...reachData.map(r => r.value)))?.date})`);
  console.log(`Pico de novos seguidores: ${Math.max(...followerGainData.map(d => d.value))} (${followerGainData.find(d => d.value === Math.max(...followerGainData.map(r => r.value)))?.date})`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
