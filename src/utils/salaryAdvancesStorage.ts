import { SalaryAdvance, Employee } from '../types';

const STORAGE_KEY = 'nfe_stock_salary_advances_v1';

export const INITIAL_SALARY_ADVANCES: SalaryAdvance[] = [
  {
    id: 'vale-1',
    employeeId: 'emp-1',
    employeeName: 'Carlos Eduardo Mendes',
    employeeRegistration: 'MAT-1001',
    employeeRole: 'Almoxarife Líder',
    employeeDepartment: 'Almoxarifado & Estoque',
    date: '2026-09-15',
    competenceMonth: '2026-09',
    amount: 300.0,
    paymentMethod: 'DINHEIRO',
    category: 'ADIANTAMENTO_SALARIAL',
    reason: 'Adiantamento quinzenal padrão solicitado no caixa físico',
    status: 'PENDENTE_DESCONTO',
    approvedBy: 'Gerência de Operações',
    receiptSigned: true,
    notes: 'Entregue em cédulas no balcão do almoxarifado',
    createdAt: '2026-09-15T14:30:00.000Z',
  },
  {
    id: 'vale-2',
    employeeId: 'emp-4',
    employeeName: 'Beatriz Albuquerque',
    employeeRegistration: 'MAT-1004',
    employeeRole: 'Auxiliar de Estoque & Separação',
    employeeDepartment: 'Expedição & Armazém',
    date: '2026-09-18',
    competenceMonth: '2026-09',
    amount: 150.0,
    paymentMethod: 'DINHEIRO',
    category: 'VALE_EMERGENCIAL',
    reason: 'Vale emergencial para despesas de saúde / farmácia',
    status: 'PENDENTE_DESCONTO',
    approvedBy: 'Supervisão de Estoque',
    receiptSigned: true,
    notes: 'Recibo assinado e arquivado na pasta de DP',
    createdAt: '2026-09-18T10:15:00.000Z',
  },
  {
    id: 'vale-3',
    employeeId: 'emp-3',
    employeeName: 'Rodrigo Silva Santos',
    employeeRegistration: 'MAT-1003',
    employeeRole: 'Operador de Empilhadeira',
    employeeDepartment: 'Estoque & Logística',
    date: '2026-09-08',
    competenceMonth: '2026-09',
    amount: 250.0,
    paymentMethod: 'PIX',
    category: 'ADIANTAMENTO_SALARIAL',
    reason: 'Adiantamento transferido via Pix chave CPF',
    status: 'DESCONTADO_FOLHA',
    approvedBy: 'Financeiro',
    receiptSigned: true,
    notes: 'Comprovante bancário anexado à prévia da folha',
    createdAt: '2026-09-08T16:00:00.000Z',
  },
  {
    id: 'vale-4',
    employeeId: 'emp-2',
    employeeName: 'Mariana Souza Lima',
    employeeRegistration: 'MAT-1002',
    employeeRole: 'Conferente de NF-e & Entrada',
    employeeDepartment: 'Recebimento Fiscal',
    date: '2026-09-22',
    competenceMonth: '2026-09',
    amount: 120.0,
    paymentMethod: 'DINHEIRO',
    category: 'VALE_TRANSPORTE_EXTRA',
    reason: 'Ajuda de transporte para plantão de inventário fiscal',
    status: 'PENDENTE_DESCONTO',
    approvedBy: 'Coordenação Fiscal',
    receiptSigned: true,
    notes: 'Retirada em espécie do fundo de caixa',
    createdAt: '2026-09-22T09:00:00.000Z',
  }
];

export function getStoredSalaryAdvances(): SalaryAdvance[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SALARY_ADVANCES));
    return INITIAL_SALARY_ADVANCES;
  }
  try {
    const parsed = JSON.parse(data);
    // Garantir conversões numéricas para evitar erros de soma
    return parsed.map((item: any) => ({
      ...item,
      amount: Number(item.amount) || 0,
    }));
  } catch (err) {
    console.error('Erro ao ler vales/adiantamentos:', err);
    return INITIAL_SALARY_ADVANCES;
  }
}

export function saveStoredSalaryAdvances(advances: SalaryAdvance[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(advances));
}

export function addSalaryAdvance(
  advanceData: Omit<SalaryAdvance, 'id' | 'createdAt'>
): { success: boolean; advance: SalaryAdvance; advances: SalaryAdvance[] } {
  const current = getStoredSalaryAdvances();
  const now = new Date().toISOString();
  const newAdvance: SalaryAdvance = {
    ...advanceData,
    id: `vale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    amount: Number(advanceData.amount) || 0,
    createdAt: now,
  };

  const updated = [newAdvance, ...current];
  saveStoredSalaryAdvances(updated);

  return {
    success: true,
    advance: newAdvance,
    advances: updated,
  };
}

export function updateSalaryAdvance(
  updatedAdvance: SalaryAdvance
): { success: boolean; advances: SalaryAdvance[]; error?: string } {
  const current = getStoredSalaryAdvances();
  const index = current.findIndex(v => v.id === updatedAdvance.id);
  if (index === -1) {
    return { success: false, advances: current, error: 'Vale não encontrado.' };
  }

  const updated = [...current];
  updated[index] = {
    ...updatedAdvance,
    amount: Number(updatedAdvance.amount) || 0,
    updatedAt: new Date().toISOString(),
  };

  saveStoredSalaryAdvances(updated);
  return { success: true, advances: updated };
}

export function deleteSalaryAdvance(
  id: string
): { success: boolean; advances: SalaryAdvance[]; deleted?: SalaryAdvance; error?: string } {
  const current = getStoredSalaryAdvances();
  const target = current.find(v => v.id === id);
  if (!target) {
    return { success: false, advances: current, error: 'Vale não encontrado para exclusão.' };
  }

  const updated = current.filter(v => v.id !== id);
  saveStoredSalaryAdvances(updated);
  return { success: true, advances: updated, deleted: target };
}

export function resetSalaryAdvancesDemo(): SalaryAdvance[] {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SALARY_ADVANCES));
  return INITIAL_SALARY_ADVANCES;
}

/**
 * Exporta os vales em arquivo CSV compatível com Excel
 */
export function exportSalaryAdvancesCSV(advances: SalaryAdvance[], monthFilter?: string): void {
  const headers = [
    'ID do Vale',
    'Data de Entrega',
    'Mês Competência',
    'Colaborador',
    'Matrícula',
    'Cargo',
    'Departamento',
    'Valor (R$)',
    'Forma de Pagamento',
    'Categoria / Finalidade',
    'Status',
    'Assinado Recibo',
    'Responsável Liberação',
    'Motivo / Descrição',
    'Observações'
  ];

  const paymentLabel: Record<string, string> = {
    DINHEIRO: 'Dinheiro em Espécie',
    PIX: 'Pix',
    TRANSFERENCIA: 'Transferência Bancária',
    CHEQUE: 'Cheque',
    OUTRO: 'Outro'
  };

  const statusLabel: Record<string, string> = {
    PENDENTE_DESCONTO: 'Pendente de Desconto em Folha',
    DESCONTADO_FOLHA: 'Descontado em Folha',
    CANCELADO: 'Cancelado'
  };

  const rows = advances.map(adv => [
    adv.id,
    adv.date,
    adv.competenceMonth,
    adv.employeeName,
    adv.employeeRegistration,
    adv.employeeRole,
    adv.employeeDepartment,
    (Number(adv.amount) || 0).toFixed(2).replace('.', ','),
    paymentLabel[adv.paymentMethod] || adv.paymentMethod,
    adv.category,
    statusLabel[adv.status] || adv.status,
    adv.receiptSigned ? 'Sim' : 'Não',
    adv.approvedBy || '',
    adv.reason.replace(/;/g, ','),
    (adv.notes || '').replace(/;/g, ',')
  ]);

  const title = monthFilter && monthFilter !== 'ALL'
    ? `RELATÓRIO DE VALES E ADIANTAMENTOS SALARIAIS - COMPETÊNCIA ${monthFilter}`
    : 'RELATÓRIO GERAL DE VALES E ADIANTAMENTOS SALARIAIS';

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
  link.setAttribute('download', `Vales_Adiantamentos_${monthFilter || 'Geral'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
