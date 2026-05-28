import type { Metadata } from "next";
import Link from "next/link";
import "katex/dist/katex.min.css";
import "./globals.css";
import { StreakChip } from "@/components/StreakChip";

export const metadata: Metadata = {
  title: "DENKEN-OS — 電験 学習 OS",
  description:
    "電験(電気主任技術者試験)を、FSRS による間隔反復学習で再現性のある合格プロセスに体系化する学習 OS。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <Link href="/" className="text-lg font-bold tracking-tight">
                DENKEN<span className="text-indigo-600">-OS</span>
              </Link>
              <StreakChip />
            </div>
            <div className="flex gap-1 text-sm">
              <Link
                href="/"
                className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                ダッシュボード
              </Link>
              <Link
                href="/study"
                className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                学習
              </Link>
              <Link
                href="/problems"
                className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                問題一覧
              </Link>
              <Link
                href="/settings"
                className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                設定
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
