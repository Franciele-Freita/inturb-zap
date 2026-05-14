"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CompanyEmploymentLinkage, CompanyProfileConfig, WorkProfile, request } from "../lib/api";
import {
  buildUsageByLinkageKey,
  clampSortOrder,
  normalizeEmploymentLinkages,
  resolveEmploymentLinkageTitle
} from "../lib/employment-linkages";

type EmploymentLinkageEditorPageProps = {
  linkageId: string;
};

type FormState = {
  label: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
};

export function EmploymentLinkageEditorPage({ linkageId }: EmploymentLinkageEditorPageProps) {
  const router = useRouter();
  const normalizedLinkageId = linkageId.trim().toUpperCase();
  const isValidLinkageKey = isEmploymentLinkageKey(normalizedLinkageId);
  const [allLinkages, setAllLinkages] = useState<CompanyEmploymentLinkage[]>([]);
  const [workProfiles, setWorkProfiles] = useState<WorkProfile[]>([]);
  const [form, setForm] = useState<FormState>({
    label: "",
    description: "",
    sortOrder: 1,
    isActive: true
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    void loadEditorData();
  }, [normalizedLinkageId]);

  async function loadEditorData() {
    setIsLoading(true);
    setNotFound(false);
    try {
      const [profile, profiles] = await Promise.all([
        request<CompanyProfileConfig>("/admin/company-profile"),
        request<WorkProfile[]>("/admin/work-profiles")
      ]);

      const linkages = normalizeEmploymentLinkages(profile.employmentLinkages);
      const current = linkages.find((item) => item.key === normalizedLinkageId);
      if (!current) {
        setNotFound(true);
        setStatusMessage("Vinculo nao encontrado.");
        return;
      }

      setAllLinkages(linkages);
      setWorkProfiles(profiles);
      setForm({
        label: current.label,
        description: current.description ?? "",
        sortOrder: current.sortOrder,
        isActive: current.isActive
      });
      setStatusMessage(null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar dados do vinculo.");
    } finally {
      setIsLoading(false);
    }
  }

  const usageByKey = useMemo(() => buildUsageByLinkageKey(workProfiles), [workProfiles]);
  const currentUsage = useMemo(() => {
    if (!isValidLinkageKey) {
      return 0;
    }
    return usageByKey[normalizedLinkageId];
  }, [isValidLinkageKey, normalizedLinkageId, usageByKey]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading || isSaving || notFound) return;

    setIsSaving(true);
    try {
      const next = allLinkages
        .map((item) =>
          item.key === normalizedLinkageId
            ? {
                ...item,
                label: form.label.trim() || item.label,
                description: form.description.trim() || undefined,
                sortOrder: clampSortOrder(form.sortOrder),
                isActive: form.isActive
              }
            : item
        )
        .sort((left, right) => left.sortOrder - right.sortOrder);

      await request<CompanyProfileConfig>("/admin/company-profile", {
        method: "PATCH",
        body: JSON.stringify({
          employmentLinkages: next.map((item) => ({
            key: item.key,
            label: item.label.trim(),
            description: item.description?.trim(),
            isActive: item.isActive,
            sortOrder: item.sortOrder
          }))
        })
      });

      router.push("/settings/employment-linkages");
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao salvar vinculo.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="page-shell cargo-editor-page-shell">
      <form className="cargo-editor-page" onSubmit={(event) => void onSubmit(event)}>
        <header className="cargo-editor-header">
          <div className="cargo-editor-header-main">
            <h1>Editar vinculo</h1>
          </div>
          <div className="cargo-editor-header-meta">
            <p className="cargo-editor-header-subtitle">
              Ajuste identificacao, descricao e disponibilidade do vinculo trabalhista.
            </p>
          </div>
        </header>

        <section className="cargo-editor-card">
          {statusMessage ? (
            <p className="cargo-editor-alert" role="alert">
              {statusMessage}
            </p>
          ) : null}

          <section className="cargo-editor-section">
            <h2>01. Identificacao</h2>
            <div className="cargo-editor-grid">
              <label className="cargo-editor-field cargo-editor-field-full">
                <span>Nome exibido</span>
                <input
                  value={form.label}
                  onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Ex.: CLT Intermitente"
                  disabled={isLoading || isSaving || notFound}
                />
              </label>

              <label className="cargo-editor-field">
                <span>Codigo tecnico</span>
                <input value={normalizedLinkageId} readOnly />
              </label>

              <label className="cargo-editor-field">
                <span>Ordem de exibicao</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={form.sortOrder}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sortOrder: clampSortOrder(event.target.value) }))
                  }
                  disabled={isLoading || isSaving || notFound}
                />
              </label>

              <label className="cargo-editor-field">
                <span>Status</span>
                <select
                  className="select"
                  value={form.isActive ? "ACTIVE" : "INACTIVE"}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, isActive: event.target.value === "ACTIVE" }))
                  }
                  disabled={isLoading || isSaving || notFound}
                >
                  <option value="ACTIVE">Ativo</option>
                  <option value="INACTIVE">Inativo</option>
                </select>
              </label>

              <label className="cargo-editor-field">
                <span>Perfis vinculados</span>
                <input value={`${currentUsage}`} readOnly />
              </label>
            </div>
          </section>

          <section className="cargo-editor-section">
            <h2>02. Descricao operacional</h2>
            <label className="cargo-editor-field cargo-editor-field-full">
              <span>Descricao</span>
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder={`Resumo do vinculo ${
                  isValidLinkageKey ? resolveEmploymentLinkageTitle(normalizedLinkageId) : ""
                }.`}
                disabled={isLoading || isSaving || notFound}
              />
            </label>
          </section>

          <footer className="cargo-editor-footer">
            <Link href="/settings/employment-linkages" className="button-link secondary-link">
              Voltar
            </Link>
            <button type="submit" disabled={isLoading || isSaving || notFound}>
              {isSaving ? "Salvando..." : "Salvar alteracoes"}
            </button>
          </footer>
        </section>
      </form>
    </main>
  );
}

function isEmploymentLinkageKey(value: string): value is CompanyEmploymentLinkage["key"] {
  return value === "CLT" || value === "CLT_INTERMITENTE" || value === "MEI" || value === "PJ" || value === "AUTONOMO";
}
