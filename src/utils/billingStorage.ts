import { BillingRecord } from '../types';

const STORAGE_KEY = 'lordlub_billing_records_clean_v1';

// Base limpa para preenchimento de dados reais a partir de hoje
export const INITIAL_BILLING_RECORDS: BillingRecord[] = [];

export function getStoredBillings(): BillingRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Erro ao ler faturamentos do localStorage:', err);
    return [];
  }
}

export function clearAllBillings(): BillingRecord[] {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    localStorage.removeItem('lordlub_billing_records_v1');
    localStorage.removeItem('lordlub_billing_records_v2');
  } catch (err) {
    console.error('Erro ao limpar faturamentos:', err);
  }
  return [];
}

export function saveStoredBillings(records: BillingRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Erro ao salvar faturamentos no localStorage:', err);
  }
}

export function addBillingRecord(data: {
  date: string;
  serviceOrderNumber: string;
  collaboratorName?: string;
  collaboratorId?: string;
  productsTotal: number;
  alignmentBalancingTotal: number;
  servicesTotal: number;
  customerName?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  paymentMethod?: BillingRecord['paymentMethod'];
  notes?: string;
}): BillingRecord {
  const current = getStoredBillings();
  const id = `bill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  
  // Cálculo automático do total geral garantindo precisão
  const products = Number(data.productsTotal) || 0;
  const alignment = Number(data.alignmentBalancingTotal) || 0;
  const services = Number(data.servicesTotal) || 0;
  const grandTotal = Math.round((products + alignment + services) * 100) / 100;

  const newRecord: BillingRecord = {
    id,
    date: data.date,
    serviceOrderNumber: data.serviceOrderNumber.trim(),
    collaboratorName: data.collaboratorName?.trim() || undefined,
    collaboratorId: data.collaboratorId?.trim() || undefined,
    productsTotal: products,
    alignmentBalancingTotal: alignment,
    servicesTotal: services,
    grandTotal,
    customerName: data.customerName?.trim() || undefined,
    vehiclePlate: data.vehiclePlate?.trim().toUpperCase() || undefined,
    vehicleModel: data.vehicleModel?.trim() || undefined,
    paymentMethod: data.paymentMethod || 'PIX',
    notes: data.notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updated = [newRecord, ...current];
  saveStoredBillings(updated);
  return newRecord;
}

export function updateBillingRecord(
  id: string,
  data: Partial<Omit<BillingRecord, 'id' | 'createdAt'>>
): BillingRecord | null {
  const current = getStoredBillings();
  const index = current.findIndex(b => b.id === id);
  if (index === -1) return null;

  const existing = current[index];
  const products = data.productsTotal !== undefined ? (Number(data.productsTotal) || 0) : existing.productsTotal;
  const alignment = data.alignmentBalancingTotal !== undefined ? (Number(data.alignmentBalancingTotal) || 0) : existing.alignmentBalancingTotal;
  const services = data.servicesTotal !== undefined ? (Number(data.servicesTotal) || 0) : existing.servicesTotal;
  const grandTotal = Math.round((products + alignment + services) * 100) / 100;

  const updatedRecord: BillingRecord = {
    ...existing,
    ...data,
    productsTotal: products,
    alignmentBalancingTotal: alignment,
    servicesTotal: services,
    grandTotal,
    vehiclePlate: data.vehiclePlate ? data.vehiclePlate.trim().toUpperCase() : existing.vehiclePlate,
    updatedAt: new Date().toISOString(),
  };

  current[index] = updatedRecord;
  saveStoredBillings(current);
  return updatedRecord;
}

export function deleteBillingRecord(id: string): boolean {
  const current = getStoredBillings();
  const filtered = current.filter(b => b.id !== id);
  if (filtered.length !== current.length) {
    saveStoredBillings(filtered);
    return true;
  }
  return false;
}

export function resetBillingsDemo(): BillingRecord[] {
  saveStoredBillings(INITIAL_BILLING_RECORDS);
  return INITIAL_BILLING_RECORDS;
}
