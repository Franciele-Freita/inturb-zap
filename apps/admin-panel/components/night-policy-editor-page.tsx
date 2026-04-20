"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { OvertimeTemplate, request } from "../lib/api";
import {
  isOvertimeTemplateCategory,
  readNightPolicySnapshot
} from "../lib/overtime-policy-settings";

type Mode = "create" | "edit" | "view";

type Props = {
  mode: Mode;
  policyId?: string;
};

type FormState = {
  name: string;
  description: string;
  isActive: boolean;
  workProfiles: string[];
  nightEnabled: boolean;
  nightStartTime: string;
  nightEndTime: string;
  nightPercent: string;
  nightAccumulatesWithOvertime: boolean;
};

const defaultForm: FormState = {
  name: "",
  description: "",
  isActive: true,
  workProfiles: [],
  nightEnabled: true,
  nightStartTime: "22:00",
  nightEndTime: "05:00",
  nightPercent: "20",
  nightAccumulatesWithOvertime: true
};

export function NightPolicyEditorPage({ mode, policyId }: Props) {
  const router = useRouter();
  const isReadOnly = mode === "view";
  const [form, setForm] = useState<FormState>(defaultForm);
  const [isLoading, setIsLoading] = useState(mode !== "create");
  const [isSaving, setIsSaving] = useState(false);
  const [isCategoryMismatch, setIsCategoryMismatch] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(
    mode === "create" ? null : "Carregando politica."
  );

  useEffect(() => {
    if (mode === "create" || !policyId) return;

    setIsLoading(true);
    void request<OvertimeTemplate>(`/admin/overtime-templates/${policyId}`)
      .then((template) => {
        if (!isOvertimeTemplateCategory(template, "NIGHT")) {
          setStatusMessage("Esta politica pertence ao modulo de hora extra.");
          setIsCategoryMismatch(true);
          return;
        }

        setForm(mapTemplateToForm(template));
        setIsCategoryMismatch(false);
        setStatusMessage(null);
      })
      .catch((error) => setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar politica."))
      .finally(() => setIsLoading(false));
  }, [mode, policyId]);

  const canSave = useMemo(() => {
    if (isReadOnly || isLoading || isSaving || isCategoryMismatch) return false;
    if (form.name.trim().length < 3) return false;
    if (!form.nightEnabled) return true;
    if (!isClock(form.nightStartTime) || !isClock(form.nightEndTime)) return false;
    if ((toNum(form.nightPercent) ?? -1) < 0) return false;
    return true;
  }, [form, isCategoryMismatch, isLoading, isReadOnly, isSaving]);

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
      if (mode === "edit" && policyId) {
        await request(`/admin/overtime-templates/${policyId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await request("/admin/overtime-templates", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      router.push("/administrative/night-policies");
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao salvar.");
      setIsSaving(false);
    }
  }

  const disabled = isReadOnly || isLoading || isSaving;
  const pageTitle =
    mode === "create"
      ? "Cadastrar politica de adicional noturno"
      : mode === "edit"
        ? "Editar politica de adicional noturno"
        : "Visualizar politica de adicional noturno";
  const pageSubtitle = "Configure regras reutilizaveis de adicional noturno por perfil de trabalho.";

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
            <div className="panel-head"><h2>Dados da politica</h2><span>Nome, descricao e status da politica.</span></div>
            <div className="form-grid">
              <label>Nome<input value={form.name} onChange={(event) => update("name", event.target.value)} disabled={disabled} /></label>
            </div>
            <label>Descricao<input value={form.description} onChange={(event) => update("description", event.target.value)} disabled={disabled} /></label>
            <section className="editor-status-block">
              <h3 className="editor-status-title">Configuracao</h3>
              <label className="editor-status-toggle">
                <input type="checkbox" checked={form.isActive} onChange={(event) => update("isActive", event.target.checked)} disabled={disabled} />
                <span>Status ativo</span>
              </label>
            </section>

            <div className="panel-head"><h2>Configuracao de adicional noturno</h2><span>Ativacao, faixa e percentual aplicado.</span></div>
            <div className="form-grid">
              <label className="toggle-field"><span>Ativar adicional noturno</span><input type="checkbox" checked={form.nightEnabled} onChange={(event) => update("nightEnabled", event.target.checked)} disabled={disabled} /></label>
            </div>

            {form.nightEnabled ? (
              <div className="form-grid">
                <label>Inicio da faixa<input type="time" value={form.nightStartTime} onChange={(event) => update("nightStartTime", event.target.value)} disabled={disabled} /></label>
                <label>Fim da faixa<input type="time" value={form.nightEndTime} onChange={(event) => update("nightEndTime", event.target.value)} disabled={disabled} /></label>
                <label>Percentual do adicional<input type="number" min="0" step="0.01" value={form.nightPercent} onChange={(event) => update("nightPercent", event.target.value)} disabled={disabled} /></label>
                <label className="toggle-field"><span>Acumula com hora extra</span><input type="checkbox" checked={form.nightAccumulatesWithOvertime} onChange={(event) => update("nightAccumulatesWithOvertime", event.target.checked)} disabled={disabled} /></label>
              </div>
            ) : (
              <div className="driver-editor-contract-inline-note">
                <strong>Adicional noturno desabilitado</strong>
                <span>A politica sera salva sem regras de adicional noturno.</span>
              </div>
            )}

            <div className="overtime-editor-footer">
              <Link href="/administrative/night-policies" className="button-link secondary-link">Voltar para lista</Link>
              {!isReadOnly ? <button type="submit" disabled={!canSave}>{isSaving ? "Salvando..." : mode === "edit" ? "Salvar alteracoes" : "Salvar politica"}</button> : null}
              {isReadOnly && policyId ? <Link href={`/administrative/night-policies/${policyId}/edit`} className="button-link">Editar politica</Link> : null}
            </div>
          </form>
        </article>
      </section>
    </main>
  );
}

function mapTemplateToForm(template: OvertimeTemplate): FormState {
  const snapshot = readNightPolicySnapshot(template.settings);

  return {
    ...defaultForm,
    name: template.name,
    description: template.description ?? "",
    isActive: template.isActive,
    workProfiles: template.workProfiles,
    nightEnabled: snapshot.enabled,
    nightStartTime: snapshot.startTime,
    nightEndTime: snapshot.endTime,
    nightPercent: String(snapshot.percent),
    nightAccumulatesWithOvertime: snapshot.accumulatesWithOvertime
  };
}

function buildPayload(form: FormState) {
  const nightPercent = toNum(form.nightPercent) ?? 20;

  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    isActive: form.isActive,
    workProfiles: form.workProfiles,
    settings: {
      policyCategory: "NIGHT",
      overtime: {
        enabled: false,
        afterDailyHours: 8,
        afterWeeklyHours: 44,
        destination: "PAYMENT"
      },
      percentages: {
        overtime50: 50,
        overtime100: 100,
        nightAdditionalPercent: nightPercent
      },
      rules: {
        maxExtraHoursPerDay: undefined,
        requiresApproval: false,
        compensateDelayWithOvertime: false,
        toleranceMinutes: 0
      },
      rounding: {
        type: "NEAREST",
        intervalMinutes: 15
      },
      bankHours: {
        enabled: false
      },
      night: {
        enabled: form.nightEnabled,
        startTime: form.nightEnabled ? form.nightStartTime : undefined,
        endTime: form.nightEnabled ? form.nightEndTime : undefined,
        percent: form.nightEnabled ? nightPercent : undefined,
        accumulatesWithOvertime: form.nightEnabled ? form.nightAccumulatesWithOvertime : false
      }
    }
  };
}

function isClock(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim());
}

function toNum(value: string): number | undefined {
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}
