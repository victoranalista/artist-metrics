import { NextResponse } from "next/server";
import { getTikTokAuthUrl } from "@/lib/oauth/tiktok";

export async function GET() {
  try {
    return NextResponse.redirect(getTikTokAuthUrl());
  } catch (error) {
    console.error("Erro ao gerar URL de autenticação do TikTok:", error);
    return NextResponse.json(
      { error: "Falha ao iniciar autenticação do TikTok" },
      { status: 500 }
    );
  }
}
