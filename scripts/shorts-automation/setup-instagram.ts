/**
 * Troca um token curto do Instagram por um token de longa duração (60 dias)
 *
 * Uso:
 *   pnpm tsx scripts/shorts-automation/setup-instagram.ts <SHORT_LIVED_TOKEN>
 *
 * Como obter o token curto:
 * 1. Acesse https://developers.facebook.com/tools/explorer/
 * 2. Selecione seu app do Facebook
 * 3. Em "User or Page": selecione "User Token"
 * 4. Adicione permissões: instagram_basic, pages_show_list, instagram_content_publish
 * 5. Clique "Generate Access Token"
 * 6. Copie o token e passe como argumento deste script
 */

import "dotenv/config";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const APP_ID = process.env.FACEBOOK_APP_ID;
const APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const SHORT_TOKEN = process.argv[2];

if (!SHORT_TOKEN) {
  console.error(`
╔══════════════════════════════════════════════════════════════╗
║  USO: pnpm tsx scripts/shorts-automation/setup-instagram.ts  ║
║        <TOKEN_CURTO>                                         ║
║                                                              ║
║  Obtenha o token em:                                         ║
║  https://developers.facebook.com/tools/explorer/             ║
║                                                              ║
║  Permissões necessárias:                                     ║
║  - instagram_basic                                           ║
║  - pages_show_list                                           ║
║  - instagram_content_publish                                 ║
╚══════════════════════════════════════════════════════════════╝
  `);
  process.exit(1);
}

async function main() {
  // Exchange short-lived token for long-lived token
  console.log("Trocando token curto por token longo...\n");

  let url: string;
  if (APP_ID && APP_SECRET) {
    url = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${SHORT_TOKEN}`;
  } else {
    // Try using the token directly as long-lived (if already long-lived)
    url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${SHORT_TOKEN}`;
  }

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    console.error("Erro:", data.error.message);
    if (!APP_ID || !APP_SECRET) {
      console.error(`
Para trocar token curto por longo, adicione ao .env:
  FACEBOOK_APP_ID=seu_app_id
  FACEBOOK_APP_SECRET=seu_app_secret

Ou use diretamente um token de longa duração do Graph API Explorer.
      `);
    }
    process.exit(1);
  }

  const longToken = data.access_token;
  const expiresIn = data.expires_in;

  // Update .env
  const envPath = join(__dirname, "../../.env");
  const envContent = await readFile(envPath, "utf-8");
  const updated = envContent.replace(
    /INSTAGRAM_ACCESS_TOKEN=.*/,
    `INSTAGRAM_ACCESS_TOKEN=${longToken}`,
  );
  await writeFile(envPath, updated);

  // Test the token
  const testRes = await fetch(
    `https://graph.instagram.com/v21.0/me?fields=id,username&access_token=${longToken}`,
  );
  const testData = await testRes.json();

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  TOKEN ATUALIZADO COM SUCESSO!                               ║
╚══════════════════════════════════════════════════════════════╝

  Conta: @${testData.username || "?"}
  ID: ${testData.id || "?"}
  Expira em: ${expiresIn ? Math.round(expiresIn / 86400) + " dias" : "desconhecido"}
  .env atualizado automaticamente!
  `);
}

main().catch((err) => {
  console.error("Erro:", err.message);
  process.exit(1);
});
