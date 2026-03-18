import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  // Force verify-full to silence pg SSL warning
  const url = new URL(connectionString);
  url.searchParams.set("sslmode", "verify-full");
  const adapter = new PrismaPg({ connectionString: url.toString() });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const ARTIST_ID = "default-artist";

export async function getArtist() {
  return prisma.artist.findUniqueOrThrow({ where: { id: ARTIST_ID } });
}
