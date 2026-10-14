import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Product, StockMovement, Invoice, Employee, TimePunch, PunchType, SalaryAdvance, BillingRecord, ExpenseRecord } from '../types';
import { CompanySettings, DEFAULT_COMPANY_SETTINGS } from './companySettings';
import { AuthUser, UserRole } from '../types/auth';
import { calculateWeightedAverageCost } from './stockCalculations';

// Credenciais do Supabase oficial
const DEFAULT_SUPABASE_URL = 'https://izketyjtzbghnebqgnjv.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_Nt2QJXnvf8XDlPyjmoCfRA_pgFrE7oS';

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
    detectSessionInUrl: true,
  },
});

// ==========================================
// FORMATAÇÃO E AUTENTICAÇÃO REAL SUPABASE
// ==========================================

export function formatAuthUser(user: User | null): AuthUser | null {
  if (!user) return null;
  const metadata = user.user_metadata || {};
  const name =
    metadata.name ||
    metadata.full_name ||
    (user.email ? user.email.split('@')[0] : 'Usuário');
  const role: UserRole = metadata.role === 'STANDARD' ? 'STANDARD' : 'ADMIN';
  const department = metadata.department || 'Geral';

  return {
    id: user.id,
    name,
    email: user.email || '',
    role,
    status: 'ATIVO',
    department,
    createdAt: user.created_at || new Date().toISOString(),
    lastLogin: user.last_sign_in_at || new Date().toISOString(),
  };
}

export async function supabaseSignIn(
  email: string,
  password: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      let friendlyError = error.message;
      if (error.message.includes('Invalid login credentials')) {
        friendlyError = 'E-mail ou senha incorretos. Verifique suas credenciais.';
      } else if (error.message.includes('Email not confirmed')) {
        friendlyError = 'O e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou o painel do Supabase.';
      } else if (error.message.includes('rate limit')) {
        friendlyError = 'Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.';
      }
      return { success: false, error: friendlyError };
    }

    if (!data.user) {
      return { success: false, error: 'Usuário não retornado pelo Supabase.' };
    }

    const authUser = formatAuthUser(data.user);
    return { success: true, user: authUser || undefined };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado ao realizar login no Supabase.' };
  }
}

export async function supabaseSignUp(params: {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  department?: string;
}): Promise<{
  success: boolean;
  user?: AuthUser;
  needsEmailConfirmation?: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const email = params.email.trim();
    const role: UserRole = params.role || 'ADMIN';
    const name = params.name.trim();
    const department = params.department?.trim() || 'Diretoria / Gestão';

    const { data, error } = await supabase.auth.signUp({
      email,
      password: params.password,
      options: {
        data: {
          name,
          role,
          department,
        },
      },
    });

    if (error) {
      let friendly = error.message;
      if (error.message.includes('already registered')) {
        friendly = 'Este e-mail já está cadastrado no sistema. Faça login com ele.';
      } else if (error.message.includes('rate limit')) {
        friendly = 'Limite de envio de e-mails do Supabase atingido. Aguarde alguns minutos ou desative a confirmação de e-mail no painel do Supabase.';
      } else if (error.message.includes('at least 6 characters')) {
        friendly = 'A senha deve conter no mínimo 6 caracteres.';
      }
      return { success: false, error: friendly };
    }

    if (!data.user) {
      return { success: false, error: 'Falha ao registrar usuário no Supabase Auth.' };
    }

    const authUser = formatAuthUser(data.user);
    const hasSession = !!data.session;

    return {
      success: true,
      user: authUser || undefined,
      needsEmailConfirmation: !hasSession,
      message: hasSession
        ? 'Conta criada e autenticada com sucesso!'
        : 'Cadastro realizado no Supabase Auth! Caso a confirmação de e-mail esteja ativada no seu projeto, confirme o e-mail antes de fazer login.',
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado no cadastro do Supabase Auth.' };
  }
}

export async function supabaseSignOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao deslogar do Supabase.' };
  }
}

export async function supabaseGetSession(): Promise<{ user: AuthUser | null; session: any; error?: string }> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return { user: null, session: null, error: error.message };
    }
    const user = data.session?.user ? formatAuthUser(data.session.user) : null;
    return { user, session: data.session };
  } catch (err: any) {
    return { user: null, session: null, error: err.message };
  }
}

// ==========================================
// MAPPERS BIDIRECIONAIS: SUPABASE <-> MODELOS
// ==========================================

export function mapProductRow(row: any): Product {
  const averageCost = Number(row.average_cost) || 0;
  const lastCost = Number(row.last_cost) || 0;
  const sellingPrice = row.selling_price !== null && row.selling_price !== undefined
    ? Number(row.selling_price)
    : Number(((lastCost || averageCost || 10) * 1.45).toFixed(2));
  const costBase = averageCost > 0 ? averageCost : (lastCost || 1);
  const marginPercent = row.margin_percent !== null && row.margin_percent !== undefined
    ? Number(row.margin_percent)
    : Number((((sellingPrice - costBase) / costBase) * 100).toFixed(1));

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category || 'Geral',
    unit: row.unit || 'UN',
    ncm: row.ncm || undefined,
    currentStock: Number(row.current_stock) || 0,
    minStock: Number(row.min_stock) || 0,
    averageCost,
    lastCost,
    sellingPrice,
    marginPercent,
    location: row.location || undefined,
    createdAt: row.created_at || row.updated_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export function mapMovementRow(row: any): StockMovement {
  return {
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
  };
}

export function mapInvoiceRow(row: any): Invoice {
  return {
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
    status: row.status || 'CONFIRMADA',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function mapEmployeeRow(row: any): Employee {
  return {
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
  };
}

export function mapPunchRow(row: any): TimePunch {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    date: row.date,
    time: row.time,
    timestamp: row.timestamp,
    type: row.type,
    source: row.source || 'RELOGIO_DIGITAL',
    nsr: Number(row.nsr),
    notes: row.notes || undefined,
    device: row.device || undefined,
  };
}

export function mapAdvanceRow(row: any): SalaryAdvance {
  return {
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
  };
}

export function mapCompanySettingsRow(row: any): CompanySettings {
  return {
    name: row.name || DEFAULT_COMPANY_SETTINGS.name,
    tradeName: row.trade_name || DEFAULT_COMPANY_SETTINGS.tradeName,
    cnpj: row.cnpj || DEFAULT_COMPANY_SETTINGS.cnpj,
    stateRegistration: row.state_registration || undefined,
    phone: row.phone || undefined,
    email: row.email || undefined,
    address: row.address || undefined,
    cityState: row.city_state || undefined,
    logoUrl: row.logo_url || DEFAULT_COMPANY_SETTINGS.logoUrl,
  };
}

export function mapBillingRow(row: any): BillingRecord {
  return {
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
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export function mapExpenseRow(row: any): ExpenseRecord {
  return {
    id: row.id,
    description: row.description,
    category: row.category,
    customCategoryName: row.custom_category_name || undefined,
    amount: Number(row.amount) || 0,
    dueDate: row.due_date,
    paymentDate: row.payment_date || undefined,
    paymentTime: row.payment_time || undefined,
    competenceMonth: row.competence_month || row.due_date?.substring(0, 7) || '',
    status: row.status || 'PENDENTE',
    paymentMethod: row.payment_method || 'BOLETO',
    supplierOrBeneficiary: row.supplier_or_beneficiary || undefined,
    documentNumber: row.document_number || undefined,
    notes: row.notes || undefined,
    isRecurring: Boolean(row.is_recurring),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

// ==========================================
// CONSULTAS DIRETAS AO SUPABASE (LEITURA)
// ==========================================

export interface AppDatabaseState {
  products: Product[];
  movements: StockMovement[];
  invoices: Invoice[];
  employees: Employee[];
  punches: TimePunch[];
  advances: SalaryAdvance[];
  companySettings: CompanySettings;
  billings: BillingRecord[];
  expenses: ExpenseRecord[];
}

export async function dbLoadAllAppData(): Promise<{
  data?: AppDatabaseState;
  errors?: Array<{ table: string; message: string; details?: string }>;
}> {
  const errors: Array<{ table: string; message: string; details?: string }> = [];

  const [pRes, mRes, iRes, eRes, tpRes, saRes, csRes, bRes, expRes] = await Promise.all([
    supabase.from('products').select('*').order('name', { ascending: true }),
    supabase.from('stock_movements').select('*').order('created_at', { ascending: false }),
    supabase.from('invoices').select('*').order('created_at', { ascending: false }),
    supabase.from('employees').select('*').order('name', { ascending: true }),
    supabase.from('time_punches').select('*').order('timestamp', { ascending: true }),
    supabase.from('salary_advances').select('*').order('created_at', { ascending: false }),
    supabase.from('company_settings').select('*').limit(1),
    supabase.from('billings').select('*').order('date', { ascending: false }),
    supabase.from('expenses').select('*').order('due_date', { ascending: false }),
  ]);

  if (pRes.error) errors.push({ table: 'products', message: pRes.error.message, details: pRes.error.details });
  if (mRes.error) errors.push({ table: 'stock_movements', message: mRes.error.message, details: mRes.error.details });
  if (iRes.error) errors.push({ table: 'invoices', message: iRes.error.message, details: iRes.error.details });
  if (eRes.error) errors.push({ table: 'employees', message: eRes.error.message, details: eRes.error.details });
  if (tpRes.error) errors.push({ table: 'time_punches', message: tpRes.error.message, details: tpRes.error.details });
  if (saRes.error) errors.push({ table: 'salary_advances', message: saRes.error.message, details: saRes.error.details });
  if (csRes.error) errors.push({ table: 'company_settings', message: csRes.error.message, details: csRes.error.details });
  if (bRes.error) errors.push({ table: 'billings', message: bRes.error.message, details: bRes.error.details });
  if (expRes.error) errors.push({ table: 'expenses', message: expRes.error.message, details: expRes.error.details });

  const products = (pRes.data || []).map(mapProductRow);
  const movements = (mRes.data || []).map(mapMovementRow);
  const invoices = (iRes.data || []).map(mapInvoiceRow);
  const employees = (eRes.data || []).map(mapEmployeeRow);
  const punches = (tpRes.data || []).map(mapPunchRow);
  const advances = (saRes.data || []).map(mapAdvanceRow);
  const billings = (bRes.data || []).map(mapBillingRow);
  const expenses = (expRes.data || []).map(mapExpenseRow);

  const companySettings = csRes.data && csRes.data.length > 0
    ? mapCompanySettingsRow(csRes.data[0])
    : DEFAULT_COMPANY_SETTINGS;

  return {
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
    },
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ==========================================
// OPERAÇÕES EM PRODUTOS (SUPABASE)
// ==========================================

export async function dbCreateProduct(product: Product): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      id: product.id,
      code: product.code,
      name: product.name,
      category: product.category || 'Geral',
      unit: product.unit || 'UN',
      ncm: product.ncm || null,
      current_stock: product.currentStock,
      min_stock: product.minStock,
      average_cost: product.averageCost,
      last_cost: product.lastCost,
      selling_price: product.sellingPrice || null,
      margin_percent: product.marginPercent || null,
      location: product.location || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('products').insert(payload);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao cadastrar produto no Supabase.' };
  }
}

export async function dbUpdateProductPrice(
  productId: string,
  newSellingPrice: number,
  newMarginPercent?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('products')
      .update({
        selling_price: newSellingPrice,
        margin_percent: newMarginPercent || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar preço no Supabase.' };
  }
}

// ==========================================
// OPERAÇÕES EM MOVIMENTAÇÕES DE ESTOQUE
// ==========================================

export async function dbRegisterStockMovement(params: {
  productId: string;
  type: StockMovement['type'];
  quantity: number;
  date: string;
  documentNumber?: string;
  supplierOrCustomer?: string;
  notes?: string;
  products: Product[];
}): Promise<{ success: boolean; movement?: StockMovement; updatedProduct?: Product; error?: string }> {
  try {
    const target = params.products.find(p => p.id === params.productId);
    if (!target) {
      return { success: false, error: 'Produto não encontrado na base de dados.' };
    }

    const isExit = params.type.startsWith('SAIDA');
    if (isExit && params.quantity > target.currentStock) {
      return {
        success: false,
        error: `Saldo insuficiente em estoque! Saldo disponível: ${target.currentStock} ${target.unit}. Tentativa de saída: ${params.quantity} ${target.unit}.`,
      };
    }

    const resultingStock = isExit
      ? target.currentStock - params.quantity
      : target.currentStock + params.quantity;

    const unitCost = target.averageCost || target.lastCost || 0;
    const totalCost = Number((unitCost * params.quantity).toFixed(2));
    const movId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const movementPayload = {
      id: movId,
      product_id: target.id,
      product_name: target.name,
      type: params.type,
      quantity: params.quantity,
      unit_cost: unitCost,
      total_cost: totalCost,
      resulting_stock: resultingStock,
      resulting_average_cost: target.averageCost,
      date: params.date,
      document_number: params.documentNumber || null,
      document_type: 'MANUAL',
      notes: params.notes || null,
      supplier_or_customer: params.supplierOrCustomer || null,
      created_at: new Date().toISOString(),
    };

    // 1. Gravar movimentação
    const { error: movError } = await supabase.from('stock_movements').insert(movementPayload);
    if (movError) throw movError;

    // 2. Atualizar saldo do produto
    const { error: prodError } = await supabase
      .from('products')
      .update({
        current_stock: resultingStock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', target.id);
    if (prodError) throw prodError;

    const newMovement = mapMovementRow(movementPayload);
    const updatedProduct: Product = {
      ...target,
      currentStock: resultingStock,
      updatedAt: new Date().toISOString(),
    };

    return { success: true, movement: newMovement, updatedProduct };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao registrar movimentação de estoque.' };
  }
}

// ==========================================
// PROCESSAMENTO DE NOTA FISCAL (NF-E)
// ==========================================

export async function dbProcessInvoiceEntry(
  invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'status'>,
  currentProducts: Product[]
): Promise<{
  success: boolean;
  invoice?: Invoice;
  products?: Product[];
  movements?: StockMovement[];
  error?: string;
}> {
  try {
    const invoiceId = `inv-${Date.now()}`;
    const nowISO = new Date().toISOString();
    const entryDate = invoiceData.entryDate || nowISO.substring(0, 10);

    const invoicePayload = {
      id: invoiceId,
      number: invoiceData.number,
      series: invoiceData.series,
      issue_date: invoiceData.issueDate,
      entry_date: entryDate,
      access_key: invoiceData.accessKey,
      supplier: invoiceData.supplier,
      recipient: invoiceData.recipient || null,
      totals: invoiceData.totals,
      items: invoiceData.items,
      status: 'CONFIRMADA',
      created_at: nowISO,
    };

    const updatedProductsMap = new Map<string, Product>();
    currentProducts.forEach(p => updatedProductsMap.set(p.id, { ...p }));

    const newMovementsPayload: any[] = [];
    const productsUpsertPayload: any[] = [];

    invoiceData.items.forEach((item, index) => {
      let targetProduct: Product | undefined;

      // Localizar produto por código ou nome
      for (const p of updatedProductsMap.values()) {
        if (p.code.trim().toUpperCase() === item.code.trim().toUpperCase() ||
            p.name.trim().toLowerCase() === item.description.trim().toLowerCase()) {
          targetProduct = p;
          break;
        }
      }

      if (targetProduct) {
        const newAverageCost = calculateWeightedAverageCost(
          targetProduct.currentStock,
          targetProduct.averageCost,
          item.quantity,
          item.unitPrice
        );
        const newStock = targetProduct.currentStock + item.quantity;
        let newSellingPrice = targetProduct.sellingPrice;
        if (item.suggestedSalePrice !== undefined && item.suggestedSalePrice > 0) {
          newSellingPrice = item.suggestedSalePrice;
        } else if (!newSellingPrice) {
          newSellingPrice = Number((item.unitPrice * 1.45).toFixed(2));
        }
        const costBase = newAverageCost > 0 ? newAverageCost : item.unitPrice;
        const newMargin = item.marginPercent !== undefined
          ? item.marginPercent
          : Number((((newSellingPrice - costBase) / costBase) * 100).toFixed(1));

        const updated: Product = {
          ...targetProduct,
          currentStock: newStock,
          averageCost: newAverageCost,
          lastCost: item.unitPrice,
          sellingPrice: newSellingPrice,
          marginPercent: newMargin,
          ncm: item.ncm || targetProduct.ncm,
          unit: item.unit || targetProduct.unit,
          updatedAt: nowISO,
        };
        updatedProductsMap.set(targetProduct.id, updated);

        productsUpsertPayload.push({
          id: updated.id,
          code: updated.code,
          name: updated.name,
          category: updated.category || 'Geral',
          unit: updated.unit || 'UN',
          ncm: updated.ncm || null,
          current_stock: updated.currentStock,
          min_stock: updated.minStock,
          average_cost: updated.averageCost,
          last_cost: updated.lastCost,
          selling_price: updated.sellingPrice || null,
          margin_percent: updated.marginPercent || null,
          location: updated.location || null,
          updated_at: nowISO,
        });

        newMovementsPayload.push({
          id: `mov-${Date.now()}-${index}`,
          product_id: updated.id,
          product_name: updated.name,
          type: 'ENTRADA_NFE',
          quantity: item.quantity,
          unit_cost: item.unitPrice,
          total_cost: item.totalPrice,
          resulting_stock: newStock,
          resulting_average_cost: newAverageCost,
          date: entryDate,
          document_number: `NF-e ${invoiceData.number}`,
          document_type: 'NFE',
          notes: `Entrada NF-e nº ${invoiceData.number} - Fornecedor: ${invoiceData.supplier.name}`,
          supplier_or_customer: invoiceData.supplier.name,
          created_at: nowISO,
        });
      } else {
        const prodId = `prod-${Date.now()}-${index}`;
        const sellingPrice = item.suggestedSalePrice && item.suggestedSalePrice > 0
          ? item.suggestedSalePrice
          : Number((item.unitPrice * 1.45).toFixed(2));
        const marginPercent = item.marginPercent !== undefined
          ? item.marginPercent
          : Number((((sellingPrice - item.unitPrice) / item.unitPrice) * 100).toFixed(1));

        const newProd: Product = {
          id: prodId,
          code: item.code,
          name: item.description,
          category: 'Entrada Fiscal',
          unit: item.unit || 'UN',
          ncm: item.ncm,
          currentStock: item.quantity,
          minStock: Math.max(5, Math.ceil(item.quantity * 0.2)),
          averageCost: item.unitPrice,
          lastCost: item.unitPrice,
          sellingPrice,
          marginPercent,
          createdAt: nowISO,
          updatedAt: nowISO,
        };
        updatedProductsMap.set(prodId, newProd);

        productsUpsertPayload.push({
          id: newProd.id,
          code: newProd.code,
          name: newProd.name,
          category: newProd.category,
          unit: newProd.unit,
          ncm: newProd.ncm || null,
          current_stock: newProd.currentStock,
          min_stock: newProd.minStock,
          average_cost: newProd.averageCost,
          last_cost: newProd.lastCost,
          selling_price: newProd.sellingPrice || null,
          margin_percent: newProd.marginPercent || null,
          location: null,
          updated_at: nowISO,
        });

        newMovementsPayload.push({
          id: `mov-${Date.now()}-${index}`,
          product_id: newProd.id,
          product_name: newProd.name,
          type: 'ENTRADA_NFE',
          quantity: item.quantity,
          unit_cost: item.unitPrice,
          total_cost: item.totalPrice,
          resulting_stock: item.quantity,
          resulting_average_cost: item.unitPrice,
          date: entryDate,
          document_number: `NF-e ${invoiceData.number}`,
          document_type: 'NFE',
          notes: `Novo item cadastrado via NF-e nº ${invoiceData.number} de ${invoiceData.supplier.name}`,
          supplier_or_customer: invoiceData.supplier.name,
          created_at: nowISO,
        });
      }
    });

    // 1. Inserir NF-e
    const { error: invErr } = await supabase.from('invoices').insert(invoicePayload);
    if (invErr) throw invErr;

    // 2. Upsert de produtos
    if (productsUpsertPayload.length > 0) {
      const { error: prodErr } = await supabase.from('products').upsert(productsUpsertPayload, { onConflict: 'id' });
      if (prodErr) throw prodErr;
    }

    // 3. Inserir movimentações
    if (newMovementsPayload.length > 0) {
      const { error: movErr } = await supabase.from('stock_movements').insert(newMovementsPayload);
      if (movErr) throw movErr;
    }

    const createdInvoice = mapInvoiceRow(invoicePayload);
    const finalProducts = Array.from(updatedProductsMap.values());
    const createdMovements = newMovementsPayload.map(mapMovementRow);

    return {
      success: true,
      invoice: createdInvoice,
      products: finalProducts,
      movements: createdMovements,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao processar entrada da NF-e no Supabase.' };
  }
}

// ==========================================
// OPERAÇÕES EM COLABORADORES
// ==========================================

export async function dbCreateEmployee(employee: Employee): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      id: employee.id,
      registration_number: employee.registrationNumber,
      name: employee.name,
      cpf: employee.cpf,
      role: employee.role,
      department: employee.department,
      work_shift: employee.workShift || '08:00 às 17:00 (Segunda a Sexta)',
      daily_hours_expected: employee.dailyHoursExpected || 8,
      pin: employee.pin || null,
      admission_date: employee.admissionDate,
      status: employee.status || 'ATIVO',
      hourly_rate: employee.hourlyRate || null,
      avatar_initials: employee.avatarInitials || null,
      phone: employee.phone || null,
      email: employee.email || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('employees').insert(payload);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao cadastrar colaborador no Supabase.' };
  }
}

export async function dbUpdateEmployee(employee: Employee): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      registration_number: employee.registrationNumber,
      name: employee.name,
      cpf: employee.cpf,
      role: employee.role,
      department: employee.department,
      work_shift: employee.workShift || '08:00 às 17:00 (Segunda a Sexta)',
      daily_hours_expected: employee.dailyHoursExpected || 8,
      pin: employee.pin || null,
      admission_date: employee.admissionDate,
      status: employee.status || 'ATIVO',
      hourly_rate: employee.hourlyRate || null,
      avatar_initials: employee.avatarInitials || null,
      phone: employee.phone || null,
      email: employee.email || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('employees').update(payload).eq('id', employee.id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar colaborador no Supabase.' };
  }
}

export async function dbDeleteEmployee(employeeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Remover batidas vinculadas
    await supabase.from('time_punches').delete().eq('employee_id', employeeId);
    // 2. Remover colaborador
    const { error } = await supabase.from('employees').delete().eq('id', employeeId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao excluir colaborador do Supabase.' };
  }
}

// ==========================================
// OPERAÇÕES EM BATIDAS DE PONTO (TIME PUNCHES)
// ==========================================

export async function dbRegisterPunch(params: {
  employeeId: string;
  type?: PunchType;
  customTime?: string;
  customDate?: string;
  notes?: string;
  employees: Employee[];
  existingPunches: TimePunch[];
}): Promise<{ success: boolean; punch?: TimePunch; error?: string }> {
  try {
    const employee = params.employees.find(e => e.id === params.employeeId);
    if (!employee) {
      return { success: false, error: 'Colaborador não encontrado.' };
    }

    const now = new Date();
    const dateStr = params.customDate || now.toISOString().substring(0, 10);
    const timeStr = params.customTime || now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const timestampStr = `${dateStr}T${timeStr}:00.000Z`;

    // Determinar o tipo da batida se não informado
    let punchType = params.type;
    if (!punchType) {
      const todayPunches = params.existingPunches.filter(
        p => p.employeeId === params.employeeId && p.date === dateStr
      );
      const count = todayPunches.length;
      if (count === 0) punchType = 'ENTRADA';
      else if (count === 1) punchType = 'SAIDA_INTERVALO';
      else if (count === 2) punchType = 'RETORNO_INTERVALO';
      else punchType = 'SAIDA';
    }

    const maxNsr = params.existingPunches.reduce((max, p) => Math.max(max, p.nsr || 0), 1000);
    const newNsr = maxNsr + 1;
    const punchId = `punch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const payload = {
      id: punchId,
      employee_id: employee.id,
      employee_name: employee.name,
      date: dateStr,
      time: timeStr,
      timestamp: timestampStr,
      type: punchType,
      source: 'RELOGIO_DIGITAL',
      nsr: newNsr,
      notes: params.notes || null,
      device: 'PORTAL_WEB',
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('time_punches').insert(payload);
    if (error) throw error;

    return { success: true, punch: mapPunchRow(payload) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao registrar ponto no Supabase.' };
  }
}

export async function dbUpdateDayPunches(params: {
  employeeId: string;
  date: string;
  entry1?: string;
  exit1?: string;
  entry2?: string;
  exit2?: string;
  notes?: string;
  employees: Employee[];
  existingPunches: TimePunch[];
}): Promise<{ success: boolean; createdPunches?: TimePunch[]; error?: string }> {
  try {
    const employee = params.employees.find(e => e.id === params.employeeId);
    if (!employee) return { success: false, error: 'Colaborador não encontrado.' };

    // 1. Remover batidas antigas daquele dia
    const { error: delError } = await supabase
      .from('time_punches')
      .delete()
      .eq('employee_id', params.employeeId)
      .eq('date', params.date);
    if (delError) throw delError;

    // 2. Criar novas batidas configuradas
    const newEntries: Array<{ type: PunchType; time: string }> = [];
    if (params.entry1?.trim()) newEntries.push({ type: 'ENTRADA', time: params.entry1.trim() });
    if (params.exit1?.trim()) newEntries.push({ type: 'SAIDA_INTERVALO', time: params.exit1.trim() });
    if (params.entry2?.trim()) newEntries.push({ type: 'RETORNO_INTERVALO', time: params.entry2.trim() });
    if (params.exit2?.trim()) newEntries.push({ type: 'SAIDA', time: params.exit2.trim() });

    if (newEntries.length === 0) {
      return { success: true, createdPunches: [] };
    }

    let currentNsr = params.existingPunches.reduce((max, p) => Math.max(max, p.nsr || 0), 1000);
    const payloads = newEntries.map((e, idx) => {
      currentNsr += 1;
      return {
        id: `punch-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        employee_id: employee.id,
        employee_name: employee.name,
        date: params.date,
        time: e.time,
        timestamp: `${params.date}T${e.time}:00.000Z`,
        type: e.type,
        source: 'AJUSTE_MANUAL',
        nsr: currentNsr,
        notes: params.notes || 'Ajuste de espelho de ponto',
        device: 'PAINEL_GESTOR',
        created_at: new Date().toISOString(),
      };
    });

    const { error: insError } = await supabase.from('time_punches').insert(payloads);
    if (insError) throw insError;

    return { success: true, createdPunches: payloads.map(mapPunchRow) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar horários do dia no Supabase.' };
  }
}

export async function dbDeleteEmployeePunchesForDate(
  employeeId: string,
  date: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('time_punches')
      .delete()
      .eq('employee_id', employeeId)
      .eq('date', date);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao remover horários do dia no Supabase.' };
  }
}

// ==========================================
// OPERAÇÕES EM VALES E ADIANTAMENTOS
// ==========================================

export async function dbCreateSalaryAdvance(
  advance: Omit<SalaryAdvance, 'id' | 'createdAt'>
): Promise<{ success: boolean; advance?: SalaryAdvance; error?: string }> {
  try {
    const id = `adv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowISO = new Date().toISOString();
    const payload = {
      id,
      employee_id: advance.employeeId,
      employee_name: advance.employeeName,
      employee_registration: advance.employeeRegistration,
      employee_role: advance.employeeRole || null,
      employee_department: advance.employeeDepartment || null,
      date: advance.date,
      competence_month: advance.competenceMonth,
      amount: advance.amount,
      payment_method: advance.paymentMethod,
      category: advance.category || 'OUTRO',
      reason: advance.reason,
      status: advance.status,
      approved_by: advance.approvedBy || null,
      receipt_signed: advance.receiptSigned ?? false,
      notes: advance.notes || null,
      created_at: nowISO,
    };

    const { error } = await supabase.from('salary_advances').insert(payload);
    if (error) throw error;
    return { success: true, advance: mapAdvanceRow(payload) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao registrar vale no Supabase.' };
  }
}

export async function dbUpdateSalaryAdvance(
  advance: SalaryAdvance
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      employee_id: advance.employeeId,
      employee_name: advance.employeeName,
      employee_registration: advance.employeeRegistration,
      employee_role: advance.employeeRole || null,
      employee_department: advance.employeeDepartment || null,
      date: advance.date,
      competence_month: advance.competenceMonth,
      amount: advance.amount,
      payment_method: advance.paymentMethod,
      category: advance.category || 'OUTRO',
      reason: advance.reason,
      status: advance.status,
      approved_by: advance.approvedBy || null,
      receipt_signed: advance.receiptSigned ?? false,
      notes: advance.notes || null,
    };

    const { error } = await supabase.from('salary_advances').update(payload).eq('id', advance.id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar vale no Supabase.' };
  }
}

export async function dbDeleteSalaryAdvance(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('salary_advances').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao excluir vale do Supabase.' };
  }
}

// ==========================================
// OPERAÇÕES EM FATURAMENTOS DE OS (BILLINGS)
// ==========================================

export async function dbCreateBilling(
  data: Omit<BillingRecord, 'id' | 'createdAt' | 'grandTotal'>
): Promise<{ success: boolean; record?: BillingRecord; error?: string }> {
  try {
    const id = `bill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const products = Number(data.productsTotal) || 0;
    const alignment = Number(data.alignmentBalancingTotal) || 0;
    const services = Number(data.servicesTotal) || 0;
    const grandTotal = Math.round((products + alignment + services) * 100) / 100;
    const nowISO = new Date().toISOString();

    const payload = {
      id,
      date: data.date,
      service_order_number: data.serviceOrderNumber.trim(),
      collaborator_name: data.collaboratorName?.trim() || null,
      collaborator_id: data.collaboratorId?.trim() || null,
      products_total: products,
      alignment_balancing_total: alignment,
      services_total: services,
      grand_total: grandTotal,
      customer_name: data.customerName?.trim() || null,
      vehicle_plate: data.vehiclePlate?.trim().toUpperCase() || null,
      vehicle_model: data.vehicleModel?.trim() || null,
      payment_method: data.paymentMethod || 'PIX',
      notes: data.notes?.trim() || null,
      created_at: nowISO,
      updated_at: nowISO,
    };

    const { error } = await supabase.from('billings').insert(payload);
    if (error) throw error;
    return { success: true, record: mapBillingRow(payload) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao salvar faturamento no Supabase.' };
  }
}

export async function dbUpdateBilling(
  id: string,
  data: Partial<Omit<BillingRecord, 'id' | 'createdAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: any = {
      updated_at: new Date().toISOString(),
    };
    if (data.date !== undefined) payload.date = data.date;
    if (data.serviceOrderNumber !== undefined) payload.service_order_number = data.serviceOrderNumber;
    if (data.collaboratorName !== undefined) payload.collaborator_name = data.collaboratorName || null;
    if (data.collaboratorId !== undefined) payload.collaborator_id = data.collaboratorId || null;
    if (data.productsTotal !== undefined) payload.products_total = Number(data.productsTotal) || 0;
    if (data.alignmentBalancingTotal !== undefined) payload.alignment_balancing_total = Number(data.alignmentBalancingTotal) || 0;
    if (data.servicesTotal !== undefined) payload.services_total = Number(data.servicesTotal) || 0;
    if (data.grandTotal !== undefined) payload.grand_total = Number(data.grandTotal) || 0;
    if (data.customerName !== undefined) payload.customer_name = data.customerName || null;
    if (data.vehiclePlate !== undefined) payload.vehicle_plate = data.vehiclePlate?.toUpperCase() || null;
    if (data.vehicleModel !== undefined) payload.vehicle_model = data.vehicleModel || null;
    if (data.paymentMethod !== undefined) payload.payment_method = data.paymentMethod;
    if (data.notes !== undefined) payload.notes = data.notes || null;

    const { error } = await supabase.from('billings').update(payload).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar faturamento no Supabase.' };
  }
}

export async function dbDeleteBilling(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('billings').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao excluir faturamento do Supabase.' };
  }
}

// ==========================================
// OPERAÇÕES EM DESPESAS (EXPENSES)
// ==========================================

export async function dbCreateExpense(
  expenseData: Omit<ExpenseRecord, 'id' | 'createdAt'>
): Promise<{ success: boolean; expense?: ExpenseRecord; error?: string }> {
  try {
    const id = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowISO = new Date().toISOString();
    const payload = {
      id,
      description: expenseData.description.trim(),
      category: expenseData.category,
      custom_category_name: expenseData.customCategoryName?.trim() || null,
      amount: Number(expenseData.amount) || 0,
      due_date: expenseData.dueDate,
      payment_date: expenseData.paymentDate || null,
      payment_time: expenseData.paymentTime || null,
      competence_month: expenseData.competenceMonth || expenseData.dueDate.substring(0, 7),
      status: expenseData.status,
      payment_method: expenseData.paymentMethod || 'BOLETO',
      supplier_or_beneficiary: expenseData.supplierOrBeneficiary?.trim() || null,
      document_number: expenseData.documentNumber?.trim() || null,
      notes: expenseData.notes?.trim() || null,
      is_recurring: Boolean(expenseData.isRecurring),
      created_at: nowISO,
      updated_at: nowISO,
    };

    const { error } = await supabase.from('expenses').insert(payload);
    if (error) throw error;
    return { success: true, expense: mapExpenseRow(payload) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao lançar despesa no Supabase.' };
  }
}

export async function dbUpdateExpense(
  id: string,
  data: Partial<ExpenseRecord>
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: any = {
      updated_at: new Date().toISOString(),
    };
    if (data.description !== undefined) payload.description = data.description;
    if (data.category !== undefined) payload.category = data.category;
    if (data.customCategoryName !== undefined) payload.custom_category_name = data.customCategoryName || null;
    if (data.amount !== undefined) payload.amount = Number(data.amount) || 0;
    if (data.dueDate !== undefined) payload.due_date = data.dueDate;
    if (data.paymentDate !== undefined) payload.payment_date = data.paymentDate || null;
    if (data.paymentTime !== undefined) payload.payment_time = data.paymentTime || null;
    if (data.competenceMonth !== undefined) payload.competence_month = data.competenceMonth;
    if (data.status !== undefined) payload.status = data.status;
    if (data.paymentMethod !== undefined) payload.payment_method = data.paymentMethod;
    if (data.supplierOrBeneficiary !== undefined) payload.supplier_or_beneficiary = data.supplierOrBeneficiary || null;
    if (data.documentNumber !== undefined) payload.document_number = data.documentNumber || null;
    if (data.notes !== undefined) payload.notes = data.notes || null;
    if (data.isRecurring !== undefined) payload.is_recurring = Boolean(data.isRecurring);

    const { error } = await supabase.from('expenses').update(payload).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar despesa no Supabase.' };
  }
}

export async function dbDeleteExpense(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao excluir despesa do Supabase.' };
  }
}

// ==========================================
// OPERAÇÕES EM CONFIGURAÇÕES DA EMPRESA
// ==========================================

export async function dbSaveCompanySettings(
  settings: CompanySettings
): Promise<{ success: boolean; error?: string }> {
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
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao salvar configurações da empresa no Supabase.' };
  }
}

// ==========================================
// TESTES E SCHEMAS SQL
// ==========================================

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  tablesStatus?: Record<string, boolean>;
}

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
    'billings',
    'expenses'
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
      return {
        success: true,
        message: `Conectado ao Supabase com ${Object.values(tablesStatus).filter(Boolean).length} tabelas ativas.`,
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

export const SUPABASE_SQL_SCHEMA = `-- SCHEMA OFICIAL SUPABASE
-- Execute no SQL Editor do Supabase se necessário
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

CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
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
`;

export const BILLING_TABLE_ONLY_SQL = SUPABASE_SQL_SCHEMA;
export const UPDATE_MIGRATION_SQL = SUPABASE_SQL_SCHEMA;

export interface MonitoredTableInfo {
  key: string;
  label: string;
}

export const MONITORED_TABLES: MonitoredTableInfo[] = [
  { key: 'products', label: '1. Produtos' },
  { key: 'stock_movements', label: '2. Movimentações' },
  { key: 'invoices', label: '3. Notas Fiscais' },
  { key: 'employees', label: '4. Colaboradores' },
  { key: 'time_punches', label: '5. Ponto (REP-P)' },
  { key: 'salary_advances', label: '6. Vales Salariais' },
  { key: 'company_settings', label: '7. Dados Empresa' },
  { key: 'billings', label: '8. Faturamento (OS)' },
  { key: 'expenses', label: '9. Despesas' },
];

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

  try {
    if (data.products && data.products.length > 0) {
      const payload = data.products.map(p => ({
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
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from('products').upsert(payload, { onConflict: 'id' });
      if (error) errors.push(`Produtos: ${error.message}`);
    }

    if (data.employees && data.employees.length > 0) {
      const payload = data.employees.map(e => ({
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
      if (error) errors.push(`Colaboradores: ${error.message}`);
    }

    if (data.companySettings) {
      const { error } = await supabase.from('company_settings').upsert({
        id: 'default_company',
        name: data.companySettings.name,
        trade_name: data.companySettings.tradeName,
        cnpj: data.companySettings.cnpj,
        state_registration: data.companySettings.stateRegistration || null,
        phone: data.companySettings.phone || null,
        email: data.companySettings.email || null,
        address: data.companySettings.address || null,
        city_state: data.companySettings.cityState || null,
        logo_url: data.companySettings.logoUrl || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      if (error) errors.push(`Empresa: ${error.message}`);
    }
  } catch (err: any) {
    errors.push(err.message || 'Erro inesperado durante sincronização.');
  }

  return {
    success: errors.length === 0,
    errors,
  };
}
