import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "VIGÍA · Gestión de mantenimiento biomédico",
    template: "%s · VIGÍA",
  },
  description:
    "Sistema de gestión del mantenimiento de equipos biomédicos de la Unidad Pediátrica Simón Bolívar IPS S.A.S.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
