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

export interface Invoice {
  id: string;
  number: string; // nNF
  series: string; // serie
  accessKey: string; // chave de 44 dígitos
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
export type AdvanceStatus = 'PENDENTE_DESCONTO' | 'DESCONTADO_FOLHA' | 'CANCELADO';

export interface SalaryAdvance {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRegistration: string;
  employeeRole: string;
  employeeDepartment: string;
  date: string; // YYYY-MM-DD (data da entrega do adiantamento)
  competenceMonth: string; // YYYY-MM (mês de referência para desconto em folha)
  amount: number; // Valor em reais R$
  paymentMethod: AdvancePaymentMethod; // Dinheiro em espécie, Pix, etc.
  category: AdvanceCategory;
  reason: string; // Motivo ou descrição
  status: AdvanceStatus; // Pendente ou Já Descontado
  approvedBy?: string; // Responsável pela liberação do dinheiro
  receiptSigned?: boolean; // Se assinou recibo físico
  notes?: string;
  createdAt: string; // ISO
  updatedAt?: string;
}


