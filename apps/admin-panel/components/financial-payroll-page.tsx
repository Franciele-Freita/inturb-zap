"use client";

import { useEffect, useMemo, useState } from "react";
import { ADMIN_SESSION_UPDATED_EVENT, getStoredAdminSession, type AdminSession } from "../lib/admin-auth";
import { type TimekeepingCostProjection, request } from "../lib/api";
import { resolveTimekeepingAccess } from "../lib/timekeeping-access";
import { formatCurrency, formatMinutes, todayDateKey } from "./timekeeping-shared";

export function FinancialPayrollPage() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [date, setDate] = useState(todayDateKey());
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
    if (!access.canOperate || !date) {
      return;
    }

    setIsLoading(true);
    setFeedback(null);
    void request<TimekeepingCostProjection>(`/admin/time-entries/cost-projection?date=${encodeURIComponent(date)}`)
      .then(setProjection)
      .catch((error: Error) => setFeedback(error.message))
      .finally(() => setIsLoading(false));
  }, [access.canOperate, date]);

  const sortedDrivers = useMemo(
    () => [...(projection?.drivers ?? [])].sort((a, b) => b.totalCost - a.totalCost),
    [projection]
  );

  function exportCsv() {
    if (!projection || sortedDrivers.length === 0 || typeof window === "undefined") {
      return;
    }

    const header = [
      "motorista",
      "valor_hora",
      "minutos_trabalhados",
      "minutos_extra",
      "minutos_noturno",
      "custo_base",
      "custo_extra",
      "custo_noturno",
      "custo_total"
    ];

    const rows = sortedDrivers.map((item) => [
      csvCell(item.driverName),
      item.hourlyRate.toFixed(2),
      String(item.workedMinutes),
      String(item.overtimeMinutes),
      String(item.nightMinutes),
      item.baseCost.toFixed(2),
      item.overtimeCost.toFixed(2),
      item.nightCost.toFixed(2),
      item.totalCost.toFixed(2)
    ]);

    const csv = [header.join(";"), ...rows.map((row) => row.join(";"))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `folha_projetada_${projection.date}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  }

  if (!access.canOperate) {
    return (
      <main className="page-shell page-shell-wide cargo-list-page-shell">
        <section className="panel panel-wide">
          <h1>Folha projetada</h1>
          <p>Seu perfil atual nao possui permissao para visualizar a projecao financeira.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <section className="panel panel-wide financial-filter-card">
        <div className="financial-filter-grid">
          <label>
            Data de referencia
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <div className="financial-filter-actions">
            <button type="button" className="secondary" onClick={exportCsv} disabled={!projection || sortedDrivers.length === 0}>
              Exportar CSV
            </button>
          </div>
        </div>
      </section>

      {feedback ? <p className="journey-list-status-message">{feedback}</p> : null}

      <section className="financial-cards-grid">
        <article className="panel financial-card">
          <span>Total base</span>
          <strong>{formatCurrency(projection?.totalBaseCost ?? 0)}</strong>
        </article>
        <article className="panel financial-card">
          <span>Total hora extra</span>
          <strong>{formatCurrency(projection?.totalOvertimeCost ?? 0)}</strong>
        </article>
        <article className="panel financial-card">
          <span>Total adicional noturno</span>
          <strong>{formatCurrency(projection?.totalNightCost ?? 0)}</strong>
        </article>
        <article className="panel financial-card">
          <span>Total projetado</span>
          <strong>{formatCurrency(projection?.totalProjectedCost ?? 0)}</strong>
        </article>
      </section>

      <section className="panel panel-wide">
        <div className="panel-head">
          <h2>Memoria da projecao por motorista</h2>
          <span>{date}</span>
        </div>

        {isLoading ? <p className="helper-text">Atualizando projecao...</p> : null}

        {sortedDrivers.length === 0 ? (
          <p className="helper-text">Nenhum dado de custo encontrado para a data selecionada.</p>
        ) : (
          <table className="drivers-table">
            <thead>
              <tr>
                <th>Motorista</th>
                <th>Horas</th>
                <th>Extras</th>
                <th>Noturno</th>
                <th>Base</th>
                <th>Extra</th>
                <th>Noturno</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {sortedDrivers.map((item) => (
                <tr key={item.driverId}>
                  <td>{item.driverName}</td>
                  <td>{formatMinutes(item.workedMinutes)}</td>
                  <td>{formatMinutes(item.overtimeMinutes)}</td>
                  <td>{formatMinutes(item.nightMinutes)}</td>
                  <td>{formatCurrency(item.baseCost)}</td>
                  <td>{formatCurrency(item.overtimeCost)}</td>
                  <td>{formatCurrency(item.nightCost)}</td>
                  <td>{formatCurrency(item.totalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

function csvCell(value: string): string {
  const normalized = value.replace(/\r?\n/g, " ").trim();
  const escaped = normalized.replace(/"/g, '""');
  return `"${escaped}"`;
}
