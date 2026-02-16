import type { Metadata } from "next";
import { Inter } from "next/font/google";
import GoogleAnalytics from "../src/components/GoogleAnalytics";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "🎧 DJ リクエスト",
  description: "DJイベント用楽曲リクエストアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={inter.variable}>
      <body className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white antialiased">
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
