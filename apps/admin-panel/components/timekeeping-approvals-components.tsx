"use client";

import type { ReactNode } from "react";
import type { DriverProfile, TimeAdjustment, TimeAdjustmentStatus, TimeEntryKind } from "../lib/api";
import { DriverProfileEditorModal } from "./driver-profile-editor-modal";
import { formatDateTime, todayDateKey } from "./timekeeping-shared";

export type ApprovalFilterStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ApprovalFiltersValue = {
  driverId: string;
  fromDate: string;
  toDate: string;
  status: ApprovalFilterStatus;
};

export type ApprovalSummary = {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
};

export function defaultApprovalFilters(driverId = ""): ApprovalFiltersValue {
  return {
    driverId,
    fromDate: todayDateKey(),
    toDate: todayDateKey(),
    status: "PENDING"
  };
}

export function PageHeader() {
  return (
    <section className="cargo-list-page-header">
      <div className="cargo-list-page-header-copy">
        <h1>Aprovacoes de ponto</h1>
        <p>Validacao de solicitacoes de ajuste por gestores e RH</p>
      </div>
    </section>
  );
}

export function ApprovalFilters(props: {
  drivers: DriverProfile[];
  value: ApprovalFiltersValue;
  pending: boolean;
  onChange: (next: Partial<ApprovalFiltersValue>) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  return (
    <section className="panel panel-soft timekeeping-approvals-block timekeeping-approvals-filter-card">
      <div className="timekeeping-approvals-card-head">
        <h2>Filtros</h2>
      </div>
      <div className="timekeeping-approvals-filters-grid">
        <label>
          <span>Funcionario/motorista</span>
          <select
            className="select"
            value={props.value.driverId}
            onChange={(event) => props.onChange({ driverId: event.target.value })}
            disabled={props.pending}
          >
            {props.drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Data inicial</span>
          <input
            type="date"
            value={props.value.fromDate}
            onChange={(event) => props.onChange({ fromDate: event.target.value })}
            disabled={props.pending}
          />
        </label>
        <label>
          <span>Data final</span>
          <input
            type="date"
            value={props.value.toDate}
            onChange={(event) => props.onChange({ toDate: event.target.value })}
            disabled={props.pending}
          />
        </label>
        <label>
          <span>Status</span>
          <select
            className="select"
            value={props.value.status}
            onChange={(event) => props.onChange({ status: event.target.value as ApprovalFilterStatus })}
            disabled={props.pending}
          >
            <option value="PENDING">Pendentes</option>
            <option value="APPROVED">Aprovados</option>
            <option value="REJECTED">Recusados</option>
          </select>
        </label>
      </div>
      <div className="timekeeping-approvals-actions-row timekeeping-approvals-filter-actions">
        <button type="button" className="button-link secondary-link" onClick={props.onClear} disabled={props.pending}>
          Limpar filtros
        </button>
        <button type="button" className="button-link" onClick={props.onApply} disabled={props.pending}>
          Filtrar
        </button>
      </div>
    </section>
  );
}

export function ApprovalSummaryCards({ summary }: { summary: ApprovalSummary }) {
  return (
    <section className="timekeeping-approvals-summary-grid">
      <article className="timekeeping-approvals-summary-card tone-warning">
        <span>Pendentes</span>
        <strong>{summary.pending}</strong>
      </article>
      <article className="timekeeping-approvals-summary-card tone-success">
        <span>Aprovados hoje</span>
        <strong>{summary.approvedToday}</strong>
      </article>
      <article className="timekeeping-approvals-summary-card tone-danger">
        <span>Recusados hoje</span>
        <strong>{summary.rejectedToday}</strong>
      </article>
    </section>
  );
}

export function ApprovalsTable(props: {
  adjustments: TimeAdjustment[];
  status: ApprovalFilterStatus;
  driversById: Record<string, string>;
  pending: boolean;
  onApprove: (item: TimeAdjustment) => void;
  onReject: (item: TimeAdjustment) => void;
  onViewDetails: (item: TimeAdjustment) => void;
}) {
  if (props.adjustments.length === 0) {
    return (
      <EmptyState message={resolveEmptyMessage(props.status)} />
    );
  }

  return (
    <table className="drivers-table pricing-table cargo-list-table">
      <thead>
        <tr>
          <th>Funcionario</th>
          <th>Tipo de ajuste</th>
          <th>Antes / Depois</th>
          <th>Motivo</th>
          <th>Data da solicitacao</th>
          <th>Solicitante</th>
          <th>Comentario do revisor</th>
          <th>Status</th>
          <th>Acoes</th>
        </tr>
      </thead>
      <tbody>
        {props.adjustments.map((adjustment) => (
          <tr key={adjustment.id}>
            <td>{props.driversById[adjustment.driverId] ?? adjustment.driverId}</td>
            <td>{resolveAdjustmentTypeLabel(adjustment)}</td>
            <td>
              <BeforeAfterDisplay adjustment={adjustment} />
            </td>
            <td>{adjustment.reason}</td>
            <td>{formatDateTime(adjustment.createdAt)}</td>
            <td>{extractRequester(adjustment)}</td>
            <td>{adjustment.reviewerNote ?? "-"}</td>
            <td>
              <ApprovalStatusBadge status={adjustment.status} />
            </td>
            <td>
              <div className="timekeeping-approvals-row-actions">
                <button
                  type="button"
                  className="button-link secondary-link"
                  onClick={() => props.onApprove(adjustment)}
                  disabled={props.pending || adjustment.status !== "PENDING"}
                >
                  Aprovar
                </button>
                <button
                  type="button"
                  className="button-link secondary-link"
                  onClick={() => props.onReject(adjustment)}
                  disabled={props.pending || adjustment.status !== "PENDING"}
                >
                  Recusar
                </button>
                <button
                  type="button"
                  className="button-link secondary-link"
                  onClick={() => props.onViewDetails(adjustment)}
                  disabled={props.pending}
                >
                  Ver detalhes
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ApprovalStatusBadge({ status }: { status: TimeAdjustmentStatus }) {
  const className = `timekeeping-badge ${
    status === "PENDING" ? "badge-warning" : status === "APPROVED" ? "badge-success" : "badge-danger"
  }`;
  return <span className={className}>{toStatusLabel(status)}</span>;
}

export function BeforeAfterDisplay({ adjustment }: { adjustment: TimeAdjustment }) {
  const before = formatBefore(adjustment);
  const after = formatAfter(adjustment);
  return (
    <span className="timekeeping-before-after">
      <strong>{before}</strong>
      <span aria-hidden="true">→</span>
      <strong>{after}</strong>
    </span>
  );
}

export function ApprovalDecisionModal(props: {
  open: boolean;
  adjustment: TimeAdjustment | null;
  mode: "APPROVE" | "REJECT" | "VIEW";
  comment: string;
  pending: boolean;
  errorMessage?: string;
  onChangeComment: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const title =
    props.mode === "APPROVE"
      ? "Confirmar aprovacao"
      : props.mode === "REJECT"
        ? "Confirmar recusa"
        : "Detalhes da solicitacao";

  return (
    <DriverProfileEditorModal
      open={props.open}
      title={title}
      description={props.adjustment ? `Solicitacao ${props.adjustment.id}` : undefined}
      onClose={props.onClose}
      dialogWidth="min(900px, 96vw)"
      footer={
        props.mode === "VIEW" ? undefined : (
          <div className="timekeeping-approvals-actions-row">
            <button
              type="button"
              className="button-link secondary-link"
              onClick={props.onClose}
              disabled={props.pending}
            >
              Voltar
            </button>
            <button type="button" className="button-link" onClick={props.onConfirm} disabled={props.pending}>
              {props.mode === "APPROVE" ? "Confirmar aprovacao" : "Confirmar recusa"}
            </button>
          </div>
        )
      }
    >
      {props.adjustment ? (
        <div className="timekeeping-approvals-modal-body">
          <div className="drivers-metrics-grid">
            <article className="driver-metric-card">
              <span>Tipo</span>
              <strong>{resolveAdjustmentTypeLabel(props.adjustment)}</strong>
            </article>
            <article className="driver-metric-card">
              <span>Status</span>
              <strong>{toStatusLabel(props.adjustment.status)}</strong>
            </article>
            <article className="driver-metric-card">
              <span>Solicitado em</span>
              <strong>{formatDateTime(props.adjustment.createdAt)}</strong>
            </article>
          </div>

          <section className="panel panel-soft" style={{ margin: 0 }}>
            <h3 style={{ marginTop: 0 }}>Antes / Depois</h3>
            <BeforeAfterDisplay adjustment={props.adjustment} />
          </section>

          <section className="panel panel-soft" style={{ margin: 0 }}>
            <h3 style={{ marginTop: 0 }}>Motivo informado</h3>
            <p style={{ margin: 0 }}>{props.adjustment.reason}</p>
          </section>

          <section className="panel panel-soft" style={{ margin: 0 }}>
            <h3 style={{ marginTop: 0 }}>Historico da batida</h3>
            <p style={{ margin: 0 }}>Batida relacionada: {props.adjustment.timeEntryId ?? "Sem batida relacionada"}</p>
            <p style={{ margin: "0.5rem 0 0" }}>
              Criado em: {formatDateTime(props.adjustment.createdAt)}
            </p>
          </section>

          <section className="panel panel-soft" style={{ margin: 0 }}>
            <h3 style={{ marginTop: 0 }}>Comentario do revisor</h3>
            <label>
              <span>
                {props.mode === "REJECT" ? "Comentario (obrigatorio na recusa)" : "Comentario (opcional)"}
              </span>
              <textarea
                value={props.comment}
                onChange={(event) => props.onChangeComment(event.target.value)}
                disabled={props.pending || props.mode === "VIEW"}
                placeholder="Descreva a justificativa da decisao"
              />
              {props.errorMessage ? <small>{props.errorMessage}</small> : null}
            </label>
          </section>
        </div>
      ) : null}
    </DriverProfileEditorModal>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="timekeeping-approvals-empty">
      <strong>{message}</strong>
    </div>
  );
}

export function ApprovalsQueueCard(props: { children: ReactNode }) {
  return (
    <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean cargo-list-table-panel timekeeping-approvals-list-card">
      <div className="drivers-table-head">
        <div className="drivers-table-head-copy">
          <h2>Fila de aprovacoes</h2>
          <span>Revise solicitacoes e decida com base no antes e depois.</span>
        </div>
      </div>
      <div className="drivers-table-wrap">{props.children}</div>
    </article>
  );
}

export function extractRequester(adjustment: TimeAdjustment): string {
  const snapshot = adjustment.requestedSnapshot as Record<string, unknown> | undefined;
  const by = snapshot?.requestedByUserName ?? snapshot?.requestedByUserId;
  return typeof by === "string" && by.trim() ? by : "-";
}

function toStatusLabel(status: TimeAdjustmentStatus): string {
  switch (status) {
    case "PENDING":
      return "Pendente";
    case "APPROVED":
      return "Aprovado";
    default:
      return "Recusado";
  }
}

function resolveAdjustmentTypeLabel(adjustment: TimeAdjustment): string {
  if (!adjustment.timeEntryId) {
    return "Incluir batida";
  }
  if (!adjustment.requestedKind && !adjustment.requestedOccurredAt) {
    return "Remover batida";
  }
  return "Alterar batida";
}

function formatBefore(adjustment: TimeAdjustment): string {
  const snapshot = adjustment.originalSnapshot as Record<string, unknown> | undefined;
  if (!snapshot) {
    return "Sem batida";
  }
  const occurredAt = typeof snapshot.occurredAt === "string" ? snapshot.occurredAt : undefined;
  const kind = typeof snapshot.kind === "string" ? snapshot.kind : undefined;
  if (!occurredAt && !kind) {
    return "Sem batida";
  }
  const kindLabel = kind ? toKindLabel(kind as TimeEntryKind) : "Batida";
  const timeLabel = occurredAt ? toHourMinute(occurredAt) : "";
  return [kindLabel, timeLabel].filter(Boolean).join(" ");
}

function formatAfter(adjustment: TimeAdjustment): string {
  if (!adjustment.timeEntryId) {
    const kindLabel = adjustment.requestedKind ? toKindLabel(adjustment.requestedKind) : "Entrada";
    const timeLabel = adjustment.requestedOccurredAt ? toHourMinute(adjustment.requestedOccurredAt) : "";
    return [kindLabel, timeLabel].filter(Boolean).join(" ");
  }
  if (!adjustment.requestedKind && !adjustment.requestedOccurredAt) {
    return "Removida";
  }
  const kindLabel = adjustment.requestedKind ? toKindLabel(adjustment.requestedKind) : "Batida";
  const timeLabel = adjustment.requestedOccurredAt ? toHourMinute(adjustment.requestedOccurredAt) : "";
  return [kindLabel, timeLabel].filter(Boolean).join(" ");
}

function toKindLabel(kind: TimeEntryKind): string {
  switch (kind) {
    case "IN":
      return "Entrada";
    case "OUT":
      return "Saida";
    case "BREAK_START":
      return "Inicio intervalo";
    default:
      return "Fim intervalo";
  }
}

function toHourMinute(iso: string): string {
  const value = new Date(iso);
  const hour = String(value.getHours()).padStart(2, "0");
  const minute = String(value.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

function resolveEmptyMessage(status: ApprovalFilterStatus): string {
  switch (status) {
    case "APPROVED":
      return "Nenhuma solicitacao aprovada para o periodo selecionado.";
    case "REJECTED":
      return "Nenhuma solicitacao recusada para o periodo selecionado.";
    default:
      return "Nenhuma solicitacao pendente para o periodo selecionado.";
  }
}
