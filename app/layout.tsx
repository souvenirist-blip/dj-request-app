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
  title: "Music Request",
  description: "Music request application for DJ events",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={inter.variable}>
      <body className="bg-black text-white antialiased">
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
