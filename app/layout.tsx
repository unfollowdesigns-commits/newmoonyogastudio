import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";
import { studio } from "@/clients";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});
const jost = Jost({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-jost" });

export const metadata: Metadata = {
  title: studio.name,
  description: studio.description.fr,
  appleWebApp: { capable: true, title: studio.shortName, statusBarStyle: "default" },
};

// a studio can recolour the app without touching globals.css
const colors = Object.entries(studio.colors ?? {})
  .map(([k, v]) => `--color-${k}:${v};`)
  .join("");

export const viewport: Viewport = {
  themeColor: studio.colors?.sand ?? "#f5f0ec",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${cormorant.variable} ${jost.variable}`}>
      {colors && <head><style>{`:root{${colors}}`}</style></head>}
      <body>{children}</body>
    </html>
  );
}
