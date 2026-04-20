"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { DriverContract, DriverContractProfile, DriverJourney, request } from "../lib/api";

type WeekDay = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
type JourneyScaleType = "FIVE_TWO" | "SIX_ONE" | "TWELVE_THIRTY_SIX" | "CUSTOM";
type CompensationMode = "PERCENT" | "FLAT" | "DAILY" | "SHIFT" | "SALARY" | "INTERMITTENT" | "CUSTOM";
type SalaryModel = "FIXED" | "FIXED_PLUS_COMMISSION" | "COMMISSION";
type OvertimePolicyMode = "PAID" | "BANK_HOURS";

type FormState = {
  name: string;
  description: string;
  contractProfile: DriverContractProfile;
  isActive: boolean;
  customCompensationModel: CompensationMode;
  customCompensationValue: string;
  customCompensationNotes: string;
  fixedSchedule: boolean;
  scaleType: JourneyScaleType;
  customScaleWorkDays: string;
  customScaleOffDays: string;
  startTime: string;
  endTime: string;
  availabilityStartTime: string;
  availabilityEndTime: string;
  availableDays: WeekDay[];
  acceptsOutsideSchedule: boolean;
  availabilityNotes: string;
  salaryModel: SalaryModel;
  fixedSalary: string;
  commissionType: "PERCENT" | "PER_RIDE";
  commissionApplyOn: "RIDE" | "RATING";
  commissionPercent: string;
  commissionPerRide: string;
  paymentFrequency: string;
  notes: string;
  overtimeEnabled: boolean;
  overtimePolicyMode: OvertimePolicyMode;
  overtimeDailyLimitHours: string;
  overtimeWeeklyLimitHours: string;
  overtimeAfterDailyHours: string;
  overtimeAfterWeeklyHours: string;
  overtimeMultiplier50: string;
  overtimeMultiplier100: string;
  overtimeNightMultiplier: string;
  overtimeRoundingMinutes: string;
};

const defaultWeekDays: WeekDay[] = ["MON", "TUE", "WED", "THU", "FRI"];

const weekDayOptions: Array<{ value: WeekDay; label: string }> = [
  { value: "MON", label: "Seg" },
  { value: "TUE", label: "Ter" },
  { value: "WED", label: "Qua" },
  { value: "THU", label: "Qui" },
  { value: "FRI", label: "Sex" },
  { value: "SAT", label: "Sab" },
  { value: "SUN", label: "Dom" }
];

const defaultForm: FormState = {
  name: "",
  description: "",
  contractProfile: "CLT",
  isActive: true,
  customCompensationModel: "SALARY",
  customCompensationValue: "",
  customCompensationNotes: "",
  fixedSchedule: true,
  scaleType: "SIX_ONE",
  customScaleWorkDays: "",
  customScaleOffDays: "",
  startTime: "08:00",
  endTime: "17:00",
  availabilityStartTime: "06:00",
  availabilityEndTime: "18:00",
  availableDays: [...defaultWeekDays],
  acceptsOutsideSchedule: false,
  availabilityNotes: "",
  salaryModel: "FIXED",
  fixedSalary: "",
  commissionType: "PERCENT",
  commissionApplyOn: "RIDE",
  commissionPercent: "",
  commissionPerRide: "",
  paymentFrequency: "",
  notes: "",
  overtimeEnabled: true,
  overtimePolicyMode: "PAID",
  overtimeDailyLimitHours: "",
  overtimeWeeklyLimitHours: "",
  overtimeAfterDailyHours: "8",
  overtimeAfterWeeklyHours: "44",
  overtimeMultiplier50: "1.5",
  overtimeMultiplier100: "2",
  overtimeNightMultiplier: "1.2",
  overtimeRoundingMinutes: "15"
};

function parseNumber(value: string): number | undefined {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function scaleLabel(scaleType: JourneyScaleType, workDays?: number, offDays?: number): string {
  if (scaleType === "FIVE_TWO") return "5x2";
  if (scaleType === "SIX_ONE") return "6x1";
  if (scaleType === "TWELVE_THIRTY_SIX") return "12x36";
  if (workDays && offDays) return `${workDays}x${offDays}`;
  return "Personalizada";
}

function weekDaySummary(days: WeekDay[]): string {
  const labels = weekDayOptions.filter((option) => days.includes(option.value)).map((option) => option.label.toLowerCase());
  if (labels.length === 0) return "nenhum dia";
  if (labels.length === 7) return "todos os dias";
  return labels.join(", ");
}
function buildJourney(form: FormState): DriverJourney {
  const workDays = form.scaleType === "CUSTOM" ? parseNumber(form.customScaleWorkDays) : undefined;
  const offDays = form.scaleType === "CUSTOM" ? parseNumber(form.customScaleOffDays) : undefined;

  return {
    fixedSchedule: form.fixedSchedule,
    fixedScheduleMode: form.fixedSchedule ? "UNIFORM" : undefined,
    scaleType: form.scaleType,
    scale: scaleLabel(form.scaleType, workDays, offDays),
    customScaleWorkDays: workDays,
    customScaleOffDays: offDays,
    startTime: form.fixedSchedule ? form.startTime : undefined,
    endTime: form.fixedSchedule ? form.endTime : undefined,
    availabilityStartTime: form.fixedSchedule ? undefined : form.availabilityStartTime,
    availabilityEndTime: form.fixedSchedule ? undefined : form.availabilityEndTime,
    availableDays: form.availableDays.length > 0 ? form.availableDays : [...defaultWeekDays],
    acceptsOutsideSchedule: form.fixedSchedule ? undefined : form.acceptsOutsideSchedule,
    availabilityNotes: form.availabilityNotes.trim() || undefined
  };
}

function buildContract(form: FormState): DriverContract {
  const contract: DriverContract = {
    salaryModel: form.salaryModel,
    fixedSalary: form.salaryModel === "COMMISSION" ? undefined : parseNumber(form.fixedSalary),
    commissionType: form.salaryModel === "FIXED" ? undefined : form.commissionType,
    commissionApplyOn: form.salaryModel === "FIXED" ? undefined : form.commissionApplyOn,
    commissionPercent:
      form.salaryModel !== "FIXED" && form.commissionType === "PERCENT" ? parseNumber(form.commissionPercent) : undefined,
    commissionPerRide:
      form.salaryModel !== "FIXED" && form.commissionType === "PER_RIDE" ? parseNumber(form.commissionPerRide) : undefined,
    paymentFrequency: form.paymentFrequency.trim() || undefined,
    notes: form.notes.trim() || undefined,
    overtimeUseGlobalPolicy: false,
    overtimeEnabled: form.overtimeEnabled,
    overtimePolicyMode: !form.overtimeEnabled ? undefined : form.overtimePolicyMode,
    overtimeDailyLimitHours:
      !form.overtimeEnabled ? undefined : parseNumber(form.overtimeDailyLimitHours),
    overtimeWeeklyLimitHours:
      !form.overtimeEnabled ? undefined : parseNumber(form.overtimeWeeklyLimitHours),
    overtimeAfterDailyHours:
      !form.overtimeEnabled ? undefined : parseNumber(form.overtimeAfterDailyHours),
    overtimeAfterWeeklyHours:
      !form.overtimeEnabled ? undefined : parseNumber(form.overtimeAfterWeeklyHours),
    overtimeMultiplier50:
      !form.overtimeEnabled ? undefined : parseNumber(form.overtimeMultiplier50),
    overtimeMultiplier100:
      !form.overtimeEnabled ? undefined : parseNumber(form.overtimeMultiplier100),
    overtimeNightMultiplier:
      !form.overtimeEnabled ? undefined : parseNumber(form.overtimeNightMultiplier),
    overtimeRoundingMinutes:
      !form.overtimeEnabled ? undefined : parseNumber(form.overtimeRoundingMinutes)
  };

  return contract;
}

export function RemunerationTemplateCreatePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Preencha salario, jornada e hora extra para padronizar o step 6 do cadastro de motorista."
  );

  const compensationSummary = useMemo(() => {
    return `${form.customCompensationModel} (${parseNumber(form.customCompensationValue) ?? 0})`;
  }, [form.customCompensationModel, form.customCompensationValue]);

  const canSubmit = useMemo(() => {
    if (form.name.trim().length < 3) return false;

    if (form.salaryModel !== "FIXED") {
      if (form.commissionType === "PERCENT" && (parseNumber(form.commissionPercent) ?? 0) <= 0) return false;
      if (form.commissionType === "PER_RIDE" && (parseNumber(form.commissionPerRide) ?? 0) <= 0) return false;
    }

    if (form.overtimeEnabled) {
      if ((parseNumber(form.overtimeAfterDailyHours) ?? 0) <= 0) return false;
      if ((parseNumber(form.overtimeMultiplier50) ?? 0) <= 0) return false;
      if ((parseNumber(form.overtimeMultiplier100) ?? 0) <= 0) return false;
      if ((parseNumber(form.overtimeRoundingMinutes) ?? 0) <= 0) return false;
    }

    return true;
  }, [
    form.commissionPercent,
    form.commissionPerRide,
    form.commissionType,
    form.name,
    form.overtimeAfterDailyHours,
    form.overtimeEnabled,
    form.overtimeMultiplier100,
    form.overtimeMultiplier50,
    form.overtimeRoundingMinutes,
    form.salaryModel
  ]);

  function updateField<Key extends keyof FormState>(field: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleDay(day: WeekDay) {
    setForm((current) => {
      const exists = current.availableDays.includes(day);
      return {
        ...current,
        availableDays: exists ? current.availableDays.filter((value) => value !== day) : [...current.availableDays, day]
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      setStatusMessage("Revise os campos obrigatorios antes de salvar.");
      return;
    }

    setIsSaving(true);
    setStatusMessage("Salvando template de remuneracao...");

    try {
      await request("/admin/remuneration-templates", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          workerType: "DRIVER",
          contractProfile: form.contractProfile,
          isActive: form.isActive,
          settings: {
            version: 1,
            scope: "DRIVER_REGISTRATION_STEP6",
            compensation: {
              useGlobalConfig: false,
              customModel: form.customCompensationModel,
              customValue: parseNumber(form.customCompensationValue),
              customNotes: form.customCompensationNotes.trim() || undefined
            },
            journey: buildJourney(form),
            contract: buildContract(form)
          }
        })
      });

      router.push("/compensation");
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao salvar template.");
      setIsSaving(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Administracao</p>
          <h1>Novo template de remuneracao</h1>
          <p className="helper-text">Monte um padrao reutilizavel para salario, jornada e hora extra.</p>
        </div>

        <div className="status-card">
          <span className="status-label">Resumo</span>
          <strong>{statusMessage}</strong>
          <div className="chips">
            <span className="chip">{form.contractProfile}</span>
            <span className="chip chip-soft">{compensationSummary}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-single">
        <article className="panel panel-wide">
          <div className="panel-head">
            <h2>Dados do template</h2>
            <span>As configuracoes abaixo vao para o settings do template.</span>
          </div>

          <form className="stack" onSubmit={(event) => void handleSubmit(event)}>
            <div className="form-grid">
              <label>
                Nome
                <input value={form.name} onChange={(event) => updateField("name", event.target.value)} />
              </label>

              <label>
                Perfil
                <select
                  className="select"
                  value={form.contractProfile}
                  onChange={(event) => updateField("contractProfile", event.target.value as DriverContractProfile)}
                >
                  <option value="CLT">CLT</option>
                  <option value="INTERMITENTE">Intermitente</option>
                  <option value="MEI">MEI</option>
                </select>
              </label>
            </div>

            <label>
              Descricao
              <input value={form.description} onChange={(event) => updateField("description", event.target.value)} />
            </label>

            <label className="toggle-field">
              <span>Template ativo</span>
              <input type="checkbox" checked={form.isActive} onChange={(event) => updateField("isActive", event.target.checked)} />
            </label>

            <div className="panel-head">
              <h2>Remuneracao base</h2>
              <span>Defina o modelo e valor base usados por este template.</span>
            </div>

            <div className="form-grid">
              <label>
                Modelo
                <select
                  className="select"
                  value={form.customCompensationModel}
                  onChange={(event) => updateField("customCompensationModel", event.target.value as CompensationMode)}
                >
                  <option value="SALARY">Salario</option>
                  <option value="PERCENT">Percentual</option>
                  <option value="FLAT">Valor por corrida</option>
                  <option value="DAILY">Diaria</option>
                  <option value="SHIFT">Turno</option>
                  <option value="INTERMITTENT">Intermitente</option>
                  <option value="CUSTOM">Personalizado</option>
                </select>
              </label>

              <label>
                Valor
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.customCompensationValue}
                  onChange={(event) => updateField("customCompensationValue", event.target.value)}
                />
              </label>
            </div>

            <div className="panel-head">
              <h2>Jornada de trabalho</h2>
              <span>Define escala e janela padrao.</span>
            </div>

            <div className="form-grid">
              <label>
                Tipo de jornada
                <select
                  className="select"
                  value={form.fixedSchedule ? "FIXED" : "VARIABLE"}
                  onChange={(event) => updateField("fixedSchedule", event.target.value === "FIXED")}
                >
                  <option value="FIXED">Fixa</option>
                  <option value="VARIABLE">Variavel</option>
                </select>
              </label>

              <label>
                Escala
                <select
                  className="select"
                  value={form.scaleType}
                  onChange={(event) => updateField("scaleType", event.target.value as JourneyScaleType)}
                >
                  <option value="FIVE_TWO">5x2</option>
                  <option value="SIX_ONE">6x1</option>
                  <option value="TWELVE_THIRTY_SIX">12x36</option>
                  <option value="CUSTOM">Personalizada</option>
                </select>
              </label>
            </div>

            {form.scaleType === "CUSTOM" ? (
              <div className="form-grid">
                <label>
                  Dias de trabalho
                  <input type="number" min="1" value={form.customScaleWorkDays} onChange={(event) => updateField("customScaleWorkDays", event.target.value)} />
                </label>

                <label>
                  Dias de folga
                  <input type="number" min="1" value={form.customScaleOffDays} onChange={(event) => updateField("customScaleOffDays", event.target.value)} />
                </label>
              </div>
            ) : null}

            <div className="pricing-rule-days">
              {weekDayOptions.map((day) => {
                const selected = form.availableDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    className={selected ? "pricing-rule-day is-selected" : "pricing-rule-day"}
                    onClick={() => toggleDay(day.value)}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>

            {form.fixedSchedule ? (
              <div className="form-grid">
                <label>
                  Inicio
                  <input type="time" value={form.startTime} onChange={(event) => updateField("startTime", event.target.value)} />
                </label>

                <label>
                  Fim
                  <input type="time" value={form.endTime} onChange={(event) => updateField("endTime", event.target.value)} />
                </label>
              </div>
            ) : (
              <div className="form-grid">
                <label>
                  Inicio disponibilidade
                  <input type="time" value={form.availabilityStartTime} onChange={(event) => updateField("availabilityStartTime", event.target.value)} />
                </label>

                <label>
                  Fim disponibilidade
                  <input type="time" value={form.availabilityEndTime} onChange={(event) => updateField("availabilityEndTime", event.target.value)} />
                </label>
              </div>
            )}

            <div className="panel-head">
              <h2>Salario</h2>
              <span>Modelo salarial do template.</span>
            </div>

            <div className="form-grid">
              <label>
                Modelo salarial
                <select className="select" value={form.salaryModel} onChange={(event) => updateField("salaryModel", event.target.value as SalaryModel)}>
                  <option value="FIXED">Fixo</option>
                  <option value="FIXED_PLUS_COMMISSION">Fixo + comissao</option>
                  <option value="COMMISSION">Somente comissao</option>
                </select>
              </label>

              {form.salaryModel !== "COMMISSION" ? (
                <label>
                  Salario fixo (R$)
                  <input type="number" min="0" step="0.01" value={form.fixedSalary} onChange={(event) => updateField("fixedSalary", event.target.value)} />
                </label>
              ) : null}

              {form.salaryModel !== "FIXED" ? (
                <label>
                  Tipo de comissao
                  <select className="select" value={form.commissionType} onChange={(event) => updateField("commissionType", event.target.value as "PERCENT" | "PER_RIDE")}>
                    <option value="PERCENT">Percentual</option>
                    <option value="PER_RIDE">Valor por corrida</option>
                  </select>
                </label>
              ) : null}

              {form.salaryModel !== "FIXED" ? (
                <label>
                  Base da comissao
                  <select className="select" value={form.commissionApplyOn} onChange={(event) => updateField("commissionApplyOn", event.target.value as "RIDE" | "RATING")}>
                    <option value="RIDE">Corrida</option>
                    <option value="RATING">Avaliacao</option>
                  </select>
                </label>
              ) : null}

              {form.salaryModel !== "FIXED" && form.commissionType === "PERCENT" ? (
                <label>
                  Percentual (%)
                  <input type="number" min="0" max="100" step="0.01" value={form.commissionPercent} onChange={(event) => updateField("commissionPercent", event.target.value)} />
                </label>
              ) : null}

              {form.salaryModel !== "FIXED" && form.commissionType === "PER_RIDE" ? (
                <label>
                  Valor por corrida (R$)
                  <input type="number" min="0" step="0.01" value={form.commissionPerRide} onChange={(event) => updateField("commissionPerRide", event.target.value)} />
                </label>
              ) : null}
            </div>

            <div className="panel-head">
              <h2>Hora extra</h2>
              <span>Politica e parametros de hora extra.</span>
            </div>

            <div className="form-grid">
              <label className="toggle-field">
                <span>Hora extra habilitada</span>
                <input type="checkbox" checked={form.overtimeEnabled} onChange={(event) => updateField("overtimeEnabled", event.target.checked)} />
              </label>
            </div>

            {form.overtimeEnabled ? (
              <div className="form-grid">
                <label>
                  Destino
                  <select className="select" value={form.overtimePolicyMode} onChange={(event) => updateField("overtimePolicyMode", event.target.value as OvertimePolicyMode)}>
                    <option value="PAID">Pagamento</option>
                    <option value="BANK_HOURS">Banco de horas</option>
                  </select>
                </label>

                <label>HE apos X horas no dia<input type="number" min="0" step="0.5" value={form.overtimeAfterDailyHours} onChange={(event) => updateField("overtimeAfterDailyHours", event.target.value)} /></label>
                <label>HE apos X horas na semana<input type="number" min="0" step="0.5" value={form.overtimeAfterWeeklyHours} onChange={(event) => updateField("overtimeAfterWeeklyHours", event.target.value)} /></label>
                <label>Multiplicador 50%<input type="number" min="0" step="0.01" value={form.overtimeMultiplier50} onChange={(event) => updateField("overtimeMultiplier50", event.target.value)} /></label>
                <label>Multiplicador 100%<input type="number" min="0" step="0.01" value={form.overtimeMultiplier100} onChange={(event) => updateField("overtimeMultiplier100", event.target.value)} /></label>
                <label>Multiplicador noturno<input type="number" min="0" step="0.01" value={form.overtimeNightMultiplier} onChange={(event) => updateField("overtimeNightMultiplier", event.target.value)} /></label>
                <label>Arredondamento (min)<input type="number" min="0" step="1" value={form.overtimeRoundingMinutes} onChange={(event) => updateField("overtimeRoundingMinutes", event.target.value)} /></label>
              </div>
            ) : null}

            <div className="driver-editor-contract-inline-note">
              <strong>Resumo da jornada</strong>
              <span>Escala {scaleLabel(form.scaleType, parseNumber(form.customScaleWorkDays), parseNumber(form.customScaleOffDays))} com dias ativos em {weekDaySummary(form.availableDays)}.</span>
            </div>

            <div className="toolbar">
              <button type="submit" disabled={isSaving || !canSubmit}>{isSaving ? "Salvando..." : "Salvar template"}</button>
              <Link href="/compensation" className="button-link secondary-link">Voltar para lista</Link>
            </div>
          </form>
        </article>
      </section>
    </main>
  );
}
