import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Product,
  StockMovement,
  Invoice,
  Employee,
  TimePunch,
  SalaryAdvance,
  BillingRecord,
  ExpenseRecord,
  InvoiceBoleto
} from '../types';
import { CompanySettings } from './companySettings';

// Credenciais padrão fornecidas
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
  tablesErrors?: Record<string, string>;
  totalTables?: number;
  activeTablesCount?: number;
}

// Mapa de detalhes e erros da última sincronização
export const lastSyncErrors: Record<string, string> = {};

export const MONITORED_TABLES: { key: string; label: string; desc: string }[] = [
  { key: 'products', label: '1. Produtos & Estoque', desc: 'Cadastro de itens, custos médios e estoques' },
  { key: 'stock_movements', label: '2. Movimentações (Kardex)', desc: 'Entradas, saídas e rastreamento de estoque' },
  { key: 'invoices', label: '3. Notas Fiscais (NF-e)', desc: 'Entradas manuais e via XML (Parnarama/Teresina)' },
  { key: 'employees', label: '4. Colaboradores', desc: 'Registro de equipe, cargos e departamentos' },
  { key: 'time_punches', label: '5. Ponto Eletrônico (REP-P)', desc: 'Batidas digitais com NSR e comprovante' },
  { key: 'salary_advances', label: '6. Vales & Adiantamentos', desc: 'Vales salariais e baixas financeiras' },
  { key: 'company_settings', label: '7. Dados da Empresa', desc: 'Identificação Lord Lub, CNPJ e contato' },
  { key: 'billings', label: '8. Faturamentos (OS)', desc: 'Ordens de serviço e faturamento da oficina' },
  { key: 'expenses', label: '9. Despesas & Contas a Pagar', desc: 'Despesas fixas, variáveis e centros de custo' },
  { key: 'boletos', label: '10. Boletos Bancários', desc: 'Controle de duplicatas, códigos de barra e baixas' },
];

// Testa a conectividade com o Supabase e o status individual de cada uma das 10 tabelas
export async function testSupabaseConnection(): Promise<ConnectionTestResult> {
  const start = performance.now();

  try {
    const tablePromises = MONITORED_TABLES.map(async ({ key, label }) => {
      try {
        const { error } = await supabase.from(key).select('id').limit(1);
        return {
          key,
          label,
          ok: !error,
          error: error ? `${error.message}${error.details ? ` (${error.details})` : ''}` : undefined,
        };
      } catch (err: any) {
        return {
          key,
          label,
          ok: false,
          error: err?.message || 'Falha de requisição',
        };
      }
    });

    const results = await Promise.all(tablePromises);
    const latencyMs = Math.round(performance.now() - start);
    const tablesStatus: Record<string, boolean> = {};
    const tablesErrors: Record<string, string> = {};
    let activeCount = 0;

    for (const r of results) {
      tablesStatus[r.key] = r.ok;
      if (r.ok) {
        activeCount++;
      } else {
        tablesErrors[r.key] = r.error || 'Tabela não encontrada no schema público';
      }
    }

    const allOk = activeCount === MONITORED_TABLES.length;
    let message = '';
    if (allOk) {
      message = `Todas as ${MONITORED_TABLES.length} tabelas estão ativas e sincronizando com o Supabase!`;
    } else {
      const missingKeys = Object.entries(tablesStatus)
        .filter(([_, ok]) => !ok)
        .map(([k]) => k);
      message = `${activeCount} de ${MONITORED_TABLES.length} tabelas conectadas. As tabelas [${missingKeys.join(', ')}] precisam ser criadas ou atualizadas no Supabase SQL Editor.`;
    }

    return {
      success: allOk,
      message,
      latencyMs,
      tablesStatus,
      tablesErrors,
      totalTables: MONITORED_TABLES.length,
      activeTablesCount: activeCount,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      success: false,
      message: err.message || 'Falha ao conectar com o servidor do Supabase. Verifique sua conexão com a internet.',
      latencyMs,
      tablesStatus: {},
      tablesErrors: {},
      totalTables: MONITORED_TABLES.length,
      activeTablesCount: 0,
    };
  }
}

// ========================================================
// SCRIPTS SQL OFICIAIS PARA O SUPABASE SQL EDITOR
// ========================================================

// 1. SCRIPT DE ATUALIZAÇÃO E CORREÇÃO (NÃO APAGA NENHUM DADO, CRIA AS TABELAS NOVAS E ADICIONA AS COLUNAS)
export const UPDATE_MIGRATION_SQL = `-- ========================================================
-- SCRIPT DE ATUALIZAÇÃO E CORREÇÃO DE TABELAS (SEM PERDA DE DADOS)
-- Lord Lub - Atualização do Banco PostgreSQL no Supabase
-- Cole no SQL Editor do Supabase e clique em 'RUN'
-- ========================================================

-- 1. Cria a Tabela de Faturamento de Ordens de Serviço (OS) caso não exista
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

-- Garante suporte às colunas de colaborador na tabela billings
ALTER TABLE public.billings ADD COLUMN IF NOT EXISTS collaborator_name TEXT;
ALTER TABLE public.billings ADD COLUMN IF NOT EXISTS collaborator_id TEXT;

-- 2. Cria a Tabela de Despesas & Contas a Pagar
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'OUTRAS',
  custom_category_name TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date TEXT NOT NULL,
  payment_date TEXT,
  payment_time TEXT,
  competence_month TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDENTE',
  payment_method TEXT NOT NULL DEFAULT 'BOLETO',
  supplier_or_beneficiary TEXT,
  document_number TEXT,
  notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Cria a Tabela de Boletos Bancários & Duplicatas
CREATE TABLE IF NOT EXISTS public.boletos (
  id TEXT PRIMARY KEY,
  invoice_id TEXT,
  invoice_number TEXT,
  supplier_name TEXT,
  supplier_cnpj TEXT,
  destination_branch TEXT,
  barcode TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date TEXT NOT NULL,
  installment_number NUMERIC DEFAULT 1,
  total_installments NUMERIC DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'PENDENTE',
  paid_at TEXT,
  payment_time TEXT,
  paid_amount NUMERIC,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Adiciona colunas de Destino da Mercadoria (Parnarama/Teresina) e Boletos na tabela de Notas Fiscais
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS destination_branch TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS boletos JSONB DEFAULT '[]'::jsonb;

-- 5. Habilitar Row Level Security (RLS) nas novas tabelas
ALTER TABLE public.billings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boletos ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de Acesso Público para as novas tabelas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billings' AND policyname = 'Permitir leitura publica de faturamentos') THEN
    CREATE POLICY "Permitir leitura publica de faturamentos" ON public.billings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billings' AND policyname = 'Permitir gravacao publica de faturamentos') THEN
    CREATE POLICY "Permitir gravacao publica de faturamentos" ON public.billings FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'Permitir leitura publica de despesas') THEN
    CREATE POLICY "Permitir leitura publica de despesas" ON public.expenses FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'Permitir gravacao publica de despesas') THEN
    CREATE POLICY "Permitir gravacao publica de despesas" ON public.expenses FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'boletos' AND policyname = 'Permitir leitura publica de boletos') THEN
    CREATE POLICY "Permitir leitura publica de boletos" ON public.boletos FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'boletos' AND policyname = 'Permitir gravacao publica de boletos') THEN
    CREATE POLICY "Permitir gravacao publica de boletos" ON public.boletos FOR ALL USING (true);
  END IF;
END $$;
`;

// 2. SCRIPT SQL COMPLETO (TODAS AS 10 TABELAS DO SISTEMA)
export const SUPABASE_SQL_SCHEMA = `-- ========================================================
-- SCHEMA COMPLETO GESTÃO LORD LUB - SUPABASE POSTGRESQL (10 TABELAS)
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
  product_id TEXT NOT NULL,
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
  destination_branch TEXT,
  supplier JSONB NOT NULL,
  recipient JSONB,
  totals JSONB NOT NULL,
  items JSONB NOT NULL,
  boletos JSONB DEFAULT '[]'::jsonb,
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
  employee_id TEXT NOT NULL,
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
  employee_id TEXT NOT NULL,
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

-- 9. TABELA DE DESPESAS E CONTAS A PAGAR
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'OUTRAS',
  custom_category_name TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date TEXT NOT NULL,
  payment_date TEXT,
  payment_time TEXT,
  competence_month TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDENTE',
  payment_method TEXT NOT NULL DEFAULT 'BOLETO',
  supplier_or_beneficiary TEXT,
  document_number TEXT,
  notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. TABELA DE BOLETOS BANCÁRIOS
CREATE TABLE IF NOT EXISTS public.boletos (
  id TEXT PRIMARY KEY,
  invoice_id TEXT,
  invoice_number TEXT,
  supplier_name TEXT,
  supplier_cnpj TEXT,
  destination_branch TEXT,
  barcode TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date TEXT NOT NULL,
  installment_number NUMERIC DEFAULT 1,
  total_installments NUMERIC DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'PENDENTE',
  paid_at TEXT,
  payment_time TEXT,
  paid_amount NUMERIC,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garante suporte às colunas adicionais caso tabelas já existam
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS destination_branch TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS boletos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.billings ADD COLUMN IF NOT EXISTS collaborator_name TEXT;
ALTER TABLE public.billings ADD COLUMN IF NOT EXISTS collaborator_id TEXT;

-- Habilitar Row Level Security (RLS) nas 10 tabelas
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boletos ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura e Escrita Públicas (Chave Anon/Publishable)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Permitir leitura publica de produtos') THEN
    CREATE POLICY "Permitir leitura publica de produtos" ON public.products FOR SELECT USING (true);
    CREATE POLICY "Permitir gravacao publica de produtos" ON public.products FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_movements' AND policyname = 'Permitir leitura publica de movimentacoes') THEN
    CREATE POLICY "Permitir leitura publica de movimentacoes" ON public.stock_movements FOR SELECT USING (true);
    CREATE POLICY "Permitir gravacao publica de movimentacoes" ON public.stock_movements FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Permitir leitura publica de notas fiscais') THEN
    CREATE POLICY "Permitir leitura publica de notas fiscais" ON public.invoices FOR SELECT USING (true);
    CREATE POLICY "Permitir gravacao publica de notas fiscais" ON public.invoices FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employees' AND policyname = 'Permitir leitura publica de colaboradores') THEN
    CREATE POLICY "Permitir leitura publica de colaboradores" ON public.employees FOR SELECT USING (true);
    CREATE POLICY "Permitir gravacao publica de colaboradores" ON public.employees FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'time_punches' AND policyname = 'Permitir leitura publica de pontos') THEN
    CREATE POLICY "Permitir leitura publica de pontos" ON public.time_punches FOR SELECT USING (true);
    CREATE POLICY "Permitir gravacao publica de pontos" ON public.time_punches FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'salary_advances' AND policyname = 'Permitir leitura publica de vales') THEN
    CREATE POLICY "Permitir leitura publica de vales" ON public.salary_advances FOR SELECT USING (true);
    CREATE POLICY "Permitir gravacao publica de vales" ON public.salary_advances FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_settings' AND policyname = 'Permitir leitura publica de config empresa') THEN
    CREATE POLICY "Permitir leitura publica de config empresa" ON public.company_settings FOR SELECT USING (true);
    CREATE POLICY "Permitir gravacao publica de config empresa" ON public.company_settings FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billings' AND policyname = 'Permitir leitura publica de faturamentos') THEN
    CREATE POLICY "Permitir leitura publica de faturamentos" ON public.billings FOR SELECT USING (true);
    CREATE POLICY "Permitir gravacao publica de faturamentos" ON public.billings FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'Permitir leitura publica de despesas') THEN
    CREATE POLICY "Permitir leitura publica de despesas" ON public.expenses FOR SELECT USING (true);
    CREATE POLICY "Permitir gravacao publica de despesas" ON public.expenses FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'boletos' AND policyname = 'Permitir leitura publica de boletos') THEN
    CREATE POLICY "Permitir leitura publica de boletos" ON public.boletos FOR SELECT USING (true);
    CREATE POLICY "Permitir gravacao publica de boletos" ON public.boletos FOR ALL USING (true);
  END IF;
END $$;
`;

export const BILLING_TABLE_ONLY_SQL = UPDATE_MIGRATION_SQL;

// ==========================================
// FUNÇÕES DE SINCRONIZAÇÃO BIDIRECIONAL
// ==========================================

// 1. Envia os produtos para o Supabase
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
      current_stock: Number(p.currentStock) || 0,
      min_stock: Number(p.minStock) || 0,
      average_cost: Number(p.averageCost) || 0,
      last_cost: Number(p.lastCost) || 0,
      selling_price: p.sellingPrice !== undefined ? Number(p.sellingPrice) : null,
      margin_percent: p.marginPercent !== undefined ? Number(p.marginPercent) : null,
      location: p.location || null,
      updated_at: p.updatedAt || new Date().toISOString()
    }));

    const { error } = await supabase.from('products').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Erro ao sincronizar produtos com Supabase:', error.message);
      lastSyncErrors['products'] = error.message;
      return false;
    }
    delete lastSyncErrors['products'];
    return true;
  } catch (err: any) {
    console.warn('Falha na sincronização de produtos:', err);
    lastSyncErrors['products'] = err?.message || 'Falha de rede';
    return false;
  }
}

// 2. Envia movimentações de estoque para o Supabase
export async function syncMovementsToSupabase(movements: StockMovement[]): Promise<boolean> {
  if (!movements || movements.length === 0) return true;
  try {
    const payload = movements.map(m => ({
      id: m.id,
      product_id: m.productId,
      product_name: m.productName,
      type: m.type,
      quantity: Number(m.quantity) || 0,
      unit_cost: Number(m.unitCost) || 0,
      total_cost: Number(m.totalCost) || 0,
      resulting_stock: Number(m.resultingStock) || 0,
      resulting_average_cost: Number(m.resultingAverageCost) || 0,
      date: m.date,
      document_number: m.documentNumber || null,
      document_type: m.documentType || null,
      notes: m.notes || null,
      supplier_or_customer: m.supplierOrCustomer || null,
    }));

    const { error } = await supabase.from('stock_movements').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Erro ao sincronizar movimentações com Supabase:', error.message);
      lastSyncErrors['stock_movements'] = error.message;
      return false;
    }
    delete lastSyncErrors['stock_movements'];
    return true;
  } catch (err: any) {
    console.warn('Falha na sincronização de movimentações:', err);
    lastSyncErrors['stock_movements'] = err?.message || 'Falha de rede';
    return false;
  }
}

// 3. Envia Notas Fiscais para o Supabase (com fallback resiliente de colunas)
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
      destination_branch: inv.destinationBranch || null,
      supplier: inv.supplier,
      recipient: inv.recipient || null,
      totals: inv.totals,
      items: inv.items,
      boletos: inv.boletos || [],
      status: inv.status || 'CONFIRMADA',
    }));

    const { error } = await supabase.from('invoices').upsert(payload, { onConflict: 'id' });
    if (error) {
      // Se a tabela ainda não tiver as colunas destination_branch ou boletos no Supabase, tenta fallback sem elas
      if (
        error.message?.includes('destination_branch') ||
        error.message?.includes('boletos') ||
        (error as any)?.code === 'PGRST204'
      ) {
        const fallbackPayload = invoices.map(inv => ({
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
        const retry = await supabase.from('invoices').upsert(fallbackPayload, { onConflict: 'id' });
        if (!retry.error) {
          delete lastSyncErrors['invoices'];
          return true;
        }
      }
      console.warn('Erro ao sincronizar notas fiscais com Supabase:', error.message);
      lastSyncErrors['invoices'] = error.message;
      return false;
    }
    delete lastSyncErrors['invoices'];
    return true;
  } catch (err: any) {
    console.warn('Falha na sincronização de notas:', err);
    lastSyncErrors['invoices'] = err?.message || 'Falha de rede';
    return false;
  }
}

// 4. Envia Colaboradores para o Supabase
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
      daily_hours_expected: Number(e.dailyHoursExpected) || 8,
      pin: e.pin || null,
      admission_date: e.admissionDate,
      status: e.status || 'ATIVO',
      hourly_rate: e.hourlyRate !== undefined ? Number(e.hourlyRate) : null,
      avatar_initials: e.avatarInitials || null,
      phone: e.phone || null,
      email: e.email || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('employees').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Erro ao sincronizar colaboradores com Supabase:', error.message);
      lastSyncErrors['employees'] = error.message;
      return false;
    }
    delete lastSyncErrors['employees'];
    return true;
  } catch (err: any) {
    console.warn('Falha na sincronização de colaboradores:', err);
    lastSyncErrors['employees'] = err?.message || 'Falha de rede';
    return false;
  }
}

// 5. Envia Batidas de Ponto para o Supabase
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
      nsr: Number(p.nsr) || 0,
      notes: p.notes || null,
      device: p.device || null,
    }));

    const { error } = await supabase.from('time_punches').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Erro ao sincronizar batidas de ponto com Supabase:', error.message);
      lastSyncErrors['time_punches'] = error.message;
      return false;
    }
    delete lastSyncErrors['time_punches'];
    return true;
  } catch (err: any) {
    console.warn('Falha na sincronização de pontos:', err);
    lastSyncErrors['time_punches'] = err?.message || 'Falha de rede';
    return false;
  }
}

// 6. Envia Vales e Adiantamentos para o Supabase
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
      amount: Number(a.amount) || 0,
      payment_method: a.paymentMethod || 'DINHEIRO',
      category: a.category || 'OUTRO',
      reason: a.reason || 'Adiantamento',
      status: a.status || 'PENDENTE_DESCONTO',
      approved_by: a.approvedBy || null,
      receipt_signed: Boolean(a.receiptSigned),
      notes: a.notes || null,
    }));

    const { error } = await supabase.from('salary_advances').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Erro ao sincronizar vales com Supabase:', error.message);
      lastSyncErrors['salary_advances'] = error.message;
      return false;
    }
    delete lastSyncErrors['salary_advances'];
    return true;
  } catch (err: any) {
    console.warn('Falha na sincronização de vales:', err);
    lastSyncErrors['salary_advances'] = err?.message || 'Falha de rede';
    return false;
  }
}

// 7. Envia Dados da Empresa (Lord Lub) para o Supabase
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
      lastSyncErrors['company_settings'] = error.message;
      return false;
    }
    delete lastSyncErrors['company_settings'];
    return true;
  } catch (err: any) {
    console.warn('Falha na sincronização da empresa:', err);
    lastSyncErrors['company_settings'] = err?.message || 'Falha de rede';
    return false;
  }
}

// 8. Envia Faturamentos de Ordens de Serviço (OS) para o Supabase
export async function syncBillingsToSupabase(billings: BillingRecord[]): Promise<boolean> {
  if (!billings || billings.length === 0) return true;
  try {
    const payload = billings.map(b => ({
      id: b.id,
      date: b.date,
      service_order_number: b.serviceOrderNumber,
      collaborator_name: b.collaboratorName || null,
      collaborator_id: b.collaboratorId || null,
      products_total: Number(b.productsTotal) || 0,
      alignment_balancing_total: Number(b.alignmentBalancingTotal) || 0,
      services_total: Number(b.servicesTotal) || 0,
      grand_total: Number(b.grandTotal) || 0,
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
      lastSyncErrors['billings'] = error.message;
      return false;
    }
    delete lastSyncErrors['billings'];
    return true;
  } catch (err: any) {
    console.warn('Falha na sincronização de faturamentos:', err);
    lastSyncErrors['billings'] = err?.message || 'Falha de rede';
    return false;
  }
}

// 9. Envia Despesas e Contas a Pagar para o Supabase
export async function syncExpensesToSupabase(expenses: ExpenseRecord[]): Promise<boolean> {
  if (!expenses || expenses.length === 0) return true;
  try {
    const payload = expenses.map(e => ({
      id: e.id,
      description: e.description,
      category: e.category || 'OUTRAS',
      custom_category_name: e.customCategoryName || null,
      amount: Number(e.amount) || 0,
      due_date: e.dueDate,
      payment_date: e.paymentDate || null,
      payment_time: e.paymentTime || null,
      competence_month: e.competenceMonth,
      status: e.status || 'PENDENTE',
      payment_method: e.paymentMethod || 'BOLETO',
      supplier_or_beneficiary: e.supplierOrBeneficiary || null,
      document_number: e.documentNumber || null,
      notes: e.notes || null,
      is_recurring: Boolean(e.isRecurring),
      created_at: e.createdAt || new Date().toISOString(),
      updated_at: e.updatedAt || new Date().toISOString(),
    }));

    const { error } = await supabase.from('expenses').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Erro ao sincronizar despesas com Supabase:', error.message);
      lastSyncErrors['expenses'] = error.message;
      return false;
    }
    delete lastSyncErrors['expenses'];
    return true;
  } catch (err: any) {
    console.warn('Falha na sincronização de despesas:', err);
    lastSyncErrors['expenses'] = err?.message || 'Falha de rede';
    return false;
  }
}

// 10. Envia Boletos Bancários para o Supabase
export async function syncBoletosToSupabase(boletos: InvoiceBoleto[]): Promise<boolean> {
  if (!boletos || boletos.length === 0) return true;
  try {
    const payload = boletos.map(b => ({
      id: b.id,
      invoice_id: b.invoiceId || null,
      invoice_number: b.invoiceNumber || null,
      supplier_name: b.supplierName || null,
      supplier_cnpj: b.supplierCnpj || null,
      destination_branch: b.destinationBranch || null,
      barcode: b.barcode,
      amount: Number(b.amount) || 0,
      due_date: b.dueDate,
      installment_number: Number(b.installmentNumber) || 1,
      total_installments: Number(b.totalInstallments) || 1,
      status: b.status || 'PENDENTE',
      paid_at: b.paidAt || null,
      payment_time: b.paymentTime || null,
      paid_amount: b.paidAmount !== undefined ? Number(b.paidAmount) : null,
      payment_method: b.paymentMethod || null,
      notes: b.notes || null,
      created_at: b.createdAt || new Date().toISOString(),
      updated_at: b.updatedAt || new Date().toISOString(),
    }));

    const { error } = await supabase.from('boletos').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Erro ao sincronizar boletos com Supabase:', error.message);
      lastSyncErrors['boletos'] = error.message;
      return false;
    }
    delete lastSyncErrors['boletos'];
    return true;
  } catch (err: any) {
    console.warn('Falha na sincronização de boletos:', err);
    lastSyncErrors['boletos'] = err?.message || 'Falha de rede';
    return false;
  }
}

// Realiza carga total de dados para o Supabase com relatório preciso
export async function pushFullDatabaseToSupabase(data: {
  products: Product[];
  movements: StockMovement[];
  invoices: Invoice[];
  employees: Employee[];
  punches: TimePunch[];
  advances: SalaryAdvance[];
  companySettings: CompanySettings;
  billings?: BillingRecord[];
  expenses?: ExpenseRecord[];
  boletos?: InvoiceBoleto[];
}): Promise<{ success: boolean; errors: string[]; errorDetails: Record<string, string>; syncedCount: Record<string, number> }> {
  const errors: string[] = [];
  const errorDetails: Record<string, string> = {};
  const syncedCount: Record<string, number> = {};

  // 1. Produtos
  const okProducts = await syncProductsToSupabase(data.products);
  if (!okProducts) {
    errors.push('Produtos');
    errorDetails['products'] = lastSyncErrors['products'] || 'Erro ao gravar produtos';
  } else {
    syncedCount['products'] = data.products.length;
  }

  // 2. Movimentações
  const okMovements = await syncMovementsToSupabase(data.movements);
  if (!okMovements) {
    errors.push('Movimentações');
    errorDetails['stock_movements'] = lastSyncErrors['stock_movements'] || 'Erro ao gravar movimentações';
  } else {
    syncedCount['stock_movements'] = data.movements.length;
  }

  // 3. Notas Fiscais
  const okInvoices = await syncInvoicesToSupabase(data.invoices);
  if (!okInvoices) {
    errors.push('Notas Fiscais');
    errorDetails['invoices'] = lastSyncErrors['invoices'] || 'Erro ao gravar notas fiscais';
  } else {
    syncedCount['invoices'] = data.invoices.length;
  }

  // 4. Colaboradores
  const okEmployees = await syncEmployeesToSupabase(data.employees);
  if (!okEmployees) {
    errors.push('Colaboradores');
    errorDetails['employees'] = lastSyncErrors['employees'] || 'Erro ao gravar colaboradores';
  } else {
    syncedCount['employees'] = data.employees.length;
  }

  // 5. Ponto Eletrônico
  const okPunches = await syncPunchesToSupabase(data.punches);
  if (!okPunches) {
    errors.push('Ponto Eletrônico');
    errorDetails['time_punches'] = lastSyncErrors['time_punches'] || 'Erro ao gravar batidas de ponto';
  } else {
    syncedCount['time_punches'] = data.punches.length;
  }

  // 6. Vales
  const okAdvances = await syncAdvancesToSupabase(data.advances);
  if (!okAdvances) {
    errors.push('Vales Salariais');
    errorDetails['salary_advances'] = lastSyncErrors['salary_advances'] || 'Erro ao gravar vales';
  } else {
    syncedCount['salary_advances'] = data.advances.length;
  }

  // 7. Dados da Empresa
  const okCompany = await syncCompanySettingsToSupabase(data.companySettings);
  if (!okCompany) {
    errors.push('Dados da Empresa');
    errorDetails['company_settings'] = lastSyncErrors['company_settings'] || 'Erro ao gravar dados da empresa';
  } else {
    syncedCount['company_settings'] = 1;
  }

  // 8. Faturamentos (OS)
  if (data.billings && data.billings.length > 0) {
    const okBillings = await syncBillingsToSupabase(data.billings);
    if (!okBillings) {
      errors.push('Faturamentos (OS)');
      errorDetails['billings'] = lastSyncErrors['billings'] || 'Tabela "billings" ausente no Supabase';
    } else {
      syncedCount['billings'] = data.billings.length;
    }
  }

  // 9. Despesas & Contas a Pagar
  if (data.expenses && data.expenses.length > 0) {
    const okExpenses = await syncExpensesToSupabase(data.expenses);
    if (!okExpenses) {
      errors.push('Despesas');
      errorDetails['expenses'] = lastSyncErrors['expenses'] || 'Tabela "expenses" ausente no Supabase';
    } else {
      syncedCount['expenses'] = data.expenses.length;
    }
  }

  // 10. Boletos Bancários
  if (data.boletos && data.boletos.length > 0) {
    const okBoletos = await syncBoletosToSupabase(data.boletos);
    if (!okBoletos) {
      errors.push('Boletos Bancários');
      errorDetails['boletos'] = lastSyncErrors['boletos'] || 'Tabela "boletos" ausente no Supabase';
    } else {
      syncedCount['boletos'] = data.boletos.length;
    }
  }

  return {
    success: errors.length === 0,
    errors,
    errorDetails,
    syncedCount,
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
    expenses: ExpenseRecord[];
    boletos: InvoiceBoleto[];
  };
  error?: string;
}> {
  try {
    const [pRes, mRes, iRes, eRes, tpRes, saRes, csRes, bRes, expRes, bolRes] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('stock_movements').select('*').order('created_at', { ascending: true }),
      supabase.from('invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('employees').select('*'),
      supabase.from('time_punches').select('*').order('nsr', { ascending: true }),
      supabase.from('salary_advances').select('*').order('created_at', { ascending: false }),
      supabase.from('company_settings').select('*').limit(1),
      supabase.from('billings').select('*').order('date', { ascending: false }),
      supabase.from('expenses').select('*').order('due_date', { ascending: true }),
      supabase.from('boletos').select('*').order('due_date', { ascending: true }),
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
      destinationBranch: row.destination_branch || undefined,
      supplier: row.supplier,
      recipient: row.recipient || undefined,
      totals: row.totals,
      items: row.items,
      boletos: Array.isArray(row.boletos) ? row.boletos : undefined,
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

    const expenses: ExpenseRecord[] = (expRes.data || []).map((row: any) => ({
      id: row.id,
      description: row.description,
      category: row.category,
      customCategoryName: row.custom_category_name || undefined,
      amount: Number(row.amount) || 0,
      dueDate: row.due_date,
      paymentDate: row.payment_date || undefined,
      paymentTime: row.payment_time || undefined,
      competenceMonth: row.competence_month,
      status: row.status,
      paymentMethod: row.payment_method,
      supplierOrBeneficiary: row.supplier_or_beneficiary || '',
      documentNumber: row.document_number || undefined,
      notes: row.notes || undefined,
      isRecurring: Boolean(row.is_recurring),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    const boletos: InvoiceBoleto[] = (bolRes.data || []).map((row: any) => ({
      id: row.id,
      invoiceId: row.invoice_id || undefined,
      invoiceNumber: row.invoice_number || undefined,
      supplierName: row.supplier_name || undefined,
      supplierCnpj: row.supplier_cnpj || undefined,
      destinationBranch: row.destination_branch || undefined,
      barcode: row.barcode,
      amount: Number(row.amount) || 0,
      dueDate: row.due_date,
      installmentNumber: row.installment_number ? Number(row.installment_number) : 1,
      totalInstallments: row.total_installments ? Number(row.total_installments) : 1,
      status: row.status,
      paidAt: row.paid_at || undefined,
      paymentTime: row.payment_time || undefined,
      paidAmount: row.paid_amount ? Number(row.paid_amount) : undefined,
      paymentMethod: row.payment_method || undefined,
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
        expenses,
        boletos,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Erro ao carregar dados do Supabase',
    };
  }
}
