"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  EmptyState,
  FinancePageHeader,
  FinanceSectionCard
} from "../components/finance-shared";
import { financeService } from "../services/finance-service";
import type { FinancialCategory, FinancialCategoryType } from "../types/finance";

type CategoryForm = {
  name: string;
  type: FinancialCategoryType;
  color: string;
  icon: string;
  isActive: boolean;
};

const defaultForm: CategoryForm = {
  name: "",
  type: "EXPENSE",
  color: "#1D4ED8",
  icon: "wallet",
  isActive: true
};

export function FinancialCategoriesPage() {
  return <FinancialCategoriesScreen mode="list" />;
}

export function FinancialCategoriesCreatePage() {
  return <FinancialCategoriesScreen mode="create" />;
}

function FinancialCategoriesScreen({ mode }: { mode: "list" | "create" }) {
  const [rows, setRows] = useState<FinancialCategory[]>([]);
  const [form, setForm] = useState<CategoryForm>(defaultForm);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void loadRows();
  }, []);

  async function loadRows() {
    const data = await financeService.listCategories();
    setRows(data);
  }

  async function handleCreate() {
    if (!form.name.trim()) {
      setFeedback("Informe o nome da categoria.");
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      await financeService.createCategory({
        name: form.name.trim(),
        type: form.type,
        color: form.color,
        icon: form.icon.trim() || "wallet",
        isActive: form.isActive
      });
      setForm(defaultForm);
      await loadRows();
      setFeedback("Categoria financeira criada com sucesso.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao criar categoria.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <FinancePageHeader
        title="Categorias financeiras"
        subtitle="Classifique receitas e despesas para analise gerencial."
        actions={
          mode === "list" ? (
            <Link href="/financial/categories/new" className="button-link">
              + Nova categoria
            </Link>
          ) : (
            <Link href="/financial/categories" className="button-link secondary-link">
              Voltar para listagem
            </Link>
          )
        }
      />

      {feedback ? <p className="journey-list-status-message">{feedback}</p> : null}

      <section className="grid grid-single finance-layout-stack">
        {mode === "create" ? (
        <FinanceSectionCard title="Nova categoria" subtitle="Cadastro rapido de categoria financeira.">
          <div className="finance-form-grid finance-form-grid-4">
            <label>
              <span>Nome</span>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label>
              <span>Tipo</span>
              <select className="select" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as FinancialCategoryType }))}>
                <option value="REVENUE">Receita</option>
                <option value="EXPENSE">Despesa</option>
                <option value="BOTH">Ambos</option>
              </select>
            </label>
            <label>
              <span>Cor</span>
              <input value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} />
            </label>
            <label>
              <span>Icone</span>
              <input value={form.icon} onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))} />
            </label>
          </div>

          <div className="timekeeping-adjustments-actions-row">
            <button type="button" className="button-link" onClick={() => void handleCreate()} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Criar categoria"}
            </button>
          </div>
        </FinanceSectionCard>
        ) : null}

        {mode === "list" ? (
        <FinanceSectionCard title="Lista de categorias" subtitle={`${rows.length} categoria(s) cadastrada(s).`}>
          {rows.length === 0 ? (
            <EmptyState
              title="Nenhuma categoria cadastrada"
              description="Cadastre categorias para organizar receitas e despesas."
            />
          ) : (
            <div className="drivers-table-wrap">
              <table className="drivers-table pricing-table cargo-list-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>Cor</th>
                    <th>Icone</th>
                    <th>Status</th>
                    <th>ID</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>{row.type}</td>
                      <td>
                        <span className="finance-color-chip" style={{ background: row.color }} />
                        {row.color}
                      </td>
                      <td>{row.icon}</td>
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
