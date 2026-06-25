import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tarefo — Azul Administradora",
  description:
    "Sistema de gestão de tarefas e comunicação interna da Azul Administradora.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
