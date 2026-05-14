"use client";

import { useEffect, useMemo, useState } from "react";
import {
  EmptyState,
  FinancePageHeader,
  FinanceSectionCard,
  FinancialStatusBadge,
  formatCurrency,
  formatDate,
  todayMonthValue
} from "../components/finance-shared";
import { financeService } from "../services/finance-service";
import type { FinanceLookupData, FinancialEntry } from "../types/finance";

export function FinancialEntriesPage() {
  const [month, setMonth] = useState(todayMonthValue());
  const [type, setType] = useState<"ALL" | "REVENUE" | "EXPENSE">("ALL");
  const [status, setStatus] = useState("ALL");
  const [rows, setRows] = useState<FinancialEntry[]>([]);
  const [lookups, setLookups] = useState<FinanceLookupData | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    void financeService.getLookups().then(setLookups);
  }, []);

  useEffect(() => {
    void financeService
      .listEntries({ month, type, status })
      .then(setRows)
      .catch((error: Error) => setFeedback(error.message));
  }, [month, type, status]);

  const totals = useMemo(() => {
    const revenue = rows.filter((row) => row.type === "REVENUE").reduce((sum, row) => sum + row.value, 0);
    const expense = rows.filter((row) => row.type === "EXPENSE").reduce((sum, row) => sum + row.value, 0);
    return { revenue, expense, result: revenue - expense };
  }, [rows]);

  function categoryName(id: string): string {
    return lookups?.categories.find((item) => item.id === id)?.name ?? id;
  }

  function costCenterName(id: string): string {
    return lookups?.costCenters.find((item) => item.id === id)?.name ?? id;
  }

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <FinancePageHeader
        title="Lancamentos financeiros"
        subtitle="Visao unificada de receitas e despesas por origem e status."
      />

      {feedback ? <p className="journey-list-status-message">{feedback}</p> : null}

      <section className="grid grid-single finance-layout-stack">
        <FinanceSectionCard title="Filtros" subtitle="Controle por competencia, tipo e status do lancamento.">
          <div className="financial-filter-grid finance-module-filters-grid">
            <label>
              <span>Competencia</span>
              <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            </label>
            <label>
              <span>Tipo</span>
              <select className="select" value={type} onChange={(event) => setType(event.target.value as "ALL" | "REVENUE" | "EXPENSE")}>
                <option value="ALL">Todos</option>
                <option value="REVENUE">Receita</option>
                <option value="EXPENSE">Despesa</option>
              </select>
            </label>
            <label>
              <span>Status</span>
              <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="ALL">Todos</option>
                <option value="OPEN">Aberto</option>
                <option value="PAID">Pago</option>
                <option value="RECEIVED">Recebido</option>
                <option value="OVERDUE">Vencido</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </label>
          </div>
        </FinanceSectionCard>

        <section className="financial-cards-grid finance-summary-cards-grid">
          <article className="panel financial-card">
            <span>Total receitas</span>
            <strong>{formatCurrency(totals.revenue)}</strong>
          </article>
          <article className="panel financial-card">
            <span>Total despesas</span>
            <strong>{formatCurrency(totals.expense)}</strong>
          </article>
          <article className="panel financial-card">
            <span>Resultado</span>
            <strong>{formatCurrency(totals.result)}</strong>
          </article>
        </section>

        <FinanceSectionCard title="Todos os lancamentos" subtitle={`${rows.length} registro(s) encontrado(s).`}>
          {rows.length === 0 ? (
            <EmptyState
              title="Nenhum lancamento encontrado"
              description="Nao existem lancamentos para os filtros selecionados."
            />
          ) : (
            <div className="drivers-table-wrap">
              <table className="drivers-table pricing-table cargo-list-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Descricao</th>
                    <th>Categoria</th>
                    <th>Centro de custo</th>
                    <th>Origem</th>
                    <th>Valor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.date)}</td>
                      <td>{row.type === "REVENUE" ? "Receita" : "Despesa"}</td>
                      <td>{row.description}</td>
                      <td>{categoryName(row.categoryId)}</td>
                      <td>{costCenterName(row.costCenterId)}</td>
                      <td>{row.origin}</td>
                      <td>{formatCurrency(row.value)}</td>
                      <td>
                        <FinancialStatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </FinanceSectionCard>
      </section>
    </main>
  );
}

