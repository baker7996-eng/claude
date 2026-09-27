import type { MetadataRoute } from "next";

// Lets phones install the site from "Add to Home Screen" like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "No Friends in Fantasy",
    short_name: "NFIF",
    description: "Our FPL Draft league: write-ups, advice and the table.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0f0d",
    theme_color: "#0b0f0d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
