"use client";

import { useEffect, useState } from "react";
import {
  EmptyState,
  FinancePageHeader,
  FinanceSectionCard,
  FinanceSummaryCards,
  MetricBars,
  formatCurrency,
  todayMonthValue
} from "../components/finance-shared";
import { financeService } from "../services/finance-service";
import type { FinanceLookupData } from "../types/finance";

type ReportResult = {
  revenue: number;
  expense: number;
  result: number;
  byCategory: Array<{ label: string; value: number }>;
  byClient: Array<{ label: string; value: number }>;
  byCostCenter: Array<{ label: string; value: number }>;
  overdueCount: number;
  cashForecast: number;
};

export function FinancialReportsPage() {
  const [month, setMonth] = useState(todayMonthValue());
  const [categoryId, setCategoryId] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [clientId, setClientId] = useState("");
  const [result, setResult] = useState<ReportResult | null>(null);
  const [lookups, setLookups] = useState<FinanceLookupData | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    void financeService.getLookups().then(setLookups);
  }, []);

  useEffect(() => {
    void financeService
      .getReports({
        month,
        categoryId: categoryId || undefined,
        costCenterId: costCenterId || undefined,
        clientId: clientId || undefined
      })
      .then(setResult)
      .catch((error: Error) => setFeedback(error.message));
  }, [month, categoryId, costCenterId, clientId]);

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <FinancePageHeader
        title="Relatorios financeiros"
        subtitle="Receitas, despesas, resultado e previsao de caixa com filtros gerenciais."
      />

      {feedback ? <p className="journey-list-status-message">{feedback}</p> : null}

      <section className="grid grid-single finance-layout-stack">
        <FinanceSectionCard title="Filtros de relatorio" subtitle="Defina periodo e recortes para analise.">
          <div className="finance-form-grid finance-form-grid-4">
            <label>
              <span>Competencia</span>
              <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            </label>
            <label>
              <span>Categoria</span>
              <select className="select" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                <option value="">Todas</option>
                {(lookups?.categories ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Centro de custo</span>
              <select className="select" value={costCenterId} onChange={(event) => setCostCenterId(event.target.value)}>
                <option value="">Todos</option>
                {(lookups?.costCenters ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Cliente</span>
              <select className="select" value={clientId} onChange={(event) => setClientId(event.target.value)}>
                <option value="">Todos</option>
                {(lookups?.clients ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </FinanceSectionCard>

        <FinanceSummaryCards
          items={[
            { label: "Receitas no periodo", value: formatCurrency(result?.revenue ?? 0), tone: "success" },
            { label: "Despesas no periodo", value: formatCurrency(result?.expense ?? 0), tone: "danger" },
            { label: "Lucro/prejuizo", value: formatCurrency(result?.result ?? 0), tone: (result?.result ?? 0) >= 0 ? "success" : "danger" },
            { label: "Contas vencidas", value: String(result?.overdueCount ?? 0), tone: "warning" },
            { label: "Previsao de caixa", value: formatCurrency(result?.cashForecast ?? 0), tone: "neutral" }
          ]}
        />

        <section className="grid grid-2-columns finance-grid-two">
          <FinanceSectionCard title="Despesas por categoria">
            {(result?.byCategory.length ?? 0) === 0 ? (
              <EmptyState title="Sem dados" description="Nao ha despesas por categoria neste filtro." />
            ) : (
              <MetricBars colorClass="expense" items={result?.byCategory ?? []} />
            )}
          </FinanceSectionCard>

          <FinanceSectionCard title="Receitas por cliente">
            {(result?.byClient.length ?? 0) === 0 ? (
              <EmptyState title="Sem dados" description="Nao ha receitas por cliente neste filtro." />
            ) : (
              <MetricBars colorClass="revenue" items={result?.byClient ?? []} />
            )}
          </FinanceSectionCard>
        </section>

        <FinanceSectionCard title="Custo por centro de custo">
          {(result?.byCostCenter.length ?? 0) === 0 ? (
            <EmptyState
              title="Sem distribuicao por centro de custo"
              description="Nao ha lancamentos no recorte selecionado."
            />
          ) : (
            <MetricBars colorClass="neutral" items={result?.byCostCenter ?? []} />
          )}
        </FinanceSectionCard>
      </section>
    </main>
  );
}

