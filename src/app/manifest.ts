import type { MetadataRoute } from "next";
import { tokenHex } from "@/lib/tokens";

// Web app manifest: lets Android (and desktop Chrome) install Gutbuster
// to the home screen and open it full screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gutbuster",
    short_name: "Gutbuster",
    description: "The comedy video store. Without the late fees.",
    start_url: "/",
    display: "standalone",
    background_color: tokenHex("background"), // splash screen = page background
    theme_color: tokenHex("colors/gb-cream/500"), // matches the cream header
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
