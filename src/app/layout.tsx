import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rota Solidária",
  description:
    "Plataforma de coordenação de doações, logística e voluntariado em ações humanitárias.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
