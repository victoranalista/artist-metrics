import "dotenv/config";
import { writeFile, mkdir, readFile, unlink, readdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const IG_USERNAME = process.env.INSTAGRAM_USERNAME || "deborakaillany";
const VIDEOS_DIR = join(__dirname, "../../data/reels");
const POSTED_FILE = join(__dirname, "../../data/posted-reels.json");
const REELS_CACHE = join(__dirname, "../../data/reels-list.json");

export interface Reel {
  id: string;
  caption: string;
  permalink: string;
}

// ── yt-dlp detection ──

function getYtDlpCmd(): string {
  try {
    execSync("yt-dlp --version", { stdio: "pipe" });
    return "yt-dlp";
  } catch {
    try {
      execSync("python -m yt_dlp --version", { stdio: "pipe" });
      return "python -m yt_dlp";
    } catch {
      throw new Error("yt-dlp nao encontrado. Instale: pip install yt-dlp");
    }
  }
}

let _ytdlpCmd: string | null = null;
function ytdlp(): string {
  if (!_ytdlpCmd) _ytdlpCmd = getYtDlpCmd();
  return _ytdlpCmd;
}

// ── Reel list management ──

/** Known reels from the profile - updated by scrape or manually */
export async function getReelsList(): Promise<Reel[]> {
  await mkdir(join(__dirname, "../../data"), { recursive: true });

  if (existsSync(REELS_CACHE)) {
    const content = await readFile(REELS_CACHE, "utf-8");
    const cached = JSON.parse(content) as Reel[];
    if (cached.length > 0) return cached;
  }

  // Seed with known reels from the profile (scraped data)
  const knownReels = await scrapeReelsFromProfile();
  if (knownReels.length > 0) {
    await writeFile(REELS_CACHE, JSON.stringify(knownReels, null, 2));
    return knownReels;
  }

  // If scraping fails, use hardcoded list from connect-instagram.ts data
  return getHardcodedReels();
}

/** Scrape reel URLs from Instagram profile using yt-dlp metadata */
async function scrapeReelsFromProfile(): Promise<Reel[]> {
  // yt-dlp profile scraping is broken for Instagram, so we fetch
  // individual reel pages using known shortcodes from the profile page
  console.log("  Tentando scrape do perfil...");

  try {
    // Use Instagram's public API endpoint for profile media
    const res = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${IG_USERNAME}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "X-IG-App-ID": "936619743392459",
        },
      },
    );

    if (!res.ok) {
      console.log("  Profile API indisponivel, usando lista local");
      return [];
    }

    const data = await res.json();
    const edges = data?.data?.user?.edge_owner_to_timeline_media?.edges || [];

    const reels: Reel[] = edges
      .filter((e: any) => e.node?.is_video)
      .map((e: any) => ({
        id: e.node.shortcode,
        caption: e.node.edge_media_to_caption?.edges?.[0]?.node?.text || "",
        permalink: `https://www.instagram.com/reel/${e.node.shortcode}/`,
      }));

    if (reels.length > 0) {
      console.log(`  ${reels.length} reels encontrados via scrape`);
    }
    return reels;
  } catch {
    return [];
  }
}

/** Hardcoded reels from profile data we already have */
function getHardcodedReels(): Reel[] {
  return [
    { id: "DV__XUouXdL", caption: "Uma carta viva", permalink: "https://www.instagram.com/reel/DV__XUouXdL/" },
    { id: "DV9ajXJuAfs", caption: "Deus de obras completas", permalink: "https://www.instagram.com/reel/DV9ajXJuAfs/" },
    { id: "DV1sTT8DqDt", caption: "Pois de que vale ??", permalink: "https://www.instagram.com/reel/DV1sTT8DqDt/" },
    { id: "DVrZIcxDjaS", caption: "Momento do louvor", permalink: "https://www.instagram.com/reel/DVrZIcxDjaS/" },
    { id: "DVb8c7lDhJM", caption: "A tremedeira no final", permalink: "https://www.instagram.com/reel/DVb8c7lDhJM/" },
    { id: "DVZXhMMjkRI", caption: "Eu amoo !!", permalink: "https://www.instagram.com/reel/DVZXhMMjkRI/" },
    { id: "DVRpGqTDtEG", caption: "SEM TI EU SOU VAZIO", permalink: "https://www.instagram.com/reel/DVRpGqTDtEG/" },
    { id: "DVPEXjSDjWA", caption: "A música do nosso casamento", permalink: "https://www.instagram.com/reel/DVPEXjSDjWA/" },
    { id: "DVMfnydjoRh", caption: "É ELE !!", permalink: "https://www.instagram.com/reel/DVMfnydjoRh/" },
    { id: "DVJ6N75DlT1", caption: "Aclame ao Senhor !!", permalink: "https://www.instagram.com/reel/DVJ6N75DlT1/" },
  ];
}

/** Add new reel URLs to the cache */
export async function addReelsToCache(reels: Reel[]): Promise<void> {
  const existing = await getReelsList();
  const existingIds = new Set(existing.map((r) => r.id));
  const newReels = reels.filter((r) => !existingIds.has(r.id));
  if (newReels.length === 0) return;
  const updated = [...existing, ...newReels];
  await mkdir(join(__dirname, "../../data"), { recursive: true });
  await writeFile(REELS_CACHE, JSON.stringify(updated, null, 2));
  console.log(`  ${newReels.length} novos reels adicionados ao cache`);
}

// ── Posted tracking ──

export async function getPostedReels(): Promise<string[]> {
  if (!existsSync(POSTED_FILE)) return [];
  const content = await readFile(POSTED_FILE, "utf-8");
  return JSON.parse(content);
}

export async function markAsPosted(reelIds: string[]): Promise<void> {
  const posted = await getPostedReels();
  const updated = [...new Set([...posted, ...reelIds])];
  await mkdir(join(__dirname, "../../data"), { recursive: true });
  await writeFile(POSTED_FILE, JSON.stringify(updated, null, 2));
}

// ── Download ──

export async function downloadReel(reel: Reel): Promise<string> {
  await mkdir(VIDEOS_DIR, { recursive: true });
  const filePath = join(VIDEOS_DIR, `${reel.id}.mp4`);

  if (existsSync(filePath)) return filePath;

  try {
    execSync(
      `${ytdlp()} --no-warnings -o "${filePath}" "${reel.permalink}"`,
      { stdio: "pipe", timeout: 180_000 },
    );
    console.log(`  [yt-dlp] ${reel.id} baixado`);
    return filePath;
  } catch (err: any) {
    throw new Error(`Falha ao baixar ${reel.id}: ${err.message}`);
  }
}

// ── Selection ──

export async function selectRandomReels(count: number): Promise<Reel[]> {
  const allReels = await getReelsList();
  const posted = await getPostedReels();
  const available = allReels.filter((r) => !posted.includes(r.id));

  if (available.length === 0) {
    console.log("  Todos os reels ja foram postados. Resetando lista...");
    await writeFile(POSTED_FILE, "[]");
    return selectRandomReels(count);
  }

  console.log(`  ${available.length}/${allReels.length} reels disponiveis`);
  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// ── Cleanup ──

export async function deleteVideo(filePath: string): Promise<void> {
  try {
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  } catch {
    // Non-critical
  }
}

export async function cleanupVideos(): Promise<number> {
  if (!existsSync(VIDEOS_DIR)) return 0;
  const files = await readdir(VIDEOS_DIR);
  let removed = 0;
  for (const file of files) {
    if (file.endsWith(".mp4")) {
      await unlink(join(VIDEOS_DIR, file));
      removed++;
    }
  }
  return removed;
}
