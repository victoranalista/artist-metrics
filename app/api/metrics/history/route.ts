import { NextRequest, NextResponse } from "next/server";
import { prisma, ARTIST_ID } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const where: Record<string, unknown> = {
      artistId: ARTIST_ID,
    };

    if (platform) {
      where.platform = platform.toUpperCase();
    }

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      where.date = dateFilter;
    }

    const snapshots = await prisma.metricsSnapshot.findMany({
      where,
      include: {
        contentMetrics: true,
        audienceMetrics: true,
      },
      orderBy: { date: "desc" },
      take: Math.min(limit, 200),
    });

    return NextResponse.json(snapshots);
  } catch (error) {
    console.error("Erro ao buscar histórico de métricas:", error);
    return NextResponse.json(
      { error: "Falha ao buscar histórico de métricas" },
      { status: 500 }
    );
  }
}
