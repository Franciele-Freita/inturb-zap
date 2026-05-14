import type {
  AccountsPayableRecord,
  AccountsReceivableRecord,
  ClientOption,
  ContractOption,
  CostCenter,
  DriverOption,
  FinancialAccount,
  FinancialCategory,
  FinancialDocument,
  FinancialEntry,
  InvoiceRecord,
  PaymentMethod,
  ReconciliationRecord,
  TripOption,
  VehicleOption
} from "../types/finance";

export const financeDrivers: DriverOption[] = [
  { id: "driver_1", name: "Marcos Silva" },
  { id: "driver_2", name: "Ana Paula Costa" },
  { id: "driver_3", name: "Joao Ferreira" }
];

export const financeVehicles: VehicleOption[] = [
  { id: "vehicle_1", label: "Onibus 201 - ABC1D23" },
  { id: "vehicle_2", label: "Van 07 - QWE9F11" },
  { id: "vehicle_3", label: "Micro 14 - JKL4M55" }
];

export const financeContracts: ContractOption[] = [
  { id: "contract_1", label: "Contrato Prefeitura - Linha Norte" },
  { id: "contract_2", label: "Contrato Escolar - Setor 3" }
];

export const financeTrips: TripOption[] = [
  { id: "trip_1", label: "Viagem V-10293" },
  { id: "trip_2", label: "Viagem V-10340" },
  { id: "trip_3", label: "Viagem V-10402" }
];

export const financeClients: ClientOption[] = [
  { id: "client_1", name: "Prefeitura Municipal" },
  { id: "client_2", name: "Escola Horizonte" },
  { id: "client_3", name: "Condominio Nova Estacao" }
];

export const financeCategories: FinancialCategory[] = [
  { id: "cat_rev_contracts", name: "Contratos", type: "REVENUE", color: "#2E8B57", icon: "file", isActive: true },
  { id: "cat_rev_trips", name: "Viagens avulsas", type: "REVENUE", color: "#1D4ED8", icon: "route", isActive: true },
  { id: "cat_rev_monthly", name: "Mensalidades", type: "REVENUE", color: "#0E7490", icon: "wallet", isActive: true },
  { id: "cat_exp_fuel", name: "Combustivel", type: "EXPENSE", color: "#B45309", icon: "fuel", isActive: true },
  { id: "cat_exp_maintenance", name: "Manutencao", type: "EXPENSE", color: "#DC2626", icon: "wrench", isActive: true },
  { id: "cat_exp_salary", name: "Salarios", type: "EXPENSE", color: "#7C3AED", icon: "users", isActive: true },
  { id: "cat_exp_tolls", name: "Pedagios", type: "EXPENSE", color: "#374151", icon: "badge", isActive: true },
  { id: "cat_exp_tech", name: "Tecnologia", type: "EXPENSE", color: "#0F766E", icon: "cpu", isActive: true },
  { id: "cat_exp_supplier", name: "Fornecedores", type: "EXPENSE", color: "#4B5563", icon: "truck", isActive: true }
];

export const financeCostCenters: CostCenter[] = [
  { id: "cc_fleet", name: "Frota", description: "Custos operacionais da frota", owner: "Operacao", isActive: true },
  { id: "cc_rh", name: "RH", description: "Custos de pessoal e beneficios", owner: "RH", isActive: true },
  { id: "cc_admin", name: "Administrativo", description: "Despesas administrativas", owner: "Financeiro", isActive: true },
  { id: "cc_trips", name: "Viagens", description: "Custos vinculados a viagens", owner: "Operacao", isActive: true },
  { id: "cc_contracts", name: "Contratos", description: "Receitas e despesas contratuais", owner: "Comercial", isActive: true }
];

export const financePaymentMethods: PaymentMethod[] = [
  { id: "pm_pix", name: "PIX", type: "PIX", isActive: true },
  { id: "pm_transfer", name: "Transferencia", type: "TRANSFER", isActive: true },
  { id: "pm_boleto", name: "Boleto", type: "BOLETO", isActive: true },
  { id: "pm_cash", name: "Dinheiro", type: "CASH", isActive: true },
  { id: "pm_card", name: "Cartao", type: "CARD", isActive: true }
];

export const financeAccounts: FinancialAccount[] = [
  {
    id: "fa_bank_1",
    name: "Conta Banco Principal",
    type: "BANK",
    bank: "Banco do Brasil",
    branch: "0012",
    accountNumber: "12345-6",
    initialBalance: 80000,
    currentBalance: 96740,
    isActive: true
  },
  {
    id: "fa_cash_1",
    name: "Caixa Operacional",
    type: "CASH_BOX",
    initialBalance: 2500,
    currentBalance: 3180,
    isActive: true
  },
  {
    id: "fa_wallet_1",
    name: "Carteira Digital",
    type: "DIGITAL_WALLET",
    initialBalance: 1200,
    currentBalance: 950,
    isActive: true
  }
];

export const financePayables: AccountsPayableRecord[] = [
  {
    id: "ap_1",
    description: "Abastecimento semana 16",
    supplierName: "Posto Central",
    categoryId: "cat_exp_fuel",
    costCenterId: "cc_fleet",
    vehicleId: "vehicle_1",
    dueDate: "2026-04-29",
    paidOrReceivedDate: "2026-04-29",
    value: 2850,
    interest: 0,
    discount: 50,
    finalValue: 2800,
    status: "PAID",
    paymentMethodId: "pm_pix",
    financialAccountId: "fa_bank_1",
    notes: "Pagamento acordado com desconto a vista.",
    attachmentName: "comprovante_abastecimento_1604.pdf",
    createdAt: "2026-04-16T09:00:00.000Z"
  },
  {
    id: "ap_2",
    description: "Revisao preventiva micro 14",
    supplierName: "Oficina Linha Forte",
    categoryId: "cat_exp_maintenance",
    costCenterId: "cc_fleet",
    vehicleId: "vehicle_3",
    dueDate: "2026-04-30",
    value: 1740,
    interest: 0,
    discount: 0,
    finalValue: 1740,
    status: "OPEN",
    paymentMethodId: "pm_transfer",
    financialAccountId: "fa_bank_1",
    createdAt: "2026-04-20T13:20:00.000Z"
  },
  {
    id: "ap_3",
    description: "Folha motoristas - quinzena",
    supplierName: "Equipe Operacional",
    categoryId: "cat_exp_salary",
    costCenterId: "cc_rh",
    driverId: "driver_1",
    dueDate: "2026-04-25",
    value: 4320,
    interest: 68,
    discount: 0,
    finalValue: 4388,
    status: "OVERDUE",
    paymentMethodId: "pm_transfer",
    financialAccountId: "fa_bank_1",
    notes: "Aguardando aprovacao final do fechamento.",
    createdAt: "2026-04-10T10:15:00.000Z"
  }
];

export const financeReceivables: AccountsReceivableRecord[] = [
  {
    id: "ar_1",
    description: "Mensalidade Linha Norte - Abril",
    clientId: "client_1",
    contractId: "contract_1",
    categoryId: "cat_rev_contracts",
    costCenterId: "cc_contracts",
    dueDate: "2026-04-30",
    paidOrReceivedDate: "2026-04-28",
    value: 24600,
    interest: 0,
    discount: 0,
    finalValue: 24600,
    status: "RECEIVED",
    paymentMethodId: "pm_transfer",
    financialAccountId: "fa_bank_1",
    attachmentName: "recibo_prefeitura_abril.pdf",
    createdAt: "2026-04-01T08:00:00.000Z"
  },
  {
    id: "ar_2",
    description: "Viagem avulsa turno noite",
    clientId: "client_3",
    tripId: "trip_2",
    categoryId: "cat_rev_trips",
    costCenterId: "cc_trips",
    dueDate: "2026-04-29",
    value: 1150,
    interest: 0,
    discount: 0,
    finalValue: 1150,
    status: "OPEN",
    paymentMethodId: "pm_pix",
    financialAccountId: "fa_wallet_1",
    createdAt: "2026-04-27T12:40:00.000Z"
  },
  {
    id: "ar_3",
    description: "Servico escolar complementar",
    clientId: "client_2",
    contractId: "contract_2",
    categoryId: "cat_rev_contracts",
    costCenterId: "cc_contracts",
    dueDate: "2026-04-24",
    value: 5900,
    interest: 72,
    discount: 0,
    finalValue: 5972,
    status: "OVERDUE",
    paymentMethodId: "pm_boleto",
    createdAt: "2026-04-08T11:10:00.000Z"
  }
];

export const financeEntries: FinancialEntry[] = [
  {
    id: "fe_1",
    recordId: "ar_1",
    type: "REVENUE",
    status: "RECEIVED",
    date: "2026-04-28",
    description: "Recebimento mensalidade contrato Prefeitura",
    categoryId: "cat_rev_contracts",
    costCenterId: "cc_contracts",
    value: 24600,
    origin: "CONTRACT",
    originRef: "contract_1",
    clientId: "client_1",
    contractId: "contract_1",
    financialAccountId: "fa_bank_1"
  },
  {
    id: "fe_2",
    recordId: "ap_1",
    type: "EXPENSE",
    status: "PAID",
    date: "2026-04-29",
    description: "Pagamento abastecimento semana 16",
    categoryId: "cat_exp_fuel",
    costCenterId: "cc_fleet",
    value: 2800,
    origin: "FLEET",
    originRef: "vehicle_1",
    vehicleId: "vehicle_1",
    financialAccountId: "fa_bank_1"
  },
  {
    id: "fe_3",
    recordId: "ar_2",
    type: "REVENUE",
    status: "OPEN",
    date: "2026-04-29",
    description: "Receita viagem avulsa",
    categoryId: "cat_rev_trips",
    costCenterId: "cc_trips",
    value: 1150,
    origin: "TRIP",
    originRef: "trip_2",
    tripId: "trip_2",
    clientId: "client_3",
    financialAccountId: "fa_wallet_1"
  },
  {
    id: "fe_4",
    recordId: "ap_3",
    type: "EXPENSE",
    status: "OVERDUE",
    date: "2026-04-25",
    description: "Folha motorista pendente",
    categoryId: "cat_exp_salary",
    costCenterId: "cc_rh",
    value: 4388,
    origin: "RH",
    originRef: "driver_1",
    driverId: "driver_1",
    financialAccountId: "fa_bank_1"
  },
  {
    id: "fe_5",
    type: "EXPENSE",
    status: "PAID",
    date: "2026-04-22",
    description: "Assinatura plataforma de telemetria",
    categoryId: "cat_exp_tech",
    costCenterId: "cc_admin",
    value: 799,
    origin: "MANUAL",
    financialAccountId: "fa_bank_1"
  }
];

export const financeReconciliationRecords: ReconciliationRecord[] = [
  {
    id: "br_1",
    bankMemo: "TED RECEBIMENTO PREFEITURA",
    postedAt: "2026-04-28",
    amount: 24600,
    accountId: "fa_bank_1",
    status: "MATCHED",
    linkedEntryId: "fe_1"
  },
  {
    id: "br_2",
    bankMemo: "PIX POSTO CENTRAL",
    postedAt: "2026-04-29",
    amount: 2800,
    accountId: "fa_bank_1",
    status: "MATCHED",
    linkedEntryId: "fe_2"
  },
  {
    id: "br_3",
    bankMemo: "BOLETO TELEMETRIA",
    postedAt: "2026-04-22",
    amount: 799,
    accountId: "fa_bank_1",
    status: "PENDING"
  }
];

export const financeInvoices: InvoiceRecord[] = [
  {
    id: "inv_1",
    clientId: "client_1",
    contractId: "contract_1",
    description: "Fatura mensal abril - Linha Norte",
    value: 24600,
    dueDate: "2026-04-30",
    status: "PAID",
    paymentLink: "https://pay.inturb.local/invoice/inv_1",
    notes: "Pago por transferencia."
  },
  {
    id: "inv_2",
    clientId: "client_2",
    contractId: "contract_2",
    description: "Fatura servico escolar complementar",
    value: 5900,
    dueDate: "2026-04-24",
    status: "OVERDUE",
    notes: "Em cobranca."
  },
  {
    id: "inv_3",
    clientId: "client_3",
    tripId: "trip_2",
    description: "Fatura viagem avulsa turno noite",
    value: 1150,
    dueDate: "2026-04-29",
    status: "OPEN",
    paymentLink: "https://pay.inturb.local/invoice/inv_3"
  }
];

export const financeDocuments: FinancialDocument[] = [
  {
    id: "doc_1",
    entryId: "fe_1",
    recordType: "RECEIVABLE",
    documentType: "RECEIPT",
    fileName: "recibo_prefeitura_abril.pdf",
    uploadedAt: "2026-04-28T15:30:00.000Z"
  },
  {
    id: "doc_2",
    entryId: "fe_2",
    recordType: "PAYABLE",
    documentType: "PROOF",
    fileName: "comprovante_abastecimento_1604.pdf",
    uploadedAt: "2026-04-29T12:10:00.000Z"
  },
  {
    id: "doc_3",
    entryId: "inv_3",
    recordType: "INVOICE",
    documentType: "BOLETO",
    fileName: "boleto_inv_3.pdf",
    uploadedAt: "2026-04-27T09:20:00.000Z",
    notes: "Enviado por email ao cliente."
  }
];

