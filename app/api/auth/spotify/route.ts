import { NextResponse } from "next/server";
import { getSpotifyAuthUrl } from "@/lib/oauth/spotify";

export async function GET() {
  try {
    return NextResponse.redirect(getSpotifyAuthUrl());
  } catch (error) {
    console.error("Erro ao gerar URL de autenticação do Spotify:", error);
    return NextResponse.json(
      { error: "Falha ao iniciar autenticação do Spotify" },
      { status: 500 }
    );
  }
}
