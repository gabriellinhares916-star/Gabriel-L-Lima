import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, StockMovement, Invoice, Employee, TimePunch, SalaryAdvance, BillingRecord } from '../types';
import { CompanySettings } from './companySettings';

// Credenciais fornecidas pelo usuário
const DEFAULT_SUPABASE_URL = 'https://izketyjtzbghnebqgnjv.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_Nt2QJXnvf8XDlPyjmoCfRA_pgFrE7oS';

// Sanitiza URL removendo /rest/v1 caso fornecido
export function getSanitizedSupabaseUrl(): string {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || DEFAULT_SUPABASE_URL;
  return envUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

export function getSupabaseAnonKey(): string {
  return (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || DEFAULT_SUPABASE_KEY;
}

const supabaseUrl = getSanitizedSupabaseUrl();
const supabaseKey = getSupabaseAnonKey();

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  tablesStatus?: Record<string, boolean>;
}

// Testa a conectividade com o Supabase e o status individual de cada uma das tabelas
export async function testSupabaseConnection(): Promise<ConnectionTestResult> {
  const start = performance.now();
  const tables = [
    'products',
    'stock_movements',
    'invoices',
    'employees',
    'time_punches',
    'salary_advances',
    'company_settings',
    'billings'
  ];

  try {
    const tablePromises = tables.map(async (table) => {
      const { error } = await supabase.from(table).select('id').limit(1);
      return { table, ok: !error };
    });

    const results = await Promise.all(tablePromises);
    const latencyMs = Math.round(performance.now() - start);
    const tablesStatus: Record<string, boolean> = {};
    let allOk = true;

    for (const r of results) {
      tablesStatus[r.table] = r.ok;
      if (!r.ok) allOk = false;
    }

    if (allOk) {
      return {
        success: true,
        message: 'Todas as tabelas estão criadas, conectadas e operacionais no Supabase!',
        latencyMs,
        tablesStatus,
      };
    } else {
      const missing = Object.entries(tablesStatus)
        .filter(([_, ok]) => !ok)
        .map(([tbl]) => tbl);
      return {
        success: true,
        message: `Conectado ao Supabase com ${Object.values(tablesStatus).filter(Boolean).length} tabelas ativas. ${missing.includes('billings') ? 'Tabela "billings" pode ser criada via Script SQL.' : ''}`,
        latencyMs,
        tablesStatus,
      };
    }
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      success: false,
      message: err.message || 'Falha ao conectar com o servidor do Supabase.',
      latencyMs,
    };
  }
}

// Script SQL completo para criação de todas as tabelas no Supabase SQL Editor
export const SUPABASE_SQL_SCHEMA = `-- ========================================================
-- SCHEMA OFICIAL GESTÃO LORD LUB - SUPABASE POSTGRESQL
-- Cole este script no Supabase -> SQL Editor e clique em 'RUN'
-- ========================================================

-- 1. TABELA DE PRODUTOS E ESTOQUE
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Geral',
  unit TEXT NOT NULL DEFAULT 'UN',
  ncm TEXT,
  current_stock NUMERIC NOT NULL DEFAULT 0,
  min_stock NUMERIC NOT NULL DEFAULT 0,
  average_cost NUMERIC NOT NULL DEFAULT 0,
  last_cost NUMERIC NOT NULL DEFAULT 0,
  selling_price NUMERIC,
  margin_percent NUMERIC,
  location TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELA DE MOVIMENTAÇÕES DE ESTOQUE (KARDEX)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_cost NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  resulting_stock NUMERIC NOT NULL,
  resulting_average_cost NUMERIC NOT NULL,
  date TEXT NOT NULL,
  document_number TEXT,
  document_type TEXT,
  notes TEXT,
  supplier_or_customer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA DE NOTAS FISCAIS ELETRÔNICAS (NF-E)
CREATE TABLE IF NOT EXISTS public.invoices (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  series TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  entry_date TEXT NOT NULL,
  access_key TEXT NOT NULL,
  supplier JSONB NOT NULL,
  recipient JSONB,
  totals JSONB NOT NULL,
  items JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'CONFIRMADA',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABELA DE COLABORADORES
CREATE TABLE IF NOT EXISTS public.employees (
  id TEXT PRIMARY KEY,
  registration_number TEXT NOT NULL,
  name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  work_shift TEXT,
  daily_hours_expected NUMERIC DEFAULT 8,
  pin TEXT,
  admission_date TEXT NOT NULL,
  status TEXT DEFAULT 'ATIVO',
  hourly_rate NUMERIC,
  avatar_initials TEXT,
  phone TEXT,
  email TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABELA DE BATIDAS DE PONTO ELETRÔNICO (REP-P)
CREATE TABLE IF NOT EXISTS public.time_punches (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'RELOGIO_DIGITAL',
  nsr BIGINT NOT NULL,
  notes TEXT,
  device TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABELA DE VALES E ADIANTAMENTOS SALARIAIS
CREATE TABLE IF NOT EXISTS public.salary_advances (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  employee_registration TEXT NOT NULL,
  employee_role TEXT,
  employee_department TEXT,
  date TEXT NOT NULL,
  competence_month TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'DINHEIRO',
  category TEXT DEFAULT 'OUTRO',
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDENTE_DESCONTO',
  approved_by TEXT,
  receipt_signed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABELA DE CONFIGURAÇÕES DA EMPRESA (LORD LUB)
CREATE TABLE IF NOT EXISTS public.company_settings (
  id TEXT PRIMARY KEY DEFAULT 'default_company',
  name TEXT NOT NULL,
  trade_name TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  state_registration TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city_state TEXT,
  logo_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. TABELA DE FATURAMENTO DE ORDENS DE SERVIÇO (OS)
CREATE TABLE IF NOT EXISTS public.billings (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  service_order_number TEXT NOT NULL,
  collaborator_name TEXT,
  collaborator_id TEXT,
  products_total NUMERIC NOT NULL DEFAULT 0,
  alignment_balancing_total NUMERIC NOT NULL DEFAULT 0,
  services_total NUMERIC NOT NULL DEFAULT 0,
  grand_total NUMERIC NOT NULL DEFAULT 0,
  customer_name TEXT,
  vehicle_plate TEXT,
  vehicle_model TEXT,
  payment_method TEXT DEFAULT 'PIX',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garante adição das colunas de colaborador se a tabela já tiver sido criada antes
ALTER TABLE public.billings ADD COLUMN IF NOT EXISTS collaborator_name TEXT;
ALTER TABLE public.billings ADD COLUMN IF NOT EXISTS collaborator_id TEXT;

-- Habilitar Row Level Security (RLS) com políticas de acesso anônimo/público para o aplicativo
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billings ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura e Escrita Públicas (Chave Anon/Publishable)
CREATE POLICY "Permitir leitura publica de produtos" ON public.products FOR SELECT USING (true);
CREATE POLICY "Permitir gravacao publica de produtos" ON public.products FOR ALL USING (true);

CREATE POLICY "Permitir leitura publica de movimentacoes" ON public.stock_movements FOR SELECT USING (true);
CREATE POLICY "Permitir gravacao publica de movimentacoes" ON public.stock_movements FOR ALL USING (true);

CREATE POLICY "Permitir leitura publica de notas fiscais" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Permitir gravacao publica de notas fiscais" ON public.invoices FOR ALL USING (true);

CREATE POLICY "Permitir leitura publica de colaboradores" ON public.employees FOR SELECT USING (true);
CREATE POLICY "Permitir gravacao publica de colaboradores" ON public.employees FOR ALL USING (true);

CREATE POLICY "Permitir leitura publica de pontos" ON public.time_punches FOR SELECT USING (true);
CREATE POLICY "Permitir gravacao publica de pontos" ON public.time_punches FOR ALL USING (true);

CREATE POLICY "Permitir leitura publica de vales" ON public.salary_advances FOR SELECT USING (true);
CREATE POLICY "Permitir gravacao publica de vales" ON public.salary_advances FOR ALL USING (true);

CREATE POLICY "Permitir leitura publica de config empresa" ON public.company_settings FOR SELECT USING (true);
CREATE POLICY "Permitir gravacao publica de config empresa" ON public.company_settings FOR ALL USING (true);

CREATE POLICY "Permitir leitura publica de faturamentos" ON public.billings FOR SELECT USING (true);
CREATE POLICY "Permitir gravacao publica de faturamentos" ON public.billings FOR ALL USING (true);
`;

// Script avulso rápido somente para a nova tabela de faturamento caso o usuário já tenha criado as 7 anteriores
export const BILLING_TABLE_ONLY_SQL = `-- ========================================================
-- NOVA TABELA: FATURAMENTO DE ORDENS DE SERVIÇO (OS)
-- Cole no Supabase -> SQL Editor e clique em 'RUN'
-- ========================================================

CREATE TABLE IF NOT EXISTS public.billings (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  service_order_number TEXT NOT NULL,
  collaborator_name TEXT,
  collaborator_id TEXT,
  products_total NUMERIC NOT NULL DEFAULT 0,
  alignment_balancing_total NUMERIC NOT NULL DEFAULT 0,
  services_total NUMERIC NOT NULL DEFAULT 0,
  grand_total NUMERIC NOT NULL DEFAULT 0,
  customer_name TEXT,
  vehicle_plate TEXT,
  vehicle_model TEXT,
  payment_method TEXT DEFAULT 'PIX',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garante suporte às colunas de colaborador mesmo se a tabela já existia antes
ALTER TABLE public.billings ADD COLUMN IF NOT EXISTS collaborator_name TEXT;
ALTER TABLE public.billings ADD COLUMN IF NOT EXISTS collaborator_id TEXT;

ALTER TABLE public.billings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura publica de faturamentos" ON public.billings FOR SELECT USING (true);
CREATE POLICY "Permitir gravacao publica de faturamentos" ON public.billings FOR ALL USING (true);
`;

// ==========================================
// FUNÇÕES DE SINCRONIZAÇÃO BIDIRECIONAL
// ==========================================

// Envia os produtos para o Supabase
export async function syncProductsToSupabase(products: Product[]): Promise<boolean> {
  if (!products || products.length === 0) return true;
  try {
    const payload = products.map(p => ({
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.category || 'Geral',
      unit: p.unit || 'UN',
      ncm: p.ncm || null,
      current_stock: p.currentStock,
      min_stock: p.minStock,
      average_cost: p.averageCost,
      last_cost: p.lastCost,
      selling_price: p.sellingPrice || null,
      margin_percent: p.marginPercent || null,
      location: p.location || null,
      updated_at: p.updatedAt || new Date().toISOString()
    }));

    const { error } = await supabase.from('products').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Erro ao sincronizar produtos com Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Falha na sincronização de produtos:', err);
    return false;
  }
}

// Envia movimentações de estoque para o Supabase
export async function syncMovementsToSupabase(movements: StockMovement[]): Promise<boolean> {
  if (!movements || movements.length === 0) return true;
  try {
    const payload = movements.map(m => ({
      id: m.id,
      product_id: m.productId,
      product_name: m.productName,
      type: m.type,
      quantity: m.quantity,
      unit_cost: m.unitCost,
      total_cost: m.totalCost,
      resulting_stock: m.resultingStock,
      resulting_average_cost: m.resultingAverageCost,
      date: m.date,
      document_number: m.documentNumber || null,
      document_type: m.documentType || null,
      notes: m.notes || null,
      supplier_or_customer: m.supplierOrCustomer || null,
    }));

    const { error } = await supabase.from('stock_movements').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Erro ao sincronizar movimentações com Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Falha na sincronização de movimentações:', err);
    return false;
  }
}

// Envia Notas Fiscais para o Supabase
export async function syncInvoicesToSupabase(invoices: Invoice[]): Promise<boolean> {
  if (!invoices || invoices.length === 0) return true;
  try {
    const payload = invoices.map(inv => ({
      id: inv.id,
      number: inv.number,
      series: inv.series,
      issue_date: inv.issueDate,
      entry_date: inv.entryDate,
      access_key: inv.accessKey,
      supplier: inv.supplier,
      recipient: inv.recipient || null,
      totals: inv.totals,
      items: inv.items,
      status: inv.status || 'CONFIRMADA',
    }));

    const { error } = await supabase.from('invoices').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Erro ao sincronizar notas fiscais com Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Falha na sincronização de notas:', err);
    return false;
  }
}

// Envia Colaboradores para o Supabase
export async function syncEmployeesToSupabase(employees: Employee[]): Promise<boolean> {
  if (!employees || employees.length === 0) return true;
  try {
    const payload = employees.map(e => ({
      id: e.id,
      registration_number: e.registrationNumber,
      name: e.name,
      cpf: e.cpf,
      role: e.role,
      department: e.department,
      work_shift: e.workShift || '08:00 às 17:00 (Segunda a Sexta)',
      daily_hours_expected: e.dailyHoursExpected || 8,
      pin: e.pin || null,
      admission_date: e.admissionDate,
      status: e.status || 'ATIVO',
      hourly_rate: e.hourlyRate || null,
      avatar_initials: e.avatarInitials || null,
      phone: e.phone || null,
      email: e.email || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('employees').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Erro ao sincronizar colaboradores com Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Falha na sincronização de colaboradores:', err);
    return false;
  }
}

// Envia Pontos para o Supabase
export async function syncPunchesToSupabase(punches: TimePunch[]): Promise<boolean> {
  if (!punches || punches.length === 0) return true;
  try {
    const payload = punches.map(p => ({
      id: p.id,
      employee_id: p.employeeId,
      employee_name: p.employeeName,
      date: p.date,
      time: p.time,
      timestamp: p.timestamp,
      type: p.type,
      source: p.source || 'RELOGIO_DIGITAL',
      nsr: p.nsr,
      notes: p.notes || null,
      device: p.device || null,
    }));

    const { error } = await supabase.from('time_punches').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Erro ao sincronizar batidas de ponto com Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Falha na sincronização de pontos:', err);
    return false;
  }
}

// Envia Vales / Adiantamentos para o Supabase
export async function syncAdvancesToSupabase(advances: SalaryAdvance[]): Promise<boolean> {
  if (!advances || advances.length === 0) return true;
  try {
    const payload = advances.map(a => ({
      id: a.id,
      employee_id: a.employeeId,
      employee_name: a.employeeName,
      employee_registration: a.employeeRegistration,
      employee_role: a.employeeRole || null,
      employee_department: a.employeeDepartment || null,
      date: a.date,
      competence_month: a.competenceMonth,
      amount: a.amount,
      payment_method: a.paymentMethod,
      category: a.category || 'OUTRO',
      reason: a.reason,
      status: a.status,
      approved_by: a.approvedBy || null,
      receipt_signed: a.receiptSigned ?? false,
      notes: a.notes || null,
    }));

    const { error } = await supabase.from('salary_advances').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Erro ao sincronizar vales com Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Falha na sincronização de vales:', err);
    return false;
  }
}

// Envia Dados da Empresa (Lord Lub) para o Supabase
export async function syncCompanySettingsToSupabase(settings: CompanySettings): Promise<boolean> {
  try {
    const payload = {
      id: 'default_company',
      name: settings.name,
      trade_name: settings.tradeName,
      cnpj: settings.cnpj,
      state_registration: settings.stateRegistration || null,
      phone: settings.phone || null,
      email: settings.email || null,
      address: settings.address || null,
      city_state: settings.cityState || null,
      logo_url: settings.logoUrl || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('company_settings').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Erro ao sincronizar dados da empresa com Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Falha na sincronização da empresa:', err);
    return false;
  }
}

// Envia Faturamentos de Ordens de Serviço (OS) para o Supabase
export async function syncBillingsToSupabase(billings: BillingRecord[]): Promise<boolean> {
  if (!billings || billings.length === 0) return true;
  try {
    const payload = billings.map(b => ({
      id: b.id,
      date: b.date,
      service_order_number: b.serviceOrderNumber,
      collaborator_name: b.collaboratorName || null,
      collaborator_id: b.collaboratorId || null,
      products_total: b.productsTotal,
      alignment_balancing_total: b.alignmentBalancingTotal,
      services_total: b.servicesTotal,
      grand_total: b.grandTotal,
      customer_name: b.customerName || null,
      vehicle_plate: b.vehiclePlate || null,
      vehicle_model: b.vehicleModel || null,
      payment_method: b.paymentMethod || 'PIX',
      notes: b.notes || null,
      created_at: b.createdAt || new Date().toISOString(),
      updated_at: b.updatedAt || new Date().toISOString(),
    }));

    const { error } = await supabase.from('billings').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Erro ao sincronizar faturamentos com Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Falha na sincronização de faturamentos:', err);
    return false;
  }
}

// Realiza carga total de dados para o Supabase
export async function pushFullDatabaseToSupabase(data: {
  products: Product[];
  movements: StockMovement[];
  invoices: Invoice[];
  employees: Employee[];
  punches: TimePunch[];
  advances: SalaryAdvance[];
  companySettings: CompanySettings;
  billings?: BillingRecord[];
}): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  const okProducts = await syncProductsToSupabase(data.products);
  if (!okProducts) errors.push('Produtos');

  const okMovements = await syncMovementsToSupabase(data.movements);
  if (!okMovements) errors.push('Movimentações');

  const okInvoices = await syncInvoicesToSupabase(data.invoices);
  if (!okInvoices) errors.push('Notas Fiscais');

  const okEmployees = await syncEmployeesToSupabase(data.employees);
  if (!okEmployees) errors.push('Colaboradores');

  const okPunches = await syncPunchesToSupabase(data.punches);
  if (!okPunches) errors.push('Ponto Eletrônico');

  const okAdvances = await syncAdvancesToSupabase(data.advances);
  if (!okAdvances) errors.push('Vales & Adiantamentos');

  const okCompany = await syncCompanySettingsToSupabase(data.companySettings);
  if (!okCompany) errors.push('Dados da Empresa');

  if (data.billings && data.billings.length > 0) {
    const okBillings = await syncBillingsToSupabase(data.billings);
    if (!okBillings) errors.push('Faturamentos (OS)');
  }

  return {
    success: errors.length === 0,
    errors
  };
}

// Puxa todos os dados do Supabase e converte para os formatos locais do aplicativo
export async function pullFullDatabaseFromSupabase(): Promise<{
  success: boolean;
  data?: {
    products: Product[];
    movements: StockMovement[];
    invoices: Invoice[];
    employees: Employee[];
    punches: TimePunch[];
    advances: SalaryAdvance[];
    companySettings?: CompanySettings;
    billings: BillingRecord[];
  };
  error?: string;
}> {
  try {
    const [pRes, mRes, iRes, eRes, tpRes, saRes, csRes, bRes] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('stock_movements').select('*').order('created_at', { ascending: true }),
      supabase.from('invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('employees').select('*'),
      supabase.from('time_punches').select('*').order('nsr', { ascending: true }),
      supabase.from('salary_advances').select('*').order('created_at', { ascending: false }),
      supabase.from('company_settings').select('*').limit(1),
      supabase.from('billings').select('*').order('date', { ascending: false }),
    ]);

    if (pRes.error) throw new Error(`Produtos: ${pRes.error.message}`);
    if (mRes.error) throw new Error(`Movimentações: ${mRes.error.message}`);
    if (iRes.error) throw new Error(`Notas: ${iRes.error.message}`);
    if (eRes.error) throw new Error(`Colaboradores: ${eRes.error.message}`);
    if (tpRes.error) throw new Error(`Pontos: ${tpRes.error.message}`);
    if (saRes.error) throw new Error(`Vales: ${saRes.error.message}`);

    const products: Product[] = (pRes.data || []).map((row: any) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category || 'Geral',
      unit: row.unit || 'UN',
      ncm: row.ncm || '',
      currentStock: Number(row.current_stock) || 0,
      minStock: Number(row.min_stock) || 0,
      averageCost: Number(row.average_cost) || 0,
      lastCost: Number(row.last_cost) || 0,
      sellingPrice: row.selling_price ? Number(row.selling_price) : undefined,
      marginPercent: row.margin_percent ? Number(row.margin_percent) : undefined,
      location: row.location || undefined,
      createdAt: row.created_at || row.updated_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    }));

    const movements: StockMovement[] = (mRes.data || []).map((row: any) => ({
      id: row.id,
      productId: row.product_id,
      productCode: row.product_code || 'PROD',
      productName: row.product_name,
      unit: row.unit || 'UN',
      type: row.type,
      documentType: (row.document_type as any) || 'MANUAL',
      quantity: Number(row.quantity) || 0,
      unitCost: Number(row.unit_cost) || 0,
      totalCost: Number(row.total_cost) || 0,
      resultingStock: Number(row.resulting_stock) || 0,
      resultingAverageCost: Number(row.resulting_average_cost) || 0,
      date: row.date,
      documentNumber: row.document_number || undefined,
      notes: row.notes || undefined,
      supplierOrCustomer: row.supplier_or_customer || undefined,
      createdAt: row.created_at || new Date().toISOString(),
    }));

    const invoices: Invoice[] = (iRes.data || []).map((row: any) => ({
      id: row.id,
      number: row.number,
      series: row.series,
      issueDate: row.issue_date,
      entryDate: row.entry_date,
      accessKey: row.access_key,
      supplier: row.supplier,
      recipient: row.recipient || undefined,
      totals: row.totals,
      items: row.items,
      status: row.status,
      createdAt: row.created_at,
    }));

    const employees: Employee[] = (eRes.data || []).map((row: any) => ({
      id: row.id,
      registrationNumber: row.registration_number,
      name: row.name,
      cpf: row.cpf,
      role: row.role,
      department: row.department,
      workShift: row.work_shift || '08:00 às 17:00 (Segunda a Sexta)',
      dailyHoursExpected: Number(row.daily_hours_expected) || 8,
      pin: row.pin || undefined,
      admissionDate: row.admission_date,
      status: row.status || 'ATIVO',
      hourlyRate: row.hourly_rate ? Number(row.hourly_rate) : undefined,
      avatarInitials: row.avatar_initials || undefined,
      phone: row.phone || undefined,
      email: row.email || undefined,
      updatedAt: row.updated_at,
    }));

    const punches: TimePunch[] = (tpRes.data || []).map((row: any) => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      date: row.date,
      time: row.time,
      timestamp: row.timestamp,
      type: row.type,
      source: row.source,
      nsr: Number(row.nsr),
      notes: row.notes || undefined,
      device: row.device || undefined,
    }));

    const advances: SalaryAdvance[] = (saRes.data || []).map((row: any) => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      employeeRegistration: row.employee_registration,
      employeeRole: row.employee_role || undefined,
      employeeDepartment: row.employee_department || undefined,
      date: row.date,
      competenceMonth: row.competence_month,
      amount: Number(row.amount) || 0,
      paymentMethod: row.payment_method,
      category: row.category || 'OUTRO',
      reason: row.reason,
      status: row.status,
      approvedBy: row.approved_by || undefined,
      receiptSigned: Boolean(row.receipt_signed),
      notes: row.notes || undefined,
      createdAt: row.created_at,
    }));

    let companySettings: CompanySettings | undefined = undefined;
    if (csRes.data && csRes.data.length > 0) {
      const cs = csRes.data[0];
      companySettings = {
        name: cs.name,
        tradeName: cs.trade_name,
        cnpj: cs.cnpj,
        stateRegistration: cs.state_registration || undefined,
        phone: cs.phone || undefined,
        email: cs.email || undefined,
        address: cs.address || undefined,
        cityState: cs.city_state || undefined,
        logoUrl: cs.logo_url || undefined,
      };
    }

    const billings: BillingRecord[] = (bRes.data || []).map((row: any) => ({
      id: row.id,
      date: row.date,
      serviceOrderNumber: row.service_order_number,
      collaboratorName: row.collaborator_name || undefined,
      collaboratorId: row.collaborator_id || undefined,
      productsTotal: Number(row.products_total) || 0,
      alignmentBalancingTotal: Number(row.alignment_balancing_total) || 0,
      servicesTotal: Number(row.services_total) || 0,
      grandTotal: Number(row.grand_total) || 0,
      customerName: row.customer_name || undefined,
      vehiclePlate: row.vehicle_plate || undefined,
      vehicleModel: row.vehicle_model || undefined,
      paymentMethod: row.payment_method || 'PIX',
      notes: row.notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return {
      success: true,
      data: {
        products,
        movements,
        invoices,
        employees,
        punches,
        advances,
        companySettings,
        billings,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Erro ao carregar dados do Supabase',
    };
  }
}
