import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz"] });
const sans = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Discovery — Un viaje por lo que la web puede hacer",
  description:
    "Una experiencia inmersiva en tiempo real: naturaleza generada en tu navegador con WebGL, shaders y audio procedural. / An immersive real-time journey through what the web can do.",
};

export const viewport: Viewport = {
  themeColor: "#0d100a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
