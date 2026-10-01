import { BillingRecord } from '../types';

const STORAGE_KEY = 'lordlub_billing_records_v1';

// Dados iniciais de demonstração para a LORD LUB
export const INITIAL_BILLING_RECORDS: BillingRecord[] = [
  {
    id: 'bill-1048',
    date: '2026-09-28',
    serviceOrderNumber: 'OS-1048',
    productsTotal: 380.00,
    alignmentBalancingTotal: 140.00,
    servicesTotal: 90.00,
    grandTotal: 610.00,
    customerName: 'Marcos Vinicius Andrade',
    vehiclePlate: 'BRA2E19',
    vehicleModel: 'Toyota Corolla 2.0',
    paymentMethod: 'PIX',
    notes: 'Troca de óleo sintético 5W30, filtro de óleo e filtro de ar + alinhamento 3D e higienização.',
    createdAt: '2026-09-28T10:30:00Z',
  },
  {
    id: 'bill-1049',
    date: '2026-09-29',
    serviceOrderNumber: 'OS-1049',
    productsTotal: 1840.00,
    alignmentBalancingTotal: 160.00,
    servicesTotal: 180.00,
    grandTotal: 2180.00,
    customerName: 'Transportadora Silva & Filhos',
    vehiclePlate: 'RLK8F42',
    vehicleModel: 'Fiat Toro Diesel',
    paymentMethod: 'CARTAO_CREDITO',
    notes: '4 Pneus 215/65R16 + Alinhamento e Balanceamento 4 rodas + Troca de pastilhas dianteiras.',
    createdAt: '2026-09-29T14:15:00Z',
  },
  {
    id: 'bill-1050',
    date: '2026-09-30',
    serviceOrderNumber: 'OS-1050',
    productsTotal: 290.00,
    alignmentBalancingTotal: 90.00,
    servicesTotal: 220.00,
    grandTotal: 600.00,
    customerName: 'Camila Rodrigues Lima',
    vehiclePlate: 'QNF3H88',
    vehicleModel: 'Honda Civic G10',
    paymentMethod: 'CARTAO_DEBITO',
    notes: 'Óleo motor 0W20 + aditivo de radiador + alinhamento dianteiro + revisão de suspensão.',
    createdAt: '2026-09-30T11:40:00Z',
  },
  {
    id: 'bill-1051',
    date: '2026-09-30',
    serviceOrderNumber: 'OS-1051',
    productsTotal: 155.00,
    alignmentBalancingTotal: 140.00,
    servicesTotal: 110.00,
    grandTotal: 405.00,
    customerName: 'Renato Siqueira Dias',
    vehiclePlate: 'FGH9J11',
    vehicleModel: 'Volkswagen Polo TSI',
    paymentMethod: 'DINHEIRO',
    notes: 'Palhetas de silicone + filtro de cabine + alinhamento computadorizado e regulagem de freios.',
    createdAt: '2026-09-30T16:05:00Z',
  }
];

export function getStoredBillings(): BillingRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BILLING_RECORDS));
      return INITIAL_BILLING_RECORDS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return INITIAL_BILLING_RECORDS;
  } catch (err) {
    console.error('Erro ao ler faturamentos do localStorage:', err);
    return INITIAL_BILLING_RECORDS;
  }
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
