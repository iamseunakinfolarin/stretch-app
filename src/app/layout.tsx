import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import { MissingConfig } from "@/components/MissingConfig";
import { missingSupabaseVars } from "@/lib/supabase/env";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const THEME_COLOR = "#e3e8e4";

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
      className={`${figtree.variable} h-full antialiased`}
    >
      <body className="min-h-dvh text-ink">
        {/* On wide screens the app stays in a centered phone-width column. */}
        <div className="relative mx-auto min-h-dvh w-full max-w-md bg-canvas">
          {missing.length > 0 ? <MissingConfig missing={missing} /> : children}
        </div>
      </body>
    </html>
  );
}
