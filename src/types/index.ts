export type MovementType = 'ENTRADA_NFE' | 'ENTRADA_AJUSTE' | 'SAIDA_VENDA' | 'SAIDA_PERDA' | 'SAIDA_CONSUMO' | 'AJUSTE_BALANCO';

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string; // UN, CX, KG, LT, M, PCT, etc.
  ncm?: string;
  currentStock: number;
  minStock: number;
  averageCost: number; // Custo médio ponderado unitário
  lastCost: number; // Último custo de entrada unitário
  sellingPrice?: number; // Preço de venda praticado / sugerido
  marginPercent?: number; // Margem bruta ou markup sobre o custo (%)
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  productId?: string; // ID se vinculado a produto existente
  code: string; // cProd do XML
  description: string; // xProd do XML
  ncm: string;
  cfop: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  suggestedSalePrice?: number; // Preço de venda sugerido na entrada da NF-e
  marginPercent?: number; // Margem / markup calculado (%)
  icms?: number;
  ipi?: number;
  pis?: number;
  cofins?: number;
}

export type InvoiceDestination = 'PARNARAMA' | 'TERESINA';
export type BoletoStatus = 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'CANCELADO';

export interface InvoiceBoleto {
  id: string;
  invoiceId?: string; // ID da NF vinculada
  invoiceNumber?: string; // Número da NF
  supplierName?: string; // Nome do fornecedor / favorecido
  supplierCnpj?: string; // CNPJ fornecedor
  destinationBranch?: InvoiceDestination; // PARNARAMA ou TERESINA
  barcode: string; // Código de barras / Linha digitável
  amount: number; // Valor (R$)
  dueDate: string; // Data de Vencimento (YYYY-MM-DD)
  installmentNumber?: number; // Número da parcela (ex: 1)
  totalInstallments?: number; // Total de parcelas (ex: 3)
  status: BoletoStatus;
  paidAt?: string; // Data do pagamento (YYYY-MM-DD)
  paymentTime?: string; // Hora do pagamento
  paidAmount?: number; // Valor pago efetivo
  paymentMethod?: string; // PIX, Conta Bancária, Dinheiro, etc.
  notes?: string; // Observações
  createdAt: string;
  updatedAt?: string;
}

export interface Invoice {
  id: string;
  number: string; // nNF
  series: string; // serie
  accessKey: string; // chave de 44 dígitos
  destinationBranch?: InvoiceDestination; // PARNARAMA ou TERESINA
  issueDate: string; // dhEmi (YYYY-MM-DD ou ISO)
  entryDate: string; // Data de recebimento no estoque
  supplier: {
    name: string; // xNome
    tradeName?: string; // xFant
    cnpj: string; // CNPJ ou CPF
    stateRegistration?: string; // IE
    uf?: string; // Estado
    city?: string; // Município
  };
  recipient?: {
    name: string;
    cnpj: string;
    uf?: string;
  };
  items: InvoiceItem[];
  totals: {
    productsValue: number;
    freightValue: number;
    taxesValue: number;
    discountValue: number;
    totalInvoiceValue: number;
  };
  boletos?: InvoiceBoleto[]; // Boletos bancários vinculados à nota
  notes?: string;
  status: 'CONFIRMADA' | 'CANCELADA';
  createdAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  unit: string;
  date: string; // ISO ou YYYY-MM-DD
  type: MovementType;
  documentType: 'NFE' | 'MANUAL' | 'INVENTARIO';
  documentNumber?: string; // Ex: NF 10425
  invoiceId?: string;
  supplierOrCustomer?: string;
  quantity: number; // Sempre positivo; o type define se soma ou subtrai
  unitCost: number;
  totalCost: number;
  resultingStock: number;
  resultingAverageCost: number;
  notes?: string;
}

export interface MonthlyProductSummary {
  productId: string;
  code: string;
  name: string;
  unit: string;
  initialStock: number;
  initialValue: number;
  incomingQty: number;
  incomingValue: number;
  outgoingQty: number;
  outgoingValue: number;
  finalStock: number;
  finalValue: number;
  averageUnitCost: number;
}

export interface MonthlyReportData {
  month: number; // 1-12
  year: number;
  monthName: string;
  totalInvoicesCount: number;
  totalIncomingValue: number;
  totalIncomingItemsCount: number;
  totalOutgoingValue: number;
  totalOutgoingItemsCount: number;
  initialInventoryValue: number;
  finalInventoryValue: number;
  movementsCount: number;
  productSummaries: MonthlyProductSummary[];
  topMovedProducts: {
    productId: string;
    name: string;
    incomingQty: number;
    outgoingQty: number;
    totalFlow: number;
  }[];
  cfopBreakdown: {
    cfop: string;
    description: string;
    totalValue: number;
    itemsCount: number;
  }[];
  supplierBreakdown: {
    supplierName: string;
    cnpj: string;
    invoicesCount: number;
    totalValue: number;
  }[];
}

// ==========================================
// Módulo de Controle de Ponto de Funcionários
// ==========================================

export type PunchType = 'ENTRADA' | 'SAIDA_INTERVALO' | 'RETORNO_INTERVALO' | 'SAIDA' | 'EXTRA';
export type DayWorkStatus = 'NORMAL' | 'HORA_EXTRA' | 'ATRASO' | 'FALTA' | 'FOLGA_DSR' | 'ATESTADO' | 'FERIADO';

export interface Employee {
  id: string;
  registrationNumber: string; // Matrícula
  name: string;
  cpf: string;
  role: string; // Cargo (e.g. Almoxarife Líder, Operador de Empilhadeira, Conferente de NF-e, Auxiliar de Estoque)
  department: string; // Almoxarifado, Estoque, Logística, Fiscal/Recebimento, Faturamento
  workShift: string; // Ex: "08:00 às 17:00 (Segunda a Sexta)"
  dailyHoursExpected: number; // Geralmente 8.0 horas
  pin: string; // PIN de 4 dígitos para batida rápida no relógio
  admissionDate: string;
  status: 'ATIVO' | 'FERIAS' | 'AFASTADO';
  hourlyRate?: number; // Valor/hora para cálculo estimativo de horas extras
  avatarInitials?: string;
  phone?: string;
  email?: string;
}

export interface TimePunch {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  timestamp: string; // ISO
  type: PunchType;
  source: 'RELOGIO_DIGITAL' | 'MANUAL' | 'SISTEMA';
  nsr: number; // Número Sequencial de Registro (Portaria 671 / CLT)
  notes?: string;
  device?: string;
}

export interface DailyTimeSheet {
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // Seg, Ter, Qua, Qui, Sex, Sáb, Dom
  employeeId: string;
  punches: TimePunch[];
  entry1?: string; // HH:mm
  exit1?: string;  // HH:mm (Almoço)
  entry2?: string; // HH:mm (Retorno)
  exit2?: string;  // HH:mm (Saída)
  totalWorkedHours: number; // Decimal (ex: 8.5)
  totalWorkedFormatted: string; // "08:30"
  expectedHours: number; // 8.0
  balanceHours: number; // +0.5 ou -0.25
  balanceFormatted: string; // "+00:30" ou "-00:15"
  status: DayWorkStatus;
  notes?: string;
}

export interface MonthlyTimeSheetSummary {
  employee: Employee;
  month: string; // YYYY-MM
  totalWorkedHours: number;
  totalExpectedHours: number;
  overtimeHours: number; // Horas extras positivas
  deficitHours: number; // Horas devidas / atrasos
  bankBalanceHours: number; // Saldo líquido do Banco de Horas
  bankBalanceFormatted: string;
  totalDaysWorked: number;
  absencesCount: number;
  delaysCount: number;
  dailySheets: DailyTimeSheet[];
}

export interface OSItem {
  id: string;
  code: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  totalPrice: number;
  simulatedUnitPrice?: number;
  simulatedTotalPrice?: number;
  diffAmount?: number;
  diffPercent?: number;
}

export interface ServiceOrder {
  id: string;
  orderNumber: string;
  company: {
    name: string;
    phone: string;
    email: string;
    address: string;
    cityUf?: string;
    logoText?: string;
  };
  client: {
    code?: string;
    name: string;
    address: string;
    phone: string;
    cpf: string;
  };
  vehicle: {
    model: string;
    plate: string;
    entryDate: string;
    deliveryEstimate: string;
    km?: string;
    chassis?: string;
  };
  products: OSItem[];
  services: OSItem[];
  totalProducts: number;
  totalServices: number;
  totalAmount: number;
  warrantyNotes?: string;
  thanksNotes?: string;
  signatures: {
    responsible: string;
    client: string;
  };
  paymentCondition?: string;
  simulatedTargetTotal?: number;
}

export interface OSSimulationResult {
  originalTotal: number;
  targetTotal: number;
  ratio: number;
  diffTotal: number;
  diffPercent: number;
  originalProductsTotal: number;
  originalServicesTotal: number;
  simulatedProductsTotal: number;
  simulatedServicesTotal: number;
  productsWeightPercent: number;
  servicesWeightPercent: number;
  simulatedProducts: OSItem[];
  simulatedServices: OSItem[];
}

// ==========================================
// Módulo de Vales & Adiantamentos Salariais
// ==========================================

export type AdvancePaymentMethod = 'DINHEIRO' | 'PIX' | 'TRANSFERENCIA' | 'CHEQUE' | 'OUTRO';
export type AdvanceCategory =
  | 'ADIANTAMENTO_SALARIAL'
  | 'VALE_EMERGENCIAL'
  | 'VALE_ALIMENTACAO_EXTRA'
  | 'VALE_TRANSPORTE_EXTRA'
  | 'AJUDA_DE_CUSTO'
  | 'OUTRO';
export type AdvanceStatus = 'PENDENTE_DESCONTO' | 'PARCIALMENTE_BAIXADO' | 'DESCONTADO_FOLHA' | 'CANCELADO';
export type AdvanceMovementType = 'ADICAO_VALOR' | 'BAIXA_VALOR';

export interface AdvanceMovement {
  id: string;
  advanceId?: string;
  type: AdvanceMovementType; // 'ADICAO_VALOR' ou 'BAIXA_VALOR'
  amount: number;
  dateTime: string; // ISO ou Timestamp completo ex: 2026-10-02T16:55:00.000Z
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  paymentMethod: AdvancePaymentMethod; // Dinheiro em espécie, Pix, etc.
  reason: string; // Motivo da adição ou da baixa
  approvedBy?: string; // Responsável que realizou/autorizou o lançamento
  notes?: string;
  receiptNumber?: string;
}

export interface SalaryAdvance {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRegistration: string;
  employeeRole: string;
  employeeDepartment: string;
  date: string; // YYYY-MM-DD (data da entrega do adiantamento)
  time?: string; // HH:mm:ss
  competenceMonth: string; // YYYY-MM (mês de referência para desconto em folha)
  amount: number; // Valor Total Concedido em reais R$ (soma de adições)
  balanceAmount?: number; // Saldo devedor atual a pagar / a baixar
  totalPaidAmount?: number; // Total já baixado / quitado
  paymentMethod: AdvancePaymentMethod; // Dinheiro em espécie, Pix, etc.
  category: AdvanceCategory;
  reason: string; // Motivo ou descrição
  status: AdvanceStatus; // Pendente, Parcialmente Baixado ou Descontado em Folha
  approvedBy?: string; // Responsável pela liberação do dinheiro
  receiptSigned?: boolean; // Se assinou recibo físico
  notes?: string;
  createdAt: string; // ISO
  updatedAt?: string;
  movements?: AdvanceMovement[]; // Histórico detalhado de adições e baixas com data e hora
}

// ==========================================
// Módulo de Faturamento de Ordens de Serviço (OS)
// ==========================================

export type BillingPaymentMethod =
  | 'PIX'
  | 'DINHEIRO'
  | 'CARTAO_CREDITO'
  | 'CARTAO_DEBITO'
  | 'BOLETO'
  | 'FATURADO'
  | 'OUTRO';

export interface BillingRecord {
  id: string;
  date: string; // YYYY-MM-DD (Data do faturamento da OS)
  serviceOrderNumber: string; // Número da Ordem de Serviço (Ex: OS-1045)
  collaboratorName?: string; // Nome do colaborador / aplicador / mecânico que realizou o serviço
  collaboratorId?: string; // ID do colaborador (se cadastrado no sistema)
  productsTotal: number; // Total de Venda de Produto (R$)
  alignmentBalancingTotal: number; // Total de Venda de Alinhamento e Balanceamento (R$)
  servicesTotal: number; // Total de Serviço (outros serviços mecânicos / mão de obra) (R$)
  grandTotal: number; // Total Geral da OS (productsTotal + alignmentBalancingTotal + servicesTotal)
  customerName?: string; // Nome do cliente (opcional)
  vehiclePlate?: string; // Placa do veículo (opcional)
  vehicleModel?: string; // Modelo / veículo (opcional)
  paymentMethod?: BillingPaymentMethod;
  notes?: string;
  createdAt: string; // ISO
  updatedAt?: string;
}

// ==========================================
// Módulo de Despesas & Contas a Pagar
// ==========================================

export type ExpenseCategory =
  | 'ALUGUEL'
  | 'ENERGIA'
  | 'AGUA'
  | 'MANUTENCAO'
  | 'INTERNET_TELEFONIA'
  | 'IMPOSTOS_TAXAS'
  | 'CONTABILIDADE'
  | 'MATERIAL_CONSUMO'
  | 'SEGUROS'
  | 'MARKETING'
  | 'COMBUSTIVEL'
  | 'OUTRAS';

export type ExpenseStatus = 'PENDENTE' | 'PAGA' | 'VENCIDA' | 'CANCELADA';
export type ExpensePaymentMethod = 'BOLETO' | 'PIX' | 'TRANSFERENCIA' | 'DEBITO_AUTOMATICO' | 'DINHEIRO' | 'CARTAO_CREDITO' | 'OUTRO';

export interface ExpenseRecord {
  id: string;
  description: string; // Ex: Aluguel do Galpão, Conta de Luz CEMIG, Manutenção Predial
  category: ExpenseCategory;
  customCategoryName?: string;
  amount: number; // R$
  dueDate: string; // YYYY-MM-DD (Vencimento)
  paymentDate?: string; // YYYY-MM-DD (Data da liquidação)
  paymentTime?: string; // HH:mm:ss
  competenceMonth: string; // YYYY-MM
  status: ExpenseStatus;
  paymentMethod: ExpensePaymentMethod;
  supplierOrBeneficiary: string; // Fornecedor / Concessionária / Favorecido
  documentNumber?: string; // Nº NF / Fatura / Código de Barras
  notes?: string;
  isRecurring?: boolean; // Se é despesa fixa recorrente
  createdAt: string;
  updatedAt?: string;
}

export interface ExpenseCategorySummary {
  category: ExpenseCategory;
  label: string;
  color: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  count: number;
  percentage: number;
}



