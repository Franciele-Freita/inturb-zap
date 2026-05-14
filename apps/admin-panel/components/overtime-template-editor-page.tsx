"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { OvertimeTemplate, request } from "../lib/api";
import { isOvertimeTemplateCategory } from "../lib/overtime-policy-settings";

type Mode = "create" | "edit" | "view";
type Destination = "PAYMENT" | "BANK_HOURS" | "BOTH";
type RoundingType = "UP" | "DOWN" | "NEAREST";
type TermUnit = "DAYS" | "MONTHS";
type BankPriority = "COMPENSATE" | "PAY";

type Props = {
  mode: Mode;
  templateId?: string;
};

type FormState = {
  name: string;
  isActive: boolean;
  overtimeEnabled: boolean;
  afterDailyHours: string;
  afterWeeklyHours: string;
  destination: Destination;
  overtime50: string;
  overtime100: string;
  maxExtraHoursPerDay: string;
  requiresApproval: boolean;
  compensateDelayWithOvertime: boolean;
  toleranceMinutes: string;
  roundingType: RoundingType;
  roundingIntervalMinutes: string;
  bankHoursEnabled: boolean;
  bankCompensationTermValue: string;
  bankCompensationTermUnit: TermUnit;
  bankPriority: BankPriority;
  bankExpirationValue: string;
  bankExpirationUnit: TermUnit;
};

const defaultForm: FormState = {
  name: "",
  isActive: true,
  overtimeEnabled: true,
  afterDailyHours: "8",
  afterWeeklyHours: "44",
  destination: "PAYMENT",
  overtime50: "50",
  overtime100: "100",
  maxExtraHoursPerDay: "",
  requiresApproval: false,
  compensateDelayWithOvertime: false,
  toleranceMinutes: "0",
  roundingType: "NEAREST",
  roundingIntervalMinutes: "15",
  bankHoursEnabled: false,
  bankCompensationTermValue: "30",
  bankCompensationTermUnit: "DAYS",
  bankPriority: "COMPENSATE",
  bankExpirationValue: "",
  bankExpirationUnit: "DAYS"
};

export function OvertimeTemplateEditorPage({ mode, templateId }: Props) {
  const router = useRouter();
  const isReadOnly = mode === "view";
  const [form, setForm] = useState<FormState>(defaultForm);
  const [isLoading, setIsLoading] = useState(mode !== "create");
  const [isSaving, setIsSaving] = useState(false);
  const [isOvertimeCategoryMismatch, setIsOvertimeCategoryMismatch] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(
    mode === "create" ? null : "Carregando politica."
  );

  useEffect(() => {
    if (mode === "create" || !templateId) return;

    setIsLoading(true);
    void request<OvertimeTemplate>(`/admin/overtime-templates/${templateId}`)
      .then((template) => {
        if (!isOvertimeTemplateCategory(template, "OVERTIME")) {
          setStatusMessage("Esta politica pertence ao modulo de adicional noturno.");
          setIsOvertimeCategoryMismatch(true);
          return;
        }

        setForm(mapTemplateToForm(template));
        setIsOvertimeCategoryMismatch(false);
        setStatusMessage(null);
      })
      .catch((error) => setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar politica."))
      .finally(() => setIsLoading(false));
  }, [mode, templateId]);

  const canSave = useMemo(() => {
    if (isReadOnly || isLoading || isSaving || isOvertimeCategoryMismatch) return false;
    if (form.name.trim().length < 3) return false;
    if (!form.overtimeEnabled) return true;
    if ((toNum(form.afterDailyHours) ?? 0) <= 0) return false;
    if ((toNum(form.afterWeeklyHours) ?? 0) <= 0) return false;
    if ((toNum(form.overtime50) ?? -1) < 0) return false;
    if ((toNum(form.overtime100) ?? -1) < 0) return false;
    if ((toInt(form.roundingIntervalMinutes) ?? 0) <= 0) return false;
    if (showBank(form) && (toInt(form.bankCompensationTermValue) ?? 0) <= 0) return false;
    return true;
  }, [form, isReadOnly, isLoading, isSaving, isOvertimeCategoryMismatch]);

  function update<Key extends keyof FormState>(field: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave || isReadOnly) return;

    setIsSaving(true);
    setStatusMessage("Salvando politica...");
    try {
      const payload = buildPayload(form);
      if (mode === "edit" && templateId) {
        await request(`/admin/overtime-templates/${templateId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await request("/admin/overtime-templates", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      router.push("/administrative/overtime");
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao salvar.");
      setIsSaving(false);
    }
  }

  const disabled = isReadOnly || isLoading || isSaving;
  const pageTitle =
    mode === "create"
      ? "Cadastrar politica de hora extra"
      : mode === "edit"
        ? "Editar politica de hora extra"
        : "Visualizar politica de hora extra";
  const pageSubtitle = "Configure regras reutilizaveis de hora extra para a operacao.";

  return (
    <main className="page-shell page-shell-wide overtime-editor-page-shell">
      <header className="overtime-editor-page-header">
        <h1>{pageTitle}</h1>
        <p>{pageSubtitle}</p>
      </header>

      {statusMessage ? <p className="overtime-editor-status-message">{statusMessage}</p> : null}

      <section className="grid grid-single">
        <article className="panel panel-wide overtime-editor-card">
          <form className="stack overtime-editor-form" onSubmit={(event) => void onSubmit(event)}>
            <div className="panel-head"><h2>Dados da politica</h2><span>Nome e status da politica.</span></div>
            <div className="form-grid">
              <label>Nome<input value={form.name} onChange={(e) => update("name", e.target.value)} disabled={disabled} /></label>
            </div>
            <section className="editor-status-block">
              <h3 className="editor-status-title">Configuracao</h3>
              <label className="editor-status-toggle">
                <input type="checkbox" checked={form.isActive} onChange={(e) => update("isActive", e.target.checked)} disabled={disabled} />
                <span>Status ativo</span>
              </label>
            </section>

            <div className="panel-head"><h2>Configuracoes de hora extra</h2><span>Ativacao, gatilhos e destino.</span></div>
            <div className="form-grid">
              <label className="toggle-field"><span>Habilitar hora extra</span><input type="checkbox" checked={form.overtimeEnabled} onChange={(e) => update("overtimeEnabled", e.target.checked)} disabled={disabled} /></label>
            </div>

            {form.overtimeEnabled ? (
              <>
                <div className="form-grid">
                  <label>Gerar hora extra apos X horas no dia<input type="number" min="0" step="0.5" value={form.afterDailyHours} onChange={(e) => update("afterDailyHours", e.target.value)} disabled={disabled} /></label>
                  <label>Gerar hora extra apos X horas na semana<input type="number" min="0" step="0.5" value={form.afterWeeklyHours} onChange={(e) => update("afterWeeklyHours", e.target.value)} disabled={disabled} /></label>
                  <label>Destino da hora extra
                    <select className="select" value={form.destination} onChange={(e) => setForm((current) => {
                      const destination = e.target.value as Destination;
                      return { ...current, destination, bankHoursEnabled: destination === "PAYMENT" ? false : current.bankHoursEnabled || true };
                    })} disabled={disabled}>
                      <option value="PAYMENT">Pagamento</option>
                      <option value="BANK_HOURS">Banco de horas</option>
                      <option value="BOTH">Ambos</option>
                    </select>
                  </label>
                </div>

                <div className="panel-head"><h2>Percentuais</h2><span>Percentuais aplicados na hora extra.</span></div>
                <div className="form-grid">
                  <label>Adicional padrão (Dias úteis - %) <input type="number" min="0" step="0.01" value={form.overtime50} onChange={(e) => update("overtime50", e.target.value)} disabled={disabled} /></label>
                  <label>Adicional especial (Dom/Feriados - %) <input type="number" min="0" step="0.01" value={form.overtime100} onChange={(e) => update("overtime100", e.target.value)} disabled={disabled} /></label>
                </div>

                <div className="panel-head"><h2>Regras adicionais</h2><span>Limites, aprovacao e tolerancia.</span></div>
                <div className="form-grid">
                  <label>Limite máximo de HE/dia (Horas) <input type="number" min="0" step="0.5" value={form.maxExtraHoursPerDay} onChange={(e) => update("maxExtraHoursPerDay", e.target.value)} placeholder="Recomendado: 2.0" disabled={disabled} /><small className="helper-text">Pela CLT, o limite é de 2h extras por dia.</small></label>
                 <label>Tolerância de ponto (Minutos)<input type="number" min="0" step="1" value={form.toleranceMinutes} onChange={(e) => update("toleranceMinutes", e.target.value)} disabled={disabled} /><small className="helper-text">Margem ignorada antes de gerar HE ou atraso.</small></label>
                  <label className="toggle-field"><span>Necessita aprovacao</span><input type="checkbox" checked={form.requiresApproval} onChange={(e) => update("requiresApproval", e.target.checked)} disabled={disabled} /></label>
                  <label className="toggle-field"><span>Compensar atraso com hora extra</span><input type="checkbox" checked={form.compensateDelayWithOvertime} onChange={(e) => update("compensateDelayWithOvertime", e.target.checked)} disabled={disabled} /></label>
                </div>

                <div className="panel-head"><h2>Arredondamento</h2><span>Tipo e intervalo de minutos.</span></div>
                <div className="form-grid">
                  <label>Tipo de arredondamento
                    <select className="select" value={form.roundingType} onChange={(e) => update("roundingType", e.target.value as RoundingType)} disabled={disabled}>
                      <option value="UP">Para cima</option>
                      <option value="DOWN">Para baixo</option>
                      <option value="NEAREST">Mais proximo</option>
                    </select>
                  </label>
                  <label>Intervalo de minutos<input type="number" min="1" step="1" value={form.roundingIntervalMinutes} onChange={(e) => update("roundingIntervalMinutes", e.target.value)} disabled={disabled} /></label>
                </div>

                {form.destination !== "PAYMENT" ? (
                  <>
                    <div className="panel-head"><h2>Banco de horas</h2><span>Campos exibidos quando banco estiver ativo.</span></div>
                    <div className="form-grid">
                      <label className="toggle-field"><span>Ativar banco de horas</span><input type="checkbox" checked={form.bankHoursEnabled} onChange={(e) => update("bankHoursEnabled", e.target.checked)} disabled={disabled} /></label>
                    </div>
                    {showBank(form) ? (
                      <div className="form-grid">
                        <label>Prazo para compensacao<input type="number" min="1" step="1" value={form.bankCompensationTermValue} onChange={(e) => update("bankCompensationTermValue", e.target.value)} disabled={disabled} /></label>
                        <label>Unidade do prazo
                          <select className="select" value={form.bankCompensationTermUnit} onChange={(e) => update("bankCompensationTermUnit", e.target.value as TermUnit)} disabled={disabled}>
                            <option value="DAYS">Dias</option>
                            <option value="MONTHS">Meses</option>
                          </select>
                        </label>
                        <label>Prioridade
                          <select className="select" value={form.bankPriority} onChange={(e) => update("bankPriority", e.target.value as BankPriority)} disabled={disabled}>
                            <option value="COMPENSATE">Compensar</option>
                            <option value="PAY">Pagar</option>
                          </select>
                        </label>
                        <label>Expiracao das horas<input type="number" min="1" step="1" value={form.bankExpirationValue} onChange={(e) => update("bankExpirationValue", e.target.value)} placeholder="Opcional" disabled={disabled} /></label>
                        <label>Unidade da expiracao
                          <select className="select" value={form.bankExpirationUnit} onChange={(e) => update("bankExpirationUnit", e.target.value as TermUnit)} disabled={disabled}>
                            <option value="DAYS">Dias</option>
                            <option value="MONTHS">Meses</option>
                          </select>
                        </label>
                      </div>
                    ) : null}
                  </>
                ) : null}

              </>
            ) : (
              <div className="driver-editor-contract-inline-note">
                <strong>Hora extra desabilitada</strong>
                <span>A politica sera salva sem regras de geracao de hora extra.</span>
              </div>
            )}

            <div className="overtime-editor-footer">
              <Link href="/administrative/overtime" className="button-link secondary-link">Voltar para lista</Link>
              {!isReadOnly ? <button type="submit" disabled={!canSave}>{isSaving ? "Salvando..." : mode === "edit" ? "Salvar alteracoes" : "Salvar politica"}</button> : null}
              {isReadOnly && templateId ? <Link href={`/administrative/overtime/${templateId}/edit`} className="button-link">Editar politica</Link> : null}
            </div>
          </form>
        </article>
      </section>
    </main>
  );
}

function showBank(form: FormState): boolean {
  return form.overtimeEnabled && form.destination !== "PAYMENT" && form.bankHoursEnabled;
}

function buildPayload(form: FormState) {
  const bankEnabled = showBank(form);
  return {
    name: form.name.trim(),
    isActive: form.isActive,
    settings: {
      policyCategory: "OVERTIME",
      overtime: {
        enabled: form.overtimeEnabled,
        afterDailyHours: toNum(form.afterDailyHours) ?? 8,
        afterWeeklyHours: toNum(form.afterWeeklyHours) ?? 44,
        destination: form.destination
      },
      percentages: {
        overtime50: toNum(form.overtime50) ?? 50,
        overtime100: toNum(form.overtime100) ?? 100,
        nightAdditionalPercent: 20
      },
      rules: {
        maxExtraHoursPerDay: toNum(form.maxExtraHoursPerDay),
        requiresApproval: form.requiresApproval,
        compensateDelayWithOvertime: form.compensateDelayWithOvertime,
        toleranceMinutes: toInt(form.toleranceMinutes) ?? 0
      },
      rounding: {
        type: form.roundingType,
        intervalMinutes: toInt(form.roundingIntervalMinutes) ?? 15
      },
      bankHours: {
        enabled: bankEnabled,
        compensationTermValue: bankEnabled ? toInt(form.bankCompensationTermValue) ?? 30 : undefined,
        compensationTermUnit: bankEnabled ? form.bankCompensationTermUnit : undefined,
        priority: bankEnabled ? form.bankPriority : undefined,
        expirationValue: bankEnabled ? toNum(form.bankExpirationValue) : undefined,
        expirationUnit: bankEnabled ? form.bankExpirationUnit : undefined
      },
      night: {
        enabled: false,
        startTime: undefined,
        endTime: undefined,
        percent: undefined,
        accumulatesWithOvertime: false
      }
    }
  };
}

function mapTemplateToForm(template: OvertimeTemplate): FormState {
  const s = readSettings(template.settings);
  return {
    ...defaultForm,
    name: template.name,
    isActive: template.isActive,
    overtimeEnabled: s.overtime.enabled,
    afterDailyHours: String(s.overtime.afterDailyHours),
    afterWeeklyHours: String(s.overtime.afterWeeklyHours),
    destination: s.overtime.destination,
    overtime50: String(s.percentages.overtime50),
    overtime100: String(s.percentages.overtime100),
    maxExtraHoursPerDay: s.rules.maxExtraHoursPerDay === undefined ? "" : String(s.rules.maxExtraHoursPerDay),
    requiresApproval: s.rules.requiresApproval,
    compensateDelayWithOvertime: s.rules.compensateDelayWithOvertime,
    toleranceMinutes: String(s.rules.toleranceMinutes),
    roundingType: s.rounding.type,
    roundingIntervalMinutes: String(s.rounding.intervalMinutes),
    bankHoursEnabled: s.bankHours.enabled,
    bankCompensationTermValue: String(s.bankHours.compensationTermValue ?? 30),
    bankCompensationTermUnit: s.bankHours.compensationTermUnit ?? "DAYS",
    bankPriority: s.bankHours.priority ?? "COMPENSATE",
    bankExpirationValue: s.bankHours.expirationValue === undefined ? "" : String(s.bankHours.expirationValue),
    bankExpirationUnit: s.bankHours.expirationUnit ?? "DAYS"
  };
}

function readSettings(value: Record<string, unknown>) {
  const overtime = asObj(value.overtime);
  const percentages = asObj(value.percentages);
  const rules = asObj(value.rules);
  const rounding = asObj(value.rounding);
  const bankHours = asObj(value.bankHours);
  const destination = overtime.destination === "BANK_HOURS" || overtime.destination === "BOTH" ? overtime.destination : "PAYMENT";
  const roundingType = rounding.type === "UP" || rounding.type === "DOWN" ? rounding.type : "NEAREST";
  const bankCompensationTermUnit: TermUnit = bankHours.compensationTermUnit === "MONTHS" ? "MONTHS" : "DAYS";
  const bankPriority: BankPriority = bankHours.priority === "PAY" ? "PAY" : "COMPENSATE";
  const bankExpirationUnit: TermUnit = bankHours.expirationUnit === "MONTHS" ? "MONTHS" : "DAYS";
  return {
    overtime: { enabled: toBool(overtime.enabled, true), afterDailyHours: toN(overtime.afterDailyHours, 8), afterWeeklyHours: toN(overtime.afterWeeklyHours, 44), destination: destination as Destination },
    percentages: { overtime50: toN(percentages.overtime50, 50), overtime100: toN(percentages.overtime100, 100) },
    rules: { maxExtraHoursPerDay: toNOpt(rules.maxExtraHoursPerDay), requiresApproval: toBool(rules.requiresApproval, false), compensateDelayWithOvertime: toBool(rules.compensateDelayWithOvertime, false), toleranceMinutes: toI(rules.toleranceMinutes, 0) },
    rounding: { type: roundingType as RoundingType, intervalMinutes: toI(rounding.intervalMinutes, 15) },
    bankHours: { enabled: toBool(bankHours.enabled, destination !== "PAYMENT"), compensationTermValue: toIOpt(bankHours.compensationTermValue), compensationTermUnit: bankCompensationTermUnit, priority: bankPriority, expirationValue: toNOpt(bankHours.expirationValue), expirationUnit: bankExpirationUnit }
  };
}

function asObj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function toNum(value: string): number | undefined {
  const n = Number(value.trim().replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

function toInt(value: string): number | undefined {
  const n = Number(value.trim());
  return Number.isInteger(n) ? n : undefined;
}

function toN(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNOpt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toI(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function toIOpt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function toBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}
