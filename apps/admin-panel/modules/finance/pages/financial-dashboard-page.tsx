"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FinancePageHeader,
  FinanceSectionCard,
  FinanceSummaryCards,
  MetricBars,
  formatCurrency,
  formatDate,
  todayMonthValue
} from "../components/finance-shared";
import { financeService } from "../services/finance-service";
import type { FinancialDashboardInsights, FinancialDashboardSummary } from "../types/finance";

export function FinancialDashboardPage() {
  const [month, setMonth] = useState(todayMonthValue());
  const [summary, setSummary] = useState<FinancialDashboardSummary | null>(null);
  const [insights, setInsights] = useState<FinancialDashboardInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setFeedback(null);
    void financeService
      .getDashboard(month)
      .then((response) => {
        setSummary(response.summary);
        setInsights(response.insights);
      })
      .catch((error: Error) => setFeedback(error.message))
      .finally(() => setIsLoading(false));
  }, [month]);

  const cards = useMemo(
    () => [
      { label: "Saldo atual", value: formatCurrency(summary?.currentBalance ?? 0), tone: "neutral" as const },
      { label: "Contas a pagar hoje", value: formatCurrency(summary?.payablesToday ?? 0), tone: "warning" as const },
      { label: "Contas a receber hoje", value: formatCurrency(summary?.receivablesToday ?? 0), tone: "success" as const },
      { label: "Vencidas a pagar", value: formatCurrency(summary?.overduePayables ?? 0), tone: "danger" as const },
      { label: "Vencidas a receber", value: formatCurrency(summary?.overdueReceivables ?? 0), tone: "warning" as const },
      { label: "Receita do mes", value: formatCurrency(summary?.monthRevenue ?? 0), tone: "success" as const },
      { label: "Despesas do mes", value: formatCurrency(summary?.monthExpense ?? 0), tone: "danger" as const },
      {
        label: "Lucro/prejuizo do mes",
        value: formatCurrency(summary?.monthResult ?? 0),
        tone: (summary?.monthResult ?? 0) >= 0 ? ("success" as const) : ("danger" as const)
      }
    ],
    [summary]
  );

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <FinancePageHeader
        title="Dashboard financeiro"
        subtitle="Resumo de caixa, receitas, despesas e saude financeira da operacao."
      />

      <section className="grid grid-single">
        <FinanceSectionCard title="Filtros" subtitle="Defina a competencia para o consolidado.">
          <div className="financial-filter-grid finance-module-filters-grid">
            <label>
              <span>Competencia</span>
              <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            </label>
          </div>
        </FinanceSectionCard>
      </section>

      {feedback ? <p className="journey-list-status-message">{feedback}</p> : null}
      {isLoading ? <p className="helper-text">Atualizando indicadores financeiros...</p> : null}

      <FinanceSummaryCards items={cards} />

      <section className="grid grid-2-columns finance-grid-two">
        <FinanceSectionCard title="Receitas x despesas" subtitle="Comparativo diario da competencia.">
          <MetricBars
            colorClass="neutral"
            items={(insights?.revenueVsExpense ?? []).map((item) => ({
              label: formatDate(item.label),
              value: item.revenue - item.expense
            }))}
          />
        </FinanceSectionCard>

        <FinanceSectionCard title="Fluxo de caixa por periodo" subtitle="Evolucao do saldo acumulado.">
          <MetricBars
            colorClass="revenue"
            items={(insights?.cashFlow ?? []).map((item) => ({
              label: formatDate(item.label),
              value: item.balance
            }))}
          />
        </FinanceSectionCard>
      </section>

      <section className="grid grid-2-columns finance-grid-two">
        <FinanceSectionCard title="Despesas por categoria" subtitle="Categorias com maior impacto no periodo.">
          <MetricBars colorClass="expense" items={insights?.expensesByCategory ?? []} />
        </FinanceSectionCard>
        <FinanceSectionCard title="Receitas por origem" subtitle="Principais origens de receita financeira.">
          <MetricBars colorClass="revenue" items={insights?.revenuesBySource ?? []} />
        </FinanceSectionCard>
      </section>
    </main>
  );
}

