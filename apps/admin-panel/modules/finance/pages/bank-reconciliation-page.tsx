"use client";

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
import type { FinanceLookupData, ReconciliationRecord } from "../types/finance";

export function BankReconciliationPage() {
  const [month, setMonth] = useState(todayMonthValue());
  const [accountId, setAccountId] = useState("");
  const [status, setStatus] = useState("ALL");
  const [rows, setRows] = useState<ReconciliationRecord[]>([]);
  const [lookups, setLookups] = useState<FinanceLookupData | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    void financeService.getLookups().then(setLookups);
  }, []);

  useEffect(() => {
    void loadRows();
  }, [month, accountId, status]);

  async function loadRows() {
    try {
      const data = await financeService.listReconciliation({
        month,
        accountId: accountId || undefined,
        status
      });
      setRows(data);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao carregar conciliacao.");
    }
  }

  async function markMatched(row: ReconciliationRecord) {
    setSavingId(row.id);
    try {
      const candidateEntryId = row.linkedEntryId || "";
      await financeService.updateReconciliation(row.id, "MATCHED", candidateEntryId || undefined);
      await loadRows();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao conciliar item.");
    } finally {
      setSavingId(null);
    }
  }

  function accountName(id: string): string {
    return lookups?.financialAccounts.find((item) => item.id === id)?.name ?? id;
  }

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <FinancePageHeader
        title="Conciliacao bancaria"
        subtitle="Marque transacoes conciliadas e vincule aos lancamentos financeiros."
      />

      {feedback ? <p className="journey-list-status-message">{feedback}</p> : null}

      <section className="grid grid-single finance-layout-stack">
        <FinanceSectionCard title="Filtros de conciliacao" subtitle="Conta financeira, periodo e status.">
          <div className="finance-form-grid finance-form-grid-3">
            <label>
              <span>Competencia</span>
              <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            </label>
            <label>
              <span>Conta</span>
              <select className="select" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
                <option value="">Todas</option>
                {(lookups?.financialAccounts ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Status</span>
              <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="ALL">Todos</option>
                <option value="PENDING">Pendente</option>
                <option value="CONCILIATED">Conciliado</option>
              </select>
            </label>
          </div>
        </FinanceSectionCard>

        <FinanceSectionCard title="Transacoes para conciliacao" subtitle={`${rows.length} item(ns) no periodo.`}>
          {rows.length === 0 ? (
            <EmptyState
              title="Nenhuma transacao para conciliar"
              description="Ajuste os filtros para visualizar transacoes bancarias."
            />
          ) : (
            <div className="drivers-table-wrap">
              <table className="drivers-table pricing-table cargo-list-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Memorando bancario</th>
                    <th>Conta</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Lancamento vinculado</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.postedAt)}</td>
                      <td>{row.bankMemo}</td>
                      <td>{accountName(row.accountId)}</td>
                      <td>{formatCurrency(row.amount)}</td>
                      <td>
                        <FinancialStatusBadge status={row.status === "MATCHED" ? "CONCILIATED" : "OPEN"} />
                      </td>
                      <td>{row.linkedEntryId || "-"}</td>
                      <td>
                        <button
                          type="button"
                          className="button-link secondary-link"
                          onClick={() => void markMatched(row)}
                          disabled={row.status === "MATCHED" || savingId === row.id}
                        >
                          {savingId === row.id ? "Conciliando..." : row.status === "MATCHED" ? "Conciliado" : "Marcar conciliado"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </FinanceSectionCard>
      </section>
    </main>
  );
}

