import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createCipheriv, randomBytes } from "crypto";

const dbUrl = new URL(process.env.DATABASE_URL!);
dbUrl.searchParams.set("sslmode", "verify-full");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: dbUrl.toString() }),
});

function encrypt(text: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

const TOKEN = "EAARwECs8Lb8BQZBBK57Egds3Y5cZAe5Gmg0oMsaFZBKyIhZBjgq6xVaVz1ys55BzhdZAmmIVvgcYGwoVzNV4NzDrqn2grEZCsF12hd4J6SMZA5YsfPv0hGGUNHDzAo6nOTqHUDbD8no3j9hDUW2pRAD8ZAYRx71X2DuYwRV21E46ZBUH7TN6pgqJnjE5cimW7W1zC1fwUtRSgZAZAby2j5Hyt9crHJTlicTs3hu2BIaDyrqLqi0ZBToQW1sffi8ZBoxwB2EWlbxBJHWsoDrOezg94";

async function main() {
  const ARTIST_ID = "default-artist";

  // Dados do perfil
  const profile = {
    id: "17841406577399253",
    username: "deborakaillany",
    name: "KAILANY",
    followers_count: 34081,
    follows_count: 183,
    media_count: 138,
    biography: "Ministra | Compositora | esposa 💍\nCONVITES (61) 994227754",
  };

  // Posts recentes com métricas
  const posts = [
    { id: "18103061626918585", caption: "Uma carta viva", type: "VIDEO", url: "https://www.instagram.com/reel/DV__XUouXdL/", date: "2026-03-17", likes: 898, comments: 15 },
    { id: "18055478300466247", caption: "Deus de obras completas", type: "VIDEO", url: "https://www.instagram.com/reel/DV9ajXJuAfs/", date: "2026-03-16", likes: 894, comments: 21 },
    { id: "18220903186311034", caption: "Pois de que vale ??", type: "VIDEO", url: "https://www.instagram.com/reel/DV1sTT8DqDt/", date: "2026-03-13", likes: 2110, comments: 51 },
    { id: "18082574840365078", caption: "Momento do louvor", type: "VIDEO", url: "https://www.instagram.com/reel/DVrZIcxDjaS/", date: "2026-03-09", likes: 7705, comments: 57 },
    { id: "17970616983000965", caption: "A tremedeira no final", type: "VIDEO", url: "https://www.instagram.com/reel/DVb8c7lDhJM/", date: "2026-03-03", likes: 3683, comments: 22 },
    { id: "18092390311854488", caption: "Eu amoo !!", type: "VIDEO", url: "https://www.instagram.com/reel/DVZXhMMjkRI/", date: "2026-03-02", likes: 2913, comments: 40 },
    { id: "18097732894943619", caption: "SEM TI EU SOU VAZIO", type: "VIDEO", url: "https://www.instagram.com/reel/DVRpGqTDtEG/", date: "2026-02-27", likes: 1537, comments: 13 },
    { id: "18071136716540557", caption: "A música do nosso casamento", type: "VIDEO", url: "https://www.instagram.com/reel/DVPEXjSDjWA/", date: "2026-02-26", likes: 17776, comments: 201 },
    { id: "18087925496329008", caption: "É ELE !!", type: "VIDEO", url: "https://www.instagram.com/reel/DVMfnydjoRh/", date: "2026-02-25", likes: 29217, comments: 187 },
    { id: "17917619901275269", caption: "Aclame ao Senhor !!", type: "VIDEO", url: "https://www.instagram.com/reel/DVJ6N75DlT1/", date: "2026-02-24", likes: 857, comments: 23 },
  ];

  // Salvar conexão
  const encryptedToken = encrypt(TOKEN);
  await prisma.platformConnection.upsert({
    where: { artistId_platform: { artistId: ARTIST_ID, platform: "INSTAGRAM" } },
    update: {
      accessToken: encryptedToken,
      externalId: profile.id,
      displayName: profile.username,
      status: "ACTIVE",
      metadata: {
        username: profile.username,
        name: profile.name,
        biography: profile.biography,
        followersCount: profile.followers_count,
        followsCount: profile.follows_count,
        mediaCount: profile.media_count,
      },
    },
    create: {
      artistId: ARTIST_ID,
      platform: "INSTAGRAM",
      accessToken: encryptedToken,
      externalId: profile.id,
      displayName: profile.username,
      status: "ACTIVE",
      metadata: {
        username: profile.username,
        name: profile.name,
        biography: profile.biography,
        followersCount: profile.followers_count,
        followsCount: profile.follows_count,
        mediaCount: profile.media_count,
      },
    },
  });
  console.log("Conexão Instagram salva:", profile.username);

  // Salvar snapshot de métricas
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
  const totalComments = posts.reduce((s, p) => s + p.comments, 0);
  const engagementRate = profile.followers_count > 0
    ? (totalLikes + totalComments) / (posts.length * profile.followers_count)
    : 0;

  const snapshot = await prisma.metricsSnapshot.upsert({
    where: {
      artistId_platform_date: { artistId: ARTIST_ID, platform: "INSTAGRAM", date: today },
    },
    update: {
      followers: profile.followers_count,
      totalLikes,
      totalComments,
      engagementRate,
      platformData: {
        username: profile.username,
        mediaCount: profile.media_count,
        followsCount: profile.follows_count,
        biography: profile.biography,
      },
    },
    create: {
      artistId: ARTIST_ID,
      platform: "INSTAGRAM",
      date: today,
      followers: profile.followers_count,
      totalLikes,
      totalComments,
      engagementRate,
      platformData: {
        username: profile.username,
        mediaCount: profile.media_count,
        followsCount: profile.follows_count,
        biography: profile.biography,
      },
    },
  });
  console.log("Snapshot salvo:", snapshot.id);

  // Salvar posts como content metrics
  await prisma.contentMetrics.deleteMany({ where: { snapshotId: snapshot.id } });
  await prisma.contentMetrics.createMany({
    data: posts.map((p) => ({
      snapshotId: snapshot.id,
      contentId: p.id,
      contentType: p.type.toLowerCase(),
      title: p.caption,
      url: p.url,
      likes: p.likes,
      comments: p.comments,
      publishedAt: new Date(p.date),
    })),
  });
  console.log("Posts salvos:", posts.length);

  console.log("\n=== RESUMO ===");
  console.log(`@${profile.username} | ${profile.followers_count.toLocaleString()} seguidores`);
  console.log(`${profile.media_count} posts | Engajamento: ${(engagementRate * 100).toFixed(2)}%`);
  console.log(`Melhor post: "É ELE !!" com 29.217 curtidas`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
