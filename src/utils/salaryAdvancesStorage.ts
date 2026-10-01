import { SalaryAdvance, Employee } from '../types';

const STORAGE_KEY = 'nfe_stock_salary_advances_clean_v1';

export const INITIAL_SALARY_ADVANCES: SalaryAdvance[] = [];

export function getStoredSalaryAdvances(): SalaryAdvance[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return [];
  }
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    // Garantir conversões numéricas para evitar erros de soma
    return parsed.map((item: any) => ({
      ...item,
      amount: Number(item.amount) || 0,
    }));
  } catch (err) {
    console.error('Erro ao ler vales/adiantamentos:', err);
    return [];
  }
}

export function clearAllAdvances(): SalaryAdvance[] {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  localStorage.removeItem('nfe_stock_salary_advances_v1');
  return [];
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
