import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TikTok LIVE TTS & Realtime API",
  description: "Bot lector de comentarios en tiempo real para transmisiones de TikTok con TTS y API para móviles",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-[#070709] text-gray-100 antialiased selection:bg-[#FE2C55]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
