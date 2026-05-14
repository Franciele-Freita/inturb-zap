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
  type TimeAdjustmentStatus,
  type TimeEntry,
  type TimeEntryKind,
  request
} from "../lib/api";
import { resolveTimekeepingAccess } from "../lib/timekeeping-access";
import {
  validateAdjustmentForm,
  validateTimekeepingDateRange
} from "../lib/timekeeping-validation";
import { DriverProfileEditorModal } from "./driver-profile-editor-modal";
import { todayDateKey } from "./timekeeping-shared";
import {
  AdjustmentFilters,
  AdjustmentForm,
  AdjustmentInfoCard,
  AdjustmentsTable,
  AdjustmentsTableCard,
  type AdjustmentFiltersValue,
  type AdjustmentFormErrors,
  type AdjustmentFormValue,
  type AdjustmentRequestType,
  EmptyState,
  PageHeader,
  resolveAdjustmentType,
  resolveStatus
} from "./timekeeping-adjustments-components";

export function TimekeepingAdjustmentsPage() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<TimeAdjustment[]>([]);
  const [relatedEntries, setRelatedEntries] = useState<TimeEntry[]>([]);
  const [selectedAdjustment, setSelectedAdjustment] = useState<TimeAdjustment | null>(null);

  const [draftFilters, setDraftFilters] = useState<AdjustmentFiltersValue>({
    driverId: "",
    fromDate: todayDateKey(),
    toDate: todayDateKey(),
    status: "ALL"
  });
  const [appliedFilters, setAppliedFilters] = useState<AdjustmentFiltersValue>({
    driverId: "",
    fromDate: todayDateKey(),
    toDate: todayDateKey(),
    status: "ALL"
  });

  const [form, setForm] = useState<AdjustmentFormValue>({
    driverId: "",
    adjustmentType: "INCLUDE",
    relatedTimeEntryId: "",
    kind: "IN",
    occurredAt: `${todayDateKey()}T08:00`,
    reason: "",
    notes: ""
  });
  const [formErrors, setFormErrors] = useState<AdjustmentFormErrors>({});

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
        if (loaded.length === 0) {
          return;
        }
        const firstDriverId = loaded[0].id;
        setDraftFilters((current) => ({
          ...current,
          driverId: current.driverId || firstDriverId
        }));
        setAppliedFilters((current) => ({
          ...current,
          driverId: current.driverId || firstDriverId
        }));
        setForm((current) => ({
          ...current,
          driverId: current.driverId || firstDriverId
        }));
      })
      .catch((error: Error) => {
        setFeedback(error.message);
      });
  }, [access.canOperate]);

  useEffect(() => {
    if (!access.canOperate || !appliedFilters.driverId) {
      return;
    }
    void loadAdjustments(appliedFilters);
  }, [access.canOperate, appliedFilters]);

  useEffect(() => {
    if (!access.canOperate || !form.driverId) {
      return;
    }
    void loadRelatedEntries(form.driverId, appliedFilters.fromDate, appliedFilters.toDate);
  }, [access.canOperate, form.driverId, appliedFilters.fromDate, appliedFilters.toDate]);

  const driversById = useMemo<Record<string, string>>(() => {
    return drivers.reduce<Record<string, string>>((acc, driver) => {
      acc[driver.id] = driver.name;
      return acc;
    }, {});
  }, [drivers]);

  function updateDraftFilters(next: Partial<AdjustmentFiltersValue>) {
    setDraftFilters((current) => ({ ...current, ...next }));
  }

  function applyFilters() {
    const rangeError = validateTimekeepingDateRange(draftFilters.fromDate, draftFilters.toDate);
    if (rangeError) {
      setFeedback(rangeError);
      return;
    }
    setAppliedFilters(draftFilters);
  }

  function clearFilters() {
    const firstDriverId = drivers[0]?.id ?? "";
    const cleared: AdjustmentFiltersValue = {
      driverId: firstDriverId,
      fromDate: todayDateKey(),
      toDate: todayDateKey(),
      status: "ALL"
    };
    setDraftFilters(cleared);
    setAppliedFilters(cleared);
  }

  async function loadAdjustments(filters: AdjustmentFiltersValue) {
    setPending(true);
    try {
      const fromIso = `${filters.fromDate}T00:00:00.000Z`;
      const toIso = `${filters.toDate}T23:59:59.999Z`;
      const queryStatus =
        filters.status === "ALL" || filters.status === "CANCELLED"
          ? filters.status === "CANCELLED"
            ? "REJECTED"
            : undefined
          : filters.status;
      const statusParam = queryStatus
        ? `&status=${encodeURIComponent(queryStatus)}`
        : "";

      const loaded = await request<TimeAdjustment[]>(
        `/admin/time-adjustments?driverId=${encodeURIComponent(filters.driverId)}&from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}${statusParam}&limit=300`
      );

      const filtered = loaded.filter((item) => {
        if (filters.status === "ALL") {
          return true;
        }
        const status = resolveStatus(item);
        if (filters.status === "CANCELLED") {
          return status === "CANCELLED";
        }
        if (filters.status === "REJECTED") {
          return status === "REJECTED";
        }
        return status === filters.status;
      });

      filtered.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setAdjustments(filtered);
      setFeedback(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao carregar ajustes.");
    } finally {
      setPending(false);
    }
  }

  async function loadRelatedEntries(driverId: string, fromDate: string, toDate: string) {
    try {
      const fromIso = `${fromDate}T00:00:00.000Z`;
      const toIso = `${toDate}T23:59:59.999Z`;
      const loaded = await request<TimeEntry[]>(
        `/admin/time-entries?driverId=${encodeURIComponent(driverId)}&from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}&limit=300`
      );
      setRelatedEntries(loaded);
    } catch {
      setRelatedEntries([]);
    }
  }

  function updateForm(next: Partial<AdjustmentFormValue>) {
    setForm((current) => {
      const updated = { ...current, ...next };
      if (next.adjustmentType === "INCLUDE") {
        updated.relatedTimeEntryId = "";
      }
      return updated;
    });
    if (Object.keys(formErrors).length > 0) {
      setFormErrors((current) => {
        const copy = { ...current };
        Object.keys(next).forEach((key) => {
          delete copy[key as keyof AdjustmentFormErrors];
        });
        return copy;
      });
    }
  }

  function resetForm() {
    setForm({
      driverId: draftFilters.driverId || drivers[0]?.id || "",
      adjustmentType: "INCLUDE",
      relatedTimeEntryId: "",
      kind: "IN",
      occurredAt: `${todayDateKey()}T08:00`,
      reason: "",
      notes: ""
    });
    setFormErrors({});
  }

  async function createAdjustment() {
    const errors = validateAdjustmentForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setFeedback("Revise os campos obrigatorios do formulario.");
      return;
    }

    const payload = buildCreatePayload(form);

    setPending(true);
    try {
      await request<TimeAdjustment>("/admin/time-adjustments", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setFeedback("Ajuste criado com sucesso.");
      resetForm();
      await loadAdjustments(appliedFilters);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao criar ajuste.");
    } finally {
      setPending(false);
    }
  }

  async function cancelAdjustment(adjustment: TimeAdjustment) {
    if (adjustment.status !== "PENDING") {
      return;
    }
    setPending(true);
    try {
      await request<TimeAdjustment>(`/admin/time-adjustments/${encodeURIComponent(adjustment.id)}/cancel`, {
        method: "POST",
        body: JSON.stringify({
          note: "Cancelado na tela de ajustes.",
          changeReason: "Cancelamento manual na tela de ajustes."
        })
      });
      setFeedback("Solicitacao cancelada.");
      await loadAdjustments(appliedFilters);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao cancelar solicitacao.");
    } finally {
      setPending(false);
    }
  }

  async function resendAdjustment(adjustment: TimeAdjustment) {
    if (adjustment.status !== "REJECTED") {
      return;
    }
    const payload = buildResendPayload(adjustment);
    setPending(true);
    try {
      await request<TimeAdjustment>("/admin/time-adjustments", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setFeedback("Solicitacao reenviada para aprovacao.");
      await loadAdjustments(appliedFilters);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao reenviar solicitacao.");
    } finally {
      setPending(false);
    }
  }

  if (!access.canOperate) {
    return (
      <main className="page-shell page-shell-wide cargo-list-page-shell">
        <section className="panel panel-wide">
          <h1>Ajustes de ponto</h1>
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
        <article className="panel panel-wide timekeeping-adjustments-layout">
          <AdjustmentFilters
            drivers={drivers}
            value={draftFilters}
            pending={pending}
            onChange={updateDraftFilters}
            onApply={applyFilters}
            onClear={clearFilters}
          />

          <AdjustmentForm
            drivers={drivers}
            relatedEntries={relatedEntries}
            value={form}
            errors={formErrors}
            pending={pending}
            onChange={updateForm}
            onSubmit={() => void createAdjustment()}
            onClear={resetForm}
          />

          <AdjustmentInfoCard />

          <AdjustmentsTableCard>
          {draftFilters.driverId ? (
            <AdjustmentsTable
              adjustments={adjustments}
              driversById={driversById}
              pending={pending}
              onViewDetails={setSelectedAdjustment}
              onCancel={(item) => void cancelAdjustment(item)}
              onResend={(item) => void resendAdjustment(item)}
            />
          ) : (
            <EmptyState
              message="Selecione um funcionario para consultar ajustes."
              hint="Depois aplique os filtros para carregar a lista."
            />
          )}
          </AdjustmentsTableCard>
        </article>
      </section>

      <DriverProfileEditorModal
        open={selectedAdjustment !== null}
        title="Detalhes da solicitacao"
        description={selectedAdjustment ? `ID ${selectedAdjustment.id}` : undefined}
        onClose={() => setSelectedAdjustment(null)}
        dialogWidth="min(860px, 96vw)"
      >
        {selectedAdjustment ? (
          <div className="timekeeping-adjustments-details">
            <div className="drivers-metrics-grid">
              <article className="driver-metric-card">
                <span>Funcionario</span>
                <strong>{driversById[selectedAdjustment.driverId] ?? selectedAdjustment.driverId}</strong>
              </article>
              <article className="driver-metric-card">
                <span>Tipo</span>
                <strong>{formatAdjustmentType(resolveAdjustmentType(selectedAdjustment))}</strong>
              </article>
              <article className="driver-metric-card">
                <span>Status</span>
                <strong>{resolveStatus(selectedAdjustment)}</strong>
              </article>
            </div>
            <section className="panel panel-soft" style={{ margin: 0 }}>
              <h3 style={{ marginTop: 0 }}>Motivo</h3>
              <p style={{ marginBottom: 0 }}>{selectedAdjustment.reason}</p>
            </section>
            <section className="panel panel-soft" style={{ margin: 0 }}>
              <h3 style={{ marginTop: 0 }}>Revisao</h3>
              <p style={{ margin: 0 }}>Revisado por: {selectedAdjustment.reviewedByUserId ?? "-"}</p>
              <p style={{ margin: "0.5rem 0 0" }}>Nota: {selectedAdjustment.reviewerNote ?? "-"}</p>
            </section>
          </div>
        ) : null}
      </DriverProfileEditorModal>
    </main>
  );
}

function validateForm(values: AdjustmentFormValue): AdjustmentFormErrors {
  return validateAdjustmentForm(values);
}

function buildCreatePayload(values: AdjustmentFormValue): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    driverId: values.driverId,
    reason: values.reason.trim(),
    changeReason: values.reason.trim()
  };

  if (values.adjustmentType === "INCLUDE") {
    payload.requestedKind = values.kind;
    payload.requestedOccurredAt = new Date(values.occurredAt).toISOString();
    payload.requestedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (values.notes.trim()) {
      payload.requestedNotes = values.notes.trim();
    }
    return payload;
  }

  payload.timeEntryId = values.relatedTimeEntryId.trim();

  if (values.adjustmentType === "UPDATE") {
    payload.requestedKind = values.kind;
    payload.requestedOccurredAt = new Date(values.occurredAt).toISOString();
    payload.requestedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (values.notes.trim()) {
      payload.requestedNotes = values.notes.trim();
    }
    return payload;
  }

  payload.requestedNotes = values.notes.trim() || "Solicitacao de remocao da batida.";
  return payload;
}

function buildResendPayload(adjustment: TimeAdjustment): Record<string, unknown> {
  const adjustmentType = resolveAdjustmentType(adjustment) as AdjustmentRequestType;
  const payload: Record<string, unknown> = {
    driverId: adjustment.driverId,
    reason: adjustment.reason,
    changeReason: adjustment.reason
  };
  if (adjustmentType !== "INCLUDE" && adjustment.timeEntryId) {
    payload.timeEntryId = adjustment.timeEntryId;
  }
  if (adjustmentType !== "REMOVE") {
    if (adjustment.requestedKind) {
      payload.requestedKind = adjustment.requestedKind;
    }
    if (adjustment.requestedOccurredAt) {
      payload.requestedOccurredAt = adjustment.requestedOccurredAt;
    }
    if (adjustment.requestedTimezone) {
      payload.requestedTimezone = adjustment.requestedTimezone;
    }
  }
  if (adjustment.requestedNotes) {
    payload.requestedNotes = adjustment.requestedNotes;
  } else if (adjustmentType === "REMOVE") {
    payload.requestedNotes = "Solicitacao de remocao reenviada.";
  }
  return payload;
}

function formatAdjustmentType(type: AdjustmentRequestType): string {
  switch (type) {
    case "INCLUDE":
      return "Incluir batida";
    case "UPDATE":
      return "Alterar batida";
    default:
      return "Remover batida";
  }
}
