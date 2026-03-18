import { NextRequest, NextResponse } from "next/server";
import { prisma, ARTIST_ID } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { exchangeTikTokCode, getTikTokUser } from "@/lib/oauth/tiktok";
import { collectTikTokMetrics } from "@/lib/platforms/tiktok";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      console.error("Erro na autenticação do TikTok:", error);
      return NextResponse.redirect(
        new URL("/connections?error=tiktok_denied", request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/connections?error=tiktok_no_code", request.url)
      );
    }

    const tokens = await exchangeTikTokCode(code);

    if (!tokens.access_token) {
      console.error("TikTok token failed:", tokens);
      return NextResponse.redirect(
        new URL("/connections?error=tiktok_token_failed", request.url)
      );
    }

    // Buscar dados do usuário
    const userResponse = await getTikTokUser(tokens.access_token);
    const user = userResponse?.data;

    const openId = user?.open_id ?? tokens.open_id ?? null;
    const displayName = user?.display_name ?? null;
    const username = user?.username ?? null;
    const avatarUrl = user?.avatar_large_url ?? user?.avatar_url ?? null;
    const bio = user?.bio_description ?? null;
    const followerCount = user?.follower_count ?? null;
    const videoCount = user?.video_count ?? null;
    const likesCount = user?.likes_count ?? null;
    const isVerified = user?.is_verified ?? false;

    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encrypt(tokens.refresh_token)
      : null;

    // TikTok access tokens expire in 24h (86400s)
    const tokenExpiry = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : new Date(Date.now() + 86400 * 1000);

    // Salvar conexão
    const connection = await prisma.platformConnection.upsert({
      where: {
        artistId_platform: {
          artistId: ARTIST_ID,
          platform: "TIKTOK",
        },
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        externalId: openId,
        displayName: displayName ?? username,
        status: "ACTIVE",
        tokenExpiry,
        scopes: tokens.scope ?? null,
        metadata: {
          username,
          avatarUrl,
          bio,
          followerCount,
          videoCount,
          likesCount,
          isVerified,
        },
      },
      create: {
        artistId: ARTIST_ID,
        platform: "TIKTOK",
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        externalId: openId,
        displayName: displayName ?? username,
        status: "ACTIVE",
        tokenExpiry,
        scopes: tokens.scope ?? null,
        metadata: {
          username,
          avatarUrl,
          bio,
          followerCount,
          videoCount,
          likesCount,
          isVerified,
        },
      },
    });

    // Coletar métricas em background
    collectTikTokMetrics(connection).then(async (metrics) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const snapshot = await prisma.metricsSnapshot.upsert({
        where: {
          artistId_platform_date: {
            artistId: ARTIST_ID,
            platform: "TIKTOK",
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
          platform: "TIKTOK",
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
    }).catch((err) =>
      console.error("Erro ao coletar métricas do TikTok:", err)
    );

    return NextResponse.redirect(
      new URL("/connections?connected=tiktok", request.url)
    );
  } catch (error) {
    console.error("Erro no callback do TikTok:", error);
    return NextResponse.redirect(
      new URL("/connections?error=tiktok_callback_failed", request.url)
    );
  }
}
