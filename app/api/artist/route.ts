import { NextRequest, NextResponse } from "next/server";
import { prisma, ARTIST_ID } from "@/lib/db";

export async function GET() {
  try {
    const artist = await prisma.artist.findUnique({
      where: { id: ARTIST_ID },
    });

    if (!artist) {
      return NextResponse.json({ error: "Artista não encontrado" }, { status: 404 });
    }

    return NextResponse.json(artist);
  } catch (error) {
    console.error("Erro ao buscar artista:", error);
    return NextResponse.json({ error: "Falha ao buscar artista" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, style, goals, bio, imageUrl } = body;

    const artist = await prisma.artist.update({
      where: { id: ARTIST_ID },
      data: {
        ...(name !== undefined && { name }),
        ...(style !== undefined && { style }),
        ...(goals !== undefined && { goals }),
        ...(bio !== undefined && { bio }),
        ...(imageUrl !== undefined && { imageUrl }),
      },
    });

    return NextResponse.json(artist);
  } catch (error) {
    console.error("Erro ao atualizar artista:", error);
    return NextResponse.json({ error: "Falha ao atualizar artista" }, { status: 500 });
  }
}
