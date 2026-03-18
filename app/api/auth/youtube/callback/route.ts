import { NextRequest, NextResponse } from "next/server";
import { prisma, ARTIST_ID } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { exchangeYouTubeCode, getYouTubeChannel } from "@/lib/oauth/youtube";
import { collectYouTubeMetrics } from "@/lib/platforms/youtube";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      console.error("Erro na autenticação do YouTube:", error);
      return NextResponse.redirect(
        new URL("/connections?error=youtube_denied", request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/connections?error=youtube_no_code", request.url)
      );
    }

    const tokens = await exchangeYouTubeCode(code);

    if (!tokens.access_token) {
      console.error("Token failed:", tokens);
      return NextResponse.redirect(
        new URL("/connections?error=youtube_token_failed", request.url)
      );
    }

    // Buscar dados do canal
    const channelResponse = await getYouTubeChannel(tokens.access_token);
    const channelItem = channelResponse?.items?.[0];

    const channelId = channelItem?.id ?? null;
    const channelTitle = channelItem?.snippet?.title ?? null;
    const channelDescription = channelItem?.snippet?.description ?? null;
    const thumbnailUrl = channelItem?.snippet?.thumbnails?.default?.url ?? null;
    const subscriberCount = channelItem?.statistics?.subscriberCount
      ? parseInt(channelItem.statistics.subscriberCount, 10)
      : null;
    const videoCount = channelItem?.statistics?.videoCount
      ? parseInt(channelItem.statistics.videoCount, 10)
      : null;
    const viewCount = channelItem?.statistics?.viewCount
      ? parseInt(channelItem.statistics.viewCount, 10)
      : null;

    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encrypt(tokens.refresh_token)
      : null;

    const tokenExpiry = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    // Salvar conexão
    const connection = await prisma.platformConnection.upsert({
      where: {
        artistId_platform: {
          artistId: ARTIST_ID,
          platform: "YOUTUBE",
        },
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        externalId: channelId,
        displayName: channelTitle,
        status: "ACTIVE",
        tokenExpiry,
        metadata: {
          subscriberCount,
          videoCount,
          viewCount,
          thumbnailUrl,
          description: channelDescription,
        },
      },
      create: {
        artistId: ARTIST_ID,
        platform: "YOUTUBE",
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        externalId: channelId,
        displayName: channelTitle,
        status: "ACTIVE",
        tokenExpiry,
        metadata: {
          subscriberCount,
          videoCount,
          viewCount,
          thumbnailUrl,
          description: channelDescription,
        },
      },
    });

    // Atualizar nome do artista se ainda é o padrão
    const artist = await prisma.artist.findUnique({
      where: { id: ARTIST_ID },
    });
    if (artist && artist.name === "Meu Perfil de Artista" && channelTitle) {
      await prisma.artist.update({
        where: { id: ARTIST_ID },
        data: {
          name: channelTitle,
          imageUrl: thumbnailUrl,
          bio: channelDescription?.substring(0, 500) ?? undefined,
        },
      });
    }

    // Coletar métricas em background (inclui Analytics API)
    collectYouTubeMetrics(connection).then(async (metrics) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const snapshot = await prisma.metricsSnapshot.upsert({
        where: {
          artistId_platform_date: {
            artistId: ARTIST_ID,
            platform: "YOUTUBE",
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
          platform: "YOUTUBE",
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

      // Salvar vídeos
      if (metrics.content.length > 0) {
        await prisma.contentMetrics.deleteMany({
          where: { snapshotId: snapshot.id },
        });
        await prisma.contentMetrics.createMany({
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
            platformData: (c.platformData ?? {}) as object,
          })),
        });
      }

      // Salvar audiência
      if (metrics.audience) {
        const audienceData = {
          ageRanges: (metrics.audience.ageRanges ?? undefined) as object | undefined,
          genderSplit: (metrics.audience.genderSplit ?? undefined) as object | undefined,
          topCountries: (metrics.audience.topCountries ?? undefined) as object | undefined,
          topCities: (metrics.audience.topCities ?? undefined) as object | undefined,
        };
        await prisma.audienceMetrics.upsert({
          where: { snapshotId: snapshot.id },
          update: audienceData,
          create: { snapshotId: snapshot.id, ...audienceData },
        });
      }
    }).catch((err) =>
      console.error("Erro ao coletar métricas do YouTube:", err)
    );

    return NextResponse.redirect(
      new URL("/connections?connected=youtube", request.url)
    );
  } catch (error) {
    console.error("Erro no callback do YouTube:", error);
    return NextResponse.redirect(
      new URL("/connections?error=youtube_callback_failed", request.url)
    );
  }
}
