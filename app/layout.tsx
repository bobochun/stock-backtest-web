import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppShell from "./components/core/AppShell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Stock Backtest Web | 台股研究平台",
    template: "%s | Stock Backtest Web",
  },
  description:
    "台股回測、法人籌碼、盤後選股、Watchlist、部位控管、風險模擬與研究報告平台。",
  keywords: [
    "台股",
    "股票回測",
    "法人籌碼",
    "盤後選股",
    "投資研究",
    "部位控管",
    "風險管理",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}