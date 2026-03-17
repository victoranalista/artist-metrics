import { NextRequest, NextResponse } from "next/server";
import { prisma, ARTIST_ID } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");
    const days = parseInt(searchParams.get("days") || "30", 10);

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const where: Record<string, unknown> = {
      artistId: ARTIST_ID,
      date: { gte: dateFrom },
    };

    if (platform) {
      where.platform = platform.toUpperCase();
    }

    const snapshots = await prisma.metricsSnapshot.findMany({
      where,
      include: {
        contentMetrics: {
          orderBy: { views: "desc" },
          take: 20,
        },
        audienceMetrics: true,
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(snapshots);
  } catch (error) {
    console.error("Erro ao buscar métricas:", error);
    return NextResponse.json({ error: "Falha ao buscar métricas" }, { status: 500 });
  }
}
