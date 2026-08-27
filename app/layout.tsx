import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Barlow, Orbitron } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

// Digital-scoreboard look for the Dashboard/Leaderboard metric tiles.
const orbitron = Orbitron({
  variable: "--font-scoreboard",
  subsets: ["latin"],
  weight: ["600", "700", "900"],
});

export const metadata: Metadata = {
  title: "Agent Accelerator",
  description: "Final expense lead management for admins and agents",
  // Without this, iOS's "Add to Home Screen" only launches standalone for
  // the exact page that was current when added — navigating anywhere else
  // (Book of Business, Reports, etc.) drops back into regular Safari with
  // the address bar. This, together with app/manifest.ts, keeps every route
  // in the standalone app window.
  appleWebApp: {
    capable: true,
    title: "Agent Accelerator",
    // "black" (opaque) rather than "black-translucent" — translucent draws
    // app content underneath the status bar/notch, which would need safe-
    // area padding added everywhere to avoid the mobile header sitting
    // under it. Not worth that scope for this fix.
    statusBarStyle: "black",
  },
  other: {
    // Next only emits the modern, unprefixed mobile-web-app-capable tag.
    // Older iOS only recognizes this legacy Apple-prefixed one — harmless
    // to include both.
    "apple-mobile-web-app-capable": "yes",
  },
};

// Without this, a browser/OS "auto dark theme" heuristic (Chrome's forced
// dark mode is the common culprit) can decide this page needs help and
// repaint pure black as a washed-out gray, throwing off every glow/shadow
// that was tuned against true black — this tells it the page is already
// intentionally dark and to leave it alone.
export const viewport: Viewport = {
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${barlowCondensed.variable} ${barlow.variable} ${orbitron.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
