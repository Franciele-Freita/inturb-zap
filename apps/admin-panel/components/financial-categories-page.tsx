"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ADMIN_SESSION_UPDATED_EVENT, getStoredAdminSession, type AdminSession } from "../lib/admin-auth";
import { FinancialCategory, request } from "../lib/api";
import { validateFinancialCategoryDraft } from "../lib/financial-validation";
import { resolveTimekeepingAccess } from "../lib/timekeeping-access";

type CategoryForm = {
  code: string;
  name: string;
  type: FinancialCategory["type"];
  color: string;
  icon: string;
  sortOrder: string;
  isActive: boolean;
};

const defaultForm: CategoryForm = {
  code: "",
  name: "",
  type: "EXPENSE",
  color: "#1D4ED8",
  icon: "wallet",
  sortOrder: "100",
  isActive: true
};

export function FinancialCategoriesPage() {
  return <FinancialCategoriesScreen mode="list" />;
}

export function FinancialCategoriesCreatePage() {
  return <FinancialCategoriesScreen mode="create" />;
}

function FinancialCategoriesScreen({ mode }: { mode: "list" | "create" }) {
  const searchParams = useSearchParams();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [rows, setRows] = useState<FinancialCategory[]>([]);
  const [form, setForm] = useState<CategoryForm>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const access = resolveTimekeepingAccess(session);

  useEffect(() => {
    function syncSession() {
      setSession(getStoredAdminSession());
    }
    syncSession();
    window.addEventListener(ADMIN_SESSION_UPDATED_EVENT, syncSession);
    return () => {
      window.removeEventListener(ADMIN_SESSION_UPDATED_EVENT, syncSession);
    };
  }, []);

  useEffect(() => {
    if (!access.canOperate) return;
    void loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access.canOperate]);

  useEffect(() => {
    if (mode !== "create") return;
    const editId = searchParams.get("id");
    if (!editId || editingId || rows.length === 0) return;
    const found = rows.find((item) => item.id === editId);
    if (found) {
      startEdit(found);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, rows, editingId, searchParams]);

  async function loadRows() {
    const data = await request<FinancialCategory[]>("/admin/financial/categories");
    setRows(data);
  }

  function startEdit(category: FinancialCategory) {
    setEditingId(category.id);
    setForm({
      code: category.code,
      name: category.name,
      type: category.type,
      color: category.color ?? "",
      icon: category.icon ?? "",
      sortOrder: String(category.sortOrder),
      isActive: category.isActive
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(defaultForm);
  }

  async function handleSave() {
    if (!access.canReview) {
      setFeedback("Somente ADMIN pode alterar categorias financeiras.");
      return;
    }

    const validation = validateFinancialCategoryDraft(form);
    if (!validation.ok) {
      setFeedback(validation.errors.join(" "));
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    const payload = validation.value;

    try {
      if (editingId) {
        await request<FinancialCategory>(`/admin/financial/categories/${encodeURIComponent(editingId)}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        setFeedback("Categoria atualizada com sucesso.");
      } else {
        await request<FinancialCategory>("/admin/financial/categories", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        setFeedback("Categoria criada com sucesso.");
      }
      resetForm();
      await loadRows();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao salvar categoria.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDisable(category: FinancialCategory) {
    if (!access.canReview) {
      setFeedback("Somente ADMIN pode inativar categorias.");
      return;
    }

    setFeedback(null);
    try {
      await request<void>(`/admin/financial/categories/${encodeURIComponent(category.id)}`, {
        method: "DELETE"
      });
      await loadRows();
      setFeedback("Categoria inativada com sucesso.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao inativar categoria.");
    }
  }

  if (!access.canOperate) {
    return (
      <main className="page-shell page-shell-wide cargo-list-page-shell">
        <section className="panel panel-wide">
          <h1>Categorias financeiras</h1>
          <p>Seu perfil atual nao possui permissao para visualizar este modulo.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <section className="cargo-list-page-header">
        <div className="cargo-list-page-header-copy">
          <h1>Categorias financeiras</h1>
          <p>Catalogo configuravel para classificar transacoes e relatorios financeiros.</p>
        </div>
        <div className="cargo-list-page-header-actions">
          {mode === "list" ? (
            <Link href="/financial/categories/new" className="button-link">+ Nova categoria</Link>
          ) : (
            <Link href="/financial/categories" className="button-link secondary-link">Voltar para listagem</Link>
          )}
        </div>
      </section>

      {feedback ? <p className="journey-list-status-message">{feedback}</p> : null}

      <section className="grid grid-single finance-layout-stack">
        {mode === "create" ? (
          <article className="panel panel-wide finance-module-card">
            <div className="panel-head finance-module-card-head">
              <h2>{editingId ? "Editar categoria" : "Nova categoria"}</h2>
              <span>Defina codigo, nome e comportamento da categoria.</span>
            </div>
            <div className="finance-form-grid finance-form-grid-4">
              <label>
                <span>Codigo</span>
                <input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} />
              </label>
              <label>
                <span>Nome</span>
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label>
                <span>Tipo</span>
                <select className="select" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as FinancialCategory["type"] }))}>
                  <option value="REVENUE">Receita</option>
                  <option value="EXPENSE">Despesa</option>
                  <option value="BOTH">Ambos</option>
                </select>
              </label>
              <label>
                <span>Ordem</span>
                <input value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))} />
              </label>
            </div>
            <div className="finance-form-grid finance-form-grid-3">
              <label>
                <span>Cor</span>
                <input value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} />
              </label>
              <label>
                <span>Icone</span>
                <input value={form.icon} onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))} />
              </label>
              <label>
                <span>Status</span>
                <select className="select" value={form.isActive ? "ACTIVE" : "INACTIVE"} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === "ACTIVE" }))}>
                  <option value="ACTIVE">Ativo</option>
                  <option value="INACTIVE">Inativo</option>
                </select>
              </label>
            </div>
            <div className="timekeeping-adjustments-actions-row">
              <button type="button" className="secondary" onClick={resetForm}>Limpar</button>
              <button type="button" onClick={() => void handleSave()} disabled={isSaving}>
                {isSaving ? "Salvando..." : editingId ? "Salvar categoria" : "Criar categoria"}
              </button>
            </div>
          </article>
        ) : null}

        <article className="panel panel-wide finance-module-card">
          <div className="panel-head finance-module-card-head">
            <h2>Lista de categorias</h2>
            <span>{rows.length} categoria(s) configurada(s).</span>
          </div>
          {rows.length === 0 ? (
            <p className="helper-text">Nenhuma categoria financeira cadastrada.</p>
          ) : (
            <table className="drivers-table">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Cor</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.code}</td>
                    <td>{row.name}</td>
                    <td>{row.type}</td>
                    <td>
                      <span className="finance-color-chip" style={{ background: row.color ?? "#dbe3f4" }} />
                      {row.color ?? "-"}
                    </td>
                    <td>
                      <span className={`timekeeping-badge ${row.isActive ? "badge-success" : "badge-neutral"}`}>
                        {row.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        {mode === "create" ? (
                          <button type="button" className="secondary" onClick={() => startEdit(row)}>
                            Editar
                          </button>
                        ) : (
                          <Link href={`/financial/categories/new?id=${encodeURIComponent(row.id)}`} className="button-link secondary-link">
                            Abrir editor
                          </Link>
                        )}
                        <button type="button" className="secondary" onClick={() => void handleDisable(row)} disabled={!row.isActive}>
                          Inativar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
      </section>
    </main>
  );
}
