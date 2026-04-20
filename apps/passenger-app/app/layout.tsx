import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Passenger App",
  description: "Web app do passageiro para simular o atendimento conversacional da Inturb."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
