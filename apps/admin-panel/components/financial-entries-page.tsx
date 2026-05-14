"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ADMIN_SESSION_UPDATED_EVENT, getStoredAdminSession, type AdminSession } from "../lib/admin-auth";
import { type FinancialTransaction, request } from "../lib/api";
import {
  type EntryStatusFilter,
  buildFinancialTransactionsQuery,
  calculateTransactionTotals,
  toEntrySourceFilter,
  toEntryTypeFilter
} from "../lib/financial-service";
import { normalizeFinancialSearchTerm } from "../lib/financial-validation";
import { resolveTimekeepingAccess } from "../lib/timekeeping-access";
import { useDebounce } from "../lib/use-debounce";
import { currentPeriodKey, formatCurrency } from "./timekeeping-shared";
import { FinancialDataTable } from "./financial-data-table";
import { DriverProfileEditorModal } from "./driver-profile-editor-modal";
import { FinancialStatusBadge } from "./financial-status-badge";

export function FinancialEntriesPage() {
  const searchParams = useSearchParams();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [periodKey, setPeriodKey] = useState(searchParams.get("period") ?? currentPeriodKey());
  const [typeFilter, setTypeFilter] = useState(toEntryTypeFilter(searchParams.get("type")));
  const [statusFilter, setStatusFilter] = useState<EntryStatusFilter>("COMPLETED");
  const [sourceFilter, setSourceFilter] = useState(toEntrySourceFilter(searchParams.get("source")));
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") ?? "");
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 420);
  const normalizedSearchTerm = useMemo(
    () => normalizeFinancialSearchTerm(debouncedSearchTerm),
    [debouncedSearchTerm]
  );
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
    if (!access.canOperate) {
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    const query = buildFinancialTransactionsQuery({
      periodKey,
      limit: 1000,
      typeFilter,
      statusFilter,
      sourceFilter,
      searchTerm: normalizedSearchTerm || undefined
    });

    void request<FinancialTransaction[]>(`/admin/financial/transactions?${query.toString()}`)
      .then(setTransactions)
      .catch((error: Error) => setFeedback(error.message))
      .finally(() => setIsLoading(false));
  }, [access.canOperate, normalizedSearchTerm, periodKey, sourceFilter, statusFilter, typeFilter]);

  if (!access.canOperate) {
    return (
      <main className="page-shell page-shell-wide cargo-list-page-shell">
        <section className="panel panel-wide">
          <h1>Movimentacoes financeiras</h1>
          <p>Seu perfil atual nao possui permissao para visualizar movimentacoes financeiras.</p>
        </section>
      </main>
    );
  }

  const totals = calculateTransactionTotals(transactions);
  const selectedTransaction = transactions.find((transaction) => transaction.id === selectedTransactionId) ?? null;

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <section className="panel panel-wide financial-filter-card">
        <div className="financial-filter-grid">
          <label>
            Competencia
            <input type="month" value={periodKey} onChange={(event) => setPeriodKey(event.target.value)} />
          </label>
          <label>
            Tipo da transacao
            <select className="select" value={typeFilter} onChange={(event) => setTypeFilter(toEntryTypeFilter(event.target.value))}>
              <option value="ALL">Todos</option>
              <option value="EARNING">Ganho / Receita</option>
              <option value="EXPENSE">Despesa</option>
              <option value="PAYMENT">Pagamento</option>
              <option value="ADJUSTMENT">Ajuste</option>
            </select>
          </label>
          <label>
            Status
            <select className="select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as EntryStatusFilter)}>
              <option value="ALL">Todos</option>
              <option value="PENDING">Pendente</option>
              <option value="COMPLETED">Concluida</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </label>
          <label>
            Origem
            <select className="select" value={sourceFilter} onChange={(event) => setSourceFilter(toEntrySourceFilter(event.target.value))}>
              <option value="ALL">Todas</option>
              <option value="RIDE">Corridas</option>
              <option value="PAYROLL">Folha</option>
              <option value="FLEET_MAINTENANCE">Frota: manutencao</option>
              <option value="FLEET_REFUEL">Frota: abastecimento</option>
              <option value="MANUAL">Manual</option>
            </select>
          </label>
          <label>
            Buscar por descricao
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Ex.: manutencao, corrida, folha..."
            />
          </label>
        </div>
      </section>

      {feedback ? <p className="journey-list-status-message">{feedback}</p> : null}

      <section className="financial-cards-grid">
        <article className="panel financial-card">
          <span>Total receitas</span>
          <strong className="text-tabular">{formatCurrency(totals.revenue)}</strong>
        </article>
        <article className="panel financial-card">
          <span>Total custos</span>
          <strong className="text-tabular">{formatCurrency(totals.cost)}</strong>
        </article>
        <article className="panel financial-card">
          <span>Resultado liquido</span>
          <strong className="text-tabular">{formatCurrency(totals.net)}</strong>
        </article>
      </section>

      <section className="panel panel-wide">
        <div className="panel-head">
          <h2>Transacoes financeiras</h2>
          <span>{isLoading ? "Atualizando..." : `${transactions.length} item(ns)`}</span>
        </div>

        <FinancialDataTable
          loading={isLoading}
          loadingLabel="Atualizando movimentacoes..."
          isEmpty={transactions.length === 0}
          emptyTitle="Nenhuma movimentacao encontrada"
          emptyDescription="Nao existem transacoes para os filtros selecionados."
          columnCount={7}
          headers={
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Origem</th>
              <th>Categoria</th>
              <th>Descricao</th>
              <th>Valor</th>
            </tr>
          }
        >
          {transactions.map((transaction) => (
            <tr
              key={transaction.id}
              onClick={() => setSelectedTransactionId(transaction.id)}
              className="finance-clickable-row"
            >
              <td>{new Date(transaction.occurredAt).toLocaleString("pt-BR")}</td>
              <td>
                <span className={`timekeeping-badge ${transaction.type === "EARNING" ? "badge-success" : "badge-danger"}`}>
                  {formatTransactionType(transaction.type)}
                </span>
              </td>
              <td>
                <FinancialStatusBadge status={transaction.status} />
              </td>
              <td>
                {transaction.referencePath ? (
                  <Link href={transaction.referencePath} onClick={(event) => event.stopPropagation()}>
                    {formatSource(transaction.source)}
                  </Link>
                ) : (
                  formatSource(transaction.source)
                )}
              </td>
              <td>
                {transaction.referencePath ? (
                  <Link href={transaction.referencePath} onClick={(event) => event.stopPropagation()}>
                    {transaction.categoryLabel ?? transaction.category}
                  </Link>
                ) : (
                  transaction.categoryLabel ?? transaction.category
                )}
              </td>
              <td>{transaction.description}</td>
              <td className="text-tabular">{formatCurrency(transaction.amount)}</td>
            </tr>
          ))}
        </FinancialDataTable>
      </section>

      <DriverProfileEditorModal
        open={selectedTransaction !== null}
        onClose={() => setSelectedTransactionId(null)}
        title="Detalhes da transacao"
        description={
          selectedTransaction
            ? `${formatSource(selectedTransaction.source)} | ${new Date(selectedTransaction.occurredAt).toLocaleString("pt-BR")}`
            : undefined
        }
      >
        {selectedTransaction ? (
          <div className="driver-workspace-keyvalue">
            <div>
              <span>Descricao</span>
              <strong>{selectedTransaction.description}</strong>
            </div>
            <div>
              <span>Categoria</span>
              <strong>{selectedTransaction.categoryLabel ?? selectedTransaction.category}</strong>
            </div>
            <div>
              <span>Valor</span>
              <strong className="text-tabular">{formatCurrency(selectedTransaction.amount)}</strong>
            </div>
            <div>
              <span>Origem</span>
              <strong>{formatSource(selectedTransaction.source)}</strong>
            </div>
            <div>
              <span>Tipo</span>
              <strong>{formatTransactionType(selectedTransaction.type)}</strong>
            </div>
            <div>
              <span>Status</span>
              <FinancialStatusBadge status={selectedTransaction.status} />
            </div>
            <div>
              <span>Motorista</span>
              <strong>{selectedTransaction.driverName ?? "-"}</strong>
            </div>
            <div>
              <span>Veiculo</span>
              <strong>{selectedTransaction.vehicleLabel ?? "-"}</strong>
            </div>
            <div>
              <span>Referencia</span>
              <strong>{selectedTransaction.referenceId ?? "-"}</strong>
            </div>
            {selectedTransaction.referencePath ? (
              <div>
                <span>Origem detalhada</span>
                <strong>
                  <Link href={selectedTransaction.referencePath}>Abrir origem</Link>
                </strong>
              </div>
            ) : null}
          </div>
        ) : null}
      </DriverProfileEditorModal>
    </main>
  );
}

function formatTransactionType(type: FinancialTransaction["type"]): string {
  if (type === "EARNING") return "Receita";
  if (type === "PAYMENT") return "Pagamento";
  if (type === "ADJUSTMENT") return "Ajuste";
  return "Despesa";
}

function formatSource(source: FinancialTransaction["source"]): string {
  if (source === "RIDE") return "Corrida";
  if (source === "PAYROLL") return "Folha";
  if (source === "FLEET_MAINTENANCE") return "Frota (manutencao)";
  if (source === "FLEET_REFUEL") return "Frota (abastecimento)";
  if (source === "MANUAL") return "Manual";
  return "-";
}
