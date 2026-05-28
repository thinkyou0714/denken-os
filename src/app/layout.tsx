import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "katex/dist/katex.min.css";
import "./globals.css";
import { StreakChip } from "@/components/StreakChip";

export const metadata: Metadata = {
  title: "DNKN-OS — 電験 学習 OS",
  description:
    "電験(電気主任技術者試験)を、FSRS による間隔反復学習で再現性のある合格プロセスに体系化する学習 OS。",
  applicationName: "DNKN-OS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DNKN-OS",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
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
          <nav className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center">
              <Link href="/" className="text-lg font-bold tracking-tight">
                DNKN<span className="text-indigo-600">-OS</span>
              </Link>
              <StreakChip />
            </div>
            <div className="flex flex-shrink-0 items-center gap-0.5 text-sm sm:gap-1">
              <Link
                href="/"
                className="rounded-md px-2 py-1.5 font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 sm:px-3"
              >
                <span className="sm:hidden">ホーム</span>
                <span className="hidden sm:inline">ダッシュボード</span>
              </Link>
              <Link
                href="/study"
                className="rounded-md px-2 py-1.5 font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 sm:px-3"
              >
                学習
              </Link>
              <Link
                href="/problems"
                className="rounded-md px-2 py-1.5 font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 sm:px-3"
              >
                <span className="sm:hidden">問題</span>
                <span className="hidden sm:inline">問題一覧</span>
              </Link>
              <Link
                href="/settings"
                className="rounded-md px-2 py-1.5 font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 sm:px-3"
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
