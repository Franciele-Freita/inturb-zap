"use client";

import type { ReactNode } from "react";
import type { FinancialRecordStatus } from "../types/finance";

export function FinancePageHeader(props: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <section className="cargo-list-page-header">
      <div className="cargo-list-page-header-copy">
        <h1>{props.title}</h1>
        <p>{props.subtitle}</p>
      </div>
      {props.actions ? (
        <div className="cargo-list-page-header-actions">{props.actions}</div>
      ) : null}
    </section>
  );
}

export function FinanceFilterCard(props: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="panel panel-wide financial-filter-card finance-module-card">
      {props.title ? (
        <div className="panel-head finance-module-card-head">
          <h2>{props.title}</h2>
          <span>{props.description}</span>
        </div>
      ) : null}
      {props.children}
    </section>
  );
}

export function FinanceSectionCard(props: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="panel panel-wide finance-module-card">
      <div className="panel-head finance-module-card-head">
        <h2>{props.title}</h2>
        {props.subtitle ? <span>{props.subtitle}</span> : null}
      </div>
      {props.children}
    </section>
  );
}

export function FinanceSummaryCards(props: {
  items: Array<{
    label: string;
    value: string;
    tone?: "neutral" | "success" | "warning" | "danger";
  }>;
}) {
  return (
    <section className="financial-cards-grid finance-summary-cards-grid">
      {props.items.map((item) => (
        <article key={item.label} className={`panel financial-card finance-summary-card tone-${item.tone ?? "neutral"}`}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </section>
  );
}

export function FinancialStatusBadge({ status }: { status: FinancialRecordStatus | string }) {
  const mapping = resolveStatusBadge(status);
  return <span className={`timekeeping-badge ${mapping.className}`}>{mapping.label}</span>;
}

export function EmptyState(props: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="finance-empty-state">
      <strong>{props.title}</strong>
      <p>{props.description}</p>
      {props.action ? <div className="finance-empty-state-actions">{props.action}</div> : null}
    </div>
  );
}

export function MetricBars(props: {
  items: Array<{ label: string; value: number }>;
  colorClass?: "revenue" | "expense" | "neutral";
}) {
  const maxValue = Math.max(...props.items.map((item) => item.value), 1);
  return (
    <div className="finance-bars">
      {props.items.map((item) => {
        const widthPercent = Math.max(4, Math.round((item.value / maxValue) * 100));
        return (
          <div key={`${item.label}-${item.value}`} className="finance-bar-row">
            <span>{item.label}</span>
            <div className="finance-bar-track">
              <div
                className={`finance-bar-fill tone-${props.colorClass ?? "neutral"}`}
                style={{ width: `${widthPercent}%` }}
              />
            </div>
            <strong>{formatCurrency(item.value)}</strong>
          </div>
        );
      })}
    </div>
  );
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${date}T12:00:00.000Z`));
}

export function todayMonthValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function resolveStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "OPEN":
      return { label: "Aberto", className: "badge-warning" };
    case "PAID":
      return { label: "Pago", className: "badge-success" };
    case "RECEIVED":
      return { label: "Recebido", className: "badge-success" };
    case "OVERDUE":
      return { label: "Vencido", className: "badge-danger" };
    case "CANCELLED":
      return { label: "Cancelado", className: "badge-neutral" };
    case "CONCILIATED":
      return { label: "Conciliado", className: "badge-success" };
    case "MATCHED":
      return { label: "Conciliado", className: "badge-success" };
    case "PENDING":
      return { label: "Pendente", className: "badge-warning" };
    default:
      return { label: status, className: "badge-neutral" };
  }
}

