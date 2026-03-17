import { NextRequest, NextResponse } from "next/server";
import { prisma, ARTIST_ID } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { exchangeYouTubeCode, getYouTubeChannel } from "@/lib/oauth/youtube";
import { researchArtist } from "@/lib/ai/research";

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
      return NextResponse.redirect(
        new URL("/connections?error=youtube_token_failed", request.url)
      );
    }

    const channel = await getYouTubeChannel(tokens.access_token);

    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encrypt(tokens.refresh_token)
      : null;

    await prisma.platformConnection.upsert({
      where: {
        artistId_platform: {
          artistId: ARTIST_ID,
          platform: "YOUTUBE",
        },
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        externalId: channel.id,
        displayName: channel.title,
        status: "ACTIVE",
        tokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
        metadata: {
          subscriberCount: channel.subscriberCount,
          videoCount: channel.videoCount,
          thumbnailUrl: channel.thumbnailUrl,
        },
      },
      create: {
        artistId: ARTIST_ID,
        platform: "YOUTUBE",
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        externalId: channel.id,
        displayName: channel.title,
        status: "ACTIVE",
        tokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
        metadata: {
          subscriberCount: channel.subscriberCount,
          videoCount: channel.videoCount,
          thumbnailUrl: channel.thumbnailUrl,
        },
      },
    });

    // Fire and forget: pesquisa sobre o artista para atualizar o perfil
    researchArtist(channel).catch((err) =>
      console.error("Erro ao pesquisar artista:", err)
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
