import { InvoiceBoleto, BoletoStatus, InvoiceDestination, Invoice } from '../types';
import { formatDateBR, formatBRL } from './stockCalculations';
import { downloadCSV } from './csvExport';

const BOLETOS_STORAGE_KEY = 'nfe_stock_boletos_v1';

/**
 * Retorna a data de hoje no formato YYYY-MM-DD
 */
export function getTodayDateStr(): string {
  return new Date().toISOString().substring(0, 10);
}

/**
 * Calcula o status dinâmico do boleto considerando vencimento
 */
export function calculateBoletoStatus(boleto: InvoiceBoleto): BoletoStatus {
  if (boleto.status === 'PAGO' || boleto.status === 'CANCELADO') {
    return boleto.status;
  }
  const today = getTodayDateStr();
  if (boleto.dueDate && boleto.dueDate < today) {
    return 'VENCIDO';
  }
  return 'PENDENTE';
}

/**
 * Busca todos os boletos armazenados
 */
export function getStoredBoletos(): InvoiceBoleto[] {
  try {
    const raw = localStorage.getItem(BOLETOS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: InvoiceBoleto[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    // Atualizar status dinâmico de vencidos
    return parsed.map(b => ({
      ...b,
      status: calculateBoletoStatus(b),
    }));
  } catch {
    return [];
  }
}

/**
 * Salva a lista de boletos
 */
export function saveStoredBoletos(boletos: InvoiceBoleto[]): void {
  try {
    localStorage.setItem(BOLETOS_STORAGE_KEY, JSON.stringify(boletos));
  } catch (err) {
    console.error('Erro ao salvar boletos no localStorage:', err);
  }
}

/**
 * Adiciona um novo boleto
 */
export function addStoredBoleto(
  boletoData: Omit<InvoiceBoleto, 'id' | 'createdAt' | 'status'> & { status?: BoletoStatus }
): { success: boolean; boleto: InvoiceBoleto; boletos: InvoiceBoleto[] } {
  const current = getStoredBoletos();
  const now = new Date();
  const id = `bol-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  
  const newBoleto: InvoiceBoleto = {
    ...boletoData,
    id,
    status: boletoData.status || (boletoData.dueDate && boletoData.dueDate < getTodayDateStr() ? 'VENCIDO' : 'PENDENTE'),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  const updated = [newBoleto, ...current];
  saveStoredBoletos(updated);
  return { success: true, boleto: newBoleto, boletos: updated };
}

/**
 * Atualiza um boleto existente
 */
export function updateStoredBoleto(
  id: string,
  updates: Partial<InvoiceBoleto>
): { success: boolean; boletos: InvoiceBoleto[] } {
  const current = getStoredBoletos();
  const index = current.findIndex(b => b.id === id);
  if (index === -1) return { success: false, boletos: current };

  const updatedItem: InvoiceBoleto = {
    ...current[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  updatedItem.status = calculateBoletoStatus(updatedItem);

  current[index] = updatedItem;
  saveStoredBoletos(current);
  return { success: true, boletos: current };
}

/**
 * Marca um boleto como pago (Liquidação)
 */
export function payStoredBoleto(
  id: string,
  paymentData: {
    paidAt?: string;
    paymentTime?: string;
    paidAmount?: number;
    paymentMethod?: string;
    notes?: string;
  }
): { success: boolean; boletos: InvoiceBoleto[] } {
  const current = getStoredBoletos();
  const index = current.findIndex(b => b.id === id);
  if (index === -1) return { success: false, boletos: current };

  const target = current[index];
  const now = new Date();

  current[index] = {
    ...target,
    status: 'PAGO',
    paidAt: paymentData.paidAt || getTodayDateStr(),
    paymentTime: paymentData.paymentTime || now.toLocaleTimeString('pt-BR'),
    paidAmount: paymentData.paidAmount !== undefined ? paymentData.paidAmount : target.amount,
    paymentMethod: paymentData.paymentMethod || 'PIX',
    notes: paymentData.notes !== undefined ? paymentData.notes : target.notes,
    updatedAt: now.toISOString(),
  };

  saveStoredBoletos(current);
  return { success: true, boletos: current };
}

/**
 * Reverte baixa de um boleto para pendente
 */
export function reopenStoredBoleto(id: string): { success: boolean; boletos: InvoiceBoleto[] } {
  const current = getStoredBoletos();
  const index = current.findIndex(b => b.id === id);
  if (index === -1) return { success: false, boletos: current };

  const target = current[index];
  current[index] = {
    ...target,
    status: target.dueDate < getTodayDateStr() ? 'VENCIDO' : 'PENDENTE',
    paidAt: undefined,
    paymentTime: undefined,
    paidAmount: undefined,
    updatedAt: new Date().toISOString(),
  };

  saveStoredBoletos(current);
  return { success: true, boletos: current };
}

/**
 * Exclui um boleto
 */
export function deleteStoredBoleto(id: string): { success: boolean; boletos: InvoiceBoleto[] } {
  const current = getStoredBoletos();
  const filtered = current.filter(b => b.id !== id);
  saveStoredBoletos(filtered);
  return { success: true, boletos: filtered };
}

/**
 * Sincroniza boletos com a lista de notas fiscais
 * (garante que boletos adicionados na NF-e constem na gestão de boletos)
 */
export function syncBoletosWithInvoices(invoices: Invoice[]): InvoiceBoleto[] {
  const stored = getStoredBoletos();
  const map = new Map<string, InvoiceBoleto>();

  // Primeiro adiciona os já armazenados
  stored.forEach(b => map.set(b.id, b));

  // Percorre as notas e inclui/atualiza seus boletos
  invoices.forEach(inv => {
    if (inv.boletos && Array.isArray(inv.boletos)) {
      inv.boletos.forEach(b => {
        const existing = map.get(b.id);
        if (existing) {
          // Mantém dados de pagamento se existirem
          map.set(b.id, {
            ...b,
            destinationBranch: b.destinationBranch || inv.destinationBranch,
            supplierName: b.supplierName || inv.supplier.name,
            supplierCnpj: b.supplierCnpj || inv.supplier.cnpj,
            invoiceNumber: b.invoiceNumber || inv.number,
            status: existing.status || calculateBoletoStatus(b),
            paidAt: existing.paidAt || b.paidAt,
            paidAmount: existing.paidAmount || b.paidAmount,
          });
        } else {
          map.set(b.id, {
            ...b,
            destinationBranch: b.destinationBranch || inv.destinationBranch,
            supplierName: b.supplierName || inv.supplier.name,
            supplierCnpj: b.supplierCnpj || inv.supplier.cnpj,
            invoiceNumber: b.invoiceNumber || inv.number,
            status: calculateBoletoStatus(b),
          });
        }
      });
    }
  });

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  saveStoredBoletos(merged);
  return merged;
}

/**
 * Limpa todos os boletos
 */
export function clearAllBoletos(): void {
  localStorage.removeItem(BOLETOS_STORAGE_KEY);
}

/**
 * Formata código de barras / linha digitável para leitura humana
 */
export function formatBarcodeDisplay(barcode: string): string {
  const clean = barcode.replace(/\D/g, '');
  if (clean.length === 47) {
    // Formato linha digitável título bancário: XXXXX.XXXXX XXXXX.XXXXXX XXXXX.XXXXXX X XXXXXXXXXXXXXX
    return `${clean.slice(0, 5)}.${clean.slice(5, 10)} ${clean.slice(10, 15)}.${clean.slice(15, 21)} ${clean.slice(21, 26)}.${clean.slice(26, 32)} ${clean.slice(32, 33)} ${clean.slice(33)}`;
  }
  if (clean.length === 48) {
    // Formato concessionária / tributos: XXXXXXXXXXX-X XXXXXXXXXXX-X XXXXXXXXXXX-X XXXXXXXXXXX-X
    return `${clean.slice(0, 11)}-${clean.slice(11, 12)} ${clean.slice(12, 23)}-${clean.slice(23, 24)} ${clean.slice(24, 35)}-${clean.slice(35, 36)} ${clean.slice(36, 47)}-${clean.slice(47, 48)}`;
  }
  // Se já tiver formatação ou tamanho diferente, retorna como digitado
  return barcode;
}

/**
 * Exporta listagem de boletos para CSV (compatível com Excel)
 */
export function exportBoletosCSV(boletos: InvoiceBoleto[]): void {
  const headers = [
    'ID',
    'Destino / Unidade',
    'Fornecedor',
    'CNPJ Fornecedor',
    'Nº da NF-e',
    'Parcela',
    'Vencimento',
    'Valor (R$)',
    'Código de Barras / Linha Digitável',
    'Status',
    'Data de Pagamento',
    'Valor Pago (R$)',
    'Forma de Pagamento',
    'Observações',
  ];

  const rows = boletos.map(b => [
    b.id,
    b.destinationBranch || 'NÃO DEFINIDO',
    b.supplierName || 'Fornecedor Avulso',
    b.supplierCnpj || '-',
    b.invoiceNumber || '-',
    b.installmentNumber ? `${b.installmentNumber}/${b.totalInstallments || 1}` : 'Única',
    formatDateBR(b.dueDate),
    b.amount.toFixed(2).replace('.', ','),
    b.barcode || '',
    b.status,
    b.paidAt ? formatDateBR(b.paidAt) : '-',
    b.paidAmount ? b.paidAmount.toFixed(2).replace('.', ',') : '-',
    b.paymentMethod || '-',
    b.notes || '',
  ]);

  const dateStr = getTodayDateStr();
  downloadCSV(`Relatorio_Boletos_${dateStr}.csv`, headers, rows);
}
