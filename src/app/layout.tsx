import type { Metadata } from "next";
import { Outfit, Cormorant_Garamond } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { HowToGuide } from "@/components/HowToGuide";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Vow & Venue | Premium Wedding Planner",
  description: "Advanced wedding planning made simple.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} ${cormorant.variable} antialiased`}
      >
        <HowToGuide />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
