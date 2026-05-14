﻿"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ADMIN_SESSION_UPDATED_EVENT, getStoredAdminSession, type AdminSession } from "../lib/admin-auth";
import { type FinancialCashflow, type FinancialOverview, request } from "../lib/api";
import {
  buildOperationalRiskRows,
  buildOverviewAlerts,
  buildOverviewSummaryCards,
  formatNormalizedDate,
  resolveDrilldownPath,
  sliceTopProjectedCosts
} from "../lib/financial-service";
import { resolveTimekeepingAccess } from "../lib/timekeeping-access";
import { FinancialDataTable } from "./financial-data-table";
import { currentPeriodKey, formatCurrency } from "./timekeeping-shared";

type DashboardAlert = {
  id: string;
  tone: "warning" | "danger" | "info";
  message: string;
  href?: string;
};

type SummaryCard = {
  label: string;
  value: string;
  tone?: "success" | "danger" | "warning";
  href?: string;
  helper?: string;
};

export function FinancialOverviewPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [periodKey, setPeriodKey] = useState(currentPeriodKey());
  const [overview, setOverview] = useState<FinancialOverview | null>(null);
  const [cashflow, setCashflow] = useState<FinancialCashflow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const access = resolveTimekeepingAccess(session);

  useEffect(() => {
    function syncSession() {
      setSession(getStoredAdminSession());
    }
    syncSession();
    window.addEventListener(ADMIN_SESSION_UPDATED_EVENT, syncSession);
    return () => {
      window.removeEventListener(ADMIN_SESSION_UPDATED_EVENT, syncSession);
    };
  }, []);

  useEffect(() => {
    if (!access.canOperate || !periodKey) {
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    void Promise.all([
      request<FinancialOverview>(`/admin/financial/overview?period=${encodeURIComponent(periodKey)}`),
      request<FinancialCashflow>(`/admin/financial/cashflow?period=${encodeURIComponent(periodKey)}`)
    ])
      .then(([loadedOverview, loadedCashflow]) => {
        setOverview(loadedOverview);
        setCashflow(loadedCashflow);
      })
      .catch((error: Error) => setFeedback(error.message))
      .finally(() => setIsLoading(false));
  }, [access.canOperate, periodKey]);

  const cards = useMemo(
    () =>
      buildOverviewSummaryCards(overview, periodKey).map((card) => ({
        ...card,
        value: card.valueType === "currency" ? formatCurrency(card.value) : String(card.value)
      })) satisfies SummaryCard[],
    [overview, periodKey]
  );

  const alerts = useMemo<DashboardAlert[]>(
    () =>
      buildOverviewAlerts({
        overview,
        cashflow,
        periodKey,
        formatCurrency,
        formatDate: formatNormalizedDate
      }),
    [cashflow, overview, periodKey]
  );

  const topProjectedCosts = useMemo(() => sliceTopProjectedCosts(overview), [overview]);

  const operationalRiskRows = useMemo(
    () => buildOperationalRiskRows(overview, formatCurrency),
    [overview]
  );

  if (!access.canOperate) {
    return (
      <main className="page-shell page-shell-wide cargo-list-page-shell">
        <section className="panel panel-wide">
          <h1>Financeiro</h1>
          <p>Seu perfil atual nao possui permissao para visualizar o modulo financeiro.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <section className="panel panel-wide financial-filter-card">
        <div className="financial-filter-grid">
          <label>
            Competencia
            <input type="month" value={periodKey} onChange={(event) => setPeriodKey(event.target.value)} />
          </label>
          <div className="financial-filter-actions">
            <Link className="button-link secondary" href="/financial/entries">
              Movimentacoes
            </Link>
            <Link className="button-link secondary" href="/financial/payroll">
              Folha projetada
            </Link>
            <Link className="button-link secondary" href="/financial/closing">
              Fechamento
            </Link>
          </div>
        </div>
      </section>

      {feedback ? <p className="journey-list-status-message">{feedback}</p> : null}
      {isLoading ? <p className="helper-text">Atualizando consolidado financeiro...</p> : null}

      {alerts.length > 0 ? (
        <section className="panel panel-wide finance-alerts-card">
          <div className="panel-head">
            <h2>Alertas proativos</h2>
            <span>Priorizacao automatica do periodo</span>
          </div>
          <div className="finance-alerts-list">
            {alerts.map((alert) => (
              <article key={alert.id} className={`finance-alert-item tone-${alert.tone}`}>
                <p>{alert.message}</p>
                {alert.href ? (
                  <Link href={alert.href} className="button-link secondary-link">
                    Ver detalhe
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="financial-cards-grid">
        {cards.map((item) => {
          const content = (
            <>
              <span>{item.label}</span>
              <strong className="text-tabular">{item.value}</strong>
              {item.tone ? (
                <small>
                  <span
                    className={`timekeeping-badge ${
                      item.tone === "success"
                        ? "badge-success"
                        : item.tone === "danger"
                          ? "badge-danger"
                          : "badge-warning"
                    }`}
                  >
                    {item.tone === "success" ? "Positivo" : item.tone === "danger" ? "Atencao" : "Monitorar"}
                  </span>
                </small>
              ) : item.helper ? (
                <small>{item.helper}</small>
              ) : null}
            </>
          );

          return item.href ? (
            <button
              key={item.label}
              type="button"
              className="panel financial-card financial-card-action"
              onClick={() => router.push(item.href as string)}
            >
              {content}
            </button>
          ) : (
            <article key={item.label} className="panel financial-card">
              {content}
            </article>
          );
        })}
      </section>

      <section className="grid grid-2-columns financial-panels-grid">
        <article className="panel panel-wide">
          <div className="panel-head">
            <h2>Evolucao de receita e custo</h2>
            <span>{periodKey}</span>
          </div>
          <FinancialMiniLineChart days={cashflow?.days ?? []} />
        </article>

        <article className="panel panel-wide">
          <div className="panel-head">
            <h2>Distribuicao de custos</h2>
            <span>Folha x Frota</span>
          </div>
          <FinancialMiniBars
            items={[
              {
                label: "Folha",
                value: overview?.totals.payrollCostAmount ?? 0,
                tone: "warning"
              },
              {
                label: "Frota",
                value: overview?.totals.fleetCostAmount ?? 0,
                tone: "danger"
              }
            ]}
          />
        </article>
      </section>

      <section className="grid grid-2-columns financial-panels-grid">
        <article className="panel panel-wide">
          <div className="panel-head">
            <h2>Maiores custos projetados</h2>
            <span>{periodKey}</span>
          </div>
          <FinancialDataTable
            loading={isLoading}
            loadingLabel="Atualizando custos projetados..."
            isEmpty={topProjectedCosts.length === 0}
            emptyTitle="Sem custos projetados"
            emptyDescription="Nao existem custos para o periodo selecionado."
            columnCount={4}
            headers={
              <tr>
                <th>Data</th>
                <th>Origem</th>
                <th>Descricao</th>
                <th>Valor</th>
              </tr>
            }
          >
            {topProjectedCosts.map((entry) => (
              <tr
                key={entry.id}
                className="finance-clickable-row"
                onClick={() => router.push(resolveDrilldownPath(periodKey, entry))}
              >
                <td>{formatNormalizedDate(entry.date)}</td>
                <td>
                  <span className="badge-outline">{entry.source}</span>
                </td>
                <td>{entry.description}</td>
                <td className="text-tabular">{formatCurrency(entry.amount)}</td>
              </tr>
            ))}
          </FinancialDataTable>
        </article>

        <article className="panel panel-wide">
          <div className="panel-head">
            <h2>Risco operacional</h2>
            <span>Sinais para acao imediata</span>
          </div>
          <table className="drivers-table">
            <thead>
              <tr>
                <th>Indicador</th>
                <th>Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {operationalRiskRows.map((risk) => (
                <tr
                  key={risk.id}
                  className="finance-clickable-row"
                  onClick={() => router.push(risk.href)}
                >
                  <td>{risk.title}</td>
                  <td className="text-tabular">{risk.value}</td>
                  <td>
                    <span
                      className={`timekeeping-badge ${
                        risk.severity === "critical"
                          ? "badge-danger"
                          : risk.severity === "warning"
                            ? "badge-warning"
                            : "badge-success"
                      }`}
                    >
                      {risk.severity === "critical"
                        ? "Critico"
                        : risk.severity === "warning"
                          ? "Atencao"
                          : "Estavel"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>

      <section className="panel panel-wide">
        <div className="panel-head">
          <h2>Fluxo diario da competencia</h2>
          <span>{periodKey}</span>
        </div>
        <FinancialDataTable
          loading={isLoading}
          loadingLabel="Atualizando fluxo diario..."
          isEmpty={(cashflow?.days.length ?? 0) === 0}
          emptyTitle="Sem movimentacao consolidada"
          emptyDescription="Nao ha dados consolidados de fluxo diario para esta competencia."
          columnCount={6}
          headers={
            <tr>
              <th>Data</th>
              <th>Receita</th>
              <th>Folha</th>
              <th>Frota</th>
              <th>Custo total</th>
              <th>Liquido</th>
            </tr>
          }
        >
          {(cashflow?.days ?? []).map((day) => (
            <tr key={day.date}>
              <td>{formatNormalizedDate(day.date)}</td>
              <td className="text-tabular">{formatCurrency(day.revenueAmount)}</td>
              <td className="text-tabular">{formatCurrency(day.payrollCostAmount)}</td>
              <td className="text-tabular">{formatCurrency(day.fleetCostAmount)}</td>
              <td className="text-tabular">{formatCurrency(day.totalCostAmount)}</td>
              <td>
                <span className={`timekeeping-badge text-tabular ${day.netAmount >= 0 ? "badge-success" : "badge-danger"}`}>
                  {formatCurrency(day.netAmount)}
                </span>
              </td>
            </tr>
          ))}
        </FinancialDataTable>
      </section>
    </main>
  );
}

function FinancialMiniBars({
  items
}: {
  items: Array<{ label: string; value: number; tone: "warning" | "danger" | "success" }>;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <div className="finance-mini-bars">
      {items.map((item) => (
        <article key={item.label} className="finance-mini-bar-row">
          <div>
            <span>{item.label}</span>
            <strong>{formatCurrency(item.value)}</strong>
          </div>
          <div className="finance-mini-bar-track">
            <div
              className={`finance-mini-bar-fill tone-${item.tone}`}
              style={{ width: `${Math.max(4, Math.round((item.value / max) * 100))}%` }}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

function FinancialMiniLineChart({ days }: { days: FinancialCashflow["days"] }) {
  if (days.length === 0) {
    return <p className="helper-text">Sem dados suficientes para exibir a evolucao no periodo.</p>;
  }

  const width = 680;
  const height = 220;
  const padding = 24;

  const pointsNet = mapLinePoints(
    days.map((item) => item.netAmount),
    width,
    height,
    padding
  );
  const pointsRevenue = mapLinePoints(
    days.map((item) => item.revenueAmount),
    width,
    height,
    padding
  );

  return (
    <div className="finance-mini-line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolucao de receita e resultado diario">
        <polyline className="line line-revenue" points={pointsRevenue} />
        <polyline className="line line-net" points={pointsNet} />
      </svg>
      <div className="finance-mini-line-legend">
        <span>
          <i className="dot dot-revenue" /> Receita
        </span>
        <span>
          <i className="dot dot-net" /> Resultado liquido
        </span>
      </div>
    </div>
  );
}

function mapLinePoints(values: number[], width: number, height: number, padding: number): string {
  if (values.length === 0) {
    return "";
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = Math.max(1, maxValue - minValue);

  return values
    .map((value, index) => {
      const x =
        values.length === 1
          ? width / 2
          : padding + (index * (width - padding * 2)) / (values.length - 1);
      const normalized = (value - minValue) / span;
      const y = height - padding - normalized * (height - padding * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}
