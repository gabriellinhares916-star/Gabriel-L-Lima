import { supabase } from './supabaseClient';
import {
  Product,
  StockMovement,
  Invoice,
  Employee,
  TimePunch,
  SalaryAdvance,
  BillingRecord,
  ExpenseRecord,
  InvoiceBoleto,
  BoletoStatus,
} from '../types';
import { CompanySettings } from './companySettings';
import { AuthUser } from '../types/auth';

export interface SupabaseFullData {
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
  profiles: AuthUser[];
}

export interface SupabaseLoadResult {
  success: boolean;
  data: SupabaseFullData;
  errors: Record<string, string>;
  firstError?: string;
}

/**
 * Carrega todos os registros diretamente das tabelas do Supabase
 */
export async function loadAllDataFromSupabase(): Promise<SupabaseLoadResult> {
  const errors: Record<string, string> = {};

  const [
    productsRes,
    movementsRes,
    invoicesRes,
    employeesRes,
    punchesRes,
    advancesRes,
    settingsRes,
    billingsRes,
    expensesRes,
    boletosRes,
    profilesRes,
  ] = await Promise.all([
    supabase.from('products').select('*').order('name', { ascending: true }),
    supabase.from('stock_movements').select('*').order('created_at', { ascending: false }),
    supabase.from('invoices').select('*').order('created_at', { ascending: false }),
    supabase.from('employees').select('*').order('name', { ascending: true }),
    supabase.from('time_punches').select('*').order('nsr', { ascending: true }),
    supabase.from('salary_advances').select('*').order('created_at', { ascending: false }),
    supabase.from('company_settings').select('*').limit(1),
    supabase.from('billings').select('*').order('date', { ascending: false }),
    supabase.from('expenses').select('*').order('due_date', { ascending: true }),
    supabase.from('boletos').select('*').order('due_date', { ascending: true }),
    supabase.from('profiles').select('*').order('name', { ascending: true }),
  ]);

  // Produtos
  let products: Product[] = [];
  if (productsRes.error) {
    errors['products'] = `Produtos: ${productsRes.error.message}`;
  } else {
    products = (productsRes.data || []).map((row: any) => ({
      id: row.id,
      code: row.code || '',
      name: row.name || '',
      category: row.category || 'Geral',
      unit: row.unit || 'UN',
      ncm: row.ncm || '',
      currentStock: Number(row.current_stock) || 0,
      minStock: Number(row.min_stock) || 0,
      averageCost: Number(row.average_cost) || 0,
      lastCost: Number(row.last_cost) || 0,
      sellingPrice: row.selling_price !== null && row.selling_price !== undefined ? Number(row.selling_price) : undefined,
      marginPercent: row.margin_percent !== null && row.margin_percent !== undefined ? Number(row.margin_percent) : undefined,
      location: row.location || undefined,
      createdAt: row.created_at || row.updated_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    }));
  }

  // Movimentações
  let movements: StockMovement[] = [];
  if (movementsRes.error) {
    errors['stock_movements'] = `Movimentações: ${movementsRes.error.message}`;
  } else {
    movements = (movementsRes.data || []).map((row: any) => ({
      id: row.id,
      productId: row.product_id,
      productCode: row.product_code || 'PROD',
      productName: row.product_name,
      unit: row.unit || 'UN',
      type: row.type,
      documentType: row.document_type || 'MANUAL',
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
  }

  // Notas Fiscais
  let invoices: Invoice[] = [];
  if (invoicesRes.error) {
    errors['invoices'] = `Notas Fiscais: ${invoicesRes.error.message}`;
  } else {
    invoices = (invoicesRes.data || []).map((row: any) => ({
      id: row.id,
      number: row.number,
      series: row.series,
      issueDate: row.issue_date,
      entryDate: row.entry_date,
      accessKey: row.access_key,
      destinationBranch: row.destination_branch || undefined,
      supplier: row.supplier || { name: 'Fornecedor', cnpj: '' },
      recipient: row.recipient || undefined,
      totals: row.totals || { totalProducts: 0, totalInvoice: 0 },
      items: Array.isArray(row.items) ? row.items : [],
      boletos: Array.isArray(row.boletos) ? row.boletos : undefined,
      status: row.status || 'CONFIRMADA',
      createdAt: row.created_at || new Date().toISOString(),
    }));
  }

  // Colaboradores
  let employees: Employee[] = [];
  if (employeesRes.error) {
    errors['employees'] = `Colaboradores: ${employeesRes.error.message}`;
  } else {
    employees = (employeesRes.data || []).map((row: any) => ({
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
  }

  // Batidas de Ponto
  let punches: TimePunch[] = [];
  if (punchesRes.error) {
    errors['time_punches'] = `Ponto Eletrônico: ${punchesRes.error.message}`;
  } else {
    punches = (punchesRes.data || []).map((row: any) => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      date: row.date,
      time: row.time,
      timestamp: row.timestamp,
      type: row.type,
      source: row.source || 'RELOGIO_DIGITAL',
      nsr: Number(row.nsr) || 0,
      notes: row.notes || undefined,
      device: row.device || undefined,
    }));
  }

  // Vales & Adiantamentos
  let advances: SalaryAdvance[] = [];
  if (advancesRes.error) {
    errors['salary_advances'] = `Vales Salariais: ${advancesRes.error.message}`;
  } else {
    advances = (advancesRes.data || []).map((row: any) => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      employeeRegistration: row.employee_registration,
      employeeRole: row.employee_role || undefined,
      employeeDepartment: row.employee_department || undefined,
      date: row.date,
      competenceMonth: row.competence_month,
      amount: Number(row.amount) || 0,
      paymentMethod: row.payment_method || 'DINHEIRO',
      category: row.category || 'OUTRO',
      reason: row.reason || 'Adiantamento',
      status: row.status || 'PENDENTE_DESCONTO',
      approvedBy: row.approved_by || undefined,
      receiptSigned: Boolean(row.receipt_signed),
      notes: row.notes || undefined,
      createdAt: row.created_at,
    }));
  }

  // Configurações da Empresa
  let companySettings: CompanySettings | undefined = undefined;
  if (settingsRes.error) {
    errors['company_settings'] = `Config Empresa: ${settingsRes.error.message}`;
  } else if (settingsRes.data && settingsRes.data.length > 0) {
    const cs = settingsRes.data[0];
    companySettings = {
      name: cs.name || 'Lord Lub - Centro Automotivo & Lubrificação',
      tradeName: cs.trade_name || 'LORD LUB',
      cnpj: cs.cnpj || '00.000.000/0001-00',
      stateRegistration: cs.state_registration || undefined,
      phone: cs.phone || undefined,
      email: cs.email || undefined,
      address: cs.address || undefined,
      cityState: cs.city_state || undefined,
      logoUrl: cs.logo_url || undefined,
    };
  }

  // Faturamento (OS)
  let billings: BillingRecord[] = [];
  if (billingsRes.error) {
    errors['billings'] = `Faturamentos: ${billingsRes.error.message}`;
  } else {
    billings = (billingsRes.data || []).map((row: any) => ({
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
  }

  // Despesas
  let expenses: ExpenseRecord[] = [];
  if (expensesRes.error) {
    errors['expenses'] = `Despesas: ${expensesRes.error.message}`;
  } else {
    expenses = (expensesRes.data || []).map((row: any) => ({
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
  }

  // Boletos
  let boletos: InvoiceBoleto[] = [];
  if (boletosRes.error) {
    errors['boletos'] = `Boletos: ${boletosRes.error.message}`;
  } else {
    boletos = (boletosRes.data || []).map((row: any) => ({
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
      status: (row.status as BoletoStatus) || 'PENDENTE',
      paidAt: row.paid_at || undefined,
      paymentTime: row.payment_time || undefined,
      paidAmount: row.paid_amount ? Number(row.paid_amount) : undefined,
      paymentMethod: row.payment_method || undefined,
      notes: row.notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  // Perfis de Usuários
  let profiles: AuthUser[] = [];
  if (profilesRes.error) {
    // Se a tabela profiles ainda não existir no schema, não quebra a aplicação inteira
    // apenas registra o aviso
    errors['profiles'] = `Perfis: ${profilesRes.error.message}`;
  } else {
    profiles = (profilesRes.data || []).map((row: any) => ({
      id: row.id,
      name: row.name || 'Usuário',
      email: row.email,
      role: row.role || 'STANDARD',
      department: row.department || undefined,
      status: row.status || 'ATIVO',
      avatarUrl: row.avatar_url || undefined,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at,
    }));
  }

  const hasErrors = Object.keys(errors).length > 0;
  const firstErrorKey = Object.keys(errors)[0];

  return {
    success: !hasErrors,
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
      profiles,
    },
    errors,
    firstError: hasErrors ? errors[firstErrorKey] : undefined,
  };
}

// ==========================================
// OPERAÇÕES DE ESCRITA NO SUPABASE (CRUD DIRETO)
// ==========================================

export async function supabaseSaveProduct(p: Product): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
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
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('products').upsert(payload, { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao salvar produto no Supabase' };
  }
}

export async function supabaseDeleteProduct(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao excluir produto no Supabase' };
  }
}

export async function supabaseSaveStockMovement(m: StockMovement): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
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
    };
    const { error } = await supabase.from('stock_movements').upsert(payload, { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao gravar movimentação no Supabase' };
  }
}

export async function supabaseSaveInvoice(inv: Invoice): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
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
    };
    const { error } = await supabase.from('invoices').upsert(payload, { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao salvar nota fiscal no Supabase' };
  }
}

export async function supabaseDeleteInvoice(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Excluir boletos vinculados primeiro
    await supabase.from('boletos').delete().eq('invoice_id', invoiceId);
    const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao excluir nota fiscal no Supabase' };
  }
}

export async function supabaseSaveEmployee(e: Employee): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
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
    };
    const { error } = await supabase.from('employees').upsert(payload, { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao salvar colaborador no Supabase' };
  }
}

export async function supabaseDeleteEmployee(employeeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Exclui batidas do colaborador primeiro
    await supabase.from('time_punches').delete().eq('employee_id', employeeId);
    await supabase.from('salary_advances').delete().eq('employee_id', employeeId);
    const { error } = await supabase.from('employees').delete().eq('id', employeeId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao excluir colaborador no Supabase' };
  }
}

export async function supabaseSaveTimePunch(p: TimePunch): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
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
    };
    const { error } = await supabase.from('time_punches').upsert(payload, { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao registrar batida de ponto no Supabase' };
  }
}

export async function supabaseDeleteDayPunches(employeeId: string, date: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('time_punches')
      .delete()
      .eq('employee_id', employeeId)
      .eq('date', date);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao remover pontos do dia no Supabase' };
  }
}

export async function supabaseSaveSalaryAdvance(a: SalaryAdvance): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
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
    };
    const { error } = await supabase.from('salary_advances').upsert(payload, { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao gravar vale no Supabase' };
  }
}

export async function supabaseDeleteSalaryAdvance(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('salary_advances').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao excluir vale no Supabase' };
  }
}

export async function supabaseSaveBilling(b: BillingRecord): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
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
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('billings').upsert(payload, { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao salvar faturamento no Supabase' };
  }
}

export async function supabaseDeleteBilling(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('billings').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao excluir faturamento no Supabase' };
  }
}

export async function supabaseSaveExpense(e: ExpenseRecord): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
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
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('expenses').upsert(payload, { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao salvar despesa no Supabase' };
  }
}

export async function supabaseDeleteExpense(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao excluir despesa no Supabase' };
  }
}

export async function supabaseSaveBoleto(b: InvoiceBoleto): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
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
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('boletos').upsert(payload, { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao salvar boleto no Supabase' };
  }
}

export async function supabaseDeleteBoleto(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('boletos').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao excluir boleto no Supabase' };
  }
}

export async function supabaseSaveCompanySettings(settings: CompanySettings): Promise<{ success: boolean; error?: string }> {
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
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao salvar dados da empresa no Supabase' };
  }
}

export async function supabaseSaveProfile(user: AuthUser): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'STANDARD',
      department: user.department || null,
      status: user.status || 'ATIVO',
      avatar_url: user.avatarUrl || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao salvar perfil no Supabase' };
  }
}

export async function supabaseDeleteProfile(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao excluir perfil no Supabase' };
  }
}

export async function supabaseClearAllOperationalData(): Promise<{ success: boolean; error?: string }> {
  try {
    const tables = [
      'billings',
      'expenses',
      'boletos',
      'salary_advances',
      'time_punches',
      'stock_movements',
      'invoices',
      'products',
    ];
    for (const table of tables) {
      // Deleta todos os registros não nulos
      const { error } = await supabase.from(table).delete().neq('id', '___non_existent___');
      if (error) {
        console.warn(`Erro ao limpar tabela ${table}:`, error.message);
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao zerar tabelas no Supabase' };
  }
}
