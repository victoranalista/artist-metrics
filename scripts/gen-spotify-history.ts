import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = new URL(process.env.DATABASE_URL!);
url.searchParams.set("sslmode", "verify-full");
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });

// Dados reais conhecidos do Spotify da Débora Kaillany
const CURRENT = {
  followers: 158,
  monthlyListeners: 214,
  totalStreams: 57125,
  tracks: {
    "Sem Limites": 23741,
    "Cristo Vive em Mim": 18615,
    "Ezequiel 47 - Ao Vivo": 11170,
    "Minha Oração": 1935,
    "Vitorioso És": 1664,
  },
};

async function main() {
  // Gerar 90 dias de snapshots com crescimento gradual baseado nos dados reais
  // Spotify não tem API de histórico diário, então simulamos com crescimento orgânico
  const days = 90;
  const today = new Date();

  // Crescimento estimado nos últimos 90 dias (baseado nos streams totais)
  const dailyStreamsAvg = Math.round(CURRENT.totalStreams * 0.015); // ~1.5% dos streams totais por dia
  const dailyFollowersAvg = 0.8; // ~0.8 followers/dia

  let saved = 0;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const daysFromEnd = i;
    const progress = (days - daysFromEnd) / days; // 0 → 1

    // Streams acumulam gradualmente
    const streams = Math.round(CURRENT.totalStreams * (0.7 + 0.3 * progress));

    // Followers crescem devagar
    const followers = Math.round(CURRENT.followers - (daysFromEnd * dailyFollowersAvg));

    // Listeners variam dia a dia (dado sazonal)
    const noise = Math.sin(daysFromEnd * 0.5) * 40 + Math.cos(daysFromEnd * 0.3) * 25;
    const listeners = Math.max(80, Math.round(CURRENT.monthlyListeners * (0.6 + 0.4 * progress) + noise));

    // Daily streams variam
    const dayNoise = Math.sin(daysFromEnd * 0.8) * 150 + Math.cos(daysFromEnd * 1.3) * 100;
    const dailyStreams = Math.max(100, Math.round(dailyStreamsAvg + dayNoise));

    await p.metricsSnapshot.upsert({
      where: {
        artistId_platform_date: { artistId: "default-artist", platform: "SPOTIFY", date },
      },
      update: {
        followers: Math.max(50, followers),
        totalViews: streams,
        platformData: {
          dailyStreams,
          monthlyListeners: listeners,
          totalStreams: streams,
          method: "estimated-history",
        },
      },
      create: {
        artistId: "default-artist",
        platform: "SPOTIFY",
        date,
        followers: Math.max(50, followers),
        totalViews: streams,
        platformData: {
          dailyStreams,
          monthlyListeners: listeners,
          totalStreams: streams,
          method: "estimated-history",
        },
      },
    });
    saved++;
  }

  console.log(`${saved} snapshots Spotify salvos (estimados com base nos dados reais)`);
  console.log(`Followers: ~${Math.round(CURRENT.followers - days * dailyFollowersAvg)} → ${CURRENT.followers}`);
  console.log(`Streams: ~${Math.round(CURRENT.totalStreams * 0.7)} → ${CURRENT.totalStreams}`);

  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
