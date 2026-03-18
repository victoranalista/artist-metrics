import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = new URL(process.env.DATABASE_URL!);
url.searchParams.set("sslmode", "verify-full");
const adapter = new PrismaPg({ connectionString: url.toString() });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Buscar a conexão do YouTube
  const conn = await prisma.platformConnection.findFirst({
    where: { artistId: "default-artist", platform: "YOUTUBE" },
  });

  if (!conn) {
    console.log("Nenhuma conexão YouTube encontrada.");
    return;
  }

  // Se displayName está null, buscar do metadata ou do snapshot
  if (!conn.displayName) {
    const snapshot = await prisma.metricsSnapshot.findFirst({
      where: { artistId: "default-artist", platform: "YOUTUBE" },
      orderBy: { date: "desc" },
    });

    const platformData = snapshot?.platformData as Record<string, unknown> | null;
    const channelTitle = platformData?.channelTitle as string | null;

    if (channelTitle) {
      await prisma.platformConnection.update({
        where: { id: conn.id },
        data: { displayName: channelTitle },
      });
      console.log("DisplayName atualizado para:", channelTitle);

      // Atualizar artista também
      await prisma.artist.update({
        where: { id: "default-artist" },
        data: {
          name: channelTitle,
        },
      });
      console.log("Nome do artista atualizado para:", channelTitle);
    } else {
      console.log("Sem channelTitle no platformData. Dados:", platformData);
    }
  } else {
    console.log("DisplayName já está preenchido:", conn.displayName);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
