import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "순천시 혜택 모음 | 순천시 맞춤 복지·지원 포털",
  description: "순천시 맞춤형 복지 및 보조금 지원 포털",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

import AiChatWidget from '@/components/AiChatWidget';

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen pb-16 md:pb-0">
        {children}
        <AiChatWidget />
      </body>
    </html>
  );
}
