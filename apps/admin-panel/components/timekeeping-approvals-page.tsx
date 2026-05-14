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
  request
} from "../lib/api";
import { resolveTimekeepingAccess } from "../lib/timekeeping-access";
import {
  validateApprovalDecisionComment,
  validateTimekeepingDateRange
} from "../lib/timekeeping-validation";
import {
  ApprovalDecisionModal,
  ApprovalFilters,
  ApprovalSummaryCards,
  ApprovalsQueueCard,
  ApprovalsTable,
  type ApprovalFiltersValue,
  defaultApprovalFilters,
  PageHeader
} from "./timekeeping-approvals-components";

type DecisionMode = "APPROVE" | "REJECT" | "VIEW";

export function TimekeepingApprovalsPage() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<TimeAdjustment[]>([]);
  const [summary, setSummary] = useState({
    pending: 0,
    approvedToday: 0,
    rejectedToday: 0
  });

  const [draftFilters, setDraftFilters] = useState<ApprovalFiltersValue>(defaultApprovalFilters());
  const [appliedFilters, setAppliedFilters] = useState<ApprovalFiltersValue>(defaultApprovalFilters());

  const [selectedAdjustment, setSelectedAdjustment] = useState<TimeAdjustment | null>(null);
  const [decisionMode, setDecisionMode] = useState<DecisionMode>("VIEW");
  const [decisionComment, setDecisionComment] = useState("");
  const [decisionError, setDecisionError] = useState<string | null>(null);

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
    if (!access.canReview) {
      return;
    }
    void request<DriverProfile[]>("/admin/drivers")
      .then((loaded) => {
        setDrivers(loaded);
        if (loaded.length === 0) {
          return;
        }
        const firstDriverId = loaded[0].id;
        setDraftFilters((current) =>
          current.driverId
            ? current
            : { ...current, driverId: firstDriverId }
        );
        setAppliedFilters((current) =>
          current.driverId
            ? current
            : { ...current, driverId: firstDriverId }
        );
      })
      .catch((error: Error) => {
        setFeedback(error.message);
      });
  }, [access.canReview]);

  useEffect(() => {
    if (!access.canReview || !appliedFilters.driverId) {
      return;
    }
    void loadApprovals(appliedFilters);
  }, [access.canReview, appliedFilters]);

  useEffect(() => {
    if (!access.canReview || !appliedFilters.driverId) {
      return;
    }
    void loadSummary(appliedFilters.driverId);
  }, [access.canReview, appliedFilters.driverId]);

  const driversById = useMemo<Record<string, string>>(() => {
    return drivers.reduce<Record<string, string>>((acc, driver) => {
      acc[driver.id] = driver.name;
      return acc;
    }, {});
  }, [drivers]);

  function updateDraftFilters(next: Partial<ApprovalFiltersValue>) {
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
    const cleared = defaultApprovalFilters(firstDriverId);
    setDraftFilters(cleared);
    setAppliedFilters(cleared);
  }

  async function loadApprovals(filters: ApprovalFiltersValue) {
    setPending(true);
    try {
      const fromIso = `${filters.fromDate}T00:00:00.000Z`;
      const toIso = `${filters.toDate}T23:59:59.999Z`;
      const loaded = await request<TimeAdjustment[]>(
        `/admin/time-adjustments?driverId=${encodeURIComponent(filters.driverId)}&status=${encodeURIComponent(filters.status)}&from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}&limit=300`
      );
      loaded.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setAdjustments(loaded);
      setFeedback(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao carregar aprovacoes.");
    } finally {
      setPending(false);
    }
  }

  async function loadSummary(driverId: string) {
    try {
      const todayKey = new Date().toISOString().slice(0, 10);
      const fromIso = `${todayKey}T00:00:00.000Z`;
      const toIso = `${todayKey}T23:59:59.999Z`;

      const [pendingItems, approvedItems, rejectedItems] = await Promise.all([
        request<TimeAdjustment[]>(
          `/admin/time-adjustments?driverId=${encodeURIComponent(driverId)}&status=PENDING&from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}&limit=300`
        ),
        request<TimeAdjustment[]>(
          `/admin/time-adjustments?driverId=${encodeURIComponent(driverId)}&status=APPROVED&from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}&limit=300`
        ),
        request<TimeAdjustment[]>(
          `/admin/time-adjustments?driverId=${encodeURIComponent(driverId)}&status=REJECTED&from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}&limit=300`
        )
      ]);

      setSummary({
        pending: pendingItems.length,
        approvedToday: approvedItems.length,
        rejectedToday: rejectedItems.length
      });
    } catch {
      setSummary({
        pending: 0,
        approvedToday: 0,
        rejectedToday: 0
      });
    }
  }

  function openDecisionModal(adjustment: TimeAdjustment, mode: DecisionMode) {
    setSelectedAdjustment(adjustment);
    setDecisionMode(mode);
    setDecisionComment("");
    setDecisionError(null);
  }

  function closeDecisionModal() {
    setSelectedAdjustment(null);
    setDecisionComment("");
    setDecisionError(null);
    setDecisionMode("VIEW");
  }

  async function confirmDecision() {
    if (!selectedAdjustment || decisionMode === "VIEW") {
      return;
    }
    const commentError = validateApprovalDecisionComment({
      mode: decisionMode,
      comment: decisionComment
    });
    if (commentError) {
      setDecisionError(commentError);
      return;
    }

    setPending(true);
    try {
      await request<TimeAdjustment>(`/admin/time-adjustments/${encodeURIComponent(selectedAdjustment.id)}/review`, {
        method: "POST",
        body: JSON.stringify({
          decision: decisionMode,
          reviewerNote: decisionComment.trim() || undefined,
          changeReason: decisionComment.trim() || undefined
        })
      });
      setFeedback(decisionMode === "APPROVE" ? "Solicitacao aprovada." : "Solicitacao recusada.");
      closeDecisionModal();
      await loadApprovals(appliedFilters);
      await loadSummary(appliedFilters.driverId);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao processar solicitacao.");
    } finally {
      setPending(false);
    }
  }

  if (!access.canReview) {
    return (
      <main className="page-shell page-shell-wide cargo-list-page-shell">
        <section className="panel panel-wide">
          <h1>Aprovacoes de ponto</h1>
          <p>Seu perfil atual nao possui permissao para validar solicitacoes de ajuste.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <PageHeader />

      {feedback ? <p className="journey-list-status-message">{feedback}</p> : null}

      <section className="grid grid-single">
        <article className="panel panel-wide timekeeping-approvals-layout">
        <ApprovalFilters
          drivers={drivers}
          value={draftFilters}
          pending={pending}
          onChange={updateDraftFilters}
          onApply={applyFilters}
          onClear={clearFilters}
        />

        <ApprovalSummaryCards summary={summary} />

          <ApprovalsQueueCard>
          {appliedFilters.driverId ? (
            <ApprovalsTable
              adjustments={adjustments}
              status={appliedFilters.status}
              driversById={driversById}
              pending={pending}
              onApprove={(item) => openDecisionModal(item, "APPROVE")}
              onReject={(item) => openDecisionModal(item, "REJECT")}
              onViewDetails={(item) => openDecisionModal(item, "VIEW")}
            />
          ) : (
            <div className="timekeeping-approvals-empty">
              <strong>Nenhuma solicitacao pendente para o periodo selecionado.</strong>
            </div>
          )}
          </ApprovalsQueueCard>
        </article>
      </section>

      <ApprovalDecisionModal
        open={selectedAdjustment !== null}
        adjustment={selectedAdjustment}
        mode={decisionMode}
        comment={decisionComment}
        pending={pending}
        errorMessage={decisionError ?? undefined}
        onChangeComment={setDecisionComment}
        onClose={closeDecisionModal}
        onConfirm={() => void confirmDecision()}
      />
    </main>
  );
}
