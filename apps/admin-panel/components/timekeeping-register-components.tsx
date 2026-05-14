"use client";

import type { DriverProfile, TimeEntryKind, TimeEntrySource } from "../lib/api";

export type RegisterFormValues = {
  driverId: string;
  occurredAt: string;
  kind: TimeEntryKind;
  source: TimeEntrySource;
  notes: string;
  isAdministrativeChange: boolean;
};

export type RegisterFormErrors = Partial<Record<keyof RegisterFormValues, string>>;

const PUNCH_TYPE_OPTIONS: Array<{ value: TimeEntryKind; label: string }> = [
  { value: "IN", label: "Entrada" },
  { value: "OUT", label: "Saida" },
  { value: "BREAK_START", label: "Inicio de intervalo" },
  { value: "BREAK_END", label: "Fim de intervalo" }
];

const PUNCH_SOURCE_OPTIONS: Array<{ value: TimeEntrySource; label: string }> = [
  { value: "ADMIN", label: "Manual" },
  { value: "APP", label: "Aplicativo" },
  { value: "WEB", label: "Sistema" },
  { value: "IMPORT", label: "Importacao" }
];

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section className="cargo-list-page-header">
      <div className="cargo-list-page-header-copy">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </section>
  );
}

export function TimekeepingRegisterForm(props: {
  drivers: DriverProfile[];
  values: RegisterFormValues;
  errors: RegisterFormErrors;
  pending: boolean;
  onChange: (next: Partial<RegisterFormValues>) => void;
  onSubmit: () => void;
}) {
  const { drivers, values, errors, pending, onChange, onSubmit } = props;
  const notesRequired = values.source === "ADMIN" || values.isAdministrativeChange;

  return (
    <section className="panel panel-soft timekeeping-register-card">
      <div className="timekeeping-register-card-head">
        <h2>Nova batida</h2>
        <p>Informe o funcionario, horario, tipo de batida e origem do registro.</p>
      </div>

      <div className="timekeeping-register-form">
        <EmployeeSelect
          drivers={drivers}
          value={values.driverId}
          error={errors.driverId}
          disabled={pending}
          onChange={(next) => onChange({ driverId: next })}
        />

        <div className="timekeeping-register-grid">
          <DateTimeInput
            value={values.occurredAt}
            error={errors.occurredAt}
            disabled={pending}
            onChange={(next) => onChange({ occurredAt: next })}
          />
          <PunchTypeSelect
            value={values.kind}
            error={errors.kind}
            disabled={pending}
            onChange={(next) => onChange({ kind: next })}
          />
          <PunchOriginSelect
            value={values.source}
            error={errors.source}
            disabled={pending}
            onChange={(next) => onChange({ source: next })}
          />
        </div>

        <label className="timekeeping-register-checkbox">
          <input
            type="checkbox"
            checked={values.isAdministrativeChange}
            disabled={pending}
            onChange={(event) => onChange({ isAdministrativeChange: event.target.checked })}
          />
          <span>Lancamento de alteracao administrativa</span>
        </label>

        <label>
          <span>
            Observacao {notesRequired ? "(obrigatoria)" : "(opcional)"}
          </span>
          <textarea
            value={values.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
            disabled={pending}
            placeholder="Ex.: Correcao manual autorizada pelo gestor."
          />
          {errors.notes ? <small>{errors.notes}</small> : null}
        </label>

        <div className="timekeeping-register-actions">
          <button type="button" className="button-link" disabled={pending} onClick={onSubmit}>
            Registrar batida
          </button>
        </div>
      </div>
    </section>
  );
}

export function EmployeeSelect(props: {
  drivers: DriverProfile[];
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span>Funcionario/motorista</span>
      <select
        className="select"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        disabled={props.disabled}
      >
        <option value="">Selecione</option>
        {props.drivers.map((driver) => (
          <option key={driver.id} value={driver.id}>
            {driver.name}
          </option>
        ))}
      </select>
      {props.error ? <small>{props.error}</small> : null}
    </label>
  );
}

export function DateTimeInput(props: {
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span>Data e hora da batida</span>
      <input
        type="datetime-local"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        disabled={props.disabled}
      />
      {props.error ? <small>{props.error}</small> : null}
    </label>
  );
}

export function PunchTypeSelect(props: {
  value: TimeEntryKind;
  error?: string;
  disabled?: boolean;
  onChange: (value: TimeEntryKind) => void;
}) {
  return (
    <label>
      <span>Tipo de batida</span>
      <select
        className="select"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value as TimeEntryKind)}
        disabled={props.disabled}
      >
        {PUNCH_TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {props.error ? <small>{props.error}</small> : null}
    </label>
  );
}

export function PunchOriginSelect(props: {
  value: TimeEntrySource;
  error?: string;
  disabled?: boolean;
  onChange: (value: TimeEntrySource) => void;
}) {
  return (
    <label>
      <span>Origem</span>
      <select
        className="select"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value as TimeEntrySource)}
        disabled={props.disabled}
      >
        {PUNCH_SOURCE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {props.error ? <small>{props.error}</small> : null}
    </label>
  );
}

export function InfoCard() {
  return (
    <aside className="panel panel-soft timekeeping-register-info">
      <h3>Como usar esta tela</h3>
      <ul>
        <li>Use esta tela somente para registrar batidas manuais.</li>
        <li>Correcao de batidas existentes deve ser feita em Ajustes.</li>
        <li>Consulta de horarios e calculos deve ser feita em Espelho de ponto.</li>
      </ul>
    </aside>
  );
}
