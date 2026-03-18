import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const dbUrl = new URL(process.env.DATABASE_URL!);
dbUrl.searchParams.set("sslmode", "verify-full");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: dbUrl.toString() }),
});

async function main() {
  const ARTIST_ID = "default-artist";
  const SPOTIFY_ID = "5DaRk7fLpUeVSPHV7YCg3n";

  const profile = {
    id: SPOTIFY_ID,
    name: "Débora Kaillany",
    followers: 158,
    monthlyListeners: 214,
    genres: ["gospel", "worship", "música cristã"],
    popularity: 15,
    imageUrl: "/artist/avatar.webp",
  };

  const topTracks = [
    { id: "sem-limites", name: "Sem Limites", streams: 23741, year: 2023 },
    { id: "cristo-vive", name: "Cristo Vive em Mim", streams: 18615, year: 2023 },
    { id: "ezequiel-47", name: "Ezequiel 47 - Ao Vivo", streams: 11170, year: 2024 },
    { id: "minha-oracao", name: "Minha Oração: Uma Carta pra Deus", streams: 1935, year: 2022 },
    { id: "vitorioso-es", name: "Vitorioso És", streams: 1664, year: 2022 },
  ];

  const releases = [
    { id: "em-ti", name: "Em Ti", type: "single", year: "2025" },
    { id: "ezequiel-47-album", name: "Ezequiel 47 (Ao Vivo)", type: "album", year: "2024" },
    { id: "cristo-vive-album", name: "Cristo Vive em Mim", type: "album", year: "2023" },
    { id: "sem-limites-album", name: "Sem Limites", type: "single", year: "2023" },
    { id: "minha-oracao-album", name: "Minha Oração: Uma Carta pra Deus", type: "single", year: "2022" },
    { id: "vitorioso-es-album", name: "Vitorioso És", type: "single", year: "2022" },
  ];

  // Salvar conexão
  await prisma.platformConnection.upsert({
    where: { artistId_platform: { artistId: ARTIST_ID, platform: "SPOTIFY" } },
    update: {
      accessToken: "public-api",
      externalId: SPOTIFY_ID,
      displayName: profile.name,
      status: "ACTIVE",
      metadata: {
        method: "public-api",
        name: profile.name,
        monthlyListeners: profile.monthlyListeners,
        followers: profile.followers,
        genres: profile.genres,
        popularity: profile.popularity,
        spotifyUrl: `https://open.spotify.com/artist/${SPOTIFY_ID}`,
        biography: "Iniciou o ministério aos 3 anos. Reconhecimento nacional em 2020 após apresentação na Arena Conference com 20.000 presentes e 50.000+ transmissões simultâneas.",
      },
    },
    create: {
      artistId: ARTIST_ID,
      platform: "SPOTIFY",
      accessToken: "public-api",
      externalId: SPOTIFY_ID,
      displayName: profile.name,
      status: "ACTIVE",
      metadata: {
        method: "public-api",
        name: profile.name,
        monthlyListeners: profile.monthlyListeners,
        followers: profile.followers,
        genres: profile.genres,
        popularity: profile.popularity,
        spotifyUrl: `https://open.spotify.com/artist/${SPOTIFY_ID}`,
        biography: "Iniciou o ministério aos 3 anos. Reconhecimento nacional em 2020 após apresentação na Arena Conference com 20.000 presentes e 50.000+ transmissões simultâneas.",
      },
    },
  });
  console.log("Conexão Spotify salva:", profile.name);

  // Salvar snapshot
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalStreams = topTracks.reduce((s, t) => s + t.streams, 0);

  const snapshot = await prisma.metricsSnapshot.upsert({
    where: {
      artistId_platform_date: { artistId: ARTIST_ID, platform: "SPOTIFY", date: today },
    },
    update: {
      followers: profile.followers,
      totalViews: totalStreams,
      platformData: {
        method: "public-api",
        monthlyListeners: profile.monthlyListeners,
        popularity: profile.popularity,
        genres: profile.genres,
        totalStreams,
        totalReleases: releases.length,
      },
    },
    create: {
      artistId: ARTIST_ID,
      platform: "SPOTIFY",
      date: today,
      followers: profile.followers,
      totalViews: totalStreams,
      platformData: {
        method: "public-api",
        monthlyListeners: profile.monthlyListeners,
        popularity: profile.popularity,
        genres: profile.genres,
        totalStreams,
        totalReleases: releases.length,
      },
    },
  });
  console.log("Snapshot salvo:", snapshot.id);

  // Salvar tracks e releases
  await prisma.contentMetrics.deleteMany({ where: { snapshotId: snapshot.id } });
  await prisma.contentMetrics.createMany({
    data: [
      ...topTracks.map((t) => ({
        snapshotId: snapshot.id,
        contentId: t.id,
        contentType: "track",
        title: t.name,
        views: t.streams,
        url: `https://open.spotify.com/artist/${SPOTIFY_ID}`,
        publishedAt: new Date(`${t.year}-01-01`),
        platformData: { streams: t.streams },
      })),
      ...releases.map((r) => ({
        snapshotId: snapshot.id,
        contentId: r.id,
        contentType: r.type,
        title: r.name,
        url: `https://open.spotify.com/artist/${SPOTIFY_ID}`,
        publishedAt: new Date(`${r.year}-01-01`),
        platformData: { releaseType: r.type },
      })),
    ],
  });
  console.log("Tracks e releases salvos:", topTracks.length + releases.length);

  // Atualizar bio do artista
  await prisma.artist.update({
    where: { id: ARTIST_ID },
    data: {
      bio: "Ministra, compositora e esposa. Iniciou o ministério aos 3 anos na igreja local. Reconhecimento nacional em 2020 após apresentação na Arena Conference com 20.000 presentes e mais de 50.000 transmissões simultâneas pelo Brasil e internacionalmente.",
    },
  });

  console.log("\n=== RESUMO SPOTIFY ===");
  console.log(`${profile.name} | ${profile.followers} seguidores | ${profile.monthlyListeners} ouvintes mensais`);
  console.log(`${totalStreams.toLocaleString()} streams totais | ${releases.length} lançamentos`);
  console.log(`Top: "Sem Limites" (23.741 streams), "Cristo Vive em Mim" (18.615 streams)`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
