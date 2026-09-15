import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Loom Docs — 팀의 지식을 한곳에",
  description: "팀 워크스페이스 기반의 실시간 리치텍스트 문서 협업 서비스",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><head><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Montserrat:wght@500;600;700&display=swap" /></head><body><Providers>{children}</Providers></body></html>;
}
