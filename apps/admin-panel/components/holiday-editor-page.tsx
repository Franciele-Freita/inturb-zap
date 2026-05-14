"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Holiday, HolidayScopeType, request } from "../lib/api";

type Mode = "create" | "edit" | "view";

type Props = {
  mode: Mode;
  holidayId?: string;
};

type FormState = {
  name: string;
  date: string;
  scopeType: HolidayScopeType;
  stateCode: string;
  cityCode: string;
  isActive: boolean;
};

const defaultForm: FormState = {
  name: "",
  date: "",
  scopeType: "NATIONAL",
  stateCode: "",
  cityCode: "",
  isActive: true
};

export function HolidayEditorPage({ mode, holidayId }: Props) {
  const router = useRouter();
  const isReadOnly = mode === "view";
  const [form, setForm] = useState<FormState>(defaultForm);
  const [isLoading, setIsLoading] = useState(mode !== "create");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(
    mode === "create" ? null : "Carregando feriado."
  );

  useEffect(() => {
    if (mode === "create" || !holidayId) return;

    setIsLoading(true);
    void request<Holiday>(`/admin/holidays/${holidayId}`)
      .then((holiday) => {
        setForm(mapHolidayToForm(holiday));
        setStatusMessage(null);
      })
      .catch((error) =>
        setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar feriado.")
      )
      .finally(() => setIsLoading(false));
  }, [mode, holidayId]);

  const canSave = useMemo(() => {
    if (isReadOnly || isLoading || isSaving) return false;
    if (form.name.trim().length < 3) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return false;
    if (form.scopeType === "STATE" && form.stateCode.trim().length !== 2) return false;
    if (form.scopeType === "CITY") {
      if (form.stateCode.trim().length !== 2) return false;
      if (form.cityCode.trim().length < 2) return false;
    }
    return true;
  }, [form, isLoading, isReadOnly, isSaving]);

  function update<Key extends keyof FormState>(field: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave || isReadOnly) return;

    setIsSaving(true);
    setStatusMessage("Salvando feriado...");

    try {
      const payload = buildPayload(form);
      if (mode === "edit" && holidayId) {
        await request(`/admin/holidays/${holidayId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await request("/admin/holidays", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      router.push("/administrative/holidays");
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao salvar.");
      setIsSaving(false);
    }
  }

  const disabled = isReadOnly || isLoading || isSaving;
  const pageTitle =
    mode === "create"
      ? "Cadastrar feriado"
      : mode === "edit"
        ? "Editar feriado"
        : "Visualizar feriado";
  const pageSubtitle = "Defina data, escopo e localizacao do feriado para uso nas regras da operacao.";

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
            <div className="panel-head">
              <h2>Dados do feriado</h2>
              <span>Nome, data, abrangencia e status.</span>
            </div>

            <div className="form-grid">
              <label>
                Nome
                <input
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  disabled={disabled}
                  placeholder="Ex.: Aniversario da cidade"
                />
              </label>

              <label>
                Data
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => update("date", event.target.value)}
                  disabled={disabled}
                />
              </label>
            </div>

            <div className="form-grid">
              <label>
                Escopo
                <select
                  className="select"
                  value={form.scopeType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      scopeType: event.target.value as HolidayScopeType,
                      stateCode:
                        event.target.value === "STATE" || event.target.value === "CITY"
                          ? current.stateCode
                          : "",
                      cityCode: event.target.value === "CITY" ? current.cityCode : ""
                    }))
                  }
                  disabled={disabled}
                >
                  <option value="NATIONAL">Nacional</option>
                  <option value="STATE">Estadual</option>
                  <option value="CITY">Municipal</option>
                </select>
              </label>

              {form.scopeType === "STATE" || form.scopeType === "CITY" ? (
                <label>
                  UF
                  <input
                    value={form.stateCode}
                    onChange={(event) => update("stateCode", event.target.value.toUpperCase())}
                    maxLength={2}
                    disabled={disabled}
                    placeholder="SP"
                  />
                </label>
              ) : null}

              {form.scopeType === "CITY" ? (
                <label>
                  Cidade
                  <input
                    value={form.cityCode}
                    onChange={(event) => update("cityCode", event.target.value)}
                    disabled={disabled}
                    placeholder="Sao Paulo"
                  />
                </label>
              ) : null}
            </div>

            <section className="editor-status-block">
              <h3 className="editor-status-title">Configuracao</h3>
              <label className="editor-status-toggle">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => update("isActive", event.target.checked)}
                  disabled={disabled}
                />
                <span>Status ativo</span>
              </label>
            </section>

            <div className="driver-editor-contract-inline-note">
              <strong>Resumo</strong>
              <span>
                {resolveHolidayScopeLabel(form.scopeType)} | {resolveHolidayLocation(form.scopeType, form.stateCode, form.cityCode)} |{" "}
                {form.date || "Data pendente"}
              </span>
            </div>

            <div className="overtime-editor-footer">
              <Link href="/administrative/holidays" className="button-link secondary-link">
                Voltar para lista
              </Link>
              {!isReadOnly ? (
                <button type="submit" disabled={!canSave}>
                  {isSaving ? "Salvando..." : mode === "edit" ? "Salvar alteracoes" : "Salvar feriado"}
                </button>
              ) : null}
              {isReadOnly && holidayId ? (
                <Link href={`/administrative/holidays/${holidayId}/edit`} className="button-link">
                  Editar feriado
                </Link>
              ) : null}
            </div>
          </form>
        </article>
      </section>
    </main>
  );
}

function mapHolidayToForm(holiday: Holiday): FormState {
  return {
    ...defaultForm,
    name: holiday.name,
    date: holiday.date,
    scopeType: holiday.scopeType,
    stateCode: holiday.stateCode ?? "",
    cityCode: holiday.cityCode ?? "",
    isActive: holiday.isActive
  };
}

function buildPayload(form: FormState) {
  const scopeType = form.scopeType;
  const stateCode =
    scopeType === "STATE" || scopeType === "CITY" ? form.stateCode.trim().toUpperCase() || undefined : undefined;
  const cityCode = scopeType === "CITY" ? form.cityCode.trim() || undefined : undefined;

  return {
    name: form.name.trim(),
    date: form.date,
    scopeType,
    stateCode,
    cityCode,
    isActive: form.isActive
  };
}

function resolveHolidayScopeLabel(scopeType: HolidayScopeType): string {
  if (scopeType === "CITY") return "Municipal";
  if (scopeType === "STATE") return "Estadual";
  return "Nacional";
}

function resolveHolidayLocation(scopeType: HolidayScopeType, stateCode?: string, cityCode?: string): string {
  if (scopeType === "CITY") {
    return `${cityCode?.trim() || "cidade"} - ${stateCode?.trim().toUpperCase() || "UF"}`;
  }
  if (scopeType === "STATE") {
    return stateCode?.trim().toUpperCase() || "UF";
  }
  return "Brasil";
}

