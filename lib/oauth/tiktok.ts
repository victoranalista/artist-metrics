import crypto from "node:crypto";

const SCOPES = "user.info.basic,user.info.profile,user.info.stats,video.list";

export function getTikTokAuthUrl(): string {
  const state = crypto.randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok/callback`,
    response_type: "code",
    scope: SCOPES,
    state,
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
}

export async function exchangeTikTokCode(code: string) {
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok/callback`,
    }),
  });
  return res.json();
}

export async function refreshTikTokToken(refreshToken: string) {
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  return res.json();
}

export async function getTikTokUser(accessToken: string) {
  const fields = "open_id,union_id,display_name,avatar_url,avatar_large_url,bio_description,follower_count,following_count,likes_count,video_count,username,is_verified";
  const res = await fetch(
    `https://open.tiktokapis.com/v2/user/info/?fields=${fields}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return res.json();
}
