import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import NextTopLoader from "nextjs-toploader";
import { IBM_Plex_Mono, IBM_Plex_Sans, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Harness, model and lab usage",
  description: "All-time token usage across harnesses, models and labs.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn(plexSans.variable, plexMono.variable, "dark", "font-sans", geist.variable)}>
      <body>
        <NextTopLoader color="#8ea2ff" height={2} showSpinner={false} shadow={false} />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
