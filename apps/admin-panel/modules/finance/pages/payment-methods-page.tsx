"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  EmptyState,
  FinancePageHeader,
  FinanceSectionCard
} from "../components/finance-shared";
import { financeService } from "../services/finance-service";
import type { PaymentMethod, PaymentMethodType } from "../types/finance";

type PaymentMethodForm = {
  name: string;
  type: PaymentMethodType;
  isActive: boolean;
};

const defaultForm: PaymentMethodForm = {
  name: "",
  type: "PIX",
  isActive: true
};

export function PaymentMethodsPage() {
  return <PaymentMethodsScreen mode="list" />;
}

export function PaymentMethodsCreatePage() {
  return <PaymentMethodsScreen mode="create" />;
}

function PaymentMethodsScreen({ mode }: { mode: "list" | "create" }) {
  const [rows, setRows] = useState<PaymentMethod[]>([]);
  const [form, setForm] = useState<PaymentMethodForm>(defaultForm);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void loadRows();
  }, []);

  async function loadRows() {
    const data = await financeService.listPaymentMethods();
    setRows(data);
  }

  async function handleCreate() {
    if (!form.name.trim()) {
      setFeedback("Informe o nome da forma de pagamento.");
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      await financeService.createPaymentMethod({
        name: form.name.trim(),
        type: form.type,
        isActive: form.isActive
      });
      setForm(defaultForm);
      await loadRows();
      setFeedback("Forma de pagamento criada com sucesso.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao criar forma de pagamento.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <FinancePageHeader
        title="Formas de pagamento"
        subtitle="Padronize os meios de pagamento e recebimento da operacao."
        actions={
          mode === "list" ? (
            <Link href="/financial/payment-methods/new" className="button-link">
              + Nova forma de pagamento
            </Link>
          ) : (
            <Link href="/financial/payment-methods" className="button-link secondary-link">
              Voltar para listagem
            </Link>
          )
        }
      />

      {feedback ? <p className="journey-list-status-message">{feedback}</p> : null}

      <section className="grid grid-single finance-layout-stack">
        {mode === "create" ? (
        <FinanceSectionCard title="Nova forma de pagamento" subtitle="Cadastro de metodo financeiro reutilizavel.">
          <div className="finance-form-grid finance-form-grid-3">
            <label>
              <span>Nome</span>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label>
              <span>Tipo</span>
              <select className="select" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as PaymentMethodType }))}>
                <option value="CASH">Dinheiro</option>
                <option value="PIX">PIX</option>
                <option value="CARD">Cartao</option>
                <option value="BOLETO">Boleto</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="AUTO_DEBIT">Debito automatico</option>
                <option value="OTHER">Outro</option>
              </select>
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
            <button type="button" className="button-link" onClick={() => void handleCreate()} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Criar forma de pagamento"}
            </button>
          </div>
        </FinanceSectionCard>
        ) : null}

        {mode === "list" ? (
        <FinanceSectionCard title="Lista de formas de pagamento" subtitle={`${rows.length} item(ns) cadastrados.`}>
          {rows.length === 0 ? (
            <EmptyState
              title="Nenhuma forma de pagamento encontrada"
              description="Cadastre ao menos uma forma para usar em contas a pagar e receber."
            />
          ) : (
            <div className="drivers-table-wrap">
              <table className="drivers-table pricing-table cargo-list-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>Status</th>
                    <th>ID</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>{row.type}</td>
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
