import { NextResponse } from "next/server";
import { prisma, ARTIST_ID } from "@/lib/db";

export async function GET() {
  try {
    const connections = await prisma.platformConnection.findMany({
      where: { artistId: ARTIST_ID },
      select: {
        id: true,
        platform: true,
        displayName: true,
        status: true,
        connectedAt: true,
        metadata: true,
      },
    });

    return NextResponse.json(connections);
  } catch (error) {
    console.error("Erro ao buscar conexões:", error);
    return NextResponse.json(
      { error: "Falha ao buscar conexões" },
      { status: 500 }
    );
  }
}
