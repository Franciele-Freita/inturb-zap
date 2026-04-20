import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inturb | Viagem segura, limpa e confiavel",
  description: "Conheca a proposta da Inturb para passageiros com foco em seguranca, limpeza, bom atendimento e confianca."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
