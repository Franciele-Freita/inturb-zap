import type {
  FinancialCashflow,
  FinancialEntry,
  FinancialOverview,
  FinancialTransaction,
  TimesheetPeriod
} from "./api";

export type EntryTypeFilter = "ALL" | "EARNING" | "EXPENSE" | "PAYMENT" | "ADJUSTMENT";
export type EntryStatusFilter = "ALL" | "PENDING" | "COMPLETED" | "CANCELLED";
export type EntrySourceFilter = "ALL" | "RIDE" | "PAYROLL" | "FLEET_MAINTENANCE" | "FLEET_REFUEL" | "MANUAL";

export type FinancialSummaryCard = {
  label: string;
  value: number;
  valueType: "currency" | "count";
  tone?: "success" | "danger" | "warning";
  href?: string;
  helper?: string;
};

export type FinancialDashboardAlert = {
  id: string;
  tone: "warning" | "danger" | "info";
  message: string;
  href?: string;
};

export type FinancialOperationalRisk = {
  id: string;
  title: string;
  value: string;
  severity: "ok" | "warning" | "critical";
  href: string;
};

export type TimesheetPeriodBuckets = {
  openPeriods: TimesheetPeriod[];
  closedPeriods: TimesheetPeriod[];
  openDriverIds: Set<string>;
  closedDriverIds: Set<string>;
};

export type ClosingImpactSummary = {
  openProjectedAmount: number;
  closedProjectedAmount: number;
  workedMinutesOpen: number;
  overtimeMinutesOpen: number;
};

export type ClosingImpact = TimesheetPeriodBuckets & ClosingImpactSummary;

export function toEntryTypeFilter(value: string | null): EntryTypeFilter {
  if (value === "EARNING" || value === "EXPENSE" || value === "PAYMENT" || value === "ADJUSTMENT") {
    return value;
  }
  return "ALL";
}

export function toEntrySourceFilter(value: string | null): EntrySourceFilter {
  if (
    value === "RIDE" ||
    value === "PAYROLL" ||
    value === "FLEET_MAINTENANCE" ||
    value === "FLEET_REFUEL" ||
    value === "MANUAL"
  ) {
    return value;
  }
  if (value === "FLEET") {
    return "FLEET_MAINTENANCE";
  }
  return "ALL";
}

export function buildFinancialTransactionsQuery(params: {
  periodKey: string;
  limit: number;
  typeFilter: EntryTypeFilter;
  statusFilter: EntryStatusFilter;
  sourceFilter: EntrySourceFilter;
  searchTerm?: string;
}): URLSearchParams {
  const query = new URLSearchParams();
  query.set("period", params.periodKey);
  query.set("limit", String(params.limit));
  if (params.typeFilter !== "ALL") {
    query.set("type", params.typeFilter);
  }
  if (params.statusFilter !== "ALL") {
    query.set("status", params.statusFilter);
  }
  if (params.sourceFilter !== "ALL") {
    query.set("source", params.sourceFilter);
  }
  if (params.searchTerm) {
    query.set("search", params.searchTerm);
  }
  return query;
}

export function calculateTransactionTotals(transactions: FinancialTransaction[]): {
  revenue: number;
  cost: number;
  net: number;
} {
  const totals = transactions.reduce(
    (acc, transaction) => {
      if (transaction.type === "EARNING") {
        acc.revenue += transaction.amount;
      } else {
        acc.cost += transaction.amount;
      }
      return acc;
    },
    { revenue: 0, cost: 0 }
  );

  return {
    revenue: totals.revenue,
    cost: totals.cost,
    net: totals.revenue - totals.cost
  };
}

export function calculateDriverStatementTotals(transactions: FinancialTransaction[]): {
  earning: number;
  cost: number;
  payment: number;
  adjustment: number;
  balance: number;
} {
  return transactions.reduce(
    (acc, transaction) => {
      if (transaction.type === "EARNING") {
        acc.earning += transaction.amount;
        acc.balance += transaction.amount;
      } else {
        acc.cost += transaction.amount;
        acc.balance -= transaction.amount;
        if (transaction.type === "PAYMENT") {
          acc.payment += transaction.amount;
        } else if (transaction.type === "ADJUSTMENT") {
          acc.adjustment += transaction.amount;
        }
      }
      return acc;
    },
    { earning: 0, cost: 0, payment: 0, adjustment: 0, balance: 0 }
  );
}

export function buildDriverBalanceTimeline(
  transactions: FinancialTransaction[]
): Array<{ date: string; balance: number }> {
  const sorted = [...transactions].sort(
    (left, right) => +new Date(left.occurredAt) - +new Date(right.occurredAt)
  );
  let balance = 0;

  return sorted.map((transaction) => {
    if (transaction.type === "EARNING") {
      balance += transaction.amount;
    } else {
      balance -= transaction.amount;
    }
    return {
      date: transaction.occurredAt,
      balance
    };
  });
}

export function splitTimesheetPeriodsByStatus(periods: TimesheetPeriod[]): TimesheetPeriodBuckets {
  const openPeriods = periods.filter((period) => period.status === "OPEN");
  const closedPeriods = periods.filter((period) => period.status === "CLOSED");
  return {
    openPeriods,
    closedPeriods,
    openDriverIds: new Set(openPeriods.map((period) => period.driverId)),
    closedDriverIds: new Set(closedPeriods.map((period) => period.driverId))
  };
}

export function calculateClosingImpactSummary(params: {
  buckets: TimesheetPeriodBuckets;
  payrollTransactions: FinancialTransaction[];
}): ClosingImpactSummary {
  const { buckets, payrollTransactions } = params;
  const openProjectedAmount = payrollTransactions
    .filter((transaction) => transaction.driverId && buckets.openDriverIds.has(transaction.driverId))
    .reduce((total, transaction) => total + transaction.amount, 0);
  const closedProjectedAmount = payrollTransactions
    .filter((transaction) => transaction.driverId && buckets.closedDriverIds.has(transaction.driverId))
    .reduce((total, transaction) => total + transaction.amount, 0);

  return {
    openProjectedAmount,
    closedProjectedAmount,
    workedMinutesOpen: buckets.openPeriods.reduce((total, period) => total + period.workedMinutes, 0),
    overtimeMinutesOpen: buckets.openPeriods.reduce((total, period) => total + period.overtimeMinutes, 0)
  };
}

export function calculateClosingImpact(
  periods: TimesheetPeriod[],
  payrollTransactions: FinancialTransaction[]
): ClosingImpact {
  const buckets = splitTimesheetPeriodsByStatus(periods);
  return {
    ...buckets,
    ...calculateClosingImpactSummary({ buckets, payrollTransactions })
  };
}

export function buildPayrollProjectionByDriver(
  payrollTransactions: FinancialTransaction[]
): Map<string, number> {
  const map = new Map<string, number>();
  payrollTransactions.forEach((transaction) => {
    if (!transaction.driverId) return;
    map.set(transaction.driverId, (map.get(transaction.driverId) ?? 0) + transaction.amount);
  });
  return map;
}

export function filterSelectedOpenPeriodIds(params: {
  selectedPeriodIds: string[];
  openPeriods: TimesheetPeriod[];
}): string[] {
  const openIds = new Set(params.openPeriods.map((period) => period.id));
  return params.selectedPeriodIds.filter((periodId) => openIds.has(periodId));
}

export function filterSelectedClosedPeriodIds(params: {
  selectedPeriodIds: string[];
  closedPeriods: TimesheetPeriod[];
}): string[] {
  const closedIds = new Set(params.closedPeriods.map((period) => period.id));
  return params.selectedPeriodIds.filter((periodId) => closedIds.has(periodId));
}

export function buildOverviewSummaryCards(
  overview: FinancialOverview | null,
  periodKey: string
): FinancialSummaryCard[] {
  if (!overview) {
    return [];
  }

  return [
    {
      label: "Receita total",
      value: overview.totals.revenueAmount,
      valueType: "currency",
      tone: "success",
      href: buildEntriesHref(periodKey, { type: "EARNING" })
    },
    {
      label: "Custo folha",
      value: overview.totals.payrollCostAmount,
      valueType: "currency",
      href: buildEntriesHref(periodKey, { source: "PAYROLL" })
    },
    {
      label: "Custo frota",
      value: overview.totals.fleetCostAmount,
      valueType: "currency",
      href: buildEntriesHref(periodKey, { source: "FLEET" })
    },
    {
      label: "Custo total",
      value: overview.totals.totalCostAmount,
      valueType: "currency",
      href: buildEntriesHref(periodKey, { type: "EXPENSE" })
    },
    {
      label: "Resultado liquido",
      value: overview.totals.netAmount,
      valueType: "currency",
      tone: overview.totals.netAmount >= 0 ? "success" : "danger",
      href: "/financial/reports"
    },
    {
      label: "Corridas concluidas",
      value: overview.indicators.completedRides,
      valueType: "count",
      href: "/rides"
    },
    {
      label: "Pendencias de ponto",
      value: overview.indicators.pendingTimekeepingIssues,
      valueType: "count",
      tone: overview.indicators.pendingTimekeepingIssues > 0 ? "warning" : undefined,
      href: "/administrative/timekeeping/mirror"
    },
    {
      label: "Competencias abertas",
      value: overview.indicators.openTimesheetPeriods,
      valueType: "count",
      helper: "Aguardando fechamento",
      href: "/financial/closing"
    },
    {
      label: "Competencias fechadas",
      value: overview.indicators.closedTimesheetPeriods,
      valueType: "count",
      helper: "Ja consolidadas",
      href: "/financial/closing"
    }
  ];
}

export function resolveWorstCashflowDay(days: FinancialCashflow["days"]): FinancialCashflow["days"][number] | null {
  return days.reduce<FinancialCashflow["days"][number] | null>((acc, day) => {
    if (!acc) return day;
    return day.netAmount < acc.netAmount ? day : acc;
  }, null);
}

export function buildOverviewAlerts(params: {
  overview: FinancialOverview | null;
  cashflow: FinancialCashflow | null;
  periodKey: string;
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
}): FinancialDashboardAlert[] {
  const { overview, cashflow, periodKey, formatCurrency, formatDate } = params;
  if (!overview || !cashflow) {
    return [];
  }

  const alerts: FinancialDashboardAlert[] = [];

  if (overview.totals.netAmount < 0) {
    alerts.push({
      id: "negative-net",
      tone: "danger",
      message: "Resultado liquido negativo na competencia. Revise custos e repasses.",
      href: "/financial/reports"
    });
  }
  if (overview.indicators.pendingTimekeepingIssues > 0) {
    alerts.push({
      id: "timekeeping-issues",
      tone: "warning",
      message: `${overview.indicators.pendingTimekeepingIssues} pendencia(s) de ponto em aberto impactando custos.`,
      href: "/administrative/timekeeping/mirror"
    });
  }
  if (overview.indicators.openTimesheetPeriods > 0) {
    alerts.push({
      id: "open-periods",
      tone: "info",
      message: `${overview.indicators.openTimesheetPeriods} competencia(s) de folha ainda sem fechamento financeiro.`,
      href: "/financial/closing"
    });
  }

  const worstDay = resolveWorstCashflowDay(cashflow.days);
  if (worstDay && worstDay.netAmount < 0) {
    alerts.push({
      id: "worst-day",
      tone: "warning",
      message: `Maior risco diario em ${formatDate(worstDay.date)} com ${formatCurrency(worstDay.netAmount)} de saldo.`,
      href: `/financial/entries?period=${encodeURIComponent(periodKey)}`
    });
  }

  return alerts;
}

export function buildOperationalRiskRows(
  overview: FinancialOverview | null,
  formatCurrency: (value: number) => string
): FinancialOperationalRisk[] {
  const pendingIssues = overview?.indicators.pendingTimekeepingIssues ?? 0;
  const openPeriods = overview?.indicators.openTimesheetPeriods ?? 0;
  const netAmount = overview?.totals.netAmount ?? 0;

  return [
    {
      id: "risk-timekeeping",
      title: "Pendencias de ponto em aberto",
      value: String(pendingIssues),
      severity: pendingIssues > 0 ? "warning" : "ok",
      href: "/administrative/timekeeping/mirror"
    },
    {
      id: "risk-open-periods",
      title: "Competencias em aberto",
      value: String(openPeriods),
      severity: openPeriods > 0 ? "warning" : "ok",
      href: "/financial/closing"
    },
    {
      id: "risk-net",
      title: "Resultado da competencia",
      value: formatCurrency(netAmount),
      severity: netAmount < 0 ? "critical" : "ok",
      href: "/financial/reports"
    }
  ];
}

export function sliceTopProjectedCosts(overview: FinancialOverview | null, limit = 8): FinancialEntry[] {
  return (overview?.topCostEntries ?? []).slice(0, limit);
}

export function resolveDrilldownPath(period: string, entry: FinancialEntry): string {
  if (entry.referencePath) {
    return entry.referencePath;
  }

  return buildEntriesHref(period, {
    type: entry.type === "REVENUE" ? "EARNING" : "EXPENSE",
    search: entry.description
  });
}

export function buildEntriesHref(
  period: string,
  filters: {
    type?: "EARNING" | "EXPENSE" | "PAYMENT" | "ADJUSTMENT";
    source?: "RIDE" | "PAYROLL" | "FLEET";
    search?: string;
  }
): string {
  const query = new URLSearchParams();
  query.set("period", period);
  if (filters.type) {
    query.set("type", filters.type);
  }
  if (filters.source) {
    query.set("source", filters.source === "FLEET" ? "FLEET_MAINTENANCE" : filters.source);
  }
  if (filters.search) {
    query.set("search", filters.search);
  }
  return `/financial/entries?${query.toString()}`;
}

export function normalizeDateKeyToNoon(dateKey: string): string {
  if (dateKey.includes("T")) {
    return dateKey;
  }
  return `${dateKey}T12:00:00`;
}

export function formatNormalizedDate(dateKey: string, locale = "pt-BR"): string {
  return new Date(normalizeDateKeyToNoon(dateKey)).toLocaleDateString(locale);
}
