import { ExpenseRecord, ExpenseCategory, ExpenseCategorySummary, ExpensePaymentMethod } from '../types';

const STORAGE_KEY = 'lordlub_expenses_records_v1';

export const EXPENSE_CATEGORIES_CONFIG: Record<
  ExpenseCategory,
  { label: string; color: string; description: string }
> = {
  ALUGUEL: {
    label: 'Aluguel & Condomínio',
    color: '#6366f1', // Indigo
    description: 'Locação do galpão/loja, condomínio e taxa de ocupação',
  },
  ENERGIA: {
    label: 'Energia Elétrica',
    color: '#f59e0b', // Amber
    description: 'Contas de luz e consumo elétrico da oficina/almoxarifado',
  },
  AGUA: {
    label: 'Água & Saneamento',
    color: '#06b6d4', // Cyan
    description: 'Fornecimento de água encanada e esgoto',
  },
  MANUTENCAO: {
    label: 'Manutenção Predial',
    color: '#ea580c', // Orange
    description: 'Consertos prediais, reformas, telhado, portão e pintura',
  },
  INTERNET_TELEFONIA: {
    label: 'Internet & Telefonia',
    color: '#3b82f6', // Blue
    description: 'Link de internet fibra, telefone fixo e celular corporativo',
  },
  IMPOSTOS_TAXAS: {
    label: 'Impostos & Taxas',
    color: '#ef4444', // Red
    description: 'Tributos municipais/estaduais, alvará, taxas de fiscalização',
  },
  CONTABILIDADE: {
    label: 'Contabilidade & Jurídico',
    color: '#8b5cf6', // Violet
    description: 'Honorários contábeis, assessoria jurídica e certidões',
  },
  MATERIAL_CONSUMO: {
    label: 'Material de Limpeza & Copa',
    color: '#10b981', // Emerald
    description: 'Descartáveis, produtos de limpeza, café e itens de copa',
  },
  SEGUROS: {
    label: 'Seguros Empresariais',
    color: '#14b8a6', // Teal
    description: 'Apólice de seguro predial, patrimonial e de máquinas',
  },
  MARKETING: {
    label: 'Marketing & Publicidade',
    color: '#ec4899', // Pink
    description: 'Comunicação visual, cartões, uniforme e redes sociais',
  },
  COMBUSTIVEL: {
    label: 'Combustível & Transporte',
    color: '#b45309', // Brown/Amber
    description: 'Abastecimento da frota de entrega e visitas técnicas',
  },
  OUTRAS: {
    label: 'Outras Despesas Operacionais',
    color: '#64748b', // Slate
    description: 'Pequenas despesas de caixa e suprimentos diversos',
  },
};

export const INITIAL_DEMO_EXPENSES: ExpenseRecord[] = [
  {
    id: 'exp-demo-01',
    description: 'Aluguel do Galpão & Almoxarifado Central',
    category: 'ALUGUEL',
    amount: 3500.00,
    dueDate: '2026-10-10',
    paymentDate: '2026-10-02',
    paymentTime: '10:30:00',
    competenceMonth: '2026-10',
    status: 'PAGA',
    paymentMethod: 'TRANSFERENCIA',
    supplierOrBeneficiary: 'Imobiliária Santa Cruz Ltda',
    documentNumber: 'ALUG-10/2026',
    notes: 'Pago pontualmente com desconto de pontualidade',
    isRecurring: true,
    createdAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'exp-demo-02',
    description: 'Conta de Energia Elétrica - Oficina e Estoque',
    category: 'ENERGIA',
    amount: 1240.85,
    dueDate: '2026-10-15',
    competenceMonth: '2026-10',
    status: 'PENDENTE',
    paymentMethod: 'DEBITO_AUTOMATICO',
    supplierOrBeneficiary: 'Companhia Energética (CEMIG)',
    documentNumber: 'FAT-8934120',
    notes: 'Débito programado para o vencimento',
    isRecurring: true,
    createdAt: '2026-10-01T09:00:00.000Z',
  },
  {
    id: 'exp-demo-03',
    description: 'Revisão Elétrica e Manutenção do Portão Automático',
    category: 'MANUTENCAO',
    amount: 850.00,
    dueDate: '2026-10-05',
    paymentDate: '2026-10-02',
    paymentTime: '15:20:00',
    competenceMonth: '2026-10',
    status: 'PAGA',
    paymentMethod: 'PIX',
    supplierOrBeneficiary: 'Serralheria & Manutenções Express',
    documentNumber: 'OS-MANUT-44',
    notes: 'Troca de cremalheira e rolamentos do portão frontal',
    isRecurring: false,
    createdAt: '2026-10-02T11:00:00.000Z',
  },
  {
    id: 'exp-demo-04',
    description: 'Consumo de Água & Esgoto',
    category: 'AGUA',
    amount: 285.40,
    dueDate: '2026-10-20',
    competenceMonth: '2026-10',
    status: 'PENDENTE',
    paymentMethod: 'BOLETO',
    supplierOrBeneficiary: 'Serviço Autônomo de Água e Esgoto',
    documentNumber: 'AGUA-202610-09',
    notes: 'Consumo dentro da média mensal',
    isRecurring: true,
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'exp-demo-05',
    description: 'Link Dedicado de Fibra Óptica 600MB + Telefonia Fixa',
    category: 'INTERNET_TELEFONIA',
    amount: 249.90,
    dueDate: '2026-10-12',
    paymentDate: '2026-10-02',
    paymentTime: '14:10:00',
    competenceMonth: '2026-10',
    status: 'PAGA',
    paymentMethod: 'BOLETO',
    supplierOrBeneficiary: 'Telecom Provedor de Internet',
    documentNumber: 'FAT-TEL-9982',
    isRecurring: true,
    createdAt: '2026-10-01T08:30:00.000Z',
  },
  {
    id: 'exp-demo-06',
    description: 'Honorários Contábeis e Assessoria Fiscal',
    category: 'CONTABILIDADE',
    amount: 1200.00,
    dueDate: '2026-10-10',
    competenceMonth: '2026-10',
    status: 'PENDENTE',
    paymentMethod: 'PIX',
    supplierOrBeneficiary: 'Escritório Contábil Modelo',
    documentNumber: 'HON-10/2026',
    isRecurring: true,
    createdAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'exp-demo-07',
    description: 'Abastecimento de Material de Limpeza e Copa',
    category: 'MATERIAL_CONSUMO',
    amount: 320.00,
    dueDate: '2026-10-02',
    paymentDate: '2026-10-02',
    paymentTime: '11:45:00',
    competenceMonth: '2026-10',
    status: 'PAGA',
    paymentMethod: 'DINHEIRO',
    supplierOrBeneficiary: 'Distribuidora Higiene & Limpeza',
    documentNumber: 'NF-6712',
    notes: 'Compra de desinfetante, sabonete líquido, café e copos',
    isRecurring: false,
    createdAt: '2026-10-02T11:45:00.000Z',
  },
  {
    id: 'exp-demo-08',
    description: 'Taxa Anual de Funcionamento e Alvará Sanitário',
    category: 'IMPOSTOS_TAXAS',
    amount: 450.00,
    dueDate: '2026-10-25',
    competenceMonth: '2026-10',
    status: 'PENDENTE',
    paymentMethod: 'BOLETO',
    supplierOrBeneficiary: 'Prefeitura Municipal / Secretaria de Fazenda',
    documentNumber: 'DAM-2026-8871',
    notes: 'Vigência 2026/2027',
    isRecurring: false,
    createdAt: '2026-10-01T14:00:00.000Z',
  },
  // Competência Anterior: Setembro / 2026 para histórico
  {
    id: 'exp-demo-09',
    description: 'Aluguel do Galpão & Almoxarifado Central (Setembro)',
    category: 'ALUGUEL',
    amount: 3500.00,
    dueDate: '2026-09-10',
    paymentDate: '2026-09-08',
    paymentTime: '11:00:00',
    competenceMonth: '2026-09',
    status: 'PAGA',
    paymentMethod: 'TRANSFERENCIA',
    supplierOrBeneficiary: 'Imobiliária Santa Cruz Ltda',
    documentNumber: 'ALUG-09/2026',
    isRecurring: true,
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'exp-demo-10',
    description: 'Conta de Energia Elétrica (Setembro)',
    category: 'ENERGIA',
    amount: 1190.40,
    dueDate: '2026-09-15',
    paymentDate: '2026-09-15',
    paymentTime: '09:00:00',
    competenceMonth: '2026-09',
    status: 'PAGA',
    paymentMethod: 'DEBITO_AUTOMATICO',
    supplierOrBeneficiary: 'Companhia Energética (CEMIG)',
    documentNumber: 'FAT-882190',
    isRecurring: true,
    createdAt: '2026-09-01T09:00:00.000Z',
  },
  {
    id: 'exp-demo-11',
    description: 'Conserto da Calha e Pintura Externa',
    category: 'MANUTENCAO',
    amount: 620.00,
    dueDate: '2026-09-18',
    paymentDate: '2026-09-18',
    paymentTime: '16:00:00',
    competenceMonth: '2026-09',
    status: 'PAGA',
    paymentMethod: 'PIX',
    supplierOrBeneficiary: 'Prestador Autônomo Carlos Elétrica',
    documentNumber: 'REC-098',
    isRecurring: false,
    createdAt: '2026-09-18T10:00:00.000Z',
  }
];

export function getStoredExpenses(): ExpenseRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_EXPENSES));
      return INITIAL_DEMO_EXPENSES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Ajustar automaticamente status se a conta estiver vencida
      const todayStr = new Date().toISOString().substring(0, 10);
      return parsed.map((item: any) => {
        const amount = Number(item.amount) || 0;
        let status = item.status || 'PENDENTE';
        if (status === 'PENDENTE' && item.dueDate && item.dueDate < todayStr) {
          status = 'VENCIDA';
        }
        return {
          ...item,
          amount,
          status,
        };
      });
    }
    return INITIAL_DEMO_EXPENSES;
  } catch (err) {
    console.error('Erro ao ler despesas do localStorage:', err);
    return INITIAL_DEMO_EXPENSES;
  }
}

export function saveStoredExpenses(expenses: ExpenseRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (err) {
    console.error('Erro ao salvar despesas no localStorage:', err);
  }
}

export function addExpenseRecord(
  data: Omit<ExpenseRecord, 'id' | 'createdAt'>
): ExpenseRecord {
  const current = getStoredExpenses();
  const id = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newRecord: ExpenseRecord = {
    ...data,
    id,
    amount: Number(data.amount) || 0,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [newRecord, ...current];
  saveStoredExpenses(updated);
  return newRecord;
}

export function updateExpenseRecord(
  id: string,
  data: Partial<Omit<ExpenseRecord, 'id' | 'createdAt'>>
): ExpenseRecord | null {
  const current = getStoredExpenses();
  const index = current.findIndex(e => e.id === id);
  if (index === -1) return null;

  const existing = current[index];
  const updatedRecord: ExpenseRecord = {
    ...existing,
    ...data,
    amount: data.amount !== undefined ? Number(data.amount) || 0 : existing.amount,
    updatedAt: new Date().toISOString(),
  };

  current[index] = updatedRecord;
  saveStoredExpenses(current);
  return updatedRecord;
}

export function payExpenseRecord(
  id: string,
  paymentData: {
    paymentDate: string;
    paymentTime?: string;
    paymentMethod: ExpensePaymentMethod;
    notes?: string;
  }
): ExpenseRecord | null {
  const current = getStoredExpenses();
  const index = current.findIndex(e => e.id === id);
  if (index === -1) return null;

  const existing = current[index];
  const updatedRecord: ExpenseRecord = {
    ...existing,
    status: 'PAGA',
    paymentDate: paymentData.paymentDate,
    paymentTime: paymentData.paymentTime || new Date().toTimeString().substring(0, 8),
    paymentMethod: paymentData.paymentMethod,
    notes: paymentData.notes ? `${existing.notes ? existing.notes + ' • ' : ''}${paymentData.notes}` : existing.notes,
    updatedAt: new Date().toISOString(),
  };

  current[index] = updatedRecord;
  saveStoredExpenses(current);
  return updatedRecord;
}

export function deleteExpenseRecord(id: string): boolean {
  const current = getStoredExpenses();
  const filtered = current.filter(e => e.id !== id);
  if (filtered.length !== current.length) {
    saveStoredExpenses(filtered);
    return true;
  }
  return false;
}

export function resetExpensesDemo(): ExpenseRecord[] {
  saveStoredExpenses(INITIAL_DEMO_EXPENSES);
  return INITIAL_DEMO_EXPENSES;
}

export function clearAllExpenses(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Calcula o sumário consolidado de despesas agrupado por categoria
 */
export function calculateCategorySummary(
  expenses: ExpenseRecord[]
): ExpenseCategorySummary[] {
  const totalGlobal = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  const categories = Object.keys(EXPENSE_CATEGORIES_CONFIG) as ExpenseCategory[];

  const summaries: ExpenseCategorySummary[] = categories.map(cat => {
    const catExpenses = expenses.filter(e => e.category === cat);
    const totalAmount = catExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const paidAmount = catExpenses
      .filter(e => e.status === 'PAGA')
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const pendingAmount = catExpenses
      .filter(e => e.status !== 'PAGA' && e.status !== 'CANCELADA')
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    const count = catExpenses.length;
    const percentage = totalGlobal > 0 ? (totalAmount / totalGlobal) * 100 : 0;

    return {
      category: cat,
      label: EXPENSE_CATEGORIES_CONFIG[cat].label,
      color: EXPENSE_CATEGORIES_CONFIG[cat].color,
      totalAmount: Math.round(totalAmount * 100) / 100,
      paidAmount: Math.round(paidAmount * 100) / 100,
      pendingAmount: Math.round(pendingAmount * 100) / 100,
      count,
      percentage: Math.round(percentage * 10) / 10,
    };
  });

  // Retorna ordenado do maior montante gasto para o menor, mantendo apenas categorias com despesas primeiro
  return summaries.sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * Exporta a listagem geral de despesas para CSV compatível com Excel
 */
export function exportExpensesCSV(expenses: ExpenseRecord[], competenceFilter?: string): void {
  const headers = [
    'ID',
    'Descrição da Despesa',
    'Categoria',
    'Valor (R$)',
    'Data de Vencimento',
    'Status',
    'Data de Pagamento',
    'Forma de Pagamento',
    'Fornecedor / Beneficiário',
    'Competência',
    'Nº Documento',
    'Despesa Recorrente',
    'Observações'
  ];

  const paymentLabels: Record<string, string> = {
    BOLETO: 'Boleto Bancário',
    PIX: 'Pix Instantâneo',
    TRANSFERENCIA: 'Transferência Bancária (TED/DOC)',
    DEBITO_AUTOMATICO: 'Débito Automático',
    DINHEIRO: 'Dinheiro em Espécie',
    CARTAO_CREDITO: 'Cartão de Crédito',
    OUTRO: 'Outro'
  };

  const statusLabels: Record<string, string> = {
    PENDENTE: 'Pendente / A Pagar',
    PAGA: 'Paga / Liquidada',
    VENCIDA: 'Vencida',
    CANCELADA: 'Cancelada'
  };

  const rows = expenses.map(exp => [
    exp.id,
    exp.description.replace(/;/g, ','),
    EXPENSE_CATEGORIES_CONFIG[exp.category]?.label || exp.category,
    (Number(exp.amount) || 0).toFixed(2).replace('.', ','),
    exp.dueDate,
    statusLabels[exp.status] || exp.status,
    exp.paymentDate || '-',
    paymentLabels[exp.paymentMethod] || exp.paymentMethod,
    (exp.supplierOrBeneficiary || '').replace(/;/g, ','),
    exp.competenceMonth,
    exp.documentNumber || '-',
    exp.isRecurring ? 'Sim' : 'Não',
    (exp.notes || '').replace(/;/g, ',')
  ]);

  const title = competenceFilter && competenceFilter !== 'ALL'
    ? `RELATÓRIO DE DESPESAS OPERACIONAIS - COMPETÊNCIA ${competenceFilter}`
    : 'RELATÓRIO GERAL DE DESPESAS OPERACIONAIS E CONTAS A PAGAR';

  const csvContent =
    '\uFEFF' +
    `${title}\r\n\r\n` +
    headers.join(';') +
    '\r\n' +
    rows.map(r => r.join(';')).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Relatorio_Despesas_${competenceFilter || 'Geral'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporta o Relatório Consolidado de Despesas por Categoria para CSV
 */
export function exportCategoryReportCSV(
  summaries: ExpenseCategorySummary[],
  competenceFilter?: string
): void {
  const headers = [
    'Categoria de Despesa',
    'Total Gasto (R$)',
    'Total Pago (R$)',
    'Total Pendente (R$)',
    'Participação (%)',
    'Quantidade de Contas',
    'Ticket Médio (R$)'
  ];

  const rows = summaries
    .filter(s => s.count > 0 || s.totalAmount > 0)
    .map(s => {
      const avg = s.count > 0 ? s.totalAmount / s.count : 0;
      return [
        s.label,
        s.totalAmount.toFixed(2).replace('.', ','),
        s.paidAmount.toFixed(2).replace('.', ','),
        s.pendingAmount.toFixed(2).replace('.', ','),
        s.percentage.toFixed(1).replace('.', ',') + '%',
        s.count.toString(),
        avg.toFixed(2).replace('.', ',')
      ];
    });

  const totalAll = summaries.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalPaid = summaries.reduce((acc, s) => acc + s.paidAmount, 0);
  const totalPending = summaries.reduce((acc, s) => acc + s.pendingAmount, 0);

  rows.push([
    'TOTAL GERAL',
    totalAll.toFixed(2).replace('.', ','),
    totalPaid.toFixed(2).replace('.', ','),
    totalPending.toFixed(2).replace('.', ','),
    '100,0%',
    summaries.reduce((acc, s) => acc + s.count, 0).toString(),
    '-'
  ]);

  const title = competenceFilter && competenceFilter !== 'ALL'
    ? `RELATÓRIO CONSOLIDADO DE DESPESAS POR CATEGORIA - COMPETÊNCIA ${competenceFilter}`
    : 'RELATÓRIO CONSOLIDADO DE DESPESAS POR CATEGORIA - TODAS AS COMPETÊNCIAS';

  const csvContent =
    '\uFEFF' +
    `${title}\r\n\r\n` +
    headers.join(';') +
    '\r\n' +
    rows.map(r => r.join(';')).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Despesas_Por_Categoria_${competenceFilter || 'Geral'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
