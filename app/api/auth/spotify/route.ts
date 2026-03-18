import { NextResponse } from "next/server";
import { getSpotifyAuthUrl } from "@/lib/oauth/spotify";

export async function GET() {
  try {
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      return NextResponse.json(
        {
          error:
            "Spotify não configurado. Adicione SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET nas variáveis de ambiente.",
        },
        { status: 400 }
      );
    }
    return NextResponse.redirect(getSpotifyAuthUrl());
  } catch (error) {
    console.error("Erro ao gerar URL de autenticação do Spotify:", error);
    return NextResponse.json(
      { error: "Falha ao iniciar autenticação do Spotify" },
      { status: 500 }
    );
  }
}
