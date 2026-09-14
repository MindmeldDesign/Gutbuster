import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// --- Gutbuster's three-tier type system ---------------------------------
// Display: big, bold, short text -- the logo, hero, section headings.
// Body: anything you'd actually read in full sentences -- descriptions,
//       bios, suggestions. Chosen specifically for readability at
//       realistic content lengths without feeling like a novelty font.
// Label: tiny all-caps tags/badges only (form tags, theater chips,
//        the team badge on video cards) -- never used for body copy,
//        since a full pixel-font page reads as overwhelming rather
//        than charming.

const amstrad = localFont({
  src: "./fonts/amstrad-pc.ttf",
  variable: "--font-display",
  display: "swap",
});

const spaceGrotesk = localFont({
  src: "./fonts/space-grotesk.ttf",
  variable: "--font-body",
  display: "swap",
});

const ibmVga = localFont({
  src: "./fonts/ibm-vga.ttf",
  variable: "--font-label",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gutbuster",
  description:
    "A curated home for improv, sketch, and standup videos from theaters and teams around the world.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${amstrad.variable} ${spaceGrotesk.variable} ${ibmVga.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
