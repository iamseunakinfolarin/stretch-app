import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, IBM_Plex_Mono, Instrument_Serif } from "next/font/google";
import { MissingConfig } from "@/components/MissingConfig";
import { missingSupabaseVars } from "@/lib/supabase/env";
import "./globals.css";

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const THEME_COLOR = "#f5efff";

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
      className={`${hanken.variable} ${instrument.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh bg-canvas text-ink">
        {missing.length > 0 ? <MissingConfig missing={missing} /> : children}
      </body>
    </html>
  );
}
