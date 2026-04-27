import type { Metadata } from "next";
import { DM_Serif_Display, Newsreader, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

const display = DM_Serif_Display({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const body = Newsreader({
  variable: "--font-body",
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NewGen Realty — Office of the Cartographer",
  description: "AI-powered real estate platform for Louisiana, Arkansas, and Mississippi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${body.variable} ${mono.variable} antialiased font-body`}
      >
        <div className="flex min-h-screen bg-parchment text-ink">
          <Sidebar />
          <main className="flex-1 px-10 py-10 paper-grain">{children}</main>
        </div>
      </body>
    </html>
  );
}
