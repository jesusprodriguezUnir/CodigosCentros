import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const display = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Buscador de Centros Educativos · Comunidad de Madrid",
  description:
    "Consulta vacantes históricas (cursos 22/23 a 25/26) de los centros educativos públicos de la Comunidad de Madrid.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} ${display.variable}`}>
      <body className="min-h-screen bg-ink-50 font-sans text-ink-900">
        {children}
      </body>
    </html>
  );
}
