import type { FinancialTransaction } from "../lib/api";

export function FinancialStatusBadge({
  status
}: {
  status: FinancialTransaction["status"];
}) {
  return (
    <span className={`timekeeping-badge ${resolveStatusClassName(status)}`}>
      {formatFinancialStatus(status)}
    </span>
  );
}

export function formatFinancialStatus(status: FinancialTransaction["status"]): string {
  if (status === "PENDING") return "Pendente";
  if (status === "CANCELLED") return "Cancelado";
  return "Concluido";
}

function resolveStatusClassName(status: FinancialTransaction["status"]): string {
  if (status === "PENDING") return "badge-warning";
  if (status === "CANCELLED") return "badge-danger";
  return "badge-success";
}
