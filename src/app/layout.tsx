import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Newsreader } from "next/font/google";
import { MissingConfig } from "@/components/MissingConfig";
import { missingSupabaseVars } from "@/lib/supabase/env";
import "./globals.css";

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const THEME_COLOR = "#f6f2ea";

export const metadata: Metadata = {
  title: { default: "Stretch", template: "%s · Stretch" },
  description: "Pray deliberately. Keep the hours.",
  applicationName: "Stretch",
  appleWebApp: {
    capable: true,
    title: "Stretch",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  // Next only emits the newer "mobile-web-app-capable" name. Older iOS still reads this one.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: THEME_COLOR,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const missing = missingSupabaseVars();

  return (
    <html
      lang="en"
      className={`${hanken.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-dvh bg-vellum text-ink">
        {missing.length > 0 ? <MissingConfig missing={missing} /> : children}
      </body>
    </html>
  );
}
