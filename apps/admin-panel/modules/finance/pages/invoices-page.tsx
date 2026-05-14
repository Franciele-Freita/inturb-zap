"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  EmptyState,
  FinancePageHeader,
  FinanceSectionCard,
  FinancialStatusBadge,
  formatCurrency,
  formatDate,
  todayMonthValue
} from "../components/finance-shared";
import { financeService } from "../services/finance-service";
import type { FinanceLookupData, InvoiceRecord } from "../types/finance";

type InvoiceForm = {
  clientId: string;
  contractId: string;
  tripId: string;
  description: string;
  value: string;
  dueDate: string;
  status: InvoiceRecord["status"];
  paymentLink: string;
  notes: string;
};

function buildInitialForm(lookups: FinanceLookupData | null): InvoiceForm {
  return {
    clientId: lookups?.clients[0]?.id ?? "",
    contractId: "",
    tripId: "",
    description: "",
    value: "",
    dueDate: "",
    status: "OPEN",
    paymentLink: "",
    notes: ""
  };
}

export function InvoicesPage() {
  return <InvoicesScreen mode="list" />;
}

export function InvoicesCreatePage() {
  return <InvoicesScreen mode="create" />;
}

function InvoicesScreen({ mode }: { mode: "list" | "create" }) {
  const [month, setMonth] = useState(todayMonthValue());
  const [status, setStatus] = useState("ALL");
  const [rows, setRows] = useState<InvoiceRecord[]>([]);
  const [lookups, setLookups] = useState<FinanceLookupData | null>(null);
  const [form, setForm] = useState<InvoiceForm>(() => buildInitialForm(null));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void financeService.getLookups().then((data) => {
      setLookups(data);
      setForm((current) => ({ ...buildInitialForm(data), ...current, clientId: current.clientId || data.clients[0]?.id || "" }));
    });
  }, []);

  useEffect(() => {
    void loadRows();
  }, [month, status]);

  async function loadRows() {
    try {
      const data = await financeService.listInvoices({ month, status });
      setRows(data);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao carregar faturas.");
    }
  }

  async function handleCreate() {
    if (!form.clientId || !form.description.trim() || !form.value || !form.dueDate) {
      setFeedback("Preencha cliente, descricao, valor e vencimento.");
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      await financeService.createInvoice({
        clientId: form.clientId,
        contractId: form.contractId || undefined,
        tripId: form.tripId || undefined,
        description: form.description.trim(),
        value: Number(form.value || "0"),
        dueDate: form.dueDate,
        status: form.status,
        paymentLink: form.paymentLink.trim() || undefined,
        notes: form.notes.trim() || undefined
      });
      setForm(buildInitialForm(lookups));
      await loadRows();
      setFeedback("Fatura/cobranca criada com sucesso.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao criar fatura.");
    } finally {
      setSaving(false);
    }
  }

  function clientName(clientId: string): string {
    return lookups?.clients.find((item) => item.id === clientId)?.name ?? clientId;
  }

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <FinancePageHeader
        title="Faturas / cobrancas"
        subtitle="Gere e acompanhe cobrancas de contratos e viagens."
        actions={
          mode === "list" ? (
            <Link href="/financial/invoices/new" className="button-link">
              + Nova fatura
            </Link>
          ) : (
            <Link href="/financial/invoices" className="button-link secondary-link">
              Voltar para listagem
            </Link>
          )
        }
      />

      {feedback ? <p className="journey-list-status-message">{feedback}</p> : null}

      <section className="grid grid-single finance-layout-stack">
        {mode === "create" ? (
        <FinanceSectionCard title="Nova fatura" subtitle="Cadastro de cobranca para cliente.">
          <div className="finance-form-grid finance-form-grid-3">
            <label>
              <span>Cliente</span>
              <select className="select" value={form.clientId} onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value }))}>
                {(lookups?.clients ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Contrato</span>
              <select className="select" value={form.contractId} onChange={(event) => setForm((current) => ({ ...current, contractId: event.target.value }))}>
                <option value="">Sem vinculo</option>
                {(lookups?.contracts ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Viagem</span>
              <select className="select" value={form.tripId} onChange={(event) => setForm((current) => ({ ...current, tripId: event.target.value }))}>
                <option value="">Sem vinculo</option>
                {(lookups?.trips ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="finance-form-grid finance-form-grid-4">
            <label>
              <span>Descricao</span>
              <input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <label>
              <span>Valor</span>
              <input type="number" min="0" step="0.01" value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} />
            </label>
            <label>
              <span>Vencimento</span>
              <input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} />
            </label>
            <label>
              <span>Status</span>
              <select className="select" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as InvoiceRecord["status"] }))}>
                <option value="OPEN">Aberta</option>
                <option value="PAID">Paga</option>
                <option value="OVERDUE">Vencida</option>
                <option value="CANCELLED">Cancelada</option>
              </select>
            </label>
          </div>

          <div className="finance-form-grid finance-form-grid-2">
            <label>
              <span>Link de pagamento (opcional)</span>
              <input value={form.paymentLink} onChange={(event) => setForm((current) => ({ ...current, paymentLink: event.target.value }))} />
            </label>
            <label>
              <span>Observacoes</span>
              <input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            </label>
          </div>

          <div className="timekeeping-adjustments-actions-row">
            <button type="button" className="button-link" onClick={() => void handleCreate()} disabled={saving}>
              {saving ? "Salvando..." : "Criar fatura"}
            </button>
          </div>
        </FinanceSectionCard>
        ) : null}

        {mode === "list" ? (
        <FinanceSectionCard title="Lista de faturas" subtitle={`${rows.length} cobranca(s) encontrada(s).`}>
          {rows.length === 0 ? (
            <EmptyState
              title="Nenhuma fatura para o periodo"
              description="Crie uma cobranca para iniciar o acompanhamento."
            />
          ) : (
            <div className="drivers-table-wrap">
              <table className="drivers-table pricing-table cargo-list-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Descricao</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Link de pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{clientName(row.clientId)}</td>
                      <td>{row.description}</td>
                      <td>{formatDate(row.dueDate)}</td>
                      <td>{formatCurrency(row.value)}</td>
                      <td>
                        <FinancialStatusBadge status={row.status} />
                      </td>
                      <td>{row.paymentLink || "-"}</td>
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
