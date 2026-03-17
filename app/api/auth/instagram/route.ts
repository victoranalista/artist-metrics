import { NextResponse } from "next/server";
import { getInstagramAuthUrl } from "@/lib/oauth/instagram";

export async function GET() {
  try {
    return NextResponse.redirect(getInstagramAuthUrl());
  } catch (error) {
    console.error("Erro ao gerar URL de autenticação do Instagram:", error);
    return NextResponse.json(
      { error: "Falha ao iniciar autenticação do Instagram" },
      { status: 500 }
    );
  }
}
