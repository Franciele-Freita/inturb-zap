"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ADMIN_SESSION_UPDATED_EVENT,
  getStoredAdminSession,
  type AdminSession
} from "../lib/admin-auth";
import {
  type DriverProfile,
  type TimeAdjustment,
  type TimeEntry,
  type TimeEntryIssue,
  type TimesheetDay,
  type TimesheetPeriod,
  type TimekeepingCostProjection,
  request,
  requestBinary
} from "../lib/api";
import { resolveTimekeepingAccess } from "../lib/timekeeping-access";
import { DriverProfileEditorModal } from "./driver-profile-editor-modal";
import {
  currentPeriodKey,
  formatCurrency,
  formatMinutes,
  todayDateKey
} from "./timekeeping-shared";
import {
  AdjustmentHistoryTable,
  DayIssuesTable,
  PageHeader,
  PendingAdjustmentsTable,
  PunchesTable,
  TimekeepingActions,
  TimekeepingFilters,
  TimekeepingSummaryCards,
  type SummaryCardItem
} from "./timekeeping-mirror-components";

export function TimekeepingMirrorPage() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [driverId, setDriverId] = useState("");
  const [date, setDate] = useState(todayDateKey());
  const [periodKey, setPeriodKey] = useState(currentPeriodKey());

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [issues, setIssues] = useState<TimeEntryIssue[]>([]);
  const [pendingAdjustments, setPendingAdjustments] = useState<TimeAdjustment[]>([]);
  const [adjustmentHistory, setAdjustmentHistory] = useState<TimeAdjustment[]>([]);
  const [timesheet, setTimesheet] = useState<TimesheetDay | null>(null);
  const [periodResult, setPeriodResult] = useState<TimesheetPeriod | null>(null);
  const [costProjection, setCostProjection] = useState<TimekeepingCostProjection | null>(null);

  const [costDetailsDriverId, setCostDetailsDriverId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const access = resolveTimekeepingAccess(session);
  const isSelectedDatePeriodClosed =
    periodResult?.status === "CLOSED" && periodResult.period === date.slice(0, 7);

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
      .catch((error: Error) => {
        setFeedback(error.message);
      });
  }, [access.canOperate, driverId]);

  useEffect(() => {
    if (!access.canOperate || !driverId || !date) {
      return;
    }
    void loadDailyData(driverId, date);
  }, [access.canOperate, driverId, date, periodKey]);

  useEffect(() => {
    if (!access.canOperate || !date) {
      return;
    }
    void loadCostProjection(date);
  }, [access.canOperate, date]);

  async function loadDailyData(nextDriverId: string, nextDate: string) {
    setPending(true);
    try {
      const fromIso = `${nextDate}T00:00:00.000Z`;
      const toIso = `${nextDate}T23:59:59.999Z`;
      const [loadedEntries, loadedIssues, loadedPendingAdjustments, loadedAdjustmentHistory, loadedTimesheet] =
        await Promise.all([
          request<TimeEntry[]>(
            `/admin/time-entries?driverId=${encodeURIComponent(nextDriverId)}&from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}&limit=500`
          ),
          request<TimeEntryIssue[]>(
            `/admin/time-entries/issues?driverId=${encodeURIComponent(nextDriverId)}&from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}&limit=500`
          ),
          request<TimeAdjustment[]>(
            `/admin/time-adjustments?driverId=${encodeURIComponent(nextDriverId)}&status=PENDING&from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}&limit=200`
          ),
          request<TimeAdjustment[]>(
            `/admin/time-adjustments?driverId=${encodeURIComponent(nextDriverId)}&from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}&limit=200`
          ),
          request<TimesheetDay[]>(
            `/admin/time-entries/timesheet-days?driverId=${encodeURIComponent(nextDriverId)}&from=${encodeURIComponent(nextDate)}&to=${encodeURIComponent(nextDate)}&limit=1`
          )
        ]);

      const loadedPeriods = await request<TimesheetPeriod[]>(
        `/admin/time-entries/timesheet-periods?driverId=${encodeURIComponent(nextDriverId)}&period=${encodeURIComponent(periodKey)}&limit=1`
      );

      setEntries(loadedEntries);
      setIssues(loadedIssues);
      setPendingAdjustments(loadedPendingAdjustments.filter((item) => item.status !== "APPROVED"));
      setAdjustmentHistory(
        loadedAdjustmentHistory
          .filter((item) => item.status !== "PENDING")
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      );
      setTimesheet(loadedTimesheet[0] ?? null);
      setPeriodResult(loadedPeriods[0] ?? null);
      setFeedback(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao carregar espelho de ponto.");
    } finally {
      setPending(false);
    }
  }

  async function loadCostProjection(nextDate: string) {
    try {
      const data = await request<TimekeepingCostProjection>(
        `/admin/time-entries/cost-projection?date=${encodeURIComponent(nextDate)}`
      );
      setCostProjection(data);
    } catch {
      // Keep mirror usable if cost projection fails temporarily.
    }
  }

  async function recalculateDay() {
    if (!driverId || !date) {
      return;
    }
    setPending(true);
    try {
      await request<TimesheetDay[]>(
        `/admin/time-entries/timesheet-days/recalculate?driverId=${encodeURIComponent(driverId)}&date=${encodeURIComponent(date)}`,
        {
          method: "POST"
        }
      );
      await loadDailyData(driverId, date);
      setFeedback("Apuracao diaria recalculada.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao recalcular dia.");
    } finally {
      setPending(false);
    }
  }

  async function calculatePeriod() {
    if (!driverId || !periodKey || periodResult?.status === "CLOSED") {
      return;
    }
    setPending(true);
    try {
      const calculated = await request<TimesheetPeriod[]>(
        `/admin/time-entries/timesheet-periods/calculate?period=${encodeURIComponent(periodKey)}&driverId=${encodeURIComponent(driverId)}`,
        { method: "POST" }
      );
      setPeriodResult(calculated[0] ?? null);
      setFeedback("Competencia recalculada.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao calcular competencia.");
    } finally {
      setPending(false);
    }
  }

  async function exportPeriod(format: "CSV" | "PDF") {
    if (!periodResult) {
      return;
    }
    setPending(true);
    try {
      const file = await requestBinary(
        `/admin/time-entries/timesheet-periods/${encodeURIComponent(periodResult.id)}/export?format=${format}`
      );
      const blobUrl = window.URL.createObjectURL(file.blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = file.fileName ?? `espelho_ponto_${periodResult.period}.${format.toLowerCase()}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
      setFeedback(`Espelho ${format} gerado com sucesso.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao gerar espelho.");
    } finally {
      setPending(false);
    }
  }

  const selectedCostDetails = useMemo(() => {
    if (!costProjection || !costDetailsDriverId) {
      return null;
    }
    return costProjection.drivers.find((item) => item.driverId === costDetailsDriverId) ?? null;
  }, [costProjection, costDetailsDriverId]);

  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
      ),
    [entries]
  );

  const inconsistentEntryIds = useMemo(() => {
    const ids = new Set<string>();
    issues.forEach((issue) => {
      issue.entryIds.forEach((entryId) => ids.add(entryId));
    });
    return ids;
  }, [issues]);

  const dayStatus = useMemo(() => {
    if (sortedEntries.length === 0) {
      return "Nao iniciado";
    }
    const last = sortedEntries[sortedEntries.length - 1];
    if (last?.kind === "OUT") {
      return "Finalizado";
    }
    if (last?.kind === "BREAK_START") {
      return "Em intervalo";
    }
    return "Em jornada";
  }, [sortedEntries]);

  const projectedCost = findDriverProjectedCost(costProjection, driverId);
  const summaryCards = useMemo<SummaryCardItem[]>(
    () => [
      {
        label: "Status do dia",
        value: dayStatus,
        tone: dayStatus === "Finalizado" ? "success" : dayStatus === "Em jornada" ? "warning" : "neutral"
      },
      { label: "Horas trabalhadas", value: formatMinutes(timesheet?.workedMinutes ?? 0) },
      { label: "Horas previstas", value: formatMinutes(timesheet?.expectedMinutes ?? 0) },
      {
        label: "Horas extras",
        value: formatMinutes(timesheet?.overtimeMinutes ?? 0),
        tone: (timesheet?.overtimeMinutes ?? 0) > 0 ? "warning" : "neutral"
      },
      {
        label: "Atraso",
        value: formatMinutes(timesheet?.latenessMinutes ?? 0),
        tone: (timesheet?.latenessMinutes ?? 0) > 0 ? "danger" : "success"
      },
      {
        label: "Pendencias",
        value: String(timesheet?.openIssueCount ?? issues.filter((item) => item.status === "OPEN").length),
        tone: (timesheet?.openIssueCount ?? 0) > 0 ? "danger" : "success"
      },
      { label: "Custo projetado", value: formatCurrency(projectedCost) }
    ],
    [dayStatus, timesheet, projectedCost, issues]
  );

  if (!access.canOperate) {
    return (
      <main className="page-shell page-shell-wide cargo-list-page-shell">
        <section className="panel panel-wide">
          <h1>Espelho de ponto</h1>
          <p>Seu perfil atual nao possui permissao para operar o modulo de ponto.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <PageHeader />
      {feedback ? <p className="journey-list-status-message">{feedback}</p> : null}
      <section className="grid grid-single">
        <article className="panel panel-wide timekeeping-mirror-layout">
          <TimekeepingFilters
            drivers={drivers}
            driverId={driverId}
            date={date}
            periodKey={periodKey}
            pending={pending}
            periodClosed={isSelectedDatePeriodClosed}
            canCalculatePeriod={Boolean(driverId) && periodResult?.status !== "CLOSED"}
            canExport={Boolean(periodResult)}
            onDriverChange={setDriverId}
            onDateChange={setDate}
            onPeriodChange={setPeriodKey}
            onRecalculate={() => void recalculateDay()}
            onCalculatePeriod={() => void calculatePeriod()}
            onExportCsv={() => void exportPeriod("CSV")}
            onExportPdf={() => void exportPeriod("PDF")}
          />

          <TimekeepingSummaryCards items={summaryCards} />

          <TimekeepingActions
            canShowCostDetails={Boolean(findDriverCostProjection(costProjection, driverId))}
            onShowCostDetails={() => setCostDetailsDriverId(driverId)}
          />

          <PunchesTable
            entries={sortedEntries}
            inconsistentEntryIds={inconsistentEntryIds}
          />

          <DayIssuesTable issues={issues} />

          <PendingAdjustmentsTable adjustments={pendingAdjustments} />

          <AdjustmentHistoryTable adjustments={adjustmentHistory} />
        </article>
      </section>

      <DriverProfileEditorModal
        open={selectedCostDetails !== null}
        title="Memoria de calculo do custo"
        description={selectedCostDetails ? `${selectedCostDetails.driverName} - ${costProjection?.date ?? date}` : undefined}
        onClose={() => setCostDetailsDriverId(null)}
        dialogWidth="min(860px, 96vw)"
      >
        {selectedCostDetails ? (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div className="drivers-metrics-grid">
              <article className="driver-metric-card">
                <span>Valor hora</span>
                <strong>{formatCurrency(selectedCostDetails.hourlyRate)}</strong>
              </article>
              <article className="driver-metric-card">
                <span>Custo base</span>
                <strong>{formatCurrency(selectedCostDetails.baseCost)}</strong>
              </article>
              <article className="driver-metric-card">
                <span>Custo extra</span>
                <strong>{formatCurrency(selectedCostDetails.overtimeCost)}</strong>
              </article>
              <article className="driver-metric-card">
                <span>Custo noturno</span>
                <strong>{formatCurrency(selectedCostDetails.nightCost)}</strong>
              </article>
              <article className="driver-metric-card">
                <span>Impacto total</span>
                <strong>{formatCurrency(selectedCostDetails.totalCost)}</strong>
              </article>
            </div>

            <section className="panel panel-soft" style={{ margin: 0 }}>
              <h3 style={{ margin: 0 }}>Passo a passo do calculo</h3>
              {(selectedCostDetails.auditMemory?.length ?? 0) > 0 ? (
                <ol style={{ margin: "0.75rem 0 0", paddingLeft: "1.25rem", display: "grid", gap: "0.5rem" }}>
                  {selectedCostDetails.auditMemory.map((line, index) => (
                    <li key={`${selectedCostDetails.driverId}-audit-${index}`}>{line}</li>
                  ))}
                </ol>
              ) : (
                <p style={{ margin: "0.75rem 0 0" }}>
                  Nenhum detalhe adicional de calculo foi registrado para este motorista.
                </p>
              )}
            </section>
          </div>
        ) : null}
      </DriverProfileEditorModal>
    </main>
  );
}

function findDriverProjectedCost(
  projection: TimekeepingCostProjection | null,
  driverId: string
): number {
  return findDriverCostProjection(projection, driverId)?.totalCost ?? 0;
}

function findDriverCostProjection(
  projection: TimekeepingCostProjection | null,
  driverId: string
) {
  if (!projection) {
    return null;
  }
  return projection.drivers.find((item) => item.driverId === driverId) ?? null;
}
