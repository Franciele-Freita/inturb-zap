"use client";

import type { ReactNode } from "react";
import type {
  DriverProfile,
  TimeAdjustment,
  TimeAdjustmentStatus,
  TimeEntry,
  TimeEntryKind
} from "../lib/api";
import { ENTRY_KIND_OPTIONS, formatDateTime } from "./timekeeping-shared";

export type AdjustmentStatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type AdjustmentRequestType = "INCLUDE" | "UPDATE" | "REMOVE";

export type AdjustmentFiltersValue = {
  driverId: string;
  fromDate: string;
  toDate: string;
  status: AdjustmentStatusFilter;
};

export type AdjustmentFormValue = {
  driverId: string;
  adjustmentType: AdjustmentRequestType;
  relatedTimeEntryId: string;
  kind: TimeEntryKind;
  occurredAt: string;
  reason: string;
  notes: string;
};

export type AdjustmentFormErrors = Partial<Record<keyof AdjustmentFormValue, string>>;

const ADJUSTMENT_STATUS_OPTIONS: Array<{ value: AdjustmentStatusFilter; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "PENDING", label: "Pendente" },
  { value: "APPROVED", label: "Aprovado" },
  { value: "REJECTED", label: "Recusado" },
  { value: "CANCELLED", label: "Cancelado" }
];

const ADJUSTMENT_TYPE_OPTIONS: Array<{ value: AdjustmentRequestType; label: string }> = [
  { value: "INCLUDE", label: "Incluir batida" },
  { value: "UPDATE", label: "Alterar batida" },
  { value: "REMOVE", label: "Remover batida" }
];

export function PageHeader() {
  return (
    <section className="cargo-list-page-header">
      <div className="cargo-list-page-header-copy">
        <h1>Ajustes de ponto</h1>
        <p>Solicite e acompanhe correcoes de batidas de ponto</p>
      </div>
    </section>
  );
}

export function AdjustmentFilters(props: {
  drivers: DriverProfile[];
  value: AdjustmentFiltersValue;
  pending: boolean;
  onChange: (next: Partial<AdjustmentFiltersValue>) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  return (
    <section className="panel panel-soft timekeeping-adjustments-block timekeeping-adjustments-filter-card">
      <div className="timekeeping-adjustments-card-head">
        <h2>Filtros</h2>
      </div>
      <div className="timekeeping-adjustments-filters-grid">
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
            onChange={(event) => props.onChange({ status: event.target.value as AdjustmentStatusFilter })}
            disabled={props.pending}
          >
            {ADJUSTMENT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="timekeeping-adjustments-actions-row timekeeping-adjustments-filter-actions">
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

export function AdjustmentForm(props: {
  drivers: DriverProfile[];
  relatedEntries: TimeEntry[];
  value: AdjustmentFormValue;
  errors: AdjustmentFormErrors;
  pending: boolean;
  onChange: (next: Partial<AdjustmentFormValue>) => void;
  onSubmit: () => void;
  onClear: () => void;
}) {
  const isInclude = props.value.adjustmentType === "INCLUDE";
  const isUpdate = props.value.adjustmentType === "UPDATE";
  const isRemove = props.value.adjustmentType === "REMOVE";

  return (
    <section className="panel panel-soft timekeeping-adjustments-block">
      <div className="timekeeping-adjustments-card-head">
        <h2>Criar ajuste</h2>
        <p>Solicite correcao de batidas para analise e aprovacao.</p>
      </div>

      <div className="timekeeping-adjustments-form-grid timekeeping-adjustments-form-row-two">
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
          {props.errors.driverId ? <small>{props.errors.driverId}</small> : null}
        </label>

        <label>
          <span>Tipo de ajuste</span>
          <select
            className="select"
            value={props.value.adjustmentType}
            onChange={(event) => props.onChange({ adjustmentType: event.target.value as AdjustmentRequestType })}
            disabled={props.pending}
          >
            {ADJUSTMENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!isRemove ? (
        <div className="timekeeping-adjustments-form-grid timekeeping-adjustments-form-row-two">
          <label>
            <span>Tipo de batida</span>
            <select
              className="select"
              value={props.value.kind}
              onChange={(event) => props.onChange({ kind: event.target.value as TimeEntryKind })}
              disabled={props.pending}
            >
              {ENTRY_KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {props.errors.kind ? <small>{props.errors.kind}</small> : null}
          </label>

          <label>
            <span>{isUpdate ? "Novo horario da batida" : "Data e hora da batida"}</span>
            <input
              type="datetime-local"
              value={props.value.occurredAt}
              onChange={(event) => props.onChange({ occurredAt: event.target.value })}
              disabled={props.pending}
            />
            {props.errors.occurredAt ? <small>{props.errors.occurredAt}</small> : null}
          </label>
        </div>
      ) : null}

      {!isInclude ? (
        <div className="timekeeping-adjustments-form-grid is-full-single">
          <label>
            <span>Batida relacionada</span>
            <select
              className="select"
              value={props.value.relatedTimeEntryId}
              onChange={(event) => props.onChange({ relatedTimeEntryId: event.target.value })}
              disabled={props.pending}
            >
              <option value="">Selecione a batida</option>
              {props.relatedEntries.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {`${formatDateTime(entry.occurredAt)} | ${toKindLabel(entry.kind)} | ${entry.source}`}
                </option>
              ))}
            </select>
            {props.errors.relatedTimeEntryId ? <small>{props.errors.relatedTimeEntryId}</small> : null}
          </label>
        </div>
      ) : null}

      <div className="timekeeping-adjustments-form-grid is-full">
        <label>
          <span>Motivo do ajuste</span>
          <input
            type="text"
            value={props.value.reason}
            onChange={(event) => props.onChange({ reason: event.target.value })}
            disabled={props.pending}
            placeholder="Descreva o motivo da solicitacao"
          />
          {props.errors.reason ? <small>{props.errors.reason}</small> : null}
        </label>
        <label>
          <span>Observacoes (opcional)</span>
          <textarea
            value={props.value.notes}
            onChange={(event) => props.onChange({ notes: event.target.value })}
            disabled={props.pending}
            placeholder="Informacoes adicionais para quem vai aprovar"
          />
        </label>
      </div>

      <div className="timekeeping-adjustments-actions-row">
        <button type="button" className="button-link" onClick={props.onSubmit} disabled={props.pending}>
          Criar ajuste
        </button>
        <button type="button" className="button-link secondary-link" onClick={props.onClear} disabled={props.pending}>
          Limpar formulario
        </button>
      </div>
    </section>
  );
}

export function AdjustmentInfoCard() {
  return (
    <section className="panel panel-soft timekeeping-adjustments-info timekeeping-adjustments-block">
      <h3>Fluxo de ajustes</h3>
      <ul>
        <li>Ajustes criados aqui ficam pendentes ate aprovacao.</li>
        <li>Para consultar calculos e batidas use Espelho de ponto.</li>
        <li>Para aprovar ou recusar use a tela Aprovacoes.</li>
      </ul>
    </section>
  );
}

export function AdjustmentsTable(props: {
  adjustments: TimeAdjustment[];
  driversById: Record<string, string>;
  pending: boolean;
  onViewDetails: (adjustment: TimeAdjustment) => void;
  onCancel: (adjustment: TimeAdjustment) => void;
  onResend: (adjustment: TimeAdjustment) => void;
}) {
  if (props.adjustments.length === 0) {
    return (
      <EmptyState
        message="Nenhum ajuste encontrado para os filtros selecionados."
      />
    );
  }

  return (
    <table className="drivers-table pricing-table cargo-list-table">
      <thead>
        <tr>
          <th>Funcionario</th>
          <th>Tipo de ajuste</th>
          <th>Batida original</th>
          <th>Nova batida</th>
          <th>Motivo</th>
          <th>Status</th>
          <th>Data da solicitacao</th>
          <th>Solicitante</th>
          <th>Revisado por</th>
          <th>Acoes</th>
        </tr>
      </thead>
      <tbody>
        {props.adjustments.map((adjustment) => {
          const resolvedStatus = resolveStatus(adjustment);
          return (
            <tr key={adjustment.id}>
              <td>{props.driversById[adjustment.driverId] ?? adjustment.driverId}</td>
              <td>{toAdjustmentTypeLabel(resolveAdjustmentType(adjustment))}</td>
              <td>{formatOriginalPunch(adjustment)}</td>
              <td>{formatNewPunch(adjustment)}</td>
              <td>{adjustment.reason}</td>
              <td>
                <StatusBadge status={resolvedStatus} />
              </td>
              <td>{formatDateTime(adjustment.createdAt)}</td>
              <td>{extractRequester(adjustment)}</td>
              <td>{adjustment.reviewedByUserId ?? "-"}</td>
              <td>
                <div className="timekeeping-adjustments-row-actions">
                  <button
                    type="button"
                    className="button-link secondary-link"
                    onClick={() => props.onViewDetails(adjustment)}
                    disabled={props.pending}
                  >
                    Ver detalhes
                  </button>
                  <button
                    type="button"
                    className="button-link secondary-link"
                    onClick={() => props.onCancel(adjustment)}
                    disabled={props.pending || adjustment.status !== "PENDING"}
                  >
                    Cancelar solicitacao
                  </button>
                  <button
                    type="button"
                    className="button-link secondary-link"
                    onClick={() => props.onResend(adjustment)}
                    disabled={props.pending || adjustment.status !== "REJECTED"}
                  >
                    Reenviar
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function StatusBadge({ status }: { status: ResolvedStatus }) {
  const className = `timekeeping-badge ${toBadgeClass(status)}`;
  return <span className={className}>{toStatusLabel(status)}</span>;
}

export function EmptyState(props: { message: string; hint?: string }) {
  return (
    <div className="timekeeping-adjustments-empty">
      <strong>{props.message}</strong>
      {props.hint ? <p>{props.hint}</p> : null}
    </div>
  );
}

export function AdjustmentsTableCard(props: { children: ReactNode }) {
  return (
    <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean cargo-list-table-panel timekeeping-adjustments-list-card">
      <div className="drivers-table-head">
        <div className="drivers-table-head-copy">
          <h2>Lista de ajustes</h2>
          <span>Acompanhe solicitacoes pendentes, aprovadas, recusadas e canceladas.</span>
        </div>
      </div>
      <div className="drivers-table-wrap">{props.children}</div>
    </article>
  );
}

export type ResolvedStatus = TimeAdjustmentStatus | "CANCELLED";

export function resolveStatus(adjustment: TimeAdjustment): ResolvedStatus {
  if (adjustment.status !== "REJECTED") {
    return adjustment.status;
  }
  const note = (adjustment.reviewerNote ?? "").toLowerCase();
  if (note.includes("cancelad")) {
    return "CANCELLED";
  }
  return "REJECTED";
}

export function resolveAdjustmentType(adjustment: TimeAdjustment): AdjustmentRequestType {
  if (!adjustment.timeEntryId) {
    return "INCLUDE";
  }
  if (!adjustment.requestedKind && !adjustment.requestedOccurredAt) {
    return "REMOVE";
  }
  return "UPDATE";
}

export function extractRequester(adjustment: TimeAdjustment): string {
  const snapshot = adjustment.requestedSnapshot as Record<string, unknown> | undefined;
  const by = snapshot?.requestedByUserName ?? snapshot?.requestedByUserId;
  return typeof by === "string" && by.trim() ? by : "-";
}

export function formatOriginalPunch(adjustment: TimeAdjustment): string {
  const snapshot = adjustment.originalSnapshot as Record<string, unknown> | undefined;
  if (!snapshot) {
    return "-";
  }
  const occurredAt = typeof snapshot.occurredAt === "string" ? snapshot.occurredAt : undefined;
  const kind = typeof snapshot.kind === "string" ? snapshot.kind : undefined;
  if (!occurredAt && !kind) {
    return "-";
  }
  const date = occurredAt ? formatDateTime(occurredAt) : "-";
  const kindLabel = kind ? toKindLabel(kind as TimeEntryKind) : "-";
  return `${date} | ${kindLabel}`;
}

export function formatNewPunch(adjustment: TimeAdjustment): string {
  const parts: string[] = [];
  if (adjustment.requestedOccurredAt) {
    parts.push(formatDateTime(adjustment.requestedOccurredAt));
  }
  if (adjustment.requestedKind) {
    parts.push(toKindLabel(adjustment.requestedKind));
  }
  if (parts.length === 0) {
    return "-";
  }
  return parts.join(" | ");
}

function toBadgeClass(status: ResolvedStatus): string {
  switch (status) {
    case "PENDING":
      return "badge-warning";
    case "APPROVED":
      return "badge-success";
    case "CANCELLED":
      return "badge-neutral";
    default:
      return "badge-danger";
  }
}

function toStatusLabel(status: ResolvedStatus): string {
  switch (status) {
    case "PENDING":
      return "Pendente";
    case "APPROVED":
      return "Aprovado";
    case "CANCELLED":
      return "Cancelado";
    default:
      return "Recusado";
  }
}

function toKindLabel(kind: TimeEntryKind): string {
  return ENTRY_KIND_OPTIONS.find((item) => item.value === kind)?.label ?? kind;
}

function toAdjustmentTypeLabel(type: AdjustmentRequestType): string {
  switch (type) {
    case "INCLUDE":
      return "Incluir batida";
    case "UPDATE":
      return "Alterar batida";
    default:
      return "Remover batida";
  }
}
