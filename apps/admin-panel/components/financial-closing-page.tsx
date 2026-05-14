"use client";

import { useEffect, useMemo, useState } from "react";
import { ADMIN_SESSION_UPDATED_EVENT, getStoredAdminSession, type AdminSession } from "../lib/admin-auth";
import {
  type DriverProfile,
  type FinancialTransaction,
  type TimesheetPeriod,
  request
} from "../lib/api";
import {
  buildPayrollProjectionByDriver,
  calculateClosingImpactSummary,
  filterSelectedClosedPeriodIds,
  filterSelectedOpenPeriodIds,
  splitTimesheetPeriodsByStatus
} from "../lib/financial-service";
import { validateFinancialReason } from "../lib/financial-validation";
import { resolveTimekeepingAccess } from "../lib/timekeeping-access";
import { FinancialActionModal } from "./financial-action-modal";
import { FinancialDataTable } from "./financial-data-table";
import { currentPeriodKey, formatCurrency, formatMinutes } from "./timekeeping-shared";

type PendingFinancialAction =
  | {
      type: "close-single" | "reopen-single";
      periodId: string;
      title: string;
      description: string;
      confirmLabel: string;
      justificationRequired: boolean;
      defaultJustification: string;
    }
  | {
      type: "close-bulk" | "reopen-bulk";
      title: string;
      description: string;
      confirmLabel: string;
      justificationRequired: boolean;
      defaultJustification: string;
    };

export function FinancialClosingPage() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [periodKey, setPeriodKey] = useState(currentPeriodKey());
  const [driverId, setDriverId] = useState("");
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [periods, setPeriods] = useState<TimesheetPeriod[]>([]);
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<string[]>([]);
  const [payrollTransactions, setPayrollTransactions] = useState<FinancialTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isBulkSaving, setIsBulkSaving] = useState<"close" | "reopen" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingFinancialAction | null>(null);
  const [actionValidationError, setActionValidationError] = useState<string | null>(null);

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

    void request<DriverProfile[]>("/admin/drivers")
      .then((loaded) => {
        setDrivers(loaded);
        if (!driverId && loaded.length > 0) {
          setDriverId(loaded[0].id);
        }
      })
      .catch((error: Error) => setFeedback(error.message));
  }, [access.canOperate, driverId]);

  useEffect(() => {
    if (!access.canOperate || !periodKey) {
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    const queryDriverId = driverId ? `&driverId=${encodeURIComponent(driverId)}` : "";

    void Promise.all([
      request<TimesheetPeriod[]>(
        `/admin/time-entries/timesheet-periods?period=${encodeURIComponent(periodKey)}${queryDriverId}&limit=500`
      ),
      request<FinancialTransaction[]>(
        `/admin/financial/transactions?period=${encodeURIComponent(periodKey)}&source=PAYROLL&type=PAYMENT&status=COMPLETED&limit=5000`
      )
    ])
      .then(([loadedPeriods, loadedPayrollTransactions]) => {
        setPeriods(loadedPeriods);
        setPayrollTransactions(loadedPayrollTransactions);
      })
      .catch((error: Error) => setFeedback(error.message))
      .finally(() => setIsLoading(false));
  }, [access.canOperate, periodKey, driverId]);

  useEffect(() => {
    setSelectedPeriodIds((current) => current.filter((id) => periods.some((period) => period.id === id)));
  }, [periods]);

  const groupedDrivers = useMemo(() => new Map(drivers.map((item) => [item.id, item.name])), [drivers]);

  const buckets = useMemo(() => splitTimesheetPeriodsByStatus(periods), [periods]);
  const impact = useMemo(
    () => calculateClosingImpactSummary({ buckets, payrollTransactions }),
    [buckets, payrollTransactions]
  );
  const projectedByDriver = useMemo(
    () => buildPayrollProjectionByDriver(payrollTransactions),
    [payrollTransactions]
  );
  const selectedOpenIds = useMemo(
    () =>
      filterSelectedOpenPeriodIds({
        selectedPeriodIds,
        openPeriods: buckets.openPeriods
      }),
    [buckets.openPeriods, selectedPeriodIds]
  );
  const selectedClosedIds = useMemo(
    () =>
      filterSelectedClosedPeriodIds({
        selectedPeriodIds,
        closedPeriods: buckets.closedPeriods
      }),
    [buckets.closedPeriods, selectedPeriodIds]
  );

  async function reloadPeriods() {
    const queryDriverId = driverId ? `&driverId=${encodeURIComponent(driverId)}` : "";
    const [loadedPeriods, loadedPayrollTransactions] = await Promise.all([
      request<TimesheetPeriod[]>(
        `/admin/time-entries/timesheet-periods?period=${encodeURIComponent(periodKey)}${queryDriverId}&limit=500`
      ),
      request<FinancialTransaction[]>(
        `/admin/financial/transactions?period=${encodeURIComponent(periodKey)}&source=PAYROLL&type=PAYMENT&status=COMPLETED&limit=5000`
      )
    ]);
    setPeriods(loadedPeriods);
    setPayrollTransactions(loadedPayrollTransactions);
  }

  async function closePeriod(periodId: string, reason?: string) {
    setIsSaving(periodId);
    try {
      await request<TimesheetPeriod>(`/admin/time-entries/timesheet-periods/${encodeURIComponent(periodId)}/close`, {
        method: "POST",
        body: JSON.stringify({ note: reason, changeReason: reason })
      });
      await reloadPeriods();
      setFeedback("Competencia fechada com sucesso.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao fechar competencia.");
    } finally {
      setIsSaving(null);
    }
  }

  async function reopenPeriod(periodId: string, reason: string) {
    setIsSaving(periodId);
    try {
      await request<TimesheetPeriod>(`/admin/time-entries/timesheet-periods/${encodeURIComponent(periodId)}/reopen`, {
        method: "POST",
        body: JSON.stringify({ note: reason, changeReason: reason })
      });
      await reloadPeriods();
      setFeedback("Competencia reaberta com sucesso.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao reabrir competencia.");
    } finally {
      setIsSaving(null);
    }
  }

  async function closeSelectedPeriods(reason?: string) {
    setIsBulkSaving("close");
    setFeedback(null);

    const failedIds: string[] = [];
    const successfulIds: string[] = [];

    for (const periodId of selectedOpenIds) {
      try {
        await request<TimesheetPeriod>(`/admin/time-entries/timesheet-periods/${encodeURIComponent(periodId)}/close`, {
          method: "POST",
          body: JSON.stringify({ note: reason, changeReason: reason })
        });
        successfulIds.push(periodId);
      } catch {
        failedIds.push(periodId);
      }
    }

    try {
      if (successfulIds.length > 0) {
        await reloadPeriods();
      }

      if (failedIds.length === 0) {
        setSelectedPeriodIds([]);
        setFeedback("Fechamento em massa concluido com sucesso.");
        return;
      }

      setSelectedPeriodIds(failedIds);
      setFeedback(
        `Fechamento parcial: ${successfulIds.length} concluida(s) e ${failedIds.length} falha(s). IDs com falha: ${failedIds.join(", ")}.`
      );
    } finally {
      setIsBulkSaving(null);
    }
  }

  async function reopenSelectedPeriods(reason: string) {
    setIsBulkSaving("reopen");
    setFeedback(null);

    const failedIds: string[] = [];
    const successfulIds: string[] = [];

    for (const periodId of selectedClosedIds) {
      try {
        await request<TimesheetPeriod>(`/admin/time-entries/timesheet-periods/${encodeURIComponent(periodId)}/reopen`, {
          method: "POST",
          body: JSON.stringify({ note: reason, changeReason: reason })
        });
        successfulIds.push(periodId);
      } catch {
        failedIds.push(periodId);
      }
    }

    try {
      if (successfulIds.length > 0) {
        await reloadPeriods();
      }

      if (failedIds.length === 0) {
        setSelectedPeriodIds([]);
        setFeedback("Reabertura em massa concluida com sucesso.");
        return;
      }

      setSelectedPeriodIds(failedIds);
      setFeedback(
        `Reabertura parcial: ${successfulIds.length} concluida(s) e ${failedIds.length} falha(s). IDs com falha: ${failedIds.join(", ")}.`
      );
    } finally {
      setIsBulkSaving(null);
    }
  }

  function openClosePeriodAction(periodId: string) {
    if (!access.canReview) {
      setFeedback("Apenas perfil ADMIN pode fechar competencia.");
      return;
    }
    setActionValidationError(null);
    setPendingAction({
      type: "close-single",
      periodId,
      title: "Fechar competencia",
      description: "Confirme o fechamento financeiro da competencia selecionada.",
      confirmLabel: "Confirmar fechamento",
      justificationRequired: false,
      defaultJustification: "Fechamento financeiro da competencia."
    });
  }

  function openReopenPeriodAction(periodId: string) {
    if (!access.canReview) {
      setFeedback("Apenas perfil ADMIN pode reabrir competencia.");
      return;
    }
    setActionValidationError(null);
    setPendingAction({
      type: "reopen-single",
      periodId,
      title: "Reabrir competencia",
      description: "Informe a justificativa da reabertura.",
      confirmLabel: "Confirmar reabertura",
      justificationRequired: true,
      defaultJustification: "Reabertura para ajuste de apuracao."
    });
  }

  function openCloseSelectedAction() {
    if (!access.canReview) {
      setFeedback("Apenas perfil ADMIN pode fechar competencia.");
      return;
    }
    if (selectedOpenIds.length === 0) {
      setFeedback("Selecione ao menos uma competencia aberta para fechamento em massa.");
      return;
    }
    setActionValidationError(null);
    setPendingAction({
      type: "close-bulk",
      title: "Fechar competencias selecionadas",
      description: `${selectedOpenIds.length} competencia(s) aberta(s) serao fechadas.`,
      confirmLabel: `Fechar ${selectedOpenIds.length} selecionada(s)`,
      justificationRequired: false,
      defaultJustification: `Fechamento financeiro em massa (${selectedOpenIds.length} competencias).`
    });
  }

  function openReopenSelectedAction() {
    if (!access.canReview) {
      setFeedback("Apenas perfil ADMIN pode reabrir competencia.");
      return;
    }
    if (selectedClosedIds.length === 0) {
      setFeedback("Selecione ao menos uma competencia fechada para reabertura em massa.");
      return;
    }
    setActionValidationError(null);
    setPendingAction({
      type: "reopen-bulk",
      title: "Reabrir competencias selecionadas",
      description: `${selectedClosedIds.length} competencia(s) fechada(s) serao reabertas.`,
      confirmLabel: `Reabrir ${selectedClosedIds.length} selecionada(s)`,
      justificationRequired: true,
      defaultJustification: `Reabertura em massa (${selectedClosedIds.length} competencias).`
    });
  }

  async function confirmPendingAction(rawJustification: string) {
    if (!pendingAction) {
      return;
    }

    const validation = validateFinancialReason(rawJustification, {
      required: pendingAction.justificationRequired,
      fieldLabel: "a justificativa",
      maxLength: 220
    });

    if (!validation.ok) {
      setActionValidationError(validation.errors[0]);
      return;
    }

    const reason = validation.value;
    setActionValidationError(null);
    setPendingAction(null);

    if (pendingAction.type === "close-single") {
      await closePeriod(pendingAction.periodId, reason);
      return;
    }

    if (pendingAction.type === "reopen-single") {
      await reopenPeriod(pendingAction.periodId, reason ?? "");
      return;
    }

    if (pendingAction.type === "close-bulk") {
      await closeSelectedPeriods(reason);
      return;
    }

    await reopenSelectedPeriods(reason ?? "");
  }

  function toggleRowSelection(periodId: string) {
    setSelectedPeriodIds((current) =>
      current.includes(periodId) ? current.filter((id) => id !== periodId) : [...current, periodId]
    );
  }

  function toggleSelectAll() {
    if (selectedPeriodIds.length === periods.length) {
      setSelectedPeriodIds([]);
      return;
    }
    setSelectedPeriodIds(periods.map((item) => item.id));
  }

  if (!access.canOperate) {
    return (
      <main className="page-shell page-shell-wide cargo-list-page-shell">
        <section className="panel panel-wide">
          <h1>Fechamento financeiro</h1>
          <p>Seu perfil atual nao possui permissao para visualizar o fechamento de competencia.</p>
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
          <label>
            Motorista
            <select className="select" value={driverId} onChange={(event) => setDriverId(event.target.value)}>
              <option value="">Todos</option>
              {drivers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {feedback ? <p className="journey-list-status-message">{feedback}</p> : null}

      <section className="financial-cards-grid">
        <article className="panel financial-card">
          <span>Competencias abertas</span>
          <strong>{buckets.openPeriods.length}</strong>
        </article>
        <article className="panel financial-card">
          <span>Competencias fechadas</span>
          <strong>{buckets.closedPeriods.length}</strong>
        </article>
        <article className="panel financial-card">
          <span>Impacto aberto (proj.)</span>
          <strong className="text-tabular">{formatCurrency(impact.openProjectedAmount)}</strong>
          <small>{formatMinutes(impact.overtimeMinutesOpen)} extras em aberto</small>
        </article>
        <article className="panel financial-card">
          <span>Impacto fechado</span>
          <strong className="text-tabular">{formatCurrency(impact.closedProjectedAmount)}</strong>
          <small>Competencias ja consolidadas</small>
        </article>
      </section>

      <section className="panel panel-wide">
        <div className="panel-head">
          <h2>Resumo de impacto antes do fechamento</h2>
          <span>{periodKey}</span>
        </div>
        <div className="financial-period-summary-grid">
          <article>
            <span>Horas trabalhadas em aberto</span>
            <strong>{formatMinutes(impact.workedMinutesOpen)}</strong>
          </article>
          <article>
            <span>Horas extras em aberto</span>
            <strong>{formatMinutes(impact.overtimeMinutesOpen)}</strong>
          </article>
          <article>
            <span>Valor projetado em aberto</span>
            <strong className="text-tabular">{formatCurrency(impact.openProjectedAmount)}</strong>
          </article>
          <article>
            <span>Selecionadas</span>
            <strong>{selectedPeriodIds.length}</strong>
          </article>
        </div>
        <div className="financial-filter-actions" style={{ marginTop: "1rem" }}>
          <button
            type="button"
            onClick={openCloseSelectedAction}
            disabled={!access.canReview || isBulkSaving !== null || selectedOpenIds.length === 0}
          >
            {isBulkSaving === "close"
              ? "Fechando selecionadas..."
              : `Fechar selecionadas (${selectedOpenIds.length})`}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={openReopenSelectedAction}
            disabled={!access.canReview || isBulkSaving !== null || selectedClosedIds.length === 0}
          >
            {isBulkSaving === "reopen"
              ? "Reabrindo selecionadas..."
              : `Reabrir selecionadas (${selectedClosedIds.length})`}
          </button>
        </div>
      </section>

      <section className="panel panel-wide">
        <div className="panel-head">
          <h2>Competencias da folha ({periodKey})</h2>
          <span>{isLoading ? "Atualizando..." : `${periods.length} item(ns)`}</span>
        </div>

        <FinancialDataTable
          loading={isLoading}
          loadingLabel="Atualizando competencias..."
          isEmpty={periods.length === 0}
          emptyTitle="Nenhuma competencia encontrada"
          emptyDescription="Nao existem competencias para os filtros aplicados."
          columnCount={9}
          headers={
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={periods.length > 0 && selectedPeriodIds.length === periods.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>Motorista</th>
              <th>Horas</th>
              <th>Extras</th>
              <th>Faltas</th>
              <th>Pendencias</th>
              <th>Impacto proj.</th>
              <th>Status</th>
              <th>Acoes</th>
            </tr>
          }
        >
          {periods.map((item) => {
            const isClosed = item.status === "CLOSED";
            const rowSaving = isSaving === item.id;
            const projectedAmount = projectedByDriver.get(item.driverId) ?? 0;
            return (
              <tr key={item.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedPeriodIds.includes(item.id)}
                    onChange={() => toggleRowSelection(item.id)}
                  />
                </td>
                <td>{groupedDrivers.get(item.driverId) ?? item.driverId}</td>
                <td>{formatMinutes(item.workedMinutes)}</td>
                <td>{formatMinutes(item.overtimeMinutes)}</td>
                <td>{item.absenceDays}</td>
                <td>{item.openIssueCount}</td>
                <td className="text-tabular">{formatCurrency(projectedAmount)}</td>
                <td>
                  <span className={`timekeeping-badge ${isClosed ? "badge-success" : "badge-warning"}`}>
                    {isClosed ? "Fechado" : "Aberto"}
                  </span>
                </td>
                <td>
                  {isClosed ? (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => openReopenPeriodAction(item.id)}
                      disabled={!access.canReview || rowSaving}
                    >
                      {rowSaving ? "Reabrindo..." : "Reabrir"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openClosePeriodAction(item.id)}
                      disabled={!access.canReview || rowSaving}
                    >
                      {rowSaving ? "Fechando..." : "Fechar"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </FinancialDataTable>
      </section>

      <FinancialActionModal
        open={pendingAction !== null}
        onClose={() => {
          if (isSaving || isBulkSaving) {
            return;
          }
          setPendingAction(null);
          setActionValidationError(null);
        }}
        title={pendingAction?.title ?? "Confirmar acao"}
        description={pendingAction?.description}
        confirmLabel={pendingAction?.confirmLabel ?? "Confirmar"}
        justificationRequired={pendingAction?.justificationRequired ?? false}
        defaultJustification={pendingAction?.defaultJustification}
        errorMessage={actionValidationError}
        isSubmitting={Boolean(isSaving) || Boolean(isBulkSaving)}
        onConfirm={(justification) => void confirmPendingAction(justification)}
      />
    </main>
  );
}
