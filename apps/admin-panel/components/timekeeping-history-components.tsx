"use client";

import type { DriverProfile, TimeEntry, TimeEntryKind, TimeEntrySource } from "../lib/api";
import { formatDateTime } from "./timekeeping-shared";

type FilterOptions = {
  driverId: string;
  fromDate: string;
  toDate: string;
  kind: "" | TimeEntryKind;
  source: "" | TimeEntrySource;
};

const TYPE_OPTIONS: Array<{ value: "" | TimeEntryKind; label: string }> = [
  { value: "", label: "Todos os tipos" },
  { value: "IN", label: "Entrada" },
  { value: "OUT", label: "Saida" },
  { value: "BREAK_START", label: "Inicio de intervalo" },
  { value: "BREAK_END", label: "Fim de intervalo" }
];

const SOURCE_OPTIONS: Array<{ value: "" | TimeEntrySource; label: string }> = [
  { value: "", label: "Todas as origens" },
  { value: "ADMIN", label: "Manual" },
  { value: "APP", label: "Aplicativo" },
  { value: "WEB", label: "Sistema" },
  { value: "IMPORT", label: "Importacao" }
];

export function HistoryFiltersCard(props: {
  drivers: DriverProfile[];
  filters: FilterOptions;
  pending: boolean;
  onChange: (next: Partial<FilterOptions>) => void;
  onSubmit: () => void;
  onClear: () => void;
}) {
  const { drivers, filters, pending, onChange, onSubmit, onClear } = props;

  return (
    <article className="panel panel-soft timekeeping-history-card">
      <div className="timekeeping-history-card-head">
        <h2>Filtros</h2>
        <p>Consulte batidas ja registradas sem misturar com o lancamento manual.</p>
      </div>

      <div className="timekeeping-history-filters-grid">
        <label>
          <span>Funcionario/motorista</span>
          <select
            className="select"
            value={filters.driverId}
            disabled={pending}
            onChange={(event) => onChange({ driverId: event.target.value })}
          >
            <option value="">Todos</option>
            {drivers.map((driver) => (
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
            value={filters.fromDate}
            disabled={pending}
            onChange={(event) => onChange({ fromDate: event.target.value })}
          />
        </label>

        <label>
          <span>Data final</span>
          <input
            type="date"
            value={filters.toDate}
            disabled={pending}
            onChange={(event) => onChange({ toDate: event.target.value })}
          />
        </label>

        <label>
          <span>Tipo de batida</span>
          <select
            className="select"
            value={filters.kind}
            disabled={pending}
            onChange={(event) => onChange({ kind: event.target.value as FilterOptions["kind"] })}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value || "ALL"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Origem</span>
          <select
            className="select"
            value={filters.source}
            disabled={pending}
            onChange={(event) => onChange({ source: event.target.value as FilterOptions["source"] })}
          >
            {SOURCE_OPTIONS.map((option) => (
              <option key={option.value || "ALL"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="timekeeping-history-actions">
        <button type="button" className="button-link secondary-link" onClick={onClear} disabled={pending}>
          Limpar filtros
        </button>
        <button type="button" className="button-link" onClick={onSubmit} disabled={pending}>
          Filtrar
        </button>
      </div>
    </article>
  );
}

export function HistoryEntriesTable(props: {
  entries: TimeEntry[];
  driversById: Record<string, string>;
  pending: boolean;
}) {
  const { entries, driversById, pending } = props;

  return (
    <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean cargo-list-table-panel">
      <div className="drivers-table-head">
        <div className="drivers-table-head-copy">
          <h2>Batidas registradas</h2>
          <span>{pending ? "Atualizando lista..." : `${entries.length} registro(s) encontrado(s).`}</span>
        </div>
      </div>

      <div className="drivers-table-wrap">
        <table className="drivers-table pricing-table cargo-list-table">
          <thead>
            <tr>
              <th>Horario</th>
              <th>Funcionario</th>
              <th>Tipo</th>
              <th>Origem</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5}>Nenhuma batida encontrada para os filtros selecionados.</td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDateTime(entry.occurredAt)}</td>
                  <td>{driversById[entry.driverId] ?? entry.driverId}</td>
                  <td>{toKindLabel(entry.kind)}</td>
                  <td>{toSourceLabel(entry.source)}</td>
                  <td>
                    <span className={toStatusClass(entry.status)}>{toStatusLabel(entry.status)}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function toKindLabel(kind: TimeEntryKind): string {
  switch (kind) {
    case "IN":
      return "Entrada";
    case "OUT":
      return "Saida";
    case "BREAK_START":
      return "Inicio de intervalo";
    default:
      return "Fim de intervalo";
  }
}

function toSourceLabel(source: TimeEntrySource): string {
  switch (source) {
    case "APP":
      return "Aplicativo";
    case "WEB":
      return "Sistema";
    case "IMPORT":
      return "Importacao";
    default:
      return "Manual";
  }
}

function toStatusLabel(status: TimeEntry["status"]): string {
  switch (status) {
    case "ADJUSTED":
      return "Ajustado";
    case "CANCELLED":
      return "Cancelado";
    default:
      return "Registrado";
  }
}

function toStatusClass(status: TimeEntry["status"]): string {
  if (status === "ADJUSTED") {
    return "status-pill";
  }
  if (status === "CANCELLED") {
    return "status-pill rides-status-pill-danger";
  }
  return "status-pill status-pill-success";
}
