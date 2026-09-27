import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FPL Draft Assistant",
  description: "Gameweek reviews and transfer suggestions for an FPL Draft league",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <header className="border-b border-black/10 dark:border-white/15">
          <div className="mx-auto max-w-3xl px-4 py-4">
            <h1 className="text-lg font-bold">FPL Draft Assistant</h1>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
