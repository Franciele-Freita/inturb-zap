"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type {
  DriverProfile,
  TimeAdjustment,
  TimeEntry,
  TimeEntryIssue
} from "../lib/api";
import {
  ENTRY_KIND_OPTIONS,
  formatDateTime,
  resolveGeofenceStatusLabel
} from "./timekeeping-shared";

type SummaryTone = "neutral" | "success" | "warning" | "danger";

export type SummaryCardItem = {
  label: string;
  value: string;
  tone?: SummaryTone;
};

export function PageHeader() {
  return (
    <section className="cargo-list-page-header">
      <div className="cargo-list-page-header-copy">
        <h1>Espelho de ponto</h1>
        <p>Consulta de batidas, horas trabalhadas e pendencias</p>
      </div>
    </section>
  );
}

export function TimekeepingFilters(props: {
  drivers: DriverProfile[];
  driverId: string;
  date: string;
  periodKey: string;
  pending: boolean;
  periodClosed: boolean;
  canCalculatePeriod: boolean;
  canExport: boolean;
  onDriverChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onPeriodChange: (value: string) => void;
  onRecalculate: () => void;
  onCalculatePeriod: () => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
}) {
  return (
    <section className="panel panel-soft timekeeping-mirror-block timekeeping-mirror-filter-card">
      <div className="timekeeping-mirror-card-head">
        <h2>Filtros</h2>
        <p>Selecione o colaborador e periodo para consultar o espelho.</p>
      </div>

      <div className="timekeeping-mirror-filters-grid">
        <label>
          <span>Funcionario/motorista</span>
          <select
            className="select"
            value={props.driverId}
            onChange={(event) => props.onDriverChange(event.target.value)}
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
          <span>Data</span>
          <input
            type="date"
            value={props.date}
            onChange={(event) => props.onDateChange(event.target.value)}
            disabled={props.pending}
          />
        </label>
        <label>
          <span>Competencia</span>
          <input
            type="month"
            value={props.periodKey}
            onChange={(event) => props.onPeriodChange(event.target.value)}
            disabled={props.pending}
          />
        </label>
      </div>

      <div className="timekeeping-mirror-actions-row timekeeping-mirror-filter-actions">
        <button
          type="button"
          className="button-link"
          onClick={props.onRecalculate}
          disabled={props.pending || props.periodClosed}
        >
          Recalcular
        </button>
        <button
          type="button"
          className="button-link secondary-link"
          onClick={props.onCalculatePeriod}
          disabled={props.pending || !props.canCalculatePeriod}
        >
          Calcular competencia
        </button>
        <button
          type="button"
          className="button-link secondary-link"
          onClick={props.onExportCsv}
          disabled={props.pending || !props.canExport}
        >
          Gerar CSV
        </button>
        <button
          type="button"
          className="button-link secondary-link"
          onClick={props.onExportPdf}
          disabled={props.pending || !props.canExport}
        >
          Gerar PDF
        </button>
      </div>
    </section>
  );
}

export function TimekeepingSummaryCards({ items }: { items: SummaryCardItem[] }) {
  return (
    <section className="panel panel-soft timekeeping-mirror-block">
      <div className="timekeeping-mirror-card-head">
        <h2>Resumo do dia</h2>
      </div>
      <div className="timekeeping-mirror-summary-grid">
        {items.map((item) => (
          <article
            key={item.label}
            className={`driver-metric-card timekeeping-summary-card tone-${item.tone ?? "neutral"}`}
          >
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

export function TimekeepingActions(props: {
  canShowCostDetails: boolean;
  onShowCostDetails: () => void;
}) {
  return (
    <section className="panel panel-soft timekeeping-mirror-block">
      <div className="timekeeping-mirror-card-head">
        <h2>Acoes rapidas</h2>
      </div>
      <div className="timekeeping-mirror-actions-row">
      <button
        type="button"
        className="button-link secondary-link"
        onClick={props.onShowCostDetails}
        disabled={!props.canShowCostDetails}
      >
        Ver calculo detalhado
      </button>
      <Link href="/administrative/timekeeping/approvals" className="button-link secondary-link">
        Ir para aprovacoes
      </Link>
      </div>
    </section>
  );
}

export function PunchesTable(props: {
  entries: TimeEntry[];
  inconsistentEntryIds: Set<string>;
}) {
  return (
    <DataSectionCard
      title="Batidas do dia"
      subtitle={`${props.entries.length} registro(s) no periodo selecionado.`}
    >
      <table className="drivers-table pricing-table cargo-list-table">
          <thead>
            <tr>
              <th>Horario</th>
              <th>Tipo</th>
              <th>Origem</th>
              <th>Status</th>
              <th>Localizacao</th>
            </tr>
          </thead>
          <tbody>
            {props.entries.map((entry) => (
              <tr
                key={entry.id}
                className={
                  props.inconsistentEntryIds.has(entry.id)
                    ? "timekeeping-row-has-issue"
                    : undefined
                }
              >
                <td>{formatDateTime(entry.occurredAt)}</td>
                <td>{ENTRY_KIND_OPTIONS.find((item) => item.value === entry.kind)?.label ?? entry.kind}</td>
                <td>{toSourceLabel(entry.source)}</td>
                <td>
                  <span className={`timekeeping-badge ${toEntryStatusClass(entry.status)}`}>
                    {toEntryStatusLabel(entry.status)}
                  </span>
                </td>
                <td>{resolveGeofenceStatusLabel(entry)}</td>
              </tr>
            ))}
            {props.entries.length === 0 ? (
              <tr>
                <td colSpan={5}>Nenhuma batida registrada</td>
              </tr>
            ) : null}
          </tbody>
      </table>
    </DataSectionCard>
  );
}

export function DayIssuesTable({ issues }: { issues: TimeEntryIssue[] }) {
  return (
    <DataSectionCard
      title="Pendencias do dia"
      subtitle={`${issues.length} pendencia(s) encontrada(s).`}
    >
      <table className="drivers-table pricing-table cargo-list-table">
        <thead>
          <tr>
            <th>Pendencia</th>
            <th>Severidade</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr key={issue.id}>
              <td>{issue.message}</td>
              <td>
                <span
                  className={`timekeeping-badge ${
                    issue.severity === "ERROR"
                      ? "badge-danger"
                      : "badge-warning"
                  }`}
                >
                  {issue.severity === "ERROR" ? "Critica" : "Warning"}
                </span>
              </td>
              <td>
                <span
                  className={`timekeeping-badge ${
                    issue.status === "OPEN"
                      ? "badge-danger"
                      : "badge-success"
                  }`}
                >
                  {issue.status === "OPEN" ? "Aberta" : "Resolvida"}
                </span>
              </td>
            </tr>
          ))}
          {issues.length === 0 ? (
            <tr>
              <td colSpan={3}>Sem pendencias</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </DataSectionCard>
  );
}

export function PendingAdjustmentsTable({ adjustments }: { adjustments: TimeAdjustment[] }) {
  return (
    <DataSectionCard
      title="Ajustes pendentes"
      subtitle={`${adjustments.length} solicitacao(oes) aguardando aprovacao.`}
    >
      <table className="drivers-table pricing-table cargo-list-table">
        <thead>
          <tr>
            <th>Tipo de ajuste</th>
            <th>Motivo</th>
            <th>Criado em</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {adjustments.map((adjustment) => (
            <tr key={adjustment.id}>
              <td>{resolveAdjustmentType(adjustment)}</td>
              <td>{adjustment.reason}</td>
              <td>{formatDateTime(adjustment.createdAt)}</td>
              <td>
                <span className="timekeeping-badge badge-warning">
                  Nao aprovado
                </span>
              </td>
            </tr>
          ))}
          {adjustments.length === 0 ? (
            <tr>
              <td colSpan={4}>Nenhum ajuste pendente</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </DataSectionCard>
  );
}

export function AdjustmentHistoryTable({ adjustments }: { adjustments: TimeAdjustment[] }) {
  return (
    <DataSectionCard
      title="Historico de alteracoes"
      subtitle={`${adjustments.length} item(ns) revisado(s).`}
    >
      <table className="drivers-table pricing-table cargo-list-table">
        <thead>
          <tr>
            <th>Ajuste realizado</th>
            <th>Motivo</th>
            <th>Status final</th>
            <th>Revisado em</th>
          </tr>
        </thead>
        <tbody>
          {adjustments.map((adjustment) => (
            <tr key={adjustment.id}>
              <td>{resolveAdjustmentType(adjustment)}</td>
              <td>{adjustment.reason}</td>
              <td>
                <span
                  className={`timekeeping-badge ${
                    adjustment.status === "APPROVED"
                      ? "badge-success"
                      : "badge-danger"
                  }`}
                >
                  {adjustment.status === "APPROVED" ? "Aprovado" : "Recusado"}
                </span>
              </td>
              <td>{adjustment.reviewedAt ? formatDateTime(adjustment.reviewedAt) : "-"}</td>
            </tr>
          ))}
          {adjustments.length === 0 ? (
            <tr>
              <td colSpan={4}>Sem historico de alteracoes</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </DataSectionCard>
  );
}

function DataSectionCard(props: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean cargo-list-table-panel timekeeping-mirror-data-card">
      <div className="drivers-table-head">
        <div className="drivers-table-head-copy">
          <h2>{props.title}</h2>
          <span>{props.subtitle}</span>
        </div>
      </div>
      <div className="drivers-table-wrap">{props.children}</div>
    </article>
  );
}

function toEntryStatusLabel(status: TimeEntry["status"]): string {
  switch (status) {
    case "REGISTERED":
      return "Registrado";
    case "ADJUSTED":
      return "Ajustado";
    default:
      return "Invalido";
  }
}

function toEntryStatusClass(status: TimeEntry["status"]): string {
  switch (status) {
    case "REGISTERED":
      return "badge-success";
    case "ADJUSTED":
      return "badge-warning";
    default:
      return "badge-danger";
  }
}

function toSourceLabel(source: TimeEntry["source"]): string {
  switch (source) {
    case "ADMIN":
      return "Manual";
    case "APP":
      return "App";
    case "WEB":
      return "Sistema";
    default:
      return "Importacao";
  }
}

function resolveAdjustmentType(adjustment: TimeAdjustment): string {
  if (!adjustment.timeEntryId) {
    return "Incluir batida";
  }
  if (!adjustment.requestedKind && !adjustment.requestedOccurredAt) {
    return "Remover batida";
  }
  return "Alterar batida";
}
