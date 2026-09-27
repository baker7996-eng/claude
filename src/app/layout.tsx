import type { Metadata, Viewport } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "@fontsource/archivo-black/400.css";
import "./globals.css";
import { Nav } from "@/components/nav";
import { ENTRY_ID } from "@/lib/config";
import { fpl } from "@/lib/fpl/client";

export const metadata: Metadata = {
  title: "FPL Draft Assistant",
  description: "Gameweek reviews and transfer suggestions for an FPL Draft league",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0f0d",
};

async function leagueName() {
  try {
    const { entry } = await fpl.entry(ENTRY_ID);
    return (await fpl.league(entry.league_set[0])).league.name;
  } catch {
    return "FPL Draft Assistant";
  }
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full pb-24 md:pb-10">
        <Nav leagueName={await leagueName()} />
        <main className="mx-auto max-w-6xl px-4 py-4 md:px-6 md:py-8">{children}</main>
      </body>
    </html>
  );
}
