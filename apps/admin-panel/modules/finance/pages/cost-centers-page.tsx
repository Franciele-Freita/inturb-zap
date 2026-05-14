"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  EmptyState,
  FinancePageHeader,
  FinanceSectionCard
} from "../components/finance-shared";
import { financeService } from "../services/finance-service";
import type { CostCenter } from "../types/finance";

type CostCenterForm = {
  name: string;
  description: string;
  owner: string;
  isActive: boolean;
};

const defaultForm: CostCenterForm = {
  name: "",
  description: "",
  owner: "",
  isActive: true
};

export function CostCentersPage() {
  return <CostCentersScreen mode="list" />;
}

export function CostCentersCreatePage() {
  return <CostCentersScreen mode="create" />;
}

function CostCentersScreen({ mode }: { mode: "list" | "create" }) {
  const [rows, setRows] = useState<CostCenter[]>([]);
  const [form, setForm] = useState<CostCenterForm>(defaultForm);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void loadRows();
  }, []);

  async function loadRows() {
    const data = await financeService.listCostCenters();
    setRows(data);
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.description.trim()) {
      setFeedback("Informe nome e descricao do centro de custo.");
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      await financeService.createCostCenter({
        name: form.name.trim(),
        description: form.description.trim(),
        owner: form.owner.trim() || undefined,
        isActive: form.isActive
      });
      setForm(defaultForm);
      await loadRows();
      setFeedback("Centro de custo criado com sucesso.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao criar centro de custo.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <FinancePageHeader
        title="Centros de custo"
        subtitle="Agrupe despesas e receitas por area da operacao."
        actions={
          mode === "list" ? (
            <Link href="/financial/cost-centers/new" className="button-link">
              + Novo centro de custo
            </Link>
          ) : (
            <Link href="/financial/cost-centers" className="button-link secondary-link">
              Voltar para listagem
            </Link>
          )
        }
      />

      {feedback ? <p className="journey-list-status-message">{feedback}</p> : null}

      <section className="grid grid-single finance-layout-stack">
        {mode === "create" ? (
        <FinanceSectionCard title="Novo centro de custo" subtitle="Cadastro para rateio e analise de resultados.">
          <div className="finance-form-grid finance-form-grid-3">
            <label>
              <span>Nome</span>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label>
              <span>Descricao</span>
              <input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <label>
              <span>Responsavel (opcional)</span>
              <input value={form.owner} onChange={(event) => setForm((current) => ({ ...current, owner: event.target.value }))} />
            </label>
          </div>

          <div className="timekeeping-adjustments-actions-row">
            <button type="button" className="button-link" onClick={() => void handleCreate()} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Criar centro de custo"}
            </button>
          </div>
        </FinanceSectionCard>
        ) : null}

        {mode === "list" ? (
        <FinanceSectionCard title="Lista de centros de custo" subtitle={`${rows.length} item(ns) cadastrados.`}>
          {rows.length === 0 ? (
            <EmptyState
              title="Nenhum centro de custo encontrado"
              description="Cadastre centros para organizar a estrutura financeira."
            />
          ) : (
            <div className="drivers-table-wrap">
              <table className="drivers-table pricing-table cargo-list-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Descricao</th>
                    <th>Responsavel</th>
                    <th>Status</th>
                    <th>ID</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>{row.description}</td>
                      <td>{row.owner || "-"}</td>
                      <td>{row.isActive ? "Ativo" : "Inativo"}</td>
                      <td>{row.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </FinanceSectionCard>
        ) : null}
      </section>
    </main>
  );
}
