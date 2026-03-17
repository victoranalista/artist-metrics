const SCOPES = [
  "instagram_basic",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
].join(",");

export function getInstagramAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`,
    scope: SCOPES,
    response_type: "code",
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
}

export async function exchangeInstagramCode(code: string) {
  // Step 1: Exchange code for short-lived token
  const shortLivedRes = await fetch(
    "https://graph.facebook.com/v21.0/oauth/access_token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`,
        code,
      }),
    }
  );
  const shortLived = await shortLivedRes.json();

  if (!shortLived.access_token) {
    return shortLived;
  }

  // Step 2: Exchange short-lived token for long-lived token
  const longLivedRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?` +
      new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: process.env.FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
        fb_exchange_token: shortLived.access_token,
      }),
    { method: "GET" }
  );
  const longLived = await longLivedRes.json();

  return {
    ...longLived,
    short_lived_token: shortLived.access_token,
  };
}

export async function refreshInstagramToken(token: string) {
  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token?` +
      new URLSearchParams({
        grant_type: "ig_refresh_token",
        access_token: token,
      }),
    { method: "GET" }
  );
  return res.json();
}

export async function getInstagramAccount(accessToken: string) {
  // Get Facebook Pages
  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`
  );
  const pages = await pagesRes.json();

  if (!pages.data || pages.data.length === 0) {
    throw new Error("No Facebook Pages found");
  }

  // Get Instagram Business Account linked to the first page
  const pageId = pages.data[0].id;
  const igRes = await fetch(
    `https://graph.facebook.com/v21.0/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
  );
  const igData = await igRes.json();

  if (!igData.instagram_business_account) {
    throw new Error("No Instagram Business Account linked to this page");
  }

  const igUserId = igData.instagram_business_account.id;

  // Get Instagram profile info
  const profileRes = await fetch(
    `https://graph.facebook.com/v21.0/${igUserId}?fields=id,username,name,profile_picture_url,followers_count,media_count,biography&access_token=${accessToken}`
  );
  return profileRes.json();
}
