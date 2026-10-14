import React, { useState, useEffect, useCallback } from 'react';
import {
  Product,
  Invoice,
  StockMovement,
  MovementType,
  Employee,
  TimePunch,
  PunchType,
  SalaryAdvance,
  BillingRecord,
  ExpenseRecord,
  ExpensePaymentMethod
} from './types';
import { CompanySettings, DEFAULT_COMPANY_SETTINGS } from './utils/companySettings';
import { AuthUser } from './types/auth';
import {
  supabase,
  supabaseGetSession,
  supabaseSignOut,
  formatAuthUser,
  dbLoadAllAppData,
  dbCreateProduct,
  dbUpdateProductPrice,
  dbRegisterStockMovement,
  dbProcessInvoiceEntry,
  dbCreateEmployee,
  dbUpdateEmployee,
  dbDeleteEmployee,
  dbRegisterPunch,
  dbUpdateDayPunches,
  dbDeleteEmployeePunchesForDate,
  dbCreateSalaryAdvance,
  dbUpdateSalaryAdvance,
  dbDeleteSalaryAdvance,
  dbCreateBilling,
  dbUpdateBilling,
  dbDeleteBilling,
  dbCreateExpense,
  dbUpdateExpense,
  dbDeleteExpense,
  dbSaveCompanySettings,
} from './utils/supabaseClient';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { InvoiceEntry } from './components/InvoiceEntry';
import { InventoryManager } from './components/InventoryManager';
import { InvoicesList } from './components/InvoicesList';
import { MonthlyReportView } from './components/MonthlyReportView';
import { PriceConsultationView } from './components/PriceConsultationView';
import { TimeClockDashboard } from './components/TimeClockDashboard';
import { SalaryAdvancesView } from './components/SalaryAdvancesView';
import { BillingView } from './components/BillingView';
import { ExpensesManagementView } from './components/ExpensesManagementView';
import { UserManagementView } from './components/UserManagementView';
import { LoginScreen } from './components/LoginScreen';
import { DanfeModal } from './components/DanfeModal';
import { CompanySettingsModal } from './components/CompanySettingsModal';
import { SupabaseSyncModal } from './components/SupabaseSyncModal';
import { SupabaseErrorBanner, SupabaseErrorInfo } from './components/SupabaseErrorBanner';
import { Loader2, Database, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  // Autenticação Real Supabase Auth (Sessão Persistente)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Estados de dados lidos diretamente das tabelas do Supabase
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [punches, setPunches] = useState<TimePunch[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [billings, setBillings] = useState<BillingRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);

  // Controle de carregamento e erros na tela
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [supabaseError, setSupabaseError] = useState<SupabaseErrorInfo | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Navegação e Modais
  const [currentTab, setCurrentTab] = useState<
    'dashboard' | 'billing' | 'expenses' | 'entry' | 'stock' | 'prices' | 'timeclock' | 'advances' | 'invoices' | 'reports' | 'users'
  >('dashboard');
  const [isCompanySettingsModalOpen, setIsCompanySettingsModalOpen] = useState<boolean>(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);
  const [activeDanfeInvoice, setActiveDanfeInvoice] = useState<Invoice | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Carrega todos os dados diretamente das tabelas do Supabase usando a sessão ativa
  const loadDatabaseData = useCallback(async () => {
    setIsLoadingData(true);
    setSupabaseError(null);

    try {
      const result = await dbLoadAllAppData();
      setIsLoadingData(false);

      if (result.errors && result.errors.length > 0) {
        const firstErr = result.errors[0];
        setSupabaseError({
          title: `Falha ao consultar tabela "${firstErr.table}" do Supabase`,
          message: firstErr.message,
          table: firstErr.table,
          details: firstErr.details || result.errors.map(e => `${e.table}: ${e.message}`).join(' | '),
          timestamp: new Date().toISOString(),
        });
      }

      if (result.data) {
        setProducts(result.data.products);
        setMovements(result.data.movements);
        setInvoices(result.data.invoices);
        setEmployees(result.data.employees);
        setPunches(result.data.punches);
        setAdvances(result.data.advances);
        setCompanySettings(result.data.companySettings);
        setBillings(result.data.billings);
        setExpenses(result.data.expenses);
      }
    } catch (err: any) {
      setIsLoadingData(false);
      setSupabaseError({
        title: 'Erro de Conexão com o Supabase',
        message: err.message || 'Não foi possível ler as tabelas do Supabase.',
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  // 1. Checagem inicial de sessão persistente no Supabase Auth
  useEffect(() => {
    let isMounted = true;

    async function checkCurrentSession() {
      try {
        const { user } = await supabaseGetSession();
        if (isMounted) {
          if (user) {
            setCurrentUser(user);
          }
          setIsAuthChecking(false);
        }
      } catch (err) {
        if (isMounted) {
          setIsAuthChecking(false);
        }
      }
    }

    checkCurrentSession();

    // Ouvir alterações de estado de autenticação (login, logout, refresh de token)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        const user = formatAuthUser(session.user);
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // 2. Quando o usuário estiver logado, carregar dados das tabelas do Supabase
  useEffect(() => {
    if (currentUser) {
      loadDatabaseData();
    } else {
      // Limpar estados em memória ao deslogar
      setProducts([]);
      setInvoices([]);
      setMovements([]);
      setEmployees([]);
      setPunches([]);
      setAdvances([]);
      setBillings([]);
      setExpenses([]);
    }
  }, [currentUser, loadDatabaseData]);

  // ==========================================
  // HANDLERS DE AÇÕES NAS TABELAS DO SUPABASE
  // ==========================================

  // Encerrar sessão (Logout)
  const handleLogout = async () => {
    try {
      await supabaseSignOut();
      setCurrentUser(null);
      showToast('Sessão encerrada com sucesso no Supabase Auth.');
    } catch (err: any) {
      setSupabaseError({
        title: 'Erro ao deslogar do Supabase',
        message: err.message || 'Falha ao encerrar sessão.',
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Registrar batida de ponto eletrônico (Grava em time_punches)
  const handleRegisterPunch = (params: {
    employeeId: string;
    type?: PunchType;
    customTime?: string;
    customDate?: string;
    notes?: string;
  }): { success: boolean; punch?: TimePunch; error?: string } => {
    const employee = employees.find(e => e.id === params.employeeId);
    if (!employee) {
      return { success: false, error: 'Colaborador não encontrado.' };
    }

    const now = new Date();
    const dateStr = params.customDate || now.toISOString().substring(0, 10);
    const timeStr = params.customTime || now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const timestampStr = `${dateStr}T${timeStr}:00.000Z`;

    let punchType = params.type;
    if (!punchType) {
      const todayPunches = punches.filter(
        p => p.employeeId === params.employeeId && p.date === dateStr
      );
      const count = todayPunches.length;
      if (count === 0) punchType = 'ENTRADA';
      else if (count === 1) punchType = 'SAIDA_INTERVALO';
      else if (count === 2) punchType = 'RETORNO_INTERVALO';
      else punchType = 'SAIDA';
    }

    const maxNsr = punches.reduce((max, p) => Math.max(max, p.nsr || 0), 1000);
    const newNsr = maxNsr + 1;
    const punchId = `punch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newPunch: TimePunch = {
      id: punchId,
      employeeId: employee.id,
      employeeName: employee.name,
      date: dateStr,
      time: timeStr,
      timestamp: timestampStr,
      type: punchType,
      source: 'RELOGIO_DIGITAL',
      nsr: newNsr,
      notes: params.notes,
      device: 'PORTAL_WEB',
    };

    setPunches(prev => [...prev, newPunch]);
    showToast(`Ponto de ${employee.name} registrado! NSR: #${newNsr}`);

    // Persistir no Supabase em background
    dbRegisterPunch({
      employeeId: params.employeeId,
      type: punchType,
      customTime: timeStr,
      customDate: dateStr,
      notes: params.notes,
      employees,
      existingPunches: punches,
    }).then(res => {
      if (!res.success) {
        setSupabaseError({
          title: 'Erro ao gravar ponto no Supabase',
          table: 'time_punches',
          message: res.error || 'Falha ao persistir ponto no banco de dados.',
          timestamp: new Date().toISOString(),
        });
      }
    });

    return { success: true, punch: newPunch };
  };

  // Atualizar horários de um dia específico (time_punches)
  const handleUpdateDayPunches = async (params: {
    employeeId: string;
    date: string;
    entry1?: string;
    exit1?: string;
    entry2?: string;
    exit2?: string;
    notes?: string;
  }) => {
    const res = await dbUpdateDayPunches({
      ...params,
      employees,
      existingPunches: punches,
    });

    if (res.success) {
      // Atualiza estado local removendo os antigos daquele dia e adicionando os novos
      setPunches(prev => [
        ...prev.filter(p => !(p.employeeId === params.employeeId && p.date === params.date)),
        ...(res.createdPunches || []),
      ]);
      showToast('Horários do colaborador atualizados no Supabase!');
    } else {
      setSupabaseError({
        title: 'Erro ao atualizar horários no Supabase',
        table: 'time_punches',
        message: res.error || 'Falha na atualização dos pontos.',
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Limpar horários de um dia (time_punches)
  const handleClearDayPunches = async (employeeId: string, date: string) => {
    const res = await dbDeleteEmployeePunchesForDate(employeeId, date);
    if (res.success) {
      setPunches(prev => prev.filter(p => !(p.employeeId === employeeId && p.date === date)));
      showToast('Horários do dia removidos no Supabase.');
    } else {
      setSupabaseError({
        title: 'Erro ao excluir horários no Supabase',
        table: 'time_punches',
        message: res.error || 'Falha ao remover registros.',
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Cadastrar novo colaborador (employees)
  const handleAddNewEmployee = async (employeeData: Omit<Employee, 'id'>) => {
    const newEmp: Employee = {
      ...employeeData,
      id: `emp-${Date.now()}`,
    };

    const res = await dbCreateEmployee(newEmp);
    if (res.success) {
      setEmployees(prev => [...prev, newEmp]);
      showToast(`Colaborador ${newEmp.name} gravado no Supabase!`);
    } else {
      setSupabaseError({
        title: 'Erro ao cadastrar colaborador no Supabase',
        table: 'employees',
        message: res.error || 'Falha ao inserir registro na tabela employees.',
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Atualizar colaborador (employees)
  const handleUpdateEmployee = async (updatedEmp: Employee) => {
    const res = await dbUpdateEmployee(updatedEmp);
    if (res.success) {
      setEmployees(prev => prev.map(e => (e.id === updatedEmp.id ? updatedEmp : e)));
      showToast(`Colaborador ${updatedEmp.name} atualizado no Supabase!`);
    } else {
      setSupabaseError({
        title: 'Erro ao atualizar colaborador no Supabase',
        table: 'employees',
        message: res.error || 'Falha ao atualizar dados.',
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Excluir colaborador (employees)
  const handleDeleteEmployee = async (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    const res = await dbDeleteEmployee(employeeId);
    if (res.success) {
      setEmployees(prev => prev.filter(e => e.id !== employeeId));
      setPunches(prev => prev.filter(p => p.employeeId !== employeeId));
      showToast(`Colaborador ${emp?.name || ''} excluído do Supabase.`);
    } else {
      setSupabaseError({
        title: 'Erro ao excluir colaborador no Supabase',
        table: 'employees',
        message: res.error || 'Falha na exclusão do colaborador.',
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Cadastrar novo adiantamento / vale (salary_advances)
  const handleAddSalaryAdvance = async (advanceData: Omit<SalaryAdvance, 'id' | 'createdAt'>) => {
    const res = await dbCreateSalaryAdvance(advanceData);
    if (res.success && res.advance) {
      setAdvances(prev => [res.advance!, ...prev]);
      showToast(`Vale de R$ ${res.advance.amount.toFixed(2).replace('.', ',')} para ${res.advance.employeeName} gravado no Supabase!`);
    } else {
      setSupabaseError({
        title: 'Erro ao registrar vale no Supabase',
        table: 'salary_advances',
        message: res.error || 'Falha ao gravar na tabela salary_advances.',
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Atualizar adiantamento (salary_advances)
  const handleUpdateSalaryAdvance = async (updatedAdvance: SalaryAdvance) => {
    const res = await dbUpdateSalaryAdvance(updatedAdvance);
    if (res.success) {
      setAdvances(prev => prev.map(a => (a.id === updatedAdvance.id ? updatedAdvance : a)));
      showToast(`Vale de ${updatedAdvance.employeeName} atualizado no Supabase!`);
    } else {
      setSupabaseError({
        title: 'Erro ao atualizar vale no Supabase',
        table: 'salary_advances',
        message: res.error || 'Falha ao atualizar registro.',
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Excluir adiantamento (salary_advances)
  const handleDeleteSalaryAdvance = async (id: string) => {
    const res = await dbDeleteSalaryAdvance(id);
    if (res.success) {
      setAdvances(prev => prev.filter(a => a.id !== id));
      showToast('Vale excluído do Supabase.');
    } else {
      setSupabaseError({
        title: 'Erro ao excluir vale no Supabase',
        table: 'salary_advances',
        message: res.error || 'Falha ao remover registro.',
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Atualizar preço de venda do produto (products)
  const handleUpdateProductPrice = async (productId: string, newSellingPrice: number) => {
    const target = products.find(p => p.id === productId);
    const costBase = target ? (target.averageCost > 0 ? target.averageCost : (target.lastCost || 1)) : 1;
    const margin = Number((((newSellingPrice - costBase) / costBase) * 100).toFixed(1));

    const res = await dbUpdateProductPrice(productId, newSellingPrice, margin);
    if (res.success) {
      setProducts(prev =>
        prev.map(p =>
          p.id === productId
            ? { ...p, sellingPrice: newSellingPrice, marginPercent: margin }
            : p
        )
      );
      showToast('Preço de venda atualizado no Supabase!');
    } else {
      setSupabaseError({
        title: 'Erro ao atualizar preço de produto no Supabase',
        table: 'products',
        message: res.error || 'Falha ao atualizar o campo selling_price.',
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Processar entrada de NF-e (invoices, products, stock_movements)
  const handleConfirmInvoiceEntry = async (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'status'>) => {
    const res = await dbProcessInvoiceEntry(invoiceData, products);
    if (res.success && res.invoice) {
      if (res.products) setProducts(res.products);
      if (res.movements) setMovements(prev => [...(res.movements || []), ...prev]);
      setInvoices(prev => [res.invoice!, ...prev]);
      showToast(`Entrada da NF-e nº ${invoiceData.number} gravada com sucesso no Supabase!`);
    } else {
      setSupabaseError({
        title: 'Erro ao processar entrada de NF-e no Supabase',
        table: 'invoices',
        message: res.error || 'Falha ao registrar nota fiscal e atualizar estoque.',
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Registrar movimentação de estoque manual (stock_movements & products)
  const handleSaveMovement = async (params: {
    productId: string;
    type: MovementType;
    quantity: number;
    date: string;
    documentNumber?: string;
    supplierOrCustomer?: string;
    notes?: string;
  }) => {
    const res = await dbRegisterStockMovement({
      ...params,
      products,
    });

    if (res.success && res.movement && res.updatedProduct) {
      setMovements(prev => [res.movement!, ...prev]);
      setProducts(prev =>
        prev.map(p => (p.id === res.updatedProduct!.id ? res.updatedProduct! : p))
      );
      showToast('Movimentação de estoque gravada no Supabase!');
    } else {
      setSupabaseError({
        title: 'Erro ao gravar movimentação no Supabase',
        table: 'stock_movements',
        message: res.error || 'Falha ao registrar movimentação.',
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Cadastrar produto manual (products)
  const handleAddNewProduct = async (newProductData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...newProductData,
      id: `prod-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };

    const res = await dbCreateProduct(newProduct);
    if (res.success) {
      setProducts(prev => [newProduct, ...prev]);

      if (newProduct.currentStock > 0) {
        await dbRegisterStockMovement({
          productId: newProduct.id,
          type: 'ENTRADA_AJUSTE',
          quantity: newProduct.currentStock,
          date: now,
          documentNumber: 'SALDO_INICIAL',
          notes: 'Cadastro inicial de produto com saldo em estoque',
          products: [newProduct, ...products],
        });
        // Atualiza movimentações
        const movRes = await dbLoadAllAppData();
        if (movRes.data) setMovements(movRes.data.movements);
      }

      showToast(`Produto ${newProduct.name} cadastrado no Supabase!`);
    } else {
      setSupabaseError({
        title: 'Erro ao cadastrar produto no Supabase',
        table: 'products',
        message: res.error || 'Falha ao gravar produto.',
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Faturamento de Ordens de Serviço (billings)
  const handleAddBilling = async (data: Omit<BillingRecord, 'id' | 'createdAt' | 'grandTotal'>) => {
    const res = await dbCreateBilling(data);
    if (res.success && res.record) {
      setBillings(prev => [res.record!, ...prev]);
      showToast(`Faturamento da ${res.record.serviceOrderNumber} gravado no Supabase!`);
    } else {
      setSupabaseError({
        title: 'Erro ao gravar faturamento no Supabase',
        table: 'billings',
        message: res.error || 'Falha ao inserir faturamento.',
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleUpdateBilling = async (id: string, updates: Partial<BillingRecord>) => {
    const res = await dbUpdateBilling(id, updates);
    if (res.success) {
      setBillings(prev =>
        prev.map(b => (b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b))
      );
      showToast('Faturamento de OS atualizado no Supabase!');
    } else {
      setSupabaseError({
        title: 'Erro ao atualizar faturamento no Supabase',
        table: 'billings',
        message: res.error || 'Falha ao atualizar OS.',
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleDeleteBilling = async (id: string) => {
    const res = await dbDeleteBilling(id);
    if (res.success) {
      setBillings(prev => prev.filter(b => b.id !== id));
      showToast('Faturamento de OS excluído do Supabase.');
    } else {
      setSupabaseError({
        title: 'Erro ao excluir faturamento no Supabase',
        table: 'billings',
        message: res.error || 'Falha ao deletar OS.',
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Gestão de Despesas (expenses)
  const handleAddExpense = async (data: Omit<ExpenseRecord, 'id' | 'createdAt'>) => {
    const res = await dbCreateExpense(data);
    if (res.success && res.expense) {
      setExpenses(prev => [res.expense!, ...prev]);
      showToast(`Despesa "${res.expense.description}" lançada no Supabase!`);
    } else {
      setSupabaseError({
        title: 'Erro ao lançar despesa no Supabase',
        table: 'expenses',
        message: res.error || 'Falha ao gravar despesa.',
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleUpdateExpense = async (id: string, data: Partial<ExpenseRecord>) => {
    const res = await dbUpdateExpense(id, data);
    if (res.success) {
      setExpenses(prev =>
        prev.map(exp => (exp.id === id ? { ...exp, ...data, updatedAt: new Date().toISOString() } : exp))
      );
      showToast('Despesa atualizada no Supabase!');
    } else {
      setSupabaseError({
        title: 'Erro ao atualizar despesa no Supabase',
        table: 'expenses',
        message: res.error || 'Falha ao atualizar despesa.',
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handlePayExpense = async (
    id: string,
    paymentData: { paymentDate: string; paymentTime?: string; paymentMethod: ExpensePaymentMethod; notes?: string }
  ) => {
    const updates = {
      status: 'PAGA' as const,
      paymentDate: paymentData.paymentDate,
      paymentTime: paymentData.paymentTime,
      paymentMethod: paymentData.paymentMethod,
      notes: paymentData.notes,
    };
    await handleUpdateExpense(id, updates);
  };

  const handleDeleteExpense = async (id: string) => {
    const res = await dbDeleteExpense(id);
    if (res.success) {
      setExpenses(prev => prev.filter(exp => exp.id !== id));
      showToast('Despesa excluída do Supabase.');
    } else {
      setSupabaseError({
        title: 'Erro ao excluir despesa no Supabase',
        table: 'expenses',
        message: res.error || 'Falha ao deletar despesa.',
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Configurações da Empresa (company_settings)
  const handleSaveCompanySettings = async (updated: CompanySettings) => {
    const res = await dbSaveCompanySettings(updated);
    if (res.success) {
      setCompanySettings(updated);
      showToast('Dados e logotipo da empresa gravados no Supabase!');
    } else {
      setSupabaseError({
        title: 'Erro ao salvar empresa no Supabase',
        table: 'company_settings',
        message: res.error || 'Falha ao gravar company_settings.',
        timestamp: new Date().toISOString(),
      });
    }
  };

  const lowStockCount = products.filter(p => p.currentStock <= p.minStock).length;

  // Estado 1: Verificando sessão persistente do Supabase Auth
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide text-slate-300">
          Verificando sessão no Supabase Auth...
        </p>
      </div>
    );
  }

  // Estado 2: Usuário não logado -> Exibir Tela de Login Real Supabase Auth
  if (!currentUser) {
    return (
      <div className="relative">
        <LoginScreen
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            showToast(`Bem-vindo ao sistema, ${user.name}!`);
          }}
          companySettings={companySettings}
          onUpdateLogo={(newLogo) => {
            const updated = { ...companySettings, logoUrl: newLogo };
            handleSaveCompanySettings(updated);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Banner de Erro em Destaque no Topo caso qualquer consulta ao Supabase falhe */}
      <SupabaseErrorBanner
        error={supabaseError}
        onDismiss={() => setSupabaseError(null)}
        onRetry={loadDatabaseData}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-800 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Header */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onResetDemo={loadDatabaseData}
        lowStockAlertsCount={lowStockCount}
        companySettings={companySettings}
        onOpenCompanySettings={() => setIsCompanySettingsModalOpen(true)}
        onOpenSupabaseSync={() => setIsSupabaseModalOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Indicador de Carregamento Ativo das Tabelas do Supabase */}
      {isLoadingData && (
        <div className="w-full bg-indigo-600 text-white text-xs py-2 px-4 flex items-center justify-center gap-2 font-medium shadow-xs">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Lendo dados diretamente das tabelas do Supabase...</span>
        </div>
      )}

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'dashboard' && (
          <Dashboard
            products={products}
            movements={movements}
            invoices={invoices}
            billings={billings}
            employees={employees}
            punches={punches}
            companySettings={companySettings}
            onNavigate={setCurrentTab}
            onOpenDanfe={(inv) => setActiveDanfeInvoice(inv)}
            onOpenCompanySettings={() => setIsCompanySettingsModalOpen(true)}
            onOpenSupabaseSync={() => setIsSupabaseModalOpen(true)}
          />
        )}

        {currentTab === 'billing' && (
          <BillingView
            billings={billings}
            onAddBilling={handleAddBilling}
            onUpdateBilling={handleUpdateBilling}
            onDeleteBilling={handleDeleteBilling}
            onResetDemo={loadDatabaseData}
            companySettings={companySettings}
            employees={employees}
          />
        )}

        {currentTab === 'expenses' && (
          <ExpensesManagementView
            expenses={expenses}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onPayExpense={handlePayExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {currentTab === 'entry' && (
          <InvoiceEntry
            products={products}
            onConfirmEntry={handleConfirmInvoiceEntry}
            onNavigateToStock={() => setCurrentTab('stock')}
          />
        )}

        {currentTab === 'stock' && (
          <InventoryManager
            products={products}
            movements={movements}
            onSaveMovement={handleSaveMovement}
            onAddNewProduct={handleAddNewProduct}
          />
        )}

        {currentTab === 'prices' && (
          <PriceConsultationView
            products={products}
            movements={movements}
            invoices={invoices}
            onUpdateProductPrice={handleUpdateProductPrice}
            onNavigateToEntry={() => setCurrentTab('entry')}
            onNavigateToKardex={() => setCurrentTab('stock')}
          />
        )}

        {currentTab === 'timeclock' && (
          <TimeClockDashboard
            employees={employees}
            punches={punches}
            onRegisterPunch={handleRegisterPunch}
            onAddNewEmployee={handleAddNewEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onUpdateDayPunches={handleUpdateDayPunches}
            onClearDayPunches={handleClearDayPunches}
          />
        )}

        {currentTab === 'advances' && (
          <SalaryAdvancesView
            employees={employees}
            advances={advances}
            companySettings={companySettings}
            onAddAdvance={handleAddSalaryAdvance}
            onUpdateAdvance={handleUpdateSalaryAdvance}
            onDeleteAdvance={handleDeleteSalaryAdvance}
          />
        )}

        {currentTab === 'invoices' && (
          <InvoicesList
            invoices={invoices}
            onNavigateToNewEntry={() => setCurrentTab('entry')}
          />
        )}

        {currentTab === 'reports' && (
          <MonthlyReportView
            products={products}
            movements={movements}
            invoices={invoices}
            billings={billings}
          />
        )}

        {currentTab === 'users' && (
          <UserManagementView
            currentUser={currentUser}
            onUpdateCurrentUser={(updated) => setCurrentUser(updated)}
            onNotify={(msg) => showToast(msg)}
          />
        )}
      </main>

      {/* DANFE Global Modal */}
      {activeDanfeInvoice && (
        <DanfeModal
          invoice={activeDanfeInvoice}
          onClose={() => setActiveDanfeInvoice(null)}
        />
      )}

      {/* Modal de Configurações da Empresa & Logotipo */}
      <CompanySettingsModal
        isOpen={isCompanySettingsModalOpen}
        onClose={() => setIsCompanySettingsModalOpen(false)}
        currentSettings={companySettings}
        onSave={handleSaveCompanySettings}
      />

      {/* Modal de Sincronização Supabase */}
      <SupabaseSyncModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        data={{
          products,
          movements,
          invoices,
          employees,
          punches,
          advances,
          companySettings,
          billings,
        }}
        onSyncComplete={(msg) => {
          showToast(msg);
          loadDatabaseData();
        }}
      />

      {/* Footer Profissional com Indicador da Conexão Supabase */}
      <footer className="bg-white border-t border-slate-200/90 py-4 text-xs text-slate-500 print:hidden mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">{companySettings.tradeName || 'LORD LUB'}</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500 font-mono">{companySettings.cnpj}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-sans font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Supabase Conectado</span>
            </span>
            <span className="text-slate-300">·</span>
            <span>Usuário: {currentUser.email}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
