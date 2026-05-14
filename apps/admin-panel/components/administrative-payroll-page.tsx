"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ADMIN_SESSION_UPDATED_EVENT,
  getStoredAdminSession,
  type AdminSession
} from "../lib/admin-auth";
import {
  type TimesheetPeriod,
  type TimekeepingCostProjection,
  request
} from "../lib/api";
import { resolveTimekeepingAccess } from "../lib/timekeeping-access";
import { currentPeriodKey, formatCurrency, formatMinutes } from "./timekeeping-shared";

export function AdministrativePayrollPage() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [periodKey, setPeriodKey] = useState(currentPeriodKey());
  const [dateKey, setDateKey] = useState(new Date().toISOString().slice(0, 10));
  const [periods, setPeriods] = useState<TimesheetPeriod[]>([]);
  const [projection, setProjection] = useState<TimekeepingCostProjection | null>(null);
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
    if (!access.canOperate) {
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    void Promise.all([
      request<TimesheetPeriod[]>(
        `/admin/time-entries/timesheet-periods?period=${encodeURIComponent(periodKey)}&limit=500`
      ),
      request<TimekeepingCostProjection>(
        `/admin/time-entries/cost-projection?date=${encodeURIComponent(dateKey)}`
      )
    ])
      .then(([loadedPeriods, loadedProjection]) => {
        setPeriods(loadedPeriods);
        setProjection(loadedProjection);
      })
      .catch((error: Error) => setFeedback(error.message))
      .finally(() => setIsLoading(false));
  }, [access.canOperate, dateKey, periodKey]);

  const summary = useMemo(() => {
    const openCount = periods.filter((item) => item.status === "OPEN").length;
    const closedCount = periods.filter((item) => item.status === "CLOSED").length;
    const workedMinutes = periods.reduce((total, item) => total + item.workedMinutes, 0);
    const overtimeMinutes = periods.reduce((total, item) => total + item.overtimeMinutes, 0);
    const openIssueCount = periods.reduce((total, item) => total + item.openIssueCount, 0);

    return {
      openCount,
      closedCount,
      workedMinutes,
      overtimeMinutes,
      openIssueCount
    };
  }, [periods]);

  if (!access.canOperate) {
    return (
      <main className="page-shell page-shell-wide cargo-list-page-shell">
        <section className="panel panel-wide">
          <h1>Folha de pagamento</h1>
          <p>Seu perfil atual nao possui permissao para visualizar a gestao de folha.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <section className="cargo-list-page-header">
        <div className="cargo-list-page-header-copy">
          <h1>Folha de pagamento</h1>
          <p>Gestao operacional da folha com projeção diaria, competencia e fechamento financeiro.</p>
        </div>
        <div className="cargo-list-page-header-actions">
          <Link href="/financial/entries" className="button-link secondary-link">
            Ver lancamentos
          </Link>
          <Link href="/financial/closing" className="button-link">
            Fechamento financeiro
          </Link>
        </div>
      </section>

      <section className="panel panel-wide financial-filter-card">
        <div className="financial-filter-grid">
          <label>
            Competencia
            <input type="month" value={periodKey} onChange={(event) => setPeriodKey(event.target.value)} />
          </label>
          <label>
            Data da projecao
            <input type="date" value={dateKey} onChange={(event) => setDateKey(event.target.value)} />
          </label>
        </div>
      </section>

      {feedback ? <p className="journey-list-status-message">{feedback}</p> : null}
      {isLoading ? <p className="helper-text">Atualizando painel da folha...</p> : null}

      <section className="financial-cards-grid">
        <article className="panel financial-card">
          <span>Competencias abertas</span>
          <strong>{summary.openCount}</strong>
        </article>
        <article className="panel financial-card">
          <span>Competencias fechadas</span>
          <strong>{summary.closedCount}</strong>
        </article>
        <article className="panel financial-card">
          <span>Horas trabalhadas</span>
          <strong>{formatMinutes(summary.workedMinutes)}</strong>
        </article>
        <article className="panel financial-card">
          <span>Horas extras</span>
          <strong>{formatMinutes(summary.overtimeMinutes)}</strong>
        </article>
        <article className="panel financial-card">
          <span>Pendencias de ponto</span>
          <strong>{summary.openIssueCount}</strong>
        </article>
        <article className="panel financial-card">
          <span>Custo projetado (dia)</span>
          <strong>{formatCurrency(projection?.totalProjectedCost ?? 0)}</strong>
        </article>
      </section>

      <section className="grid grid-2-columns financial-panels-grid">
        <article className="panel panel-wide">
          <div className="panel-head">
            <h2>Projecao financeira diaria</h2>
            <span>{dateKey}</span>
          </div>
          <div className="financial-period-summary-grid">
            <article>
              <span>Custo base</span>
              <strong>{formatCurrency(projection?.totalBaseCost ?? 0)}</strong>
            </article>
            <article>
              <span>Custo extra</span>
              <strong>{formatCurrency(projection?.totalOvertimeCost ?? 0)}</strong>
            </article>
            <article>
              <span>Custo noturno</span>
              <strong>{formatCurrency(projection?.totalNightCost ?? 0)}</strong>
            </article>
            <article>
              <span>Total projetado</span>
              <strong>{formatCurrency(projection?.totalProjectedCost ?? 0)}</strong>
            </article>
          </div>
        </article>

        <article className="panel panel-wide">
          <div className="panel-head">
            <h2>Acoes de fechamento</h2>
            <span>Integracao RH -&gt; Financeiro</span>
          </div>
          <div className="driver-workspace-keyvalue">
            <div>
              <span>Fluxo recomendado</span>
              <strong>Apurar ponto -&gt; Revisar pendencias -&gt; Fechar competencia</strong>
            </div>
            <div>
              <span>Destino financeiro</span>
              <strong>Contas a pagar (Financeiro)</strong>
            </div>
          </div>
          <div className="financial-filter-actions" style={{ marginTop: "1rem" }}>
            <Link href="/administrative/timekeeping/mirror" className="button-link secondary-link">
              Revisar espelho
            </Link>
            <Link href="/financial/closing" className="button-link">
              Ir para fechamento
            </Link>
          </div>
        </article>
      </section>

      <section className="panel panel-wide">
        <div className="panel-head">
          <h2>Top custos projetados por motorista (dia)</h2>
          <span>{projection?.drivers.length ?? 0} motorista(s)</span>
        </div>
        {(projection?.drivers.length ?? 0) === 0 ? (
          <p className="helper-text">Sem custos projetados para a data selecionada.</p>
        ) : (
          <table className="drivers-table">
            <thead>
              <tr>
                <th>Motorista</th>
                <th>Horas</th>
                <th>Horas extras</th>
                <th>Custo total</th>
              </tr>
            </thead>
            <tbody>
              {(projection?.drivers ?? []).slice(0, 12).map((driver) => (
                <tr key={driver.driverId}>
                  <td>{driver.driverName}</td>
                  <td>{formatMinutes(driver.workedMinutes)}</td>
                  <td>{formatMinutes(driver.overtimeMinutes)}</td>
                  <td>{formatCurrency(driver.totalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

