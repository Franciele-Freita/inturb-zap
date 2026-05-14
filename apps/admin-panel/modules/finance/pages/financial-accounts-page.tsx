"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  EmptyState,
  FinancePageHeader,
  FinanceSectionCard,
  formatCurrency
} from "../components/finance-shared";
import { financeService } from "../services/finance-service";
import type { FinancialAccount, FinancialAccountType } from "../types/finance";

type FinancialAccountForm = {
  name: string;
  type: FinancialAccountType;
  bank: string;
  branch: string;
  accountNumber: string;
  initialBalance: string;
  isActive: boolean;
};

const defaultForm: FinancialAccountForm = {
  name: "",
  type: "BANK",
  bank: "",
  branch: "",
  accountNumber: "",
  initialBalance: "0",
  isActive: true
};

export function FinancialAccountsPage() {
  return <FinancialAccountsScreen mode="list" />;
}

export function FinancialAccountsCreatePage() {
  return <FinancialAccountsScreen mode="create" />;
}

function FinancialAccountsScreen({ mode }: { mode: "list" | "create" }) {
  const [rows, setRows] = useState<FinancialAccount[]>([]);
  const [form, setForm] = useState<FinancialAccountForm>(defaultForm);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void loadRows();
  }, []);

  async function loadRows() {
    const data = await financeService.listFinancialAccounts();
    setRows(data);
  }

  async function handleCreate() {
    if (!form.name.trim()) {
      setFeedback("Informe o nome da conta financeira.");
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      await financeService.createFinancialAccount({
        name: form.name.trim(),
        type: form.type,
        bank: form.bank.trim() || undefined,
        branch: form.branch.trim() || undefined,
        accountNumber: form.accountNumber.trim() || undefined,
        initialBalance: Number(form.initialBalance || "0"),
        isActive: form.isActive
      });
      setForm(defaultForm);
      await loadRows();
      setFeedback("Conta financeira criada com sucesso.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao criar conta financeira.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <FinancePageHeader
        title="Contas bancarias / caixas"
        subtitle="Cadastro de contas financeiras para movimentacao e conciliacao."
        actions={
          mode === "list" ? (
            <Link href="/financial/accounts/new" className="button-link">
              + Nova conta financeira
            </Link>
          ) : (
            <Link href="/financial/accounts" className="button-link secondary-link">
              Voltar para listagem
            </Link>
          )
        }
      />

      {feedback ? <p className="journey-list-status-message">{feedback}</p> : null}

      <section className="grid grid-single finance-layout-stack">
        {mode === "create" ? (
        <FinanceSectionCard title="Nova conta financeira" subtitle="Banco, caixa fisico, carteira digital ou cartao.">
          <div className="finance-form-grid finance-form-grid-4">
            <label>
              <span>Nome da conta</span>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label>
              <span>Tipo</span>
              <select className="select" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as FinancialAccountType }))}>
                <option value="BANK">Banco</option>
                <option value="CASH_BOX">Caixa fisico</option>
                <option value="DIGITAL_WALLET">Carteira digital</option>
                <option value="CARD">Cartao</option>
                <option value="OTHER">Outro</option>
              </select>
            </label>
            <label>
              <span>Banco</span>
              <input value={form.bank} onChange={(event) => setForm((current) => ({ ...current, bank: event.target.value }))} />
            </label>
            <label>
              <span>Agencia</span>
              <input value={form.branch} onChange={(event) => setForm((current) => ({ ...current, branch: event.target.value }))} />
            </label>
          </div>

          <div className="finance-form-grid finance-form-grid-3">
            <label>
              <span>Conta</span>
              <input value={form.accountNumber} onChange={(event) => setForm((current) => ({ ...current, accountNumber: event.target.value }))} />
            </label>
            <label>
              <span>Saldo inicial</span>
              <input type="number" min="0" step="0.01" value={form.initialBalance} onChange={(event) => setForm((current) => ({ ...current, initialBalance: event.target.value }))} />
            </label>
            <label>
              <span>Status</span>
              <select className="select" value={form.isActive ? "ACTIVE" : "INACTIVE"} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === "ACTIVE" }))}>
                <option value="ACTIVE">Ativa</option>
                <option value="INACTIVE">Inativa</option>
              </select>
            </label>
          </div>

          <div className="timekeeping-adjustments-actions-row">
            <button type="button" className="button-link" onClick={() => void handleCreate()} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Criar conta financeira"}
            </button>
          </div>
        </FinanceSectionCard>
        ) : null}

        {mode === "list" ? (
        <FinanceSectionCard title="Lista de contas financeiras" subtitle={`${rows.length} conta(s) cadastrada(s).`}>
          {rows.length === 0 ? (
            <EmptyState
              title="Nenhuma conta financeira encontrada"
              description="Cadastre contas para controlar caixa e conciliacao."
            />
          ) : (
            <div className="drivers-table-wrap">
              <table className="drivers-table pricing-table cargo-list-table">
                <thead>
                  <tr>
                    <th>Conta</th>
                    <th>Tipo</th>
                    <th>Banco</th>
                    <th>Saldo inicial</th>
                    <th>Saldo atual</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>{row.type}</td>
                      <td>{row.bank || "-"}</td>
                      <td>{formatCurrency(row.initialBalance)}</td>
                      <td>{formatCurrency(row.currentBalance)}</td>
                      <td>{row.isActive ? "Ativa" : "Inativa"}</td>
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
