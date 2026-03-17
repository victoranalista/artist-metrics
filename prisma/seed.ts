import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const artist = await prisma.artist.upsert({
    where: { id: "default-artist" },
    update: {},
    create: {
      id: "default-artist",
      name: "Meu Perfil de Artista",
      style: "Não definido",
      goals: "Crescer nas plataformas digitais",
      bio: "Configure seu perfil conectando suas plataformas.",
    },
  });

  console.log("Artista padrão criado:", artist);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
