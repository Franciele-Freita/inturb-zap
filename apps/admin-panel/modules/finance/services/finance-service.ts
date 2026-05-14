import {
  financeAccounts,
  financeCategories,
  financeClients,
  financeContracts,
  financeCostCenters,
  financeDocuments,
  financeDrivers,
  financeEntries,
  financeInvoices,
  financePayables,
  financePaymentMethods,
  financeReceivables,
  financeReconciliationRecords,
  financeTrips,
  financeVehicles
} from "../data/mock-finance";
import type {
  AccountsPayableRecord,
  AccountsReceivableRecord,
  CashFlowRow,
  CostCenter,
  FinanceFilters,
  FinanceLookupData,
  FinancialAccount,
  FinancialCategory,
  FinancialDashboardInsights,
  FinancialDashboardSummary,
  FinancialDocument,
  FinancialEntry,
  FinancialEntryType,
  InvoiceRecord,
  PaymentMethod,
  ReconciliationRecord,
  ReconciliationStatus
} from "../types/finance";

let payablesState = [...financePayables];
let receivablesState = [...financeReceivables];
let entriesState = [...financeEntries];
let categoriesState = [...financeCategories];
let costCentersState = [...financeCostCenters];
let paymentMethodsState = [...financePaymentMethods];
let financialAccountsState = [...financeAccounts];
let reconciliationState = [...financeReconciliationRecords];
let invoicesState = [...financeInvoices];
let documentsState = [...financeDocuments];

function nowIso(): string {
  return new Date().toISOString();
}

function monthRange(month: string): { start: string; end: string } {
  const [yearValue, monthValue] = month.split("-");
  const year = Number(yearValue);
  const numericMonth = Number(monthValue);
  if (!Number.isFinite(year) || !Number.isFinite(numericMonth)) {
    return { start: "1900-01-01", end: "2900-01-01" };
  }
  const start = `${yearValue}-${monthValue}-01`;
  const endDate = new Date(year, numericMonth, 0);
  const end = `${yearValue}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { start, end };
}

function isDateInRange(date: string, start?: string, end?: string): boolean {
  if (start && date < start) {
    return false;
  }
  if (end && date > end) {
    return false;
  }
  return true;
}

function resolveFilterRange(filters: FinanceFilters): { start?: string; end?: string } {
  if (filters.month) {
    return monthRange(filters.month);
  }
  return {
    start: filters.periodStart,
    end: filters.periodEnd
  };
}

function applySharedFilters<T extends { dueDate?: string; date?: string; status?: string; categoryId?: string; costCenterId?: string }>(
  rows: T[],
  filters: FinanceFilters
): T[] {
  const { start, end } = resolveFilterRange(filters);
  return rows.filter((item) => {
    const dateValue = item.date ?? item.dueDate ?? "";
    if (!isDateInRange(dateValue, start, end)) {
      return false;
    }
    if (filters.status && filters.status !== "ALL" && item.status && item.status !== filters.status) {
      return false;
    }
    if (filters.categoryId && item.categoryId !== filters.categoryId) {
      return false;
    }
    if (filters.costCenterId && item.costCenterId !== filters.costCenterId) {
      return false;
    }
    return true;
  });
}

function computeFinalValue(value: number, interest: number, discount: number): number {
  const total = value + interest - discount;
  return Number(total.toFixed(2));
}

function padId(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2, 10)}`;
}

function resolveTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function toCurrencySafe(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function entryToDirection(type: FinancialEntryType): "ENTRY" | "EXIT" {
  return type === "REVENUE" ? "ENTRY" : "EXIT";
}

function recordToStatusBadge(status: string): string {
  if (status === "OPEN") return "OPEN";
  if (status === "PAID") return "PAID";
  if (status === "RECEIVED") return "RECEIVED";
  if (status === "OVERDUE") return "OVERDUE";
  if (status === "CANCELLED") return "CANCELLED";
  return status;
}

export const financeService = {
  async getLookups(): Promise<FinanceLookupData> {
    return {
      categories: [...categoriesState],
      costCenters: [...costCentersState],
      paymentMethods: [...paymentMethodsState],
      financialAccounts: [...financialAccountsState],
      drivers: [...financeDrivers],
      vehicles: [...financeVehicles],
      contracts: [...financeContracts],
      trips: [...financeTrips],
      clients: [...financeClients]
    };
  },

  async getDashboard(month: string): Promise<{ summary: FinancialDashboardSummary; insights: FinancialDashboardInsights }> {
    const range = monthRange(month);
    const filteredEntries = entriesState.filter((entry) => isDateInRange(entry.date, range.start, range.end));
    const today = resolveTodayDate();

    const monthRevenue = filteredEntries
      .filter((entry) => entry.type === "REVENUE" && entry.status !== "CANCELLED")
      .reduce((total, item) => total + item.value, 0);
    const monthExpense = filteredEntries
      .filter((entry) => entry.type === "EXPENSE" && entry.status !== "CANCELLED")
      .reduce((total, item) => total + item.value, 0);

    const payablesToday = payablesState
      .filter((item) => item.dueDate === today && item.status === "OPEN")
      .reduce((total, item) => total + item.finalValue, 0);
    const receivablesToday = receivablesState
      .filter((item) => item.dueDate === today && item.status === "OPEN")
      .reduce((total, item) => total + item.finalValue, 0);

    const overduePayables = payablesState
      .filter((item) => item.status === "OVERDUE")
      .reduce((total, item) => total + item.finalValue, 0);
    const overdueReceivables = receivablesState
      .filter((item) => item.status === "OVERDUE")
      .reduce((total, item) => total + item.finalValue, 0);

    const currentBalance = financialAccountsState.reduce((total, account) => total + account.currentBalance, 0);

    const byDayMap = new Map<string, { revenue: number; expense: number }>();
    filteredEntries.forEach((entry) => {
      const day = entry.date;
      const current = byDayMap.get(day) ?? { revenue: 0, expense: 0 };
      if (entry.type === "REVENUE") {
        current.revenue += entry.value;
      } else {
        current.expense += entry.value;
      }
      byDayMap.set(day, current);
    });

    const revenueVsExpense = Array.from(byDayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, values]) => ({
        label,
        revenue: toCurrencySafe(values.revenue),
        expense: toCurrencySafe(values.expense),
        balance: toCurrencySafe(values.revenue - values.expense)
      }));

    let runningBalance = 0;
    const cashFlow = revenueVsExpense.map((row) => {
      runningBalance += row.balance;
      return { ...row, balance: runningBalance };
    });

    const expensesByCategoryMap = new Map<string, number>();
    filteredEntries
      .filter((entry) => entry.type === "EXPENSE")
      .forEach((entry) => {
        expensesByCategoryMap.set(entry.categoryId, (expensesByCategoryMap.get(entry.categoryId) ?? 0) + entry.value);
      });
    const expensesByCategory = Array.from(expensesByCategoryMap.entries())
      .map(([categoryId, value]) => ({
        label: categoriesState.find((category) => category.id === categoryId)?.name ?? categoryId,
        value
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const revenuesBySourceMap = new Map<string, number>();
    filteredEntries
      .filter((entry) => entry.type === "REVENUE")
      .forEach((entry) => {
        revenuesBySourceMap.set(entry.origin, (revenuesBySourceMap.get(entry.origin) ?? 0) + entry.value);
      });
    const revenuesBySource = Array.from(revenuesBySourceMap.entries()).map(([label, value]) => ({
      label,
      value
    }));

    return {
      summary: {
        currentBalance,
        payablesToday,
        receivablesToday,
        overduePayables,
        overdueReceivables,
        monthRevenue,
        monthExpense,
        monthResult: monthRevenue - monthExpense
      },
      insights: {
        revenueVsExpense,
        cashFlow,
        expensesByCategory,
        revenuesBySource
      }
    };
  },

  async listPayables(filters: FinanceFilters): Promise<AccountsPayableRecord[]> {
    let rows = applySharedFilters(payablesState, filters);
    if (filters.driverId) rows = rows.filter((item) => item.driverId === filters.driverId);
    if (filters.vehicleId) rows = rows.filter((item) => item.vehicleId === filters.vehicleId);
    if (filters.tripId) rows = rows.filter((item) => item.tripId === filters.tripId);
    if (filters.contractId) rows = rows.filter((item) => item.contractId === filters.contractId);
    return rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },

  async createPayable(payload: Omit<AccountsPayableRecord, "id" | "createdAt" | "finalValue">): Promise<AccountsPayableRecord> {
    const created: AccountsPayableRecord = {
      ...payload,
      id: padId("ap"),
      finalValue: computeFinalValue(payload.value, payload.interest, payload.discount),
      createdAt: nowIso()
    };
    payablesState = [created, ...payablesState];
    entriesState = [
      {
        id: padId("fe"),
        recordId: created.id,
        type: "EXPENSE",
        status: recordToStatusBadge(created.status) as FinancialEntry["status"],
        date: created.paidOrReceivedDate ?? created.dueDate,
        description: created.description,
        categoryId: created.categoryId,
        costCenterId: created.costCenterId,
        value: created.finalValue,
        origin: "MANUAL",
        driverId: created.driverId,
        vehicleId: created.vehicleId,
        tripId: created.tripId,
        contractId: created.contractId,
        financialAccountId: created.financialAccountId
      },
      ...entriesState
    ];
    return created;
  },

  async updatePayableStatus(id: string, status: AccountsPayableRecord["status"], paidDate?: string): Promise<void> {
    payablesState = payablesState.map((item) =>
      item.id === id ? { ...item, status, paidOrReceivedDate: paidDate ?? item.paidOrReceivedDate } : item
    );
  },

  async listReceivables(filters: FinanceFilters): Promise<AccountsReceivableRecord[]> {
    let rows = applySharedFilters(receivablesState, filters);
    if (filters.clientId) rows = rows.filter((item) => item.clientId === filters.clientId);
    if (filters.tripId) rows = rows.filter((item) => item.tripId === filters.tripId);
    if (filters.contractId) rows = rows.filter((item) => item.contractId === filters.contractId);
    return rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },

  async createReceivable(
    payload: Omit<AccountsReceivableRecord, "id" | "createdAt" | "finalValue">
  ): Promise<AccountsReceivableRecord> {
    const created: AccountsReceivableRecord = {
      ...payload,
      id: padId("ar"),
      finalValue: computeFinalValue(payload.value, payload.interest, payload.discount),
      createdAt: nowIso()
    };
    receivablesState = [created, ...receivablesState];
    entriesState = [
      {
        id: padId("fe"),
        recordId: created.id,
        type: "REVENUE",
        status: recordToStatusBadge(created.status) as FinancialEntry["status"],
        date: created.paidOrReceivedDate ?? created.dueDate,
        description: created.description,
        categoryId: created.categoryId,
        costCenterId: created.costCenterId,
        value: created.finalValue,
        origin: "MANUAL",
        clientId: created.clientId,
        tripId: created.tripId,
        contractId: created.contractId,
        financialAccountId: created.financialAccountId
      },
      ...entriesState
    ];
    return created;
  },

  async updateReceivableStatus(id: string, status: AccountsReceivableRecord["status"], receivedDate?: string): Promise<void> {
    receivablesState = receivablesState.map((item) =>
      item.id === id ? { ...item, status, paidOrReceivedDate: receivedDate ?? item.paidOrReceivedDate } : item
    );
  },

  async listEntries(filters: FinanceFilters): Promise<FinancialEntry[]> {
    let rows = applySharedFilters(entriesState, filters);
    if (filters.type && filters.type !== "ALL") {
      rows = rows.filter((entry) => entry.type === filters.type);
    }
    if (filters.clientId) rows = rows.filter((entry) => entry.clientId === filters.clientId);
    if (filters.vehicleId) rows = rows.filter((entry) => entry.vehicleId === filters.vehicleId);
    if (filters.driverId) rows = rows.filter((entry) => entry.driverId === filters.driverId);
    if (filters.tripId) rows = rows.filter((entry) => entry.tripId === filters.tripId);
    if (filters.contractId) rows = rows.filter((entry) => entry.contractId === filters.contractId);
    if (filters.accountId) rows = rows.filter((entry) => entry.financialAccountId === filters.accountId);
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  },

  async listCashFlow(filters: FinanceFilters): Promise<CashFlowRow[]> {
    const rows = await this.listEntries(filters);
    let balance = 0;
    return rows
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((entry) => {
        const direction = entryToDirection(entry.type);
        const amountIn = direction === "ENTRY" ? entry.value : 0;
        const amountOut = direction === "EXIT" ? entry.value : 0;
        balance += amountIn - amountOut;
        return {
          id: entry.id,
          date: entry.date,
          description: entry.description,
          categoryId: entry.categoryId,
          costCenterId: entry.costCenterId,
          type: direction,
          amountIn,
          amountOut,
          balance,
          status: entry.status,
          financialAccountId: entry.financialAccountId,
          clientId: entry.clientId,
          vehicleId: entry.vehicleId,
          driverId: entry.driverId,
          tripId: entry.tripId,
          contractId: entry.contractId
        };
      });
  },

  async listCategories(): Promise<FinancialCategory[]> {
    return [...categoriesState].sort((a, b) => a.name.localeCompare(b.name));
  },

  async createCategory(payload: Omit<FinancialCategory, "id">): Promise<FinancialCategory> {
    const created: FinancialCategory = { ...payload, id: padId("cat") };
    categoriesState = [created, ...categoriesState];
    return created;
  },

  async listCostCenters(): Promise<CostCenter[]> {
    return [...costCentersState].sort((a, b) => a.name.localeCompare(b.name));
  },

  async createCostCenter(payload: Omit<CostCenter, "id">): Promise<CostCenter> {
    const created: CostCenter = { ...payload, id: padId("cc") };
    costCentersState = [created, ...costCentersState];
    return created;
  },

  async listPaymentMethods(): Promise<PaymentMethod[]> {
    return [...paymentMethodsState].sort((a, b) => a.name.localeCompare(b.name));
  },

  async createPaymentMethod(payload: Omit<PaymentMethod, "id">): Promise<PaymentMethod> {
    const created: PaymentMethod = { ...payload, id: padId("pm") };
    paymentMethodsState = [created, ...paymentMethodsState];
    return created;
  },

  async listFinancialAccounts(): Promise<FinancialAccount[]> {
    return [...financialAccountsState].sort((a, b) => a.name.localeCompare(b.name));
  },

  async createFinancialAccount(payload: Omit<FinancialAccount, "id" | "currentBalance">): Promise<FinancialAccount> {
    const created: FinancialAccount = {
      ...payload,
      id: padId("fa"),
      currentBalance: payload.initialBalance
    };
    financialAccountsState = [created, ...financialAccountsState];
    return created;
  },

  async listReconciliation(filters: FinanceFilters): Promise<ReconciliationRecord[]> {
    const { start, end } = resolveFilterRange(filters);
    let rows = reconciliationState.filter((item) => isDateInRange(item.postedAt, start, end));
    if (filters.accountId) rows = rows.filter((item) => item.accountId === filters.accountId);
    if (filters.status && filters.status !== "ALL") {
      const normalized = filters.status === "CONCILIATED" ? "MATCHED" : filters.status;
      rows = rows.filter((item) => item.status === normalized);
    }
    return rows.sort((a, b) => a.postedAt.localeCompare(b.postedAt));
  },

  async updateReconciliation(id: string, status: ReconciliationStatus, linkedEntryId?: string): Promise<void> {
    reconciliationState = reconciliationState.map((item) =>
      item.id === id ? { ...item, status, linkedEntryId } : item
    );
  },

  async listInvoices(filters: FinanceFilters): Promise<InvoiceRecord[]> {
    const { start, end } = resolveFilterRange(filters);
    let rows = invoicesState.filter((item) => isDateInRange(item.dueDate, start, end));
    if (filters.clientId) rows = rows.filter((item) => item.clientId === filters.clientId);
    if (filters.contractId) rows = rows.filter((item) => item.contractId === filters.contractId);
    if (filters.tripId) rows = rows.filter((item) => item.tripId === filters.tripId);
    if (filters.status && filters.status !== "ALL") rows = rows.filter((item) => item.status === filters.status);
    return rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },

  async createInvoice(payload: Omit<InvoiceRecord, "id">): Promise<InvoiceRecord> {
    const created: InvoiceRecord = {
      ...payload,
      id: padId("inv")
    };
    invoicesState = [created, ...invoicesState];
    return created;
  },

  async listDocuments(): Promise<FinancialDocument[]> {
    return [...documentsState].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  },

  async attachDocument(payload: Omit<FinancialDocument, "id" | "uploadedAt">): Promise<FinancialDocument> {
    const created: FinancialDocument = {
      ...payload,
      id: padId("doc"),
      uploadedAt: nowIso()
    };
    documentsState = [created, ...documentsState];
    return created;
  },

  async getReports(filters: FinanceFilters): Promise<{
    revenue: number;
    expense: number;
    result: number;
    byCategory: Array<{ label: string; value: number }>;
    byClient: Array<{ label: string; value: number }>;
    byCostCenter: Array<{ label: string; value: number }>;
    overdueCount: number;
    cashForecast: number;
  }> {
    const entries = await this.listEntries(filters);
    const revenue = entries.filter((entry) => entry.type === "REVENUE").reduce((sum, item) => sum + item.value, 0);
    const expense = entries.filter((entry) => entry.type === "EXPENSE").reduce((sum, item) => sum + item.value, 0);

    const byCategoryMap = new Map<string, number>();
    entries.forEach((entry) => {
      byCategoryMap.set(entry.categoryId, (byCategoryMap.get(entry.categoryId) ?? 0) + entry.value);
    });
    const byCategory = Array.from(byCategoryMap.entries())
      .map(([id, value]) => ({
        label: categoriesState.find((item) => item.id === id)?.name ?? id,
        value
      }))
      .sort((a, b) => b.value - a.value);

    const byClientMap = new Map<string, number>();
    entries
      .filter((entry) => entry.type === "REVENUE" && entry.clientId)
      .forEach((entry) => {
        const key = entry.clientId as string;
        byClientMap.set(key, (byClientMap.get(key) ?? 0) + entry.value);
      });
    const byClient = Array.from(byClientMap.entries())
      .map(([id, value]) => ({
        label: financeClients.find((item) => item.id === id)?.name ?? id,
        value
      }))
      .sort((a, b) => b.value - a.value);

    const byCostCenterMap = new Map<string, number>();
    entries.forEach((entry) => {
      byCostCenterMap.set(entry.costCenterId, (byCostCenterMap.get(entry.costCenterId) ?? 0) + entry.value);
    });
    const byCostCenter = Array.from(byCostCenterMap.entries())
      .map(([id, value]) => ({
        label: costCentersState.find((item) => item.id === id)?.name ?? id,
        value
      }))
      .sort((a, b) => b.value - a.value);

    const overdueCount =
      payablesState.filter((item) => item.status === "OVERDUE").length +
      receivablesState.filter((item) => item.status === "OVERDUE").length;

    const forecastOpenReceivables = receivablesState
      .filter((item) => item.status === "OPEN")
      .reduce((sum, item) => sum + item.finalValue, 0);
    const forecastOpenPayables = payablesState
      .filter((item) => item.status === "OPEN")
      .reduce((sum, item) => sum + item.finalValue, 0);
    const currentBalance = financialAccountsState.reduce((sum, item) => sum + item.currentBalance, 0);

    return {
      revenue,
      expense,
      result: revenue - expense,
      byCategory,
      byClient,
      byCostCenter,
      overdueCount,
      cashForecast: currentBalance + forecastOpenReceivables - forecastOpenPayables
    };
  }
};
