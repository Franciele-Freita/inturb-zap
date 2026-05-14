export type FinancialRecordStatus =
  | "OPEN"
  | "PAID"
  | "RECEIVED"
  | "OVERDUE"
  | "CANCELLED"
  | "CONCILIATED";

export type FinancialEntryType = "REVENUE" | "EXPENSE";
export type FinancialCategoryType = "REVENUE" | "EXPENSE" | "BOTH";
export type PaymentMethodType =
  | "CASH"
  | "PIX"
  | "CARD"
  | "BOLETO"
  | "TRANSFER"
  | "AUTO_DEBIT"
  | "OTHER";

export type FinancialAccountType =
  | "BANK"
  | "CASH_BOX"
  | "DIGITAL_WALLET"
  | "CARD"
  | "OTHER";

export type EntryOrigin = "MANUAL" | "CONTRACT" | "TRIP" | "FLEET" | "RH";

export type ReconciliationStatus = "PENDING" | "MATCHED";

export type DriverOption = { id: string; name: string };
export type VehicleOption = { id: string; label: string };
export type ContractOption = { id: string; label: string };
export type TripOption = { id: string; label: string };
export type ClientOption = { id: string; name: string };

export type FinancialCategory = {
  id: string;
  name: string;
  type: FinancialCategoryType;
  color: string;
  icon: string;
  isActive: boolean;
};

export type CostCenter = {
  id: string;
  name: string;
  description: string;
  owner?: string;
  isActive: boolean;
};

export type PaymentMethod = {
  id: string;
  name: string;
  type: PaymentMethodType;
  isActive: boolean;
};

export type FinancialAccount = {
  id: string;
  name: string;
  type: FinancialAccountType;
  bank?: string;
  branch?: string;
  accountNumber?: string;
  initialBalance: number;
  currentBalance: number;
  isActive: boolean;
};

type FinancialBaseRecord = {
  id: string;
  description: string;
  categoryId: string;
  costCenterId: string;
  dueDate: string;
  paidOrReceivedDate?: string;
  value: number;
  interest: number;
  discount: number;
  finalValue: number;
  status: FinancialRecordStatus;
  paymentMethodId?: string;
  financialAccountId?: string;
  notes?: string;
  attachmentName?: string;
  createdAt: string;
};

export type AccountsPayableRecord = FinancialBaseRecord & {
  supplierName: string;
  driverId?: string;
  vehicleId?: string;
  tripId?: string;
  contractId?: string;
};

export type AccountsReceivableRecord = FinancialBaseRecord & {
  clientId: string;
  tripId?: string;
  contractId?: string;
};

export type FinancialEntry = {
  id: string;
  recordId?: string;
  type: FinancialEntryType;
  status: FinancialRecordStatus;
  date: string;
  description: string;
  categoryId: string;
  costCenterId: string;
  value: number;
  origin: EntryOrigin;
  originRef?: string;
  clientId?: string;
  vehicleId?: string;
  driverId?: string;
  tripId?: string;
  contractId?: string;
  financialAccountId?: string;
};

export type CashFlowRow = {
  id: string;
  date: string;
  description: string;
  categoryId: string;
  costCenterId: string;
  type: "ENTRY" | "EXIT";
  amountIn: number;
  amountOut: number;
  balance: number;
  status: FinancialRecordStatus;
  financialAccountId?: string;
  clientId?: string;
  vehicleId?: string;
  driverId?: string;
  tripId?: string;
  contractId?: string;
};

export type ReconciliationRecord = {
  id: string;
  bankMemo: string;
  postedAt: string;
  amount: number;
  accountId: string;
  status: ReconciliationStatus;
  linkedEntryId?: string;
};

export type InvoiceRecord = {
  id: string;
  clientId: string;
  description: string;
  contractId?: string;
  tripId?: string;
  value: number;
  dueDate: string;
  status: "OPEN" | "PAID" | "OVERDUE" | "CANCELLED";
  paymentLink?: string;
  notes?: string;
};

export type FinancialDocument = {
  id: string;
  entryId?: string;
  recordType: "PAYABLE" | "RECEIVABLE" | "ENTRY" | "INVOICE";
  documentType: "RECEIPT" | "PROOF" | "INVOICE" | "BOLETO" | "CONTRACT" | "OTHER";
  fileName: string;
  uploadedAt: string;
  notes?: string;
};

export type FinancialDashboardSummary = {
  currentBalance: number;
  payablesToday: number;
  receivablesToday: number;
  overduePayables: number;
  overdueReceivables: number;
  monthRevenue: number;
  monthExpense: number;
  monthResult: number;
};

export type FinancialDashboardSeriesPoint = {
  label: string;
  revenue: number;
  expense: number;
  balance: number;
};

export type FinancialDashboardInsights = {
  revenueVsExpense: FinancialDashboardSeriesPoint[];
  cashFlow: FinancialDashboardSeriesPoint[];
  expensesByCategory: Array<{ label: string; value: number }>;
  revenuesBySource: Array<{ label: string; value: number }>;
};

export type FinanceFilters = {
  periodStart?: string;
  periodEnd?: string;
  month?: string;
  status?: string;
  accountId?: string;
  categoryId?: string;
  costCenterId?: string;
  clientId?: string;
  vehicleId?: string;
  driverId?: string;
  tripId?: string;
  contractId?: string;
  type?: FinancialEntryType | "ALL";
};

export type FinanceLookupData = {
  categories: FinancialCategory[];
  costCenters: CostCenter[];
  paymentMethods: PaymentMethod[];
  financialAccounts: FinancialAccount[];
  drivers: DriverOption[];
  vehicles: VehicleOption[];
  contracts: ContractOption[];
  trips: TripOption[];
  clients: ClientOption[];
};

