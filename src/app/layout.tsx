import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { getDesignVersion } from "@/lib/design-server";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "StudioCRM",
  description: "CRM-система для веб-студии",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const design = await getDesignVersion();

  return (
    <html lang="ru" suppressHydrationWarning data-design={design}>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
