/**
 * Script de setup para obter o refresh_token do YouTube.
 * Execute: pnpm tsx scripts/shorts-automation/setup-youtube.ts
 *
 * PASSO A PASSO:
 * 1. Acesse https://console.cloud.google.com/
 * 2. Crie um projeto (ou use um existente)
 * 3. Ative "YouTube Data API v3" em APIs & Services > Library
 * 4. Vá em APIs & Services > Credentials > Create Credentials > OAuth client ID
 * 5. Tipo: Web application
 * 6. Redirect URI: http://localhost:3000/oauth2callback
 * 7. Copie Client ID e Client Secret para o .env
 * 8. Execute este script e siga as instruções
 */

import "dotenv/config";
import { google } from "googleapis";
import { createServer } from "http";

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(`
╔══════════════════════════════════════════════════════════════╗
║  CONFIGURAÇÃO NECESSÁRIA                                     ║
║                                                              ║
║  Adicione ao .env:                                           ║
║    YOUTUBE_CLIENT_ID=seu_client_id                           ║
║    YOUTUBE_CLIENT_SECRET=seu_client_secret                   ║
║                                                              ║
║  Obtenha em: https://console.cloud.google.com/               ║
║  1. Criar projeto                                            ║
║  2. Ativar YouTube Data API v3                               ║
║  3. Criar OAuth2 credentials (Web application)               ║
║  4. Redirect URI: http://localhost:3000/oauth2callback        ║
╚══════════════════════════════════════════════════════════════╝
  `);
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  "http://localhost:3000/oauth2callback",
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.force-ssl",
  ],
  prompt: "consent",
});

console.log(`
╔══════════════════════════════════════════════════════════════╗
║  AUTORIZAÇÃO YOUTUBE                                         ║
║                                                              ║
║  1. Abra este link no navegador:                             ║
╚══════════════════════════════════════════════════════════════╝

${authUrl}

Aguardando autorização...
`);

const server = createServer(async (req, res) => {
  if (!req.url?.startsWith("/oauth2callback")) return;

  const url = new URL(req.url, "http://localhost:3000");
  const code = url.searchParams.get("code");

  if (!code) {
    res.writeHead(400);
    res.end("No code received");
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
      <html><body style="font-family:sans-serif;text-align:center;padding:40px;">
        <h1 style="color:#22c55e;">Autorizado com sucesso!</h1>
        <p>Pode fechar esta aba e voltar ao terminal.</p>
      </body></html>
    `);

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  SUCESSO! Adicione ao .env:                                  ║
╚══════════════════════════════════════════════════════════════╝

YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}

`);

    server.close();
    process.exit(0);
  } catch (err) {
    console.error("Erro ao obter token:", err);
    res.writeHead(500);
    res.end("Error");
    server.close();
    process.exit(1);
  }
});

server.listen(3000, () => {
  console.log("Servidor OAuth aguardando em http://localhost:3000...");
});
