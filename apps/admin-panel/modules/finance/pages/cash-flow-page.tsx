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
import type { CashFlowRow, FinanceLookupData } from "../types/finance";

export function CashFlowPage() {
  const [month, setMonth] = useState(todayMonthValue());
  const [status, setStatus] = useState("ALL");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [clientId, setClientId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [contractId, setContractId] = useState("");
  const [tripId, setTripId] = useState("");
  const [rows, setRows] = useState<CashFlowRow[]>([]);
  const [lookups, setLookups] = useState<FinanceLookupData | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    void financeService.getLookups().then(setLookups);
  }, []);

  useEffect(() => {
    void financeService
      .listCashFlow({
        month,
        status,
        accountId: accountId || undefined,
        categoryId: categoryId || undefined,
        costCenterId: costCenterId || undefined,
        clientId: clientId || undefined,
        vehicleId: vehicleId || undefined,
        driverId: driverId || undefined,
        contractId: contractId || undefined,
        tripId: tripId || undefined
      })
      .then(setRows)
      .catch((error: Error) => setFeedback(error.message));
  }, [month, status, accountId, categoryId, costCenterId, clientId, vehicleId, driverId, contractId, tripId]);

  function categoryName(id: string): string {
    return lookups?.categories.find((item) => item.id === id)?.name ?? id;
  }

  function costCenterName(id: string): string {
    return lookups?.costCenters.find((item) => item.id === id)?.name ?? id;
  }

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <FinancePageHeader
        title="Fluxo de caixa"
        subtitle="Entradas, saidas e saldo acumulado por periodo e filtros operacionais."
      />

      {feedback ? <p className="journey-list-status-message">{feedback}</p> : null}

      <section className="grid grid-single finance-layout-stack">
        <FinanceSectionCard title="Filtros" subtitle="Aplique filtros para analisar o fluxo de caixa.">
          <div className="finance-form-grid finance-form-grid-4">
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
                <option value="RECEIVED">Recebido</option>
                <option value="OVERDUE">Vencido</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </label>
            <label>
              <span>Conta financeira</span>
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
              <span>Categoria</span>
              <select className="select" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                <option value="">Todas</option>
                {(lookups?.categories ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="finance-form-grid finance-form-grid-4">
            <label>
              <span>Centro de custo</span>
              <select className="select" value={costCenterId} onChange={(event) => setCostCenterId(event.target.value)}>
                <option value="">Todos</option>
                {(lookups?.costCenters ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Cliente</span>
              <select className="select" value={clientId} onChange={(event) => setClientId(event.target.value)}>
                <option value="">Todos</option>
                {(lookups?.clients ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Veiculo</span>
              <select className="select" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
                <option value="">Todos</option>
                {(lookups?.vehicles ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Motorista</span>
              <select className="select" value={driverId} onChange={(event) => setDriverId(event.target.value)}>
                <option value="">Todos</option>
                {(lookups?.drivers ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="finance-form-grid finance-form-grid-3">
            <label>
              <span>Contrato</span>
              <select className="select" value={contractId} onChange={(event) => setContractId(event.target.value)}>
                <option value="">Todos</option>
                {(lookups?.contracts ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Viagem</span>
              <select className="select" value={tripId} onChange={(event) => setTripId(event.target.value)}>
                <option value="">Todas</option>
                {(lookups?.trips ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </FinanceSectionCard>

        <FinanceSectionCard title="Movimentacao de caixa" subtitle={`${rows.length} item(ns) no periodo selecionado.`}>
          {rows.length === 0 ? (
            <EmptyState
              title="Sem movimentacao para os filtros aplicados"
              description="Ajuste os filtros para visualizar entradas e saidas."
            />
          ) : (
            <div className="drivers-table-wrap">
              <table className="drivers-table pricing-table cargo-list-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descricao</th>
                    <th>Categoria</th>
                    <th>Centro de custo</th>
                    <th>Tipo</th>
                    <th>Entrada</th>
                    <th>Saida</th>
                    <th>Saldo</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.date)}</td>
                      <td>{row.description}</td>
                      <td>{categoryName(row.categoryId)}</td>
                      <td>{costCenterName(row.costCenterId)}</td>
                      <td>{row.type === "ENTRY" ? "Entrada" : "Saida"}</td>
                      <td>{formatCurrency(row.amountIn)}</td>
                      <td>{formatCurrency(row.amountOut)}</td>
                      <td>{formatCurrency(row.balance)}</td>
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
      </section>
    </main>
  );
}

