import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "学会管理ページ",
  description: "学会プレゼンテーション管理システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
