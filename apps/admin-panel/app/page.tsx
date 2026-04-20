import type { Metadata } from "next";
import { AdminOverviewPage } from "../components/admin-overview-page";

export const metadata: Metadata = {
  title: "Admin Panel | Visao geral",
  description: "Painel administrativo e operacional da Inturb para acompanhar corridas, clientes e motoristas."
};

export default function HomePage() {
  return <AdminOverviewPage />;
}
