"use client";

import { useState, useEffect, useCallback } from "react";
import { getColorsFromDate } from "@/lib/colors";

type DiaryEntry = { date: string; title: string; body: string } | null;

function formatDateForInput(yyyyMMdd: string): string {
  if (yyyyMMdd.length !== 8) return "";
  return `${yyyyMMdd.slice(0, 4)}-${yyyyMMdd.slice(4, 6)}-${yyyyMMdd.slice(6, 8)}`;
}

function todayYyyyMMdd(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export default function Home() {
  const [dateYyyyMMdd, setDateYyyyMMdd] = useState(todayYyyyMMdd);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadEntry = useCallback(async (yyyyMMdd: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/diary?date=${yyyyMMdd}`);
      const data: DiaryEntry = await res.json();
      if (data) {
        setTitle(data.title);
        setBody(data.body);
      } else {
        setTitle("");
        setBody("");
      }
    } catch {
      setTitle("");
      setBody("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntry(dateYyyyMMdd);
  }, [dateYyyyMMdd, loadEntry]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (!v) return;
    const yyyyMMdd = v.replace(/-/g, "");
    setDateYyyyMMdd(yyyyMMdd);
  };

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/diary/export?t=${Date.now()}`);
      if (!res.ok) {
        setMessage({ type: "err", text: "내보내기에 실패했습니다." });
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?([^";\n]+)"?/);
      const filename = match?.[1] ?? `diary_export_${todayYyyyMMdd()}.tsv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({ type: "ok", text: "TSV 파일이 다운로드되었습니다." });
    } catch {
      setMessage({ type: "err", text: "내보내기 중 오류가 발생했습니다." });
    } finally {
      setExporting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateYyyyMMdd,
          title,
          body,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage({ type: "err", text: (err as { error?: string }).error || "저장에 실패했습니다." });
        return;
      }
      setMessage({ type: "ok", text: "저장되었습니다." });
    } catch {
      setMessage({ type: "err", text: "저장 중 오류가 발생했습니다." });
    } finally {
      setSaving(false);
    }
  };

  const colors = getColorsFromDate(dateYyyyMMdd);
  const dateInputValue = dateYyyyMMdd.length === 8 ? formatDateForInput(dateYyyyMMdd) : "";

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="mb-8 text-2xl font-semibold" style={{ color: colors.text }}>
          오늘의 일기
        </h1>

        <div className="space-y-6">
          <div>
            <label htmlFor="diary-date" className="mb-1 block text-sm font-medium opacity-90">
              날짜
            </label>
            <input
              id="diary-date"
              type="date"
              value={dateInputValue}
              onChange={handleDateChange}
              className="w-full rounded-lg border border-current/30 bg-white/80 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-current/40"
              style={{ color: colors.text }}
              aria-label="날짜 선택"
            />
          </div>

          <div>
            <label htmlFor="diary-title" className="mb-1 block text-sm font-medium opacity-90">
              제목
            </label>
            <input
              id="diary-title"
              type="text"
              placeholder="제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-current/30 bg-white/80 px-3 py-2 text-base placeholder:opacity-60 focus:outline-none focus:ring-2 focus:ring-current/40"
              style={{ color: colors.text }}
              aria-label="일기 제목"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="diary-body" className="mb-1 block text-sm font-medium opacity-90">
              내용
            </label>
            <textarea
              id="diary-body"
              placeholder="오늘 하루를 기록해 보세요."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full resize-y rounded-lg border border-current/30 bg-white/80 px-3 py-2 text-base placeholder:opacity-60 focus:outline-none focus:ring-2 focus:ring-current/40"
              style={{ color: colors.text }}
              aria-label="일기 내용"
              disabled={loading}
            />
          </div>

          {message && (
            <p
              role="alert"
              className={`text-sm ${message.type === "ok" ? "opacity-80" : "font-medium"}`}
            >
              {message.text}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="rounded-lg bg-current px-5 py-2.5 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: colors.text, color: colors.bg }}
              aria-label="저장"
            >
              {saving ? "저장 중…" : "저장"}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="rounded-lg border-2 border-current/50 px-5 py-2.5 font-medium opacity-90 transition-opacity hover:opacity-100 disabled:opacity-50"
              style={{ color: colors.text }}
              aria-label="TSV 파일 내보내기"
            >
              {exporting ? "내보내는 중…" : "TSV 내보내기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
