"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { PricingRule, formatCurrency, request } from "../lib/api";

type PricingRuleFormState = {
  name: string;
  description: string;
  scheduleType: "WEEKLY_WINDOW" | "DATE_RANGE";
  adjustmentType: "FLAT" | "PERCENT";
  adjustmentValue: string;
  isActive: boolean;
  priority: string;
  daysOfWeek: string[];
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
};

type PricingRuleEditorProps = {
  mode: "create" | "edit";
  initialRule?: PricingRule;
};

const weekdayOptions = [
  { value: "1", label: "Seg" },
  { value: "2", label: "Ter" },
  { value: "3", label: "Qua" },
  { value: "4", label: "Qui" },
  { value: "5", label: "Sex" },
  { value: "6", label: "Sab" },
  { value: "0", label: "Dom" }
];

function minutesToTime(value?: number): string {
  if (value === undefined) {
    return "";
  }

  const hours = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (value % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function isoToDateInput(value?: string): string {
  return value ? value.slice(0, 10) : "";
}

function toPricingRuleFormState(rule?: PricingRule): PricingRuleFormState {
  return {
    name: rule?.name ?? "",
    description: rule?.description ?? "",
    scheduleType: rule?.scheduleType ?? "WEEKLY_WINDOW",
    adjustmentType: rule?.adjustmentType ?? "FLAT",
    adjustmentValue: String(rule?.adjustmentValue ?? 0),
    isActive: rule?.isActive ?? true,
    priority: String(rule?.priority ?? 100),
    daysOfWeek: rule?.daysOfWeek ? rule.daysOfWeek.split(",").filter(Boolean) : ["1", "2", "3", "4", "5"],
    startTime: minutesToTime(rule?.startMinutes ?? 420),
    endTime: minutesToTime(rule?.endMinutes ?? 540),
    startDate: isoToDateInput(rule?.startDate),
    endDate: isoToDateInput(rule?.endDate)
  };
}

export function PricingRuleEditor({ mode, initialRule }: PricingRuleEditorProps) {
  const router = useRouter();
  const [form, setForm] = useState<PricingRuleFormState>(() => toPricingRuleFormState(initialRule));
  const [statusMessage, setStatusMessage] = useState(
    mode === "create"
      ? "Crie uma regra para horario de pico, dias da semana ou datas especiais."
      : "Atualize a regra tarifaria selecionada."
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const previewAdjustment = useMemo(() => {
    if (form.adjustmentType === "PERCENT") {
      return `+${Number(form.adjustmentValue || 0)}%`;
    }

    return `+${formatCurrency(Number(form.adjustmentValue || 0))}`;
  }, [form.adjustmentType, form.adjustmentValue]);

  function updateField<Key extends keyof PricingRuleFormState>(field: Key, value: PricingRuleFormState[Key]) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function toggleWeekday(day: string) {
    setForm((current) => {
      const nextDays = current.daysOfWeek.includes(day)
        ? current.daysOfWeek.filter((item) => item !== day)
        : [...current.daysOfWeek, day];

      return {
        ...current,
        daysOfWeek: nextDays
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage(mode === "create" ? "Salvando nova regra tarifaria..." : "Salvando alteracoes...");

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        scheduleType: form.scheduleType,
        adjustmentType: form.adjustmentType,
        adjustmentValue: Number(form.adjustmentValue || 0),
        isActive: form.isActive,
        priority: Number(form.priority || 100),
        daysOfWeek: form.scheduleType === "WEEKLY_WINDOW" ? form.daysOfWeek.join(",") : undefined,
        startMinutes: form.scheduleType === "WEEKLY_WINDOW" && form.startTime ? timeToMinutes(form.startTime) : undefined,
        endMinutes: form.scheduleType === "WEEKLY_WINDOW" && form.endTime ? timeToMinutes(form.endTime) : undefined,
        startDate: form.scheduleType === "DATE_RANGE" ? form.startDate : undefined,
        endDate: form.scheduleType === "DATE_RANGE" ? form.endDate : undefined
      };

      const rule =
        mode === "create"
          ? await request<PricingRule>("/admin/pricing-rules", {
              method: "POST",
              body: JSON.stringify(payload)
            })
          : await request<PricingRule>(`/admin/pricing-rules/${initialRule?.id}`, {
              method: "PATCH",
              body: JSON.stringify(payload)
            });

      setForm(toPricingRuleFormState(rule));
      setStatusMessage(
        mode === "create" ? `Regra ${rule.name} criada com sucesso.` : `Regra ${rule.name} atualizada com sucesso.`
      );

      if (mode === "create") {
        router.push(`/pricing/${rule.id}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao salvar regra tarifaria.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!initialRule) {
      return;
    }

    const confirmed = window.confirm(`Excluir a regra tarifaria "${initialRule.name}"?`);
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setStatusMessage(`Excluindo ${initialRule.name}...`);

    try {
      await request<void>(`/admin/pricing-rules/${initialRule.id}`, {
        method: "DELETE"
      });
      router.push("/pricing");
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao excluir regra tarifaria.");
      setIsDeleting(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Precificacao</p>
          <h1>{mode === "create" ? "Nova regra tarifaria" : form.name || "Editar regra tarifaria"}</h1>
          <p className="helper-text">
            Regras cobrem horario de pico, dias uteis e periodos especiais sem misturar tudo na tarifa base.
          </p>
        </div>

        <div className="status-card">
          <span className="status-label">Resumo</span>
          <strong>{statusMessage}</strong>
          <div className="chips">
            <span className="chip">{form.scheduleType === "WEEKLY_WINDOW" ? "Janela semanal" : "Periodo por data"}</span>
            <span className="chip chip-soft">{previewAdjustment}</span>
            <span className="chip chip-soft">Prioridade {form.priority || "100"}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-single">
        <article className="panel panel-wide">
          <div className="panel-head">
            <h2>{mode === "create" ? "Configuracao da regra" : "Manutencao da regra"}</h2>
            <span>Se duas regras coincidirem, a de maior prioridade vence.</span>
          </div>

          <form className="stack" onSubmit={(event) => void handleSubmit(event)}>
            <div className="form-grid">
              <label>
                Nome da regra
                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Ex.: Pico dias uteis 7h as 9h"
                />
              </label>

              <label>
                Prioridade
                <input
                  type="number"
                  min="0"
                  value={form.priority}
                  onChange={(event) => updateField("priority", event.target.value)}
                  placeholder="100"
                />
              </label>
            </div>

            <label>
              Descricao
              <input
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Explique quando essa regra entra na cotacao."
              />
            </label>

            <div className="form-grid">
              <label>
                Tipo da regra
                <select
                  className="select"
                  value={form.scheduleType}
                  onChange={(event) =>
                    updateField("scheduleType", event.target.value as PricingRuleFormState["scheduleType"])
                  }
                >
                  <option value="WEEKLY_WINDOW">Janela semanal</option>
                  <option value="DATE_RANGE">Periodo por data</option>
                </select>
              </label>

              <label>
                Tipo de ajuste
                <select
                  className="select"
                  value={form.adjustmentType}
                  onChange={(event) =>
                    updateField("adjustmentType", event.target.value as PricingRuleFormState["adjustmentType"])
                  }
                >
                  <option value="FLAT">Acrescimo fixo</option>
                  <option value="PERCENT">Percentual</option>
                </select>
              </label>
            </div>

            <div className="form-grid">
              <label>
                {form.adjustmentType === "PERCENT" ? "Percentual" : "Valor adicional"}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.adjustmentValue}
                  onChange={(event) => updateField("adjustmentValue", event.target.value)}
                  placeholder={form.adjustmentType === "PERCENT" ? "20" : "5,00"}
                />
              </label>

              <label className="toggle-field">
                <span>Regra ativa</span>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => updateField("isActive", event.target.checked)}
                />
              </label>
            </div>

            {form.scheduleType === "WEEKLY_WINDOW" ? (
              <>
                <div className="pricing-rule-days">
                  {weekdayOptions.map((day) => {
                    const isSelected = form.daysOfWeek.includes(day.value);

                    return (
                      <button
                        key={day.value}
                        type="button"
                        className={isSelected ? "pricing-rule-day is-selected" : "pricing-rule-day"}
                        onClick={() => toggleWeekday(day.value)}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>

                <div className="form-grid">
                  <label>
                    Inicio
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(event) => updateField("startTime", event.target.value)}
                    />
                  </label>

                  <label>
                    Fim
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(event) => updateField("endTime", event.target.value)}
                    />
                  </label>
                </div>
              </>
            ) : (
              <div className="form-grid">
                <label>
                  Data inicial
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) => updateField("startDate", event.target.value)}
                  />
                </label>

                <label>
                  Data final
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(event) => updateField("endDate", event.target.value)}
                  />
                </label>
              </div>
            )}

            <div className="toolbar">
              <button type="submit" disabled={isSaving || !form.name.trim()}>
                {isSaving ? "Salvando..." : mode === "create" ? "Salvar regra" : "Salvar alteracoes"}
              </button>

              <Link href="/pricing" className="button-link secondary-link">
                Voltar para lista
              </Link>

              {mode === "edit" ? (
                <button type="button" className="danger" disabled={isDeleting} onClick={() => void handleDelete()}>
                  {isDeleting ? "Excluindo..." : "Excluir regra"}
                </button>
              ) : null}
            </div>
          </form>
        </article>
      </section>
    </main>
  );
}
