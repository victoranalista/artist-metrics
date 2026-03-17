import type { PlatformConnection } from "@prisma/client";
import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { refreshSpotifyToken } from "@/lib/oauth/spotify";
import type { CollectedMetrics, ContentItem } from "./types";

const SPOTIFY_API = "https://api.spotify.com/v1";

async function getValidAccessToken(connection: PlatformConnection): Promise<string> {
  const now = new Date();
  const tokenExpiry = connection.tokenExpiry;

  if (tokenExpiry && tokenExpiry > now) {
    return decrypt(connection.accessToken);
  }

  if (!connection.refreshToken) {
    throw new Error("No refresh token available for Spotify connection");
  }

  const refreshToken = decrypt(connection.refreshToken);
  const tokenData = await refreshSpotifyToken(refreshToken);

  if (tokenData.error) {
    await prisma.platformConnection.update({
      where: { id: connection.id },
      data: { status: "ERROR" },
    });
    throw new Error(
      `Spotify token refresh failed: ${tokenData.error_description || tokenData.error}`
    );
  }

  await prisma.platformConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: encrypt(tokenData.access_token),
      tokenExpiry: new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000),
      ...(tokenData.refresh_token
        ? { refreshToken: encrypt(tokenData.refresh_token) }
        : {}),
      status: "ACTIVE",
    },
  });

  return tokenData.access_token;
}

async function fetchArtistProfile(accessToken: string, artistId: string) {
  const res = await fetch(`${SPOTIFY_API}/artists/${artistId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}

async function fetchTopTracks(
  accessToken: string,
  artistId: string
): Promise<ContentItem[]> {
  const res = await fetch(
    `${SPOTIFY_API}/artists/${artistId}/top-tracks?market=BR`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();

  if (!data.tracks) return [];

  return data.tracks.map(
    (track: {
      id: string;
      name: string;
      album?: { images?: { url: string }[] };
      external_urls?: { spotify?: string };
      popularity: number;
      duration_ms: number;
      preview_url: string | null;
    }): ContentItem => ({
      contentId: track.id,
      contentType: "track",
      title: track.name,
      thumbnailUrl: track.album?.images?.[0]?.url ?? null,
      publishedAt: null,
      url: track.external_urls?.spotify ?? null,
      views: null,
      likes: null,
      comments: null,
      shares: null,
      saves: null,
      platformData: {
        popularity: track.popularity,
        durationMs: track.duration_ms,
        previewUrl: track.preview_url,
      },
    })
  );
}

async function fetchRecentAlbums(
  accessToken: string,
  artistId: string
): Promise<ContentItem[]> {
  const res = await fetch(
    `${SPOTIFY_API}/artists/${artistId}/albums?include_groups=album,single&limit=50&market=BR`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();

  if (!data.items) return [];

  return data.items.map(
    (album: {
      id: string;
      album_type: string;
      name: string;
      images?: { url: string }[];
      release_date: string;
      external_urls?: { spotify?: string };
      total_tracks: number;
    }): ContentItem => ({
      contentId: album.id,
      contentType: album.album_type ?? "album",
      title: album.name,
      thumbnailUrl: album.images?.[0]?.url ?? null,
      publishedAt: album.release_date ? new Date(album.release_date) : null,
      url: album.external_urls?.spotify ?? null,
      views: null,
      likes: null,
      comments: null,
      shares: null,
      saves: null,
      platformData: {
        totalTracks: album.total_tracks,
        albumType: album.album_type,
      },
    })
  );
}

export async function collectSpotifyMetrics(
  connection: PlatformConnection
): Promise<CollectedMetrics> {
  try {
    const accessToken = await getValidAccessToken(connection);
    const artistId = connection.externalId;

    if (!artistId) {
      throw new Error("No Spotify artist ID stored in connection");
    }

    const artist = await fetchArtistProfile(accessToken, artistId);
    const topTracks = await fetchTopTracks(accessToken, artistId);
    const albums = await fetchRecentAlbums(accessToken, artistId);

    const followers = artist.followers?.total ?? null;
    const content = [...topTracks, ...albums];

    return {
      followers,
      totalViews: null,
      totalLikes: null,
      totalComments: null,
      totalShares: null,
      engagementRate: null,
      platformData: {
        spotifyId: artist.id,
        name: artist.name,
        popularity: artist.popularity,
        genres: artist.genres,
        images: artist.images,
        externalUrls: artist.external_urls,
      },
      content,
      audience: null,
    };
  } catch (error) {
    console.error("Spotify metrics collection failed:", error);

    return {
      followers: null,
      totalViews: null,
      totalLikes: null,
      totalComments: null,
      totalShares: null,
      engagementRate: null,
      platformData: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      content: [],
      audience: null,
    };
  }
}
