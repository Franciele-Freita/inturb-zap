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
import type { AccountsPayableRecord, FinanceLookupData } from "../types/finance";

type PayableForm = {
  description: string;
  supplierName: string;
  categoryId: string;
  costCenterId: string;
  dueDate: string;
  paidDate: string;
  value: string;
  interest: string;
  discount: string;
  status: AccountsPayableRecord["status"];
  paymentMethodId: string;
  financialAccountId: string;
  driverId: string;
  vehicleId: string;
  tripId: string;
  contractId: string;
  notes: string;
  attachmentName: string;
};

function buildInitialForm(lookups: FinanceLookupData | null): PayableForm {
  return {
    description: "",
    supplierName: "",
    categoryId: lookups?.categories.find((item) => item.type !== "REVENUE")?.id ?? "",
    costCenterId: lookups?.costCenters[0]?.id ?? "",
    dueDate: "",
    paidDate: "",
    value: "",
    interest: "0",
    discount: "0",
    status: "OPEN",
    paymentMethodId: lookups?.paymentMethods[0]?.id ?? "",
    financialAccountId: lookups?.financialAccounts[0]?.id ?? "",
    driverId: "",
    vehicleId: "",
    tripId: "",
    contractId: "",
    notes: "",
    attachmentName: ""
  };
}

export function AccountsPayablePage() {
  return <AccountsPayableScreen mode="list" />;
}

export function AccountsPayableCreatePage() {
  return <AccountsPayableScreen mode="create" />;
}

function AccountsPayableScreen({ mode }: { mode: "list" | "create" }) {
  const [month, setMonth] = useState(todayMonthValue());
  const [status, setStatus] = useState("ALL");
  const [lookups, setLookups] = useState<FinanceLookupData | null>(null);
  const [rows, setRows] = useState<AccountsPayableRecord[]>([]);
  const [form, setForm] = useState<PayableForm>(() => buildInitialForm(null));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void financeService.getLookups().then((data) => {
      setLookups(data);
      setForm((current) => ({
        ...buildInitialForm(data),
        ...current,
        categoryId: current.categoryId || data.categories.find((item) => item.type !== "REVENUE")?.id || "",
        costCenterId: current.costCenterId || data.costCenters[0]?.id || "",
        paymentMethodId: current.paymentMethodId || data.paymentMethods[0]?.id || "",
        financialAccountId: current.financialAccountId || data.financialAccounts[0]?.id || ""
      }));
    });
  }, []);

  useEffect(() => {
    void financeService
      .listPayables({ month, status })
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
    if (!form.description.trim() || !form.supplierName.trim() || !form.categoryId || !form.costCenterId || !form.dueDate || !form.value) {
      setFeedback("Preencha descricao, fornecedor, categoria, centro de custo, vencimento e valor.");
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      await financeService.createPayable({
        description: form.description.trim(),
        supplierName: form.supplierName.trim(),
        categoryId: form.categoryId,
        costCenterId: form.costCenterId,
        dueDate: form.dueDate,
        paidOrReceivedDate: form.paidDate || undefined,
        value: Number(form.value || "0"),
        interest: Number(form.interest || "0"),
        discount: Number(form.discount || "0"),
        status: form.status,
        paymentMethodId: form.paymentMethodId || undefined,
        financialAccountId: form.financialAccountId || undefined,
        driverId: form.driverId || undefined,
        vehicleId: form.vehicleId || undefined,
        tripId: form.tripId || undefined,
        contractId: form.contractId || undefined,
        notes: form.notes.trim() || undefined,
        attachmentName: form.attachmentName.trim() || undefined
      });
      setFeedback("Conta a pagar registrada com sucesso.");
      setForm(buildInitialForm(lookups));
      setRows(await financeService.listPayables({ month, status }));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao criar conta a pagar.");
    } finally {
      setIsSaving(false);
    }
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
        title="Contas a pagar"
        subtitle="Controle de despesas, vencimentos, pagamentos e comprovantes."
        actions={
          mode === "list" ? (
            <Link href="/financial/accounts-payable/new" className="button-link">
              + Nova conta a pagar
            </Link>
          ) : (
            <Link href="/financial/accounts-payable" className="button-link secondary-link">
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
                  <option value="PAID">Pago</option>
                  <option value="OVERDUE">Vencido</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </label>
            </div>
          </FinanceSectionCard>
        ) : null}

        {mode === "create" ? (
        <FinanceSectionCard title="Nova conta a pagar" subtitle="Cadastro manual de despesas e obrigacoes.">
          <div className="finance-form-grid finance-form-grid-3">
            <label>
              <span>Descricao</span>
              <input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <label>
              <span>Fornecedor/beneficiario</span>
              <input value={form.supplierName} onChange={(event) => setForm((current) => ({ ...current, supplierName: event.target.value }))} />
            </label>
            <label>
              <span>Categoria financeira</span>
              <select className="select" value={form.categoryId} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}>
                {(lookups?.categories ?? [])
                  .filter((item) => item.type !== "REVENUE")
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <div className="finance-form-grid finance-form-grid-3">
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
            <label>
              <span>Vencimento</span>
              <input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} />
            </label>
            <label>
              <span>Data de pagamento</span>
              <input type="date" value={form.paidDate} onChange={(event) => setForm((current) => ({ ...current, paidDate: event.target.value }))} />
            </label>
          </div>

          <div className="finance-form-grid finance-form-grid-4">
            <label>
              <span>Valor</span>
              <input type="number" min="0" step="0.01" value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} />
            </label>
            <label>
              <span>Juros/multa</span>
              <input type="number" min="0" step="0.01" value={form.interest} onChange={(event) => setForm((current) => ({ ...current, interest: event.target.value }))} />
            </label>
            <label>
              <span>Desconto</span>
              <input type="number" min="0" step="0.01" value={form.discount} onChange={(event) => setForm((current) => ({ ...current, discount: event.target.value }))} />
            </label>
            <label>
              <span>Status</span>
              <select className="select" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as AccountsPayableRecord["status"] }))}>
                <option value="OPEN">Aberto</option>
                <option value="PAID">Pago</option>
                <option value="OVERDUE">Vencido</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </label>
          </div>

          <div className="finance-form-grid finance-form-grid-4">
            <label>
              <span>Forma de pagamento</span>
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
              <span>Conta financeira de saida</span>
              <select className="select" value={form.financialAccountId} onChange={(event) => setForm((current) => ({ ...current, financialAccountId: event.target.value }))}>
                <option value="">Nao informado</option>
                {(lookups?.financialAccounts ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Motorista</span>
              <select className="select" value={form.driverId} onChange={(event) => setForm((current) => ({ ...current, driverId: event.target.value }))}>
                <option value="">Sem vinculo</option>
                {(lookups?.drivers ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Veiculo</span>
              <select className="select" value={form.vehicleId} onChange={(event) => setForm((current) => ({ ...current, vehicleId: event.target.value }))}>
                <option value="">Sem vinculo</option>
                {(lookups?.vehicles ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="finance-form-grid finance-form-grid-3">
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
              <span>Anexo/comprovante</span>
              <input value={form.attachmentName} onChange={(event) => setForm((current) => ({ ...current, attachmentName: event.target.value }))} placeholder="nome_arquivo.pdf" />
            </label>
          </div>

          <div className="finance-form-grid finance-form-grid-2">
            <label>
              <span>Observacoes</span>
              <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} />
            </label>
            <article className="panel panel-soft finance-inline-summary-card">
              <span>Valor final previsto</span>
              <strong>{formatCurrency(finalPreview)}</strong>
            </article>
          </div>

          <div className="timekeeping-adjustments-actions-row">
            <button type="button" className="button-link" onClick={() => void handleCreate()} disabled={isSaving}>
              {isSaving ? "Registrando..." : "Registrar conta a pagar"}
            </button>
          </div>
        </FinanceSectionCard>
        ) : null}

        {mode === "list" ? (
        <FinanceSectionCard title="Lista de contas a pagar" subtitle={`${rows.length} registro(s) encontrado(s).`}>
          {rows.length === 0 ? (
            <EmptyState
              title="Nenhuma conta a pagar encontrada"
              description="Cadastre uma despesa para iniciar o controle financeiro."
            />
          ) : (
            <div className="drivers-table-wrap">
              <table className="drivers-table pricing-table cargo-list-table">
                <thead>
                  <tr>
                    <th>Descricao</th>
                    <th>Fornecedor</th>
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
                      <td>{row.supplierName}</td>
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
