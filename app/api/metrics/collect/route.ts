import { NextResponse } from "next/server";
import { prisma, ARTIST_ID } from "@/lib/db";
import { collectYouTubeMetrics } from "@/lib/platforms/youtube";
import { collectInstagramMetrics } from "@/lib/platforms/instagram";
import { collectSpotifyMetrics } from "@/lib/platforms/spotify";
import { getStatus, setStatus, deleteStatus } from "@/lib/collection-store";
import type { PlatformConnection } from "@prisma/client";
import type {
  CollectedMetrics,
  PlatformCollectionStatus,
} from "@/lib/platforms/types";

const platformCollectors: Record<
  string,
  (connection: PlatformConnection) => Promise<CollectedMetrics>
> = {
  YOUTUBE: collectYouTubeMetrics,
  INSTAGRAM: collectInstagramMetrics,
  SPOTIFY: collectSpotifyMetrics,
};

export async function POST() {
  try {
    const connections = await prisma.platformConnection.findMany({
      where: {
        artistId: ARTIST_ID,
        status: "ACTIVE",
      },
    });

    if (connections.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma plataforma conectada encontrada" },
        { status: 400 }
      );
    }

    const collectionId = `col_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const initialStatuses: PlatformCollectionStatus[] = connections.map(
      (conn) => ({
        platform: conn.platform,
        status: "pending" as const,
      })
    );

    setStatus(collectionId, initialStatuses);

    // Processar em background
    (async () => {
      for (const connection of connections) {
        const currentStatuses = getStatus(collectionId);
        const platformIndex = currentStatuses.findIndex(
          (s) => s.platform === connection.platform
        );

        if (platformIndex === -1) continue;

        currentStatuses[platformIndex] = {
          ...currentStatuses[platformIndex],
          status: "processing",
        };
        setStatus(collectionId, [...currentStatuses]);

        try {
          const collector = platformCollectors[connection.platform];
          if (!collector) {
            throw new Error(`Coletor não encontrado: ${connection.platform}`);
          }

          const metrics = await collector(connection);

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          await prisma.$transaction(async (tx) => {
            const snapshot = await tx.metricsSnapshot.upsert({
              where: {
                artistId_platform_date: {
                  artistId: ARTIST_ID,
                  platform: connection.platform,
                  date: today,
                },
              },
              update: {
                followers: metrics.followers,
                totalViews: metrics.totalViews,
                totalLikes: metrics.totalLikes,
                totalComments: metrics.totalComments,
                totalShares: metrics.totalShares,
                engagementRate: metrics.engagementRate,
                platformData: metrics.platformData as object,
              },
              create: {
                artistId: ARTIST_ID,
                platform: connection.platform,
                date: today,
                followers: metrics.followers,
                totalViews: metrics.totalViews,
                totalLikes: metrics.totalLikes,
                totalComments: metrics.totalComments,
                totalShares: metrics.totalShares,
                engagementRate: metrics.engagementRate,
                platformData: metrics.platformData as object,
              },
            });

            if (metrics.content.length > 0) {
              await tx.contentMetrics.deleteMany({
                where: { snapshotId: snapshot.id },
              });

              await tx.contentMetrics.createMany({
                data: metrics.content.map((c) => ({
                  snapshotId: snapshot.id,
                  contentId: c.contentId,
                  contentType: c.contentType,
                  title: c.title,
                  thumbnailUrl: c.thumbnailUrl,
                  publishedAt: c.publishedAt,
                  url: c.url,
                  views: c.views,
                  likes: c.likes,
                  comments: c.comments,
                  shares: c.shares,
                  saves: c.saves,
                  platformData: c.platformData as object,
                })),
              });
            }

            if (metrics.audience) {
              const audienceData = {
                ageRanges: (metrics.audience.ageRanges ?? undefined) as object | undefined,
                genderSplit: (metrics.audience.genderSplit ?? undefined) as object | undefined,
                topCountries: (metrics.audience.topCountries ?? undefined) as object | undefined,
                topCities: (metrics.audience.topCities ?? undefined) as object | undefined,
              };
              await tx.audienceMetrics.upsert({
                where: { snapshotId: snapshot.id },
                update: audienceData,
                create: { snapshotId: snapshot.id, ...audienceData },
              });
            }
          });

          const updatedStatuses = getStatus(collectionId);
          const idx = updatedStatuses.findIndex(
            (s) => s.platform === connection.platform
          );
          if (idx !== -1) {
            updatedStatuses[idx] = {
              ...updatedStatuses[idx],
              status: "completed",
              message: `${metrics.followers?.toLocaleString("pt-BR") ?? "?"} seguidores`,
            };
            setStatus(collectionId, [...updatedStatuses]);
          }
        } catch (error) {
          console.error(`Erro ao coletar ${connection.platform}:`, error);

          const updatedStatuses = getStatus(collectionId);
          const idx = updatedStatuses.findIndex(
            (s) => s.platform === connection.platform
          );
          if (idx !== -1) {
            updatedStatuses[idx] = {
              ...updatedStatuses[idx],
              status: "error",
              message: error instanceof Error ? error.message : "Erro desconhecido",
            };
            setStatus(collectionId, [...updatedStatuses]);
          }
        }
      }

      setTimeout(() => deleteStatus(collectionId), 5 * 60 * 1000);
    })();

    return NextResponse.json({ collectionId, platforms: initialStatuses });
  } catch (error) {
    console.error("Erro ao iniciar coleta:", error);
    return NextResponse.json(
      { error: "Falha ao iniciar coleta de métricas" },
      { status: 500 }
    );
  }
}
