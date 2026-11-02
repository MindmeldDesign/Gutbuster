import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import AppHeader from "@/components/AppHeader";
import TabBar from "@/components/TabBar";
import "./globals.css";

// --- Gutbuster type system (from the style guide) -----------------------
// Display:   Bowlby One. The wordmark and big headings only.
// Interface: Space Grotesk (variable 300 to 700). Titles, tabs, prose.
// Catalog:   Courier Prime. Uppercase metadata, the rental-sticker layer.

const bowlby = localFont({
  src: "./fonts/BowlbyOne-Regular.ttf",
  variable: "--font-bowlby",
  weight: "400",
  display: "swap",
});

const grotesk = localFont({
  src: "./fonts/SpaceGrotesk-Variable.ttf",
  variable: "--font-grotesk",
  weight: "300 700",
  display: "swap",
});

const courier = localFont({
  src: [
    { path: "./fonts/CourierPrime-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/CourierPrime-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-courier",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gutbuster",
  description: "The comedy video store. Without the late fees.",
  applicationName: "Gutbuster",
  // Lets iPhone users "Add to Home Screen" and open it full screen,
  // without Safari's address bar.
  appleWebApp: {
    capable: true,
    title: "Gutbuster",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fff8e7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bowlby.variable} ${grotesk.variable} ${courier.variable} antialiased`}
    >
      <body className="min-h-dvh bg-gb-paper">
        {/* Mobile-first: the app is a single phone-width column. On a
            desktop it simply centers, so it still opens anywhere. */}
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-gb-paper">
          <AppHeader />
          <main className="flex-1 pb-28">{children}</main>
          <TabBar />
        </div>
      </body>
    </html>
  );
}
