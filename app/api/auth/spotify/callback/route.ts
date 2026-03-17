import { NextRequest, NextResponse } from "next/server";
import { prisma, ARTIST_ID } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { exchangeSpotifyCode } from "@/lib/oauth/spotify";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      console.error("Erro na autenticação do Spotify:", error);
      return NextResponse.redirect(
        new URL("/connections?error=spotify_denied", request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/connections?error=spotify_no_code", request.url)
      );
    }

    const tokens = await exchangeSpotifyCode(code);

    if (!tokens.access_token) {
      return NextResponse.redirect(
        new URL("/connections?error=spotify_token_failed", request.url)
      );
    }

    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encrypt(tokens.refresh_token)
      : null;

    // Buscar nome do artista no banco para pesquisar no Spotify
    const artist = await prisma.artist.findUnique({
      where: { id: ARTIST_ID },
      select: { name: true },
    });

    let spotifyArtistId: string | null = null;
    let spotifyArtistName: string | null = null;
    let spotifyMetadata: object = {};

    if (artist?.name) {
      // Pesquisar artista no Spotify
      const searchResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(artist.name)}&type=artist&limit=1`,
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const spotifyArtist = searchData.artists?.items?.[0];

        if (spotifyArtist) {
          spotifyArtistId = spotifyArtist.id;
          spotifyArtistName = spotifyArtist.name;
          spotifyMetadata = {
            genres: spotifyArtist.genres,
            popularity: spotifyArtist.popularity,
            followers: spotifyArtist.followers?.total,
            imageUrl: spotifyArtist.images?.[0]?.url,
          };
        }
      }
    }

    // Se não encontrou artista, buscar perfil do usuário
    if (!spotifyArtistId) {
      const profileResponse = await fetch("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        spotifyArtistId = profile.id;
        spotifyArtistName = profile.display_name;
      }
    }

    await prisma.platformConnection.upsert({
      where: {
        artistId_platform: {
          artistId: ARTIST_ID,
          platform: "SPOTIFY",
        },
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        externalId: spotifyArtistId,
        displayName: spotifyArtistName,
        status: "ACTIVE",
        tokenExpiry: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        metadata: spotifyMetadata,
      },
      create: {
        artistId: ARTIST_ID,
        platform: "SPOTIFY",
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        externalId: spotifyArtistId,
        displayName: spotifyArtistName,
        status: "ACTIVE",
        tokenExpiry: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        metadata: spotifyMetadata,
      },
    });

    return NextResponse.redirect(
      new URL("/connections?connected=spotify", request.url)
    );
  } catch (error) {
    console.error("Erro no callback do Spotify:", error);
    return NextResponse.redirect(
      new URL("/connections?error=spotify_callback_failed", request.url)
    );
  }
}
