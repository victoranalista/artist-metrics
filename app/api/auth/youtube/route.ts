import { NextResponse } from "next/server";
import { getYouTubeAuthUrl } from "@/lib/oauth/youtube";

export async function GET() {
  try {
    return NextResponse.redirect(getYouTubeAuthUrl());
  } catch (error) {
    console.error("Erro ao gerar URL de autenticação do YouTube:", error);
    return NextResponse.json(
      { error: "Falha ao iniciar autenticação do YouTube" },
      { status: 500 }
    );
  }
}
