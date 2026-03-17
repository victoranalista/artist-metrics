import { NextRequest, NextResponse } from "next/server";
import { prisma, ARTIST_ID } from "@/lib/db";
import type { Platform } from "@prisma/client";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform } = await params;
    const platformUpper = platform.toUpperCase() as Platform;

    const connection = await prisma.platformConnection.findUnique({
      where: {
        artistId_platform: {
          artistId: ARTIST_ID,
          platform: platformUpper,
        },
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: `Conexão com ${platform} não encontrada` },
        { status: 404 }
      );
    }

    await prisma.platformConnection.delete({
      where: {
        artistId_platform: {
          artistId: ARTIST_ID,
          platform: platformUpper,
        },
      },
    });

    return NextResponse.json({
      message: `Conexão com ${platform} removida com sucesso`,
    });
  } catch (error) {
    console.error("Erro ao desconectar plataforma:", error);
    return NextResponse.json(
      { error: "Falha ao desconectar plataforma" },
      { status: 500 }
    );
  }
}
