import { readFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

const DATA_DIR = join(process.cwd(), "data");
const REELS_FILE = join(DATA_DIR, "reels-list.json");
const POSTED_FILE = join(DATA_DIR, "posted-reels.json");

export async function GET() {
  try {
    let totalReels = 0;
    let postedCount = 0;
    let reels: { id: string; caption: string; permalink: string }[] = [];
    let posted: string[] = [];

    if (existsSync(REELS_FILE)) {
      reels = JSON.parse(await readFile(REELS_FILE, "utf-8"));
      totalReels = reels.length;
    }

    if (existsSync(POSTED_FILE)) {
      posted = JSON.parse(await readFile(POSTED_FILE, "utf-8"));
      postedCount = posted.length;
    }

    const remaining = totalReels - postedCount;
    const daysRemaining = Math.ceil(remaining / 3);

    return NextResponse.json({
      totalReels,
      posted: postedCount,
      remaining,
      daysRemaining,
      postedIds: posted,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
