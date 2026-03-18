// ── Public Data Fetching (sem OAuth) ──
// Busca dados públicos de plataformas usando API keys ou Client Credentials.

// ────────────────────────────────────────
// YouTube - Public Data API v3
// ────────────────────────────────────────

export interface YouTubePublicData {
  channelId: string;
  name: string;
  description: string;
  subscribers: number | null;
  totalViews: number | null;
  videoCount: number | null;
  thumbnailUrl: string | null;
  recentVideos: {
    title: string;
    views: number | null;
    likes: number | null;
    videoId: string;
  }[];
}

function parseYouTubeInput(input: string): { type: "id" | "handle"; value: string } {
  const trimmed = input.trim();

  // Channel URL with ID: youtube.com/channel/UC...
  const channelIdMatch = trimmed.match(
    /(?:youtube\.com|youtu\.be)\/channel\/(UC[\w-]+)/i
  );
  if (channelIdMatch) return { type: "id", value: channelIdMatch[1] };

  // Handle URL: youtube.com/@handle
  const handleUrlMatch = trimmed.match(
    /(?:youtube\.com|youtu\.be)\/@([\w.-]+)/i
  );
  if (handleUrlMatch) return { type: "handle", value: handleUrlMatch[1] };

  // Custom URL: youtube.com/c/name or youtube.com/user/name
  const customMatch = trimmed.match(
    /(?:youtube\.com)\/(?:c|user)\/([\w.-]+)/i
  );
  if (customMatch) return { type: "handle", value: customMatch[1] };

  // Plain @handle
  if (trimmed.startsWith("@")) return { type: "handle", value: trimmed.slice(1) };

  // Raw channel ID
  if (trimmed.startsWith("UC") && trimmed.length >= 20) return { type: "id", value: trimmed };

  // Treat as handle/search term
  return { type: "handle", value: trimmed };
}

export async function fetchYouTubePublicData(
  channelInput: string
): Promise<YouTubePublicData> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "YOUTUBE_API_KEY não configurada. Adicione a chave da API do YouTube nas variáveis de ambiente."
    );
  }

  const parsed = parseYouTubeInput(channelInput);

  // 1. Fetch channel info
  let channelUrl: string;
  if (parsed.type === "id") {
    channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${encodeURIComponent(parsed.value)}&key=${apiKey}`;
  } else {
    channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${encodeURIComponent(parsed.value)}&key=${apiKey}`;
  }

  const channelRes = await fetch(channelUrl);
  const channelData = await channelRes.json();

  if (!channelData.items || channelData.items.length === 0) {
    throw new Error(
      "Canal do YouTube não encontrado. Verifique a URL, @handle ou ID do canal."
    );
  }

  const channel = channelData.items[0];
  const channelId = channel.id;
  const stats = channel.statistics;
  const snippet = channel.snippet;

  // 2. Fetch recent videos via search
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=10&type=video&key=${apiKey}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();

  const recentVideos: YouTubePublicData["recentVideos"] = [];

  if (searchData.items && searchData.items.length > 0) {
    const videoIds = searchData.items
      .map(
        (item: { id?: { videoId?: string } }) => item.id?.videoId
      )
      .filter(Boolean)
      .join(",");

    if (videoIds) {
      // 3. Fetch video statistics
      const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`;
      const videosRes = await fetch(videosUrl);
      const videosData = await videosRes.json();

      if (videosData.items) {
        for (const video of videosData.items) {
          recentVideos.push({
            title: video.snippet?.title ?? "",
            views: video.statistics?.viewCount
              ? parseInt(video.statistics.viewCount, 10)
              : null,
            likes: video.statistics?.likeCount
              ? parseInt(video.statistics.likeCount, 10)
              : null,
            videoId: video.id,
          });
        }
      }
    }
  }

  return {
    channelId,
    name: snippet?.title ?? "",
    description: snippet?.description ?? "",
    subscribers: stats?.subscriberCount
      ? parseInt(stats.subscriberCount, 10)
      : null,
    totalViews: stats?.viewCount ? parseInt(stats.viewCount, 10) : null,
    videoCount: stats?.videoCount ? parseInt(stats.videoCount, 10) : null,
    thumbnailUrl: snippet?.thumbnails?.medium?.url ?? null,
    recentVideos,
  };
}

// ────────────────────────────────────────
// Spotify - Client Credentials Flow
// ────────────────────────────────────────

export interface SpotifyPublicData {
  artistId: string;
  name: string;
  followers: number | null;
  popularity: number | null;
  genres: string[];
  imageUrl: string | null;
  topTracks: {
    name: string;
    popularity: number;
    previewUrl: string | null;
  }[];
  albums: {
    name: string;
    releaseDate: string;
    totalTracks: number;
    type: string;
  }[];
}

function parseSpotifyInput(input: string): { type: "id" | "search"; value: string } {
  const trimmed = input.trim();

  // Spotify URL: open.spotify.com/artist/{id}
  const urlMatch = trimmed.match(
    /open\.spotify\.com\/artist\/([\w]+)/i
  );
  if (urlMatch) return { type: "id", value: urlMatch[1] };

  // Spotify URI: spotify:artist:{id}
  const uriMatch = trimmed.match(/^spotify:artist:([\w]+)$/i);
  if (uriMatch) return { type: "id", value: uriMatch[1] };

  // Looks like a Spotify ID (22 char alphanumeric)
  if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) return { type: "id", value: trimmed };

  // Treat as search term
  return { type: "search", value: trimmed };
}

async function getSpotifyClientToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET precisam estar configurados nas variaveis de ambiente."
    );
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();

  if (data.error) {
    throw new Error(
      `Erro ao autenticar com Spotify: ${data.error_description || data.error}`
    );
  }

  return data.access_token;
}

export async function fetchSpotifyPublicData(
  artistInput: string
): Promise<SpotifyPublicData> {
  const token = await getSpotifyClientToken();
  const parsed = parseSpotifyInput(artistInput);
  const headers = { Authorization: `Bearer ${token}` };

  let artistId: string;

  if (parsed.type === "id") {
    artistId = parsed.value;
  } else {
    // Search for artist
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(parsed.value)}&type=artist&limit=1`;
    const searchRes = await fetch(searchUrl, { headers });
    const searchData = await searchRes.json();

    if (
      !searchData.artists?.items ||
      searchData.artists.items.length === 0
    ) {
      throw new Error(
        `Artista "${parsed.value}" não encontrado no Spotify. Tente usar o link do perfil.`
      );
    }

    artistId = searchData.artists.items[0].id;
  }

  // Fetch artist profile
  const artistRes = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}`,
    { headers }
  );

  if (!artistRes.ok) {
    throw new Error(
      "Artista não encontrado no Spotify. Verifique o link ou nome."
    );
  }

  const artist = await artistRes.json();

  // Fetch top tracks
  const topTracksRes = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=BR`,
    { headers }
  );
  const topTracksData = await topTracksRes.json();

  const topTracks = (topTracksData.tracks ?? []).map(
    (track: {
      name: string;
      popularity: number;
      preview_url: string | null;
    }) => ({
      name: track.name,
      popularity: track.popularity,
      previewUrl: track.preview_url,
    })
  );

  // Fetch albums
  const albumsRes = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=20&market=BR`,
    { headers }
  );
  const albumsData = await albumsRes.json();

  const albums = (albumsData.items ?? []).map(
    (album: {
      name: string;
      release_date: string;
      total_tracks: number;
      album_type: string;
    }) => ({
      name: album.name,
      releaseDate: album.release_date,
      totalTracks: album.total_tracks,
      type: album.album_type,
    })
  );

  return {
    artistId,
    name: artist.name ?? "",
    followers: artist.followers?.total ?? null,
    popularity: artist.popularity ?? null,
    genres: artist.genres ?? [],
    imageUrl: artist.images?.[0]?.url ?? null,
    topTracks,
    albums,
  };
}

// ────────────────────────────────────────
// Instagram - Sem API publica
// ────────────────────────────────────────

export interface InstagramPublicData {
  error: string;
}

export async function fetchInstagramPublicData(
  _username: string
): Promise<InstagramPublicData> {
  return {
    error:
      "Instagram requer conta Business/Creator vinculada a uma Página do Facebook. Configure o OAuth na página de Conexões para acessar métricas do Instagram.",
  };
}

// ────────────────────────────────────────
// TikTok - Sem API publica
// ────────────────────────────────────────

export interface TikTokPublicData {
  error: string;
}

export async function fetchTikTokPublicData(
  _username: string
): Promise<TikTokPublicData> {
  return {
    error:
      "TikTok não oferece API pública. Configure o OAuth na página de Conexões para acessar métricas do TikTok.",
  };
}
