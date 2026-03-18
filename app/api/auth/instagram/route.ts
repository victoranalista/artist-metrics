import { NextResponse } from "next/server";
import { getInstagramAuthUrl } from "@/lib/oauth/instagram";

export async function GET() {
  try {
    if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
      return NextResponse.json(
        {
          error:
            "Instagram não configurado. Adicione FACEBOOK_APP_ID e FACEBOOK_APP_SECRET nas variáveis de ambiente.",
        },
        { status: 400 }
      );
    }
    return NextResponse.redirect(getInstagramAuthUrl());
  } catch (error) {
    console.error("Erro ao gerar URL de autenticação do Instagram:", error);
    return NextResponse.json(
      { error: "Falha ao iniciar autenticação do Instagram" },
      { status: 500 }
    );
  }
}
