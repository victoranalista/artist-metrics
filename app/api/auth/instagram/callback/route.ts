import { NextRequest, NextResponse } from "next/server";
import { prisma, ARTIST_ID } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { exchangeInstagramCode } from "@/lib/oauth/instagram";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      console.error("Erro na autenticação do Instagram:", error);
      return NextResponse.redirect(
        new URL("/connections?error=instagram_denied", request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/connections?error=instagram_no_code", request.url)
      );
    }

    const tokens = await exchangeInstagramCode(code);

    if (!tokens.access_token) {
      return NextResponse.redirect(
        new URL("/connections?error=instagram_token_failed", request.url)
      );
    }

    const encryptedAccessToken = encrypt(tokens.access_token);

    // Buscar informações da conta business do Instagram
    const profileResponse = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=id,username,name,account_type,media_count,followers_count&access_token=${tokens.access_token}`
    );

    if (!profileResponse.ok) {
      console.error(
        "Erro ao buscar perfil do Instagram:",
        await profileResponse.text()
      );
      return NextResponse.redirect(
        new URL("/connections?error=instagram_profile_failed", request.url)
      );
    }

    const profile = await profileResponse.json();

    await prisma.platformConnection.upsert({
      where: {
        artistId_platform: {
          artistId: ARTIST_ID,
          platform: "INSTAGRAM",
        },
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: null,
        externalId: profile.id,
        displayName: profile.username || profile.name,
        status: "ACTIVE",
        tokenExpiry: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        metadata: {
          accountType: profile.account_type,
          mediaCount: profile.media_count,
          followersCount: profile.followers_count,
        },
      },
      create: {
        artistId: ARTIST_ID,
        platform: "INSTAGRAM",
        accessToken: encryptedAccessToken,
        refreshToken: null,
        externalId: profile.id,
        displayName: profile.username || profile.name,
        status: "ACTIVE",
        tokenExpiry: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        metadata: {
          accountType: profile.account_type,
          mediaCount: profile.media_count,
          followersCount: profile.followers_count,
        },
      },
    });

    return NextResponse.redirect(
      new URL("/connections?connected=instagram", request.url)
    );
  } catch (error) {
    console.error("Erro no callback do Instagram:", error);
    return NextResponse.redirect(
      new URL("/connections?error=instagram_callback_failed", request.url)
    );
  }
}
