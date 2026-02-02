import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DIARY_FILE = path.join(DATA_DIR, "diary.tsv");
const SEP = "\t";

export type DiaryEntry = {
  date: string;
  title: string;
  body: string;
};

/** 제목 등 한 줄 필드용: 탭·줄바꿈을 공백으로 */
function sanitize(value: string): string {
  return value.replace(/[\t\n\r]+/g, " ").trim();
}

/** TSV 한 행에 넣기 위해 본문의 \, \n, \t 이스케이프 */
function escapeBody(body: string): string {
  return body
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "")
    .replace(/\t/g, "\\t");
}

/** TSV에서 읽은 본문 복원 */
function unescapeBody(body: string): string {
  return body
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\");
}

async function ensureDataFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DIARY_FILE);
  } catch {
    await fs.writeFile(DIARY_FILE, "", "utf-8");
  }
}

async function readEntries(): Promise<DiaryEntry[]> {
  await ensureDataFile();
  const content = await fs.readFile(DIARY_FILE, "utf-8");
  if (!content.trim()) return [];
  const lines = content.trim().split("\n");
  const entries: DiaryEntry[] = [];
  for (const line of lines) {
    const parts = line.split(SEP);
    if (parts.length >= 3) {
      entries.push({
        date: parts[0],
        title: parts[1],
        body: unescapeBody(parts.slice(2).join(SEP)),
      });
    }
  }
  return entries;
}

async function writeEntries(entries: DiaryEntry[]): Promise<void> {
  await ensureDataFile();
  const lines = entries.map(
    (e) => `${e.date}${SEP}${e.title}${SEP}${escapeBody(e.body)}`
  );
  await fs.writeFile(DIARY_FILE, lines.join("\n"), "utf-8");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const entries = await readEntries();
    if (date) {
      const one = entries.find((e) => e.date === date);
      return NextResponse.json(one ?? null);
    }
    return NextResponse.json(entries);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to read diary" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { date, title, body: bodyText } = data as {
      date?: string;
      title?: string;
      body?: string;
    };
    if (!date || typeof date !== "string") {
      return NextResponse.json(
        { error: "date is required (yyyyMMdd)" },
        { status: 400 }
      );
    }
    const yyyyMMdd = date.replace(/-/g, "").slice(0, 8);
    if (yyyyMMdd.length !== 8) {
      return NextResponse.json(
        { error: "date must be yyyyMMdd or yyyy-MM-dd" },
        { status: 400 }
      );
    }
    const entries = await readEntries();
    const newEntry: DiaryEntry = {
      date: yyyyMMdd,
      title: sanitize(typeof title === "string" ? title : ""),
      body: typeof bodyText === "string" ? bodyText.trim() : "",
    };
    const rest = entries.filter((e) => e.date !== yyyyMMdd);
    await writeEntries([...rest, newEntry]);
    return NextResponse.json(newEntry);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to save diary" },
      { status: 500 }
    );
  }
}
