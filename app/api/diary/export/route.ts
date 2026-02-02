import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DIARY_FILE = path.join(DATA_DIR, "diary.tsv");

function exportFilename(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `diary_export_${y}${m}${d}.tsv`;
}

export async function GET() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const content = await fs.readFile(DIARY_FILE, "utf-8").catch(() => "");
    const filename = exportFilename();
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/tab-separated-values; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to export diary" },
      { status: 500 }
    );
  }
}
