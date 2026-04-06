import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const DATA_DIR = join(process.cwd(), "data");
const REELS_FILE = join(DATA_DIR, "reels-list.json");
const POSTED_FILE = join(DATA_DIR, "posted-reels.json");

interface Reel {
  id: string;
  caption: string;
  permalink: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reelsFromDate, startPostingDate, dryRun = false } = body;

    if (!reelsFromDate || !startPostingDate) {
      return NextResponse.json(
        { error: "reelsFromDate e startPostingDate são obrigatórios" },
        { status: 400 },
      );
    }

    // Load reels
    if (!existsSync(REELS_FILE)) {
      return NextResponse.json(
        { error: "Nenhum reel encontrado. Execute o scraper primeiro." },
        { status: 404 },
      );
    }

    const allReels: Reel[] = JSON.parse(await readFile(REELS_FILE, "utf-8"));
    const posted: string[] = existsSync(POSTED_FILE)
      ? JSON.parse(await readFile(POSTED_FILE, "utf-8"))
      : [];

    // Filter reels not yet posted
    const available = allReels.filter((r) => !posted.includes(r.id));

    if (available.length === 0) {
      return NextResponse.json(
        { error: "Todos os reels já foram postados." },
        { status: 400 },
      );
    }

    // Calculate how many videos and days
    const totalVideos = available.length;
    const totalDays = Math.ceil(totalVideos / 3);
    const endDate = new Date(startPostingDate);
    endDate.setDate(endDate.getDate() + totalDays - 1);

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        totalVideos,
        totalDays,
        startDate: startPostingDate,
        endDate: endDate.toISOString().split("T")[0],
        videosPerDay: 3,
        schedule: "12:00, 18:00, 21:00 BRT",
      });
    }

    // Run the batch upload script in background
    const scriptPath = join(process.cwd(), "scripts/shorts-automation/run-batch.ts");
    const batchSize = Math.min(available.length, 10); // Process 10 at a time to avoid quota

    try {
      const result = execSync(
        `pnpm tsx "${scriptPath}" --batch ${batchSize}`,
        {
          cwd: process.cwd(),
          timeout: 600_000,
          encoding: "utf-8",
          env: { ...process.env },
        },
      );

      // Count successful uploads from output
      const uploadedCount = (result.match(/Uploaded:/g) || []).length;

      return NextResponse.json({
        success: true,
        uploaded: uploadedCount,
        batchSize,
        totalRemaining: available.length - uploadedCount,
        message: `${uploadedCount} videos agendados com sucesso!`,
      });
    } catch (err: any) {
      const output = err.stdout || err.message;
      const uploadedCount = (output.match(/Uploaded:/g) || []).length;

      if (output.includes("quota")) {
        return NextResponse.json({
          success: uploadedCount > 0,
          uploaded: uploadedCount,
          quotaExceeded: true,
          message: `${uploadedCount} videos agendados. Quota do YouTube excedida - tente novamente amanhã.`,
        });
      }

      return NextResponse.json(
        { error: `Erro no agendamento: ${err.message}` },
        { status: 500 },
      );
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
