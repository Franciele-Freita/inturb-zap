"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import type { AccountsReceivableRecord, FinanceLookupData } from "../types/finance";

type ReceivableForm = {
  clientId: string;
  contractId: string;
  tripId: string;
  description: string;
  categoryId: string;
  costCenterId: string;
  dueDate: string;
  receivedDate: string;
  value: string;
  interest: string;
  discount: string;
  status: AccountsReceivableRecord["status"];
  paymentMethodId: string;
  financialAccountId: string;
  notes: string;
  attachmentName: string;
};

function buildInitialForm(lookups: FinanceLookupData | null): ReceivableForm {
  return {
    clientId: lookups?.clients[0]?.id ?? "",
    contractId: "",
    tripId: "",
    description: "",
    categoryId: lookups?.categories.find((item) => item.type !== "EXPENSE")?.id ?? "",
    costCenterId: lookups?.costCenters[0]?.id ?? "",
    dueDate: "",
    receivedDate: "",
    value: "",
    interest: "0",
    discount: "0",
    status: "OPEN",
    paymentMethodId: lookups?.paymentMethods[0]?.id ?? "",
    financialAccountId: lookups?.financialAccounts[0]?.id ?? "",
    notes: "",
    attachmentName: ""
  };
}

export function AccountsReceivablePage() {
  return <AccountsReceivableScreen mode="list" />;
}

export function AccountsReceivableCreatePage() {
  return <AccountsReceivableScreen mode="create" />;
}

function AccountsReceivableScreen({ mode }: { mode: "list" | "create" }) {
  const [month, setMonth] = useState(todayMonthValue());
  const [status, setStatus] = useState("ALL");
  const [lookups, setLookups] = useState<FinanceLookupData | null>(null);
  const [rows, setRows] = useState<AccountsReceivableRecord[]>([]);
  const [form, setForm] = useState<ReceivableForm>(() => buildInitialForm(null));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void financeService.getLookups().then((data) => {
      setLookups(data);
      setForm((current) => ({
        ...buildInitialForm(data),
        ...current,
        clientId: current.clientId || data.clients[0]?.id || "",
        categoryId: current.categoryId || data.categories.find((item) => item.type !== "EXPENSE")?.id || "",
        costCenterId: current.costCenterId || data.costCenters[0]?.id || "",
        paymentMethodId: current.paymentMethodId || data.paymentMethods[0]?.id || "",
        financialAccountId: current.financialAccountId || data.financialAccounts[0]?.id || ""
      }));
    });
  }, []);

  useEffect(() => {
    void financeService
      .listReceivables({ month, status })
      .then(setRows)
      .catch((error: Error) => setFeedback(error.message));
  }, [month, status]);

  const finalPreview = useMemo(() => {
    const value = Number(form.value || "0");
    const interest = Number(form.interest || "0");
    const discount = Number(form.discount || "0");
    return value + interest - discount;
  }, [form.value, form.interest, form.discount]);

  async function handleCreate() {
    if (!form.clientId || !form.description.trim() || !form.categoryId || !form.costCenterId || !form.dueDate || !form.value) {
      setFeedback("Preencha cliente, descricao, categoria, centro de custo, vencimento e valor.");
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      await financeService.createReceivable({
        clientId: form.clientId,
        contractId: form.contractId || undefined,
        tripId: form.tripId || undefined,
        description: form.description.trim(),
        categoryId: form.categoryId,
        costCenterId: form.costCenterId,
        dueDate: form.dueDate,
        paidOrReceivedDate: form.receivedDate || undefined,
        value: Number(form.value || "0"),
        interest: Number(form.interest || "0"),
        discount: Number(form.discount || "0"),
        status: form.status,
        paymentMethodId: form.paymentMethodId || undefined,
        financialAccountId: form.financialAccountId || undefined,
        notes: form.notes.trim() || undefined,
        attachmentName: form.attachmentName.trim() || undefined
      });
      setFeedback("Conta a receber registrada com sucesso.");
      setForm(buildInitialForm(lookups));
      setRows(await financeService.listReceivables({ month, status }));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao criar conta a receber.");
    } finally {
      setIsSaving(false);
    }
  }

  function resolveClientName(id: string): string {
    return lookups?.clients.find((item) => item.id === id)?.name ?? id;
  }

  function resolveCategoryName(id: string): string {
    return lookups?.categories.find((item) => item.id === id)?.name ?? id;
  }

  function resolveCostCenterName(id: string): string {
    return lookups?.costCenters.find((item) => item.id === id)?.name ?? id;
  }

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <FinancePageHeader
        title="Contas a receber"
        subtitle="Gestao de receitas, cobrancas e recebimentos da operacao."
        actions={
          mode === "list" ? (
            <Link href="/financial/accounts-receivable/new" className="button-link">
              + Nova conta a receber
            </Link>
          ) : (
            <Link href="/financial/accounts-receivable" className="button-link secondary-link">
              Voltar para listagem
            </Link>
          )
        }
      />

      {feedback ? <p className="journey-list-status-message">{feedback}</p> : null}

      <section className="grid grid-single finance-layout-stack">
        {mode === "list" ? (
        <FinanceSectionCard title="Filtros" subtitle="Filtre por competencia e status.">
          <div className="financial-filter-grid finance-module-filters-grid">
            <label>
              <span>Competencia</span>
              <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            </label>
            <label>
              <span>Status</span>
              <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="ALL">Todos</option>
                <option value="OPEN">Aberto</option>
                <option value="RECEIVED">Recebido</option>
                <option value="OVERDUE">Vencido</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </label>
          </div>
        </FinanceSectionCard>
        ) : null}

        {mode === "create" ? (
        <FinanceSectionCard title="Nova conta a receber" subtitle="Cadastro manual de receitas e cobrancas.">
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

          <div className="finance-form-grid finance-form-grid-3">
            <label>
              <span>Descricao</span>
              <input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <label>
              <span>Categoria financeira</span>
              <select className="select" value={form.categoryId} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}>
                {(lookups?.categories ?? [])
                  .filter((item) => item.type !== "EXPENSE")
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <span>Centro de custo</span>
              <select className="select" value={form.costCenterId} onChange={(event) => setForm((current) => ({ ...current, costCenterId: event.target.value }))}>
                {(lookups?.costCenters ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="finance-form-grid finance-form-grid-4">
            <label>
              <span>Vencimento</span>
              <input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} />
            </label>
            <label>
              <span>Data de recebimento</span>
              <input type="date" value={form.receivedDate} onChange={(event) => setForm((current) => ({ ...current, receivedDate: event.target.value }))} />
            </label>
            <label>
              <span>Valor</span>
              <input type="number" min="0" step="0.01" value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} />
            </label>
            <label>
              <span>Status</span>
              <select className="select" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as AccountsReceivableRecord["status"] }))}>
                <option value="OPEN">Aberto</option>
                <option value="RECEIVED">Recebido</option>
                <option value="OVERDUE">Vencido</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </label>
          </div>

          <div className="finance-form-grid finance-form-grid-4">
            <label>
              <span>Juros/multa</span>
              <input type="number" min="0" step="0.01" value={form.interest} onChange={(event) => setForm((current) => ({ ...current, interest: event.target.value }))} />
            </label>
            <label>
              <span>Desconto</span>
              <input type="number" min="0" step="0.01" value={form.discount} onChange={(event) => setForm((current) => ({ ...current, discount: event.target.value }))} />
            </label>
            <label>
              <span>Forma de recebimento</span>
              <select className="select" value={form.paymentMethodId} onChange={(event) => setForm((current) => ({ ...current, paymentMethodId: event.target.value }))}>
                <option value="">Nao informado</option>
                {(lookups?.paymentMethods ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Conta financeira de entrada</span>
              <select className="select" value={form.financialAccountId} onChange={(event) => setForm((current) => ({ ...current, financialAccountId: event.target.value }))}>
                <option value="">Nao informado</option>
                {(lookups?.financialAccounts ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="finance-form-grid finance-form-grid-2">
            <label>
              <span>Observacoes</span>
              <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} />
            </label>
            <div className="finance-form-grid finance-form-grid-1">
              <label>
                <span>Comprovante</span>
                <input value={form.attachmentName} onChange={(event) => setForm((current) => ({ ...current, attachmentName: event.target.value }))} placeholder="comprovante.pdf" />
              </label>
              <article className="panel panel-soft finance-inline-summary-card">
                <span>Valor final previsto</span>
                <strong>{formatCurrency(finalPreview)}</strong>
              </article>
            </div>
          </div>

          <div className="timekeeping-adjustments-actions-row">
            <button type="button" className="button-link" onClick={() => void handleCreate()} disabled={isSaving}>
              {isSaving ? "Registrando..." : "Registrar conta a receber"}
            </button>
          </div>
        </FinanceSectionCard>
        ) : null}

        {mode === "list" ? (
        <FinanceSectionCard title="Lista de contas a receber" subtitle={`${rows.length} registro(s) encontrado(s).`}>
          {rows.length === 0 ? (
            <EmptyState
              title="Nenhuma conta a receber encontrada"
              description="Cadastre uma receita para iniciar o controle de recebimentos."
            />
          ) : (
            <div className="drivers-table-wrap">
              <table className="drivers-table pricing-table cargo-list-table">
                <thead>
                  <tr>
                    <th>Descricao</th>
                    <th>Cliente</th>
                    <th>Categoria</th>
                    <th>Centro de custo</th>
                    <th>Vencimento</th>
                    <th>Valor final</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.description}</td>
                      <td>{resolveClientName(row.clientId)}</td>
                      <td>{resolveCategoryName(row.categoryId)}</td>
                      <td>{resolveCostCenterName(row.costCenterId)}</td>
                      <td>{formatDate(row.dueDate)}</td>
                      <td>{formatCurrency(row.finalValue)}</td>
                      <td>
                        <FinancialStatusBadge status={row.status} />
                      </td>
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
