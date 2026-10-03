import { SalaryAdvance, Employee, AdvanceMovement, AdvanceStatus } from '../types';

const STORAGE_KEY = 'nfe_stock_salary_advances_clean_v1';

export const INITIAL_SALARY_ADVANCES: SalaryAdvance[] = [];

/**
 * Garante a integridade financeira e de histórico de um vale,
 * recalculando saldo devedor, total pago e status a partir dos lançamentos (movimentações)
 */
export function ensureAdvanceIntegrity(rawAdv: any): SalaryAdvance {
  const baseAmount = Number(rawAdv.amount) || 0;
  let movements: AdvanceMovement[] = Array.isArray(rawAdv.movements) ? [...rawAdv.movements] : [];

  // Se não possuir movimentações registradas, inicializa com o primeiro lançamento de adição
  if (movements.length === 0 && baseAmount > 0) {
    const createdAt = rawAdv.createdAt || new Date().toISOString();
    const [dPart, tPart] = createdAt.split('T');
    const time = rawAdv.time || (tPart ? tPart.substring(0, 8) : '08:00:00');
    movements = [
      {
        id: `mov-init-${rawAdv.id || Date.now()}`,
        advanceId: rawAdv.id,
        type: 'ADICAO_VALOR',
        amount: baseAmount,
        dateTime: createdAt,
        date: rawAdv.date || dPart || new Date().toISOString().substring(0, 10),
        time,
        paymentMethod: rawAdv.paymentMethod || 'DINHEIRO',
        reason: rawAdv.reason || 'Lançamento inicial de adiantamento',
        approvedBy: rawAdv.approvedBy || '',
        notes: rawAdv.notes || '',
      }
    ];
  }

  // Recalcular montantes a partir das movimentações registradas com data e hora
  let totalAdded = 0;
  let totalPaid = 0;

  movements.forEach(m => {
    const val = Number(m.amount) || 0;
    if (m.type === 'ADICAO_VALOR') {
      totalAdded += val;
    } else if (m.type === 'BAIXA_VALOR') {
      totalPaid += val;
    }
  });

  const finalAmount = totalAdded > 0 ? Math.round(totalAdded * 100) / 100 : baseAmount;
  const finalPaid = Math.round(totalPaid * 100) / 100;
  const balanceAmount = Math.max(0, Math.round((finalAmount - finalPaid) * 100) / 100);

  let status: AdvanceStatus = rawAdv.status || 'PENDENTE_DESCONTO';
  if (status !== 'CANCELADO') {
    if (balanceAmount <= 0.009) {
      status = 'DESCONTADO_FOLHA';
    } else if (finalPaid > 0) {
      status = 'PARCIALMENTE_BAIXADO';
    } else {
      status = 'PENDENTE_DESCONTO';
    }
  }

  return {
    ...rawAdv,
    amount: finalAmount,
    balanceAmount,
    totalPaidAmount: finalPaid,
    status,
    movements,
  };
}

export function getStoredSalaryAdvances(): SalaryAdvance[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return [];
  }
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any) => ensureAdvanceIntegrity(item));
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
  const validated = advances.map(a => ensureAdvanceIntegrity(a));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
}

export function addSalaryAdvance(
  advanceData: Omit<SalaryAdvance, 'id' | 'createdAt'>
): { success: boolean; advance: SalaryAdvance; advances: SalaryAdvance[] } {
  const current = getStoredSalaryAdvances();
  const now = new Date();
  const nowISO = now.toISOString();
  const nowTime = now.toTimeString().substring(0, 8);
  const id = `vale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const amount = Number(advanceData.amount) || 0;

  // Lançamento inicial na conta do vale
  const initialMovement: AdvanceMovement = {
    id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    advanceId: id,
    type: 'ADICAO_VALOR',
    amount,
    dateTime: nowISO,
    date: advanceData.date || nowISO.substring(0, 10),
    time: advanceData.time || nowTime,
    paymentMethod: advanceData.paymentMethod || 'DINHEIRO',
    reason: advanceData.reason || 'Concessão inicial de adiantamento',
    approvedBy: advanceData.approvedBy || '',
    notes: advanceData.notes || '',
  };

  const newAdvance: SalaryAdvance = ensureAdvanceIntegrity({
    ...advanceData,
    id,
    amount,
    time: advanceData.time || nowTime,
    balanceAmount: amount,
    totalPaidAmount: 0,
    status: 'PENDENTE_DESCONTO',
    movements: advanceData.movements && advanceData.movements.length > 0
      ? advanceData.movements
      : [initialMovement],
    createdAt: nowISO,
    updatedAt: nowISO,
  });

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
): { success: boolean; advances: SalaryAdvance[]; advance?: SalaryAdvance; error?: string } {
  const current = getStoredSalaryAdvances();
  const index = current.findIndex(v => v.id === updatedAdvance.id);
  if (index === -1) {
    return { success: false, advances: current, error: 'Vale não encontrado.' };
  }

  const validated = ensureAdvanceIntegrity({
    ...updatedAdvance,
    updatedAt: new Date().toISOString(),
  });

  const updated = [...current];
  updated[index] = validated;

  saveStoredSalaryAdvances(updated);
  return { success: true, advances: updated, advance: validated };
}

/**
 * Adiciona uma nova movimentação (Adição de Valor ou Baixa/Quitação) ao card do vale
 * com registro fiel de Data e Hora
 */
export function addMovementToAdvance(
  advanceId: string,
  movementData: Omit<AdvanceMovement, 'id' | 'advanceId'>
): { success: boolean; advance?: SalaryAdvance; advances: SalaryAdvance[]; error?: string } {
  const current = getStoredSalaryAdvances();
  const index = current.findIndex(v => v.id === advanceId);
  if (index === -1) {
    return { success: false, advances: current, error: 'Vale não encontrado.' };
  }

  const target = current[index];
  const newMovementId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date();

  const newMovement: AdvanceMovement = {
    ...movementData,
    id: newMovementId,
    advanceId,
    amount: Number(movementData.amount) || 0,
    dateTime: movementData.dateTime || now.toISOString(),
    date: movementData.date || now.toISOString().substring(0, 10),
    time: movementData.time || now.toTimeString().substring(0, 8),
  };

  const updatedMovements = [...(target.movements || []), newMovement];
  const updatedAdvance = ensureAdvanceIntegrity({
    ...target,
    movements: updatedMovements,
    updatedAt: now.toISOString(),
  });

  current[index] = updatedAdvance;
  saveStoredSalaryAdvances(current);

  return {
    success: true,
    advance: updatedAdvance,
    advances: current,
  };
}

/**
 * Exclui uma movimentação específica de um vale e recalcula os totais do card
 */
export function deleteMovementFromAdvance(
  advanceId: string,
  movementId: string
): { success: boolean; advance?: SalaryAdvance; advances: SalaryAdvance[]; error?: string } {
  const current = getStoredSalaryAdvances();
  const index = current.findIndex(v => v.id === advanceId);
  if (index === -1) {
    return { success: false, advances: current, error: 'Vale não encontrado.' };
  }

  const target = current[index];
  const updatedMovements = (target.movements || []).filter(m => m.id !== movementId);

  const updatedAdvance = ensureAdvanceIntegrity({
    ...target,
    movements: updatedMovements,
    updatedAt: new Date().toISOString(),
  });

  current[index] = updatedAdvance;
  saveStoredSalaryAdvances(current);

  return {
    success: true,
    advance: updatedAdvance,
    advances: current,
  };
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
    'Data da Concessão',
    'Mês Competência',
    'Colaborador',
    'Matrícula',
    'Cargo',
    'Departamento',
    'Total Adiantado (R$)',
    'Total Baixado (R$)',
    'Saldo Devedor (R$)',
    'Forma Principal',
    'Categoria / Finalidade',
    'Status Atual',
    'Nº Lançamentos',
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
    PARCIALMENTE_BAIXADO: 'Parcialmente Baixado',
    DESCONTADO_FOLHA: 'Totalmente Quitado / Descontado',
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
    (Number(adv.totalPaidAmount) || 0).toFixed(2).replace('.', ','),
    (Number(adv.balanceAmount) || 0).toFixed(2).replace('.', ','),
    paymentLabel[adv.paymentMethod] || adv.paymentMethod,
    adv.category,
    statusLabel[adv.status] || adv.status,
    (adv.movements?.length || 1).toString(),
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
