import React, { useState, useMemo } from 'react';
import { ExpenseRecord, ExpenseCategory, ExpensePaymentMethod } from '../types';
import { CompanySettings } from '../utils/companySettings';
import {
  EXPENSE_CATEGORIES_CONFIG,
  exportExpensesCSV
} from '../utils/expenseStorage';
import { AddEditExpenseModal } from './AddEditExpenseModal';
import { PayExpenseModal } from './PayExpenseModal';
import { ExpensesCategoryReport } from './ExpensesCategoryReport';
import { ExpenseCategoryPdfModal } from './ExpenseCategoryPdfModal';
import {
  ReceiptText,
  PlusCircle,
  FileSpreadsheet,
  PieChart as PieChartIcon,
  List,
  LayoutGrid,
  Search,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Trash2,
  Edit3,
  Check,
  CreditCard,
  Layers,
  ArrowDownCircle,
  FileText,
  Fuel,
  Utensils,
  Coffee,
  Wrench,
  Truck,
  Zap,
  Sparkles,
  TrendingDown,
  DollarSign,
  Printer
} from 'lucide-react';

interface ExpensesManagementViewProps {
  expenses: ExpenseRecord[];
  onAddExpense: (data: Omit<ExpenseRecord, 'id' | 'createdAt'>) => void;
  onUpdateExpense: (id: string, data: Partial<ExpenseRecord>) => void;
  onPayExpense: (id: string, paymentData: { paymentDate: string; paymentTime?: string; paymentMethod: ExpensePaymentMethod; notes?: string }) => void;
  onDeleteExpense: (id: string) => void;
  initialSubTab?: 'list' | 'report';
  companySettings?: CompanySettings;
}

function formatBRL(val: number): string {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const ExpensesManagementView: React.FC<ExpensesManagementViewProps> = ({
  expenses,
  onAddExpense,
  onUpdateExpense,
  onPayExpense,
  onDeleteExpense,
  initialSubTab = 'list',
  companySettings,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'report'>(initialSubTab);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [pdfModalCategory, setPdfModalCategory] = useState<ExpenseCategory | null>(null);

  // Hoje no formato local YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Filtros
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'TODAY' | 'THIS_WEEK' | 'OVERDUE' | 'PENDING' | 'PAID'>('ALL');
  const [competenceFilter, setCompetenceFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modais
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState<boolean>(false);
  const [expenseToEdit, setExpenseToEdit] = useState<ExpenseRecord | null>(null);
  const [initialPreset, setInitialPreset] = useState<Partial<ExpenseRecord> | null>(null);
  const [expenseToPay, setExpenseToPay] = useState<ExpenseRecord | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseRecord | null>(null);

  // Competências disponíveis
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    const currentMonth = todayStr.substring(0, 7);
    set.add(currentMonth);
    expenses.forEach(e => {
      if (e.competenceMonth) set.add(e.competenceMonth);
    });
    return Array.from(set).sort().reverse();
  }, [expenses, todayStr]);

  // Estatísticas específicas de Hoje (Gestão do Dia a Dia)
  const todayStats = useMemo(() => {
    const paidToday = expenses
      .filter(e => e.status === 'PAGA' && e.paymentDate === todayStr)
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    const dueToday = expenses
      .filter(e => e.status !== 'PAGA' && e.status !== 'CANCELADA' && e.dueDate === todayStr)
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    const countToday = expenses.filter(
      e => e.dueDate === todayStr || e.paymentDate === todayStr
    ).length;

    return {
      paidToday,
      dueToday,
      countToday,
      netToday: paidToday + dueToday,
    };
  }, [expenses, todayStr]);

  // Filtragem das despesas
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    // Início da semana (domingo ou segunda)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().substring(0, 10);
    const sevenDaysAhead = new Date();
    sevenDaysAhead.setDate(now.getDate() + 7);
    const sevenDaysAheadStr = sevenDaysAhead.toISOString().substring(0, 10);

    return expenses.filter(exp => {
      // Filtro temporal rápido
      if (timeFilter === 'TODAY') {
        const isToday = exp.dueDate === todayStr || exp.paymentDate === todayStr;
        if (!isToday) return false;
      } else if (timeFilter === 'THIS_WEEK') {
        const inWindow =
          (exp.dueDate >= sevenDaysAgoStr && exp.dueDate <= sevenDaysAheadStr) ||
          (exp.paymentDate && exp.paymentDate >= sevenDaysAgoStr && exp.paymentDate <= todayStr);
        if (!inWindow) return false;
      } else if (timeFilter === 'OVERDUE') {
        if (exp.status !== 'VENCIDA') return false;
      } else if (timeFilter === 'PENDING') {
        if (exp.status !== 'PENDENTE') return false;
      } else if (timeFilter === 'PAID') {
        if (exp.status !== 'PAGA') return false;
      }

      // Filtro de mês de competência
      const matchMonth = competenceFilter === 'ALL' || exp.competenceMonth === competenceFilter;
      // Filtro de categoria
      const matchCategory = selectedCategoryFilter === 'ALL' || exp.category === selectedCategoryFilter;
      // Busca textual
      const matchSearch =
        !searchTerm.trim() ||
        exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exp.supplierOrBeneficiary && exp.supplierOrBeneficiary.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (exp.documentNumber && exp.documentNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (exp.notes && exp.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchMonth && matchCategory && matchSearch;
    });
  }, [expenses, timeFilter, competenceFilter, selectedCategoryFilter, searchTerm, todayStr]);

  // Indicadores consolidados do filtro atual
  const summary = useMemo(() => {
    const totalAmount = filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const paidAmount = filteredExpenses
      .filter(e => e.status === 'PAGA')
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const pendingAmount = filteredExpenses
      .filter(e => e.status === 'PENDENTE')
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const overdueAmount = filteredExpenses
      .filter(e => e.status === 'VENCIDA')
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    return {
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
      totalCount: filteredExpenses.length,
      paidCount: filteredExpenses.filter(e => e.status === 'PAGA').length,
      pendingCount: filteredExpenses.filter(e => e.status === 'PENDENTE').length,
      overdueCount: filteredExpenses.filter(e => e.status === 'VENCIDA').length,
    };
  }, [filteredExpenses]);

  const handleOpenAddModal = (preset?: Partial<ExpenseRecord>) => {
    setExpenseToEdit(null);
    setInitialPreset(preset || null);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (exp: ExpenseRecord) => {
    setExpenseToEdit(exp);
    setInitialPreset(null);
    setIsAddEditModalOpen(true);
  };

  const handleSaveModal = (data: Omit<ExpenseRecord, 'id' | 'createdAt'>, editId?: string) => {
    if (editId) {
      onUpdateExpense(editId, data);
    } else {
      onAddExpense(data);
    }
  };

  const handleConfirmPay = (paymentData: {
    paymentDate: string;
    paymentTime?: string;
    paymentMethod: ExpensePaymentMethod;
    notes?: string;
  }) => {
    if (expenseToPay) {
      onPayExpense(expenseToPay.id, paymentData);
      setExpenseToPay(null);
    }
  };

  const handleConfirmDelete = () => {
    if (expenseToDelete) {
      onDeleteExpense(expenseToDelete.id);
      setExpenseToDelete(null);
    }
  };

  const handleExportCSV = () => {
    exportExpensesCSV(filteredExpenses, competenceFilter);
  };

  const categoriesList = Object.keys(EXPENSE_CATEGORIES_CONFIG) as ExpenseCategory[];

  // Atalhos rápidos para despesas do dia a dia
  const quickExpensePresets: {
    label: string;
    category: ExpenseCategory;
    icon: React.ElementType;
    color: string;
    defaultAmount: number;
    description: string;
    method: ExpensePaymentMethod;
  }[] = [
    {
      label: 'Combustível',
      category: 'COMBUSTIVEL',
      icon: Fuel,
      color: '#b45309',
      defaultAmount: 120.0,
      description: 'Abastecimento veículo / frota',
      method: 'PIX',
    },
    {
      label: 'Almoço / Lanche',
      category: 'OUTRAS',
      icon: Utensils,
      color: '#10b981',
      defaultAmount: 45.0,
      description: 'Alimentação equipe / almoço diário',
      method: 'PIX',
    },
    {
      label: 'Café & Limpeza',
      category: 'MATERIAL_CONSUMO',
      icon: Coffee,
      color: '#06b6d4',
      defaultAmount: 35.0,
      description: 'Café, açúcar, água mineral e produtos de limpeza',
      method: 'DINHEIRO',
    },
    {
      label: 'Manutenção / Peça',
      category: 'MANUTENCAO',
      icon: Wrench,
      color: '#ea580c',
      defaultAmount: 180.0,
      description: 'Conserto predial / reparo mecânico emergencial',
      method: 'PIX',
    },
    {
      label: 'Frete / Entrega',
      category: 'OUTRAS',
      icon: Truck,
      color: '#6366f1',
      defaultAmount: 30.0,
      description: 'Taxa motoboy / frete de entrega rápida',
      method: 'PIX',
    },
    {
      label: 'Energia Elétrica',
      category: 'ENERGIA',
      icon: Zap,
      color: '#f59e0b',
      defaultAmount: 850.0,
      description: 'Fatura de energia elétrica mensal',
      method: 'DEBITO_AUTOMATICO',
    },
    {
      label: 'Aluguel / Imóvel',
      category: 'ALUGUEL',
      icon: Building2,
      color: '#4f46e5',
      defaultAmount: 3500.0,
      description: 'Aluguel do galpão / loja comercial',
      method: 'TRANSFERENCIA',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-semibold mb-2">
              <ReceiptText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Contas a Pagar & Despesas do Dia a Dia</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Gestão de Despesas & Contas a Pagar
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Adicione e controle despesas operacionais do dia a dia (aluguel, energia, água, manutenção predial, combustível, alimentação e fornecedores), com baixa rápida e relatório detalhado por categoria.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => {
                const targetCat = selectedCategoryFilter !== 'ALL'
                  ? (selectedCategoryFilter as ExpenseCategory)
                  : 'ALUGUEL';
                setPdfModalCategory(targetCat);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer border border-indigo-400/40 active:scale-95"
              title="Exportar documento PDF formatado com o resumo financeiro da categoria"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>Exportar Relatório</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all border border-white/10 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar (CSV)</span>
            </button>

            <button
              onClick={() => handleOpenAddModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nova Despesa</span>
            </button>
          </div>
        </div>

        {/* Efeito decorativo */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Bloco de Gestão do Dia a Dia: Lançamentos Rápidos */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Lançamento Rápido do Dia a Dia
              </h3>
              <p className="text-[11px] text-slate-500">
                Clique em uma despesa frequente para abrir com categoria e vencimento de hoje pré-preenchidos
              </p>
            </div>
          </div>

          {/* Resumo do Dia (Hoje) */}
          <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-1 text-slate-500 font-medium">
              <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
              <span>Hoje ({todayStr.split('-').reverse().join('/')}):</span>
            </div>
            <span className="font-bold text-emerald-700 font-mono">
              Pago: {formatBRL(todayStats.paidToday)}
            </span>
            {todayStats.dueToday > 0 && (
              <span className="font-bold text-amber-700 font-mono">
                A Vencer: {formatBRL(todayStats.dueToday)}
              </span>
            )}
          </div>
        </div>

        {/* Botões de atalho rápido */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {quickExpensePresets.map((preset, idx) => {
            const Icon = preset.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() =>
                  handleOpenAddModal({
                    description: preset.description,
                    category: preset.category,
                    amount: preset.defaultAmount,
                    dueDate: todayStr,
                    paymentMethod: preset.method,
                    status: 'PENDENTE',
                    isRecurring: preset.category === 'ALUGUEL' || preset.category === 'ENERGIA',
                  })
                }
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 text-xs font-bold text-slate-700 hover:text-indigo-900 shrink-0 transition-all cursor-pointer shadow-2xs group"
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: preset.color }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span>+ {preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Cards Rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total de Despesas
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {formatBRL(summary.totalAmount)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {summary.totalCount} contas no filtro
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Pendentes / A Pagar
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2 font-mono">
            {formatBRL(summary.pendingAmount)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {summary.pendingCount} contas aguardando quitação
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Pagas / Liquidadas
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2 font-mono">
            {formatBRL(summary.paidAmount)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {summary.paidCount} contas já quitadas
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
              Contas Vencidas
            </span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700 mt-2 font-mono">
            {formatBRL(summary.overdueAmount)}
          </div>
          <span className="text-[11px] text-rose-500 font-bold mt-0.5 block">
            {summary.overdueCount} {summary.overdueCount === 1 ? 'conta vencida' : 'contas vencidas'}
          </span>
        </div>
      </div>

      {/* Sub-Navegação entre Gestão de Contas e Relatório por Categoria */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSubTab('list')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'list'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ReceiptText className="w-4 h-4" />
          <span>Gestão de Despesas do Dia a Dia</span>
          <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-mono">
            {filteredExpenses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('report')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'report'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <PieChartIcon className="w-4 h-4 text-emerald-400" />
          <span>Relatório por Categoria</span>
        </button>
      </div>

      {/* Conteúdo da Sub-Aba: Relatório por Categoria */}
      {activeSubTab === 'report' && (
        <ExpensesCategoryReport
          expenses={expenses}
          competenceMonthFilter={competenceFilter}
          onChangeCompetenceFilter={setCompetenceFilter}
          availableMonths={availableMonths}
          companySettings={companySettings}
          onOpenPdfReport={(cat) => setPdfModalCategory(cat)}
        />
      )}

      {/* Conteúdo da Sub-Aba: Gestão de Contas do Dia a Dia */}
      {activeSubTab === 'list' && (
        <div className="space-y-4">
          {/* Barra de Busca e Filtros Rápidos */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            {/* Linha 1: Filtros de Período Rápido */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                  Filtrar:
                </span>

                <button
                  type="button"
                  onClick={() => setTimeFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    timeFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todas
                </button>

                <button
                  type="button"
                  onClick={() => setTimeFilter('TODAY')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    timeFilter === 'TODAY'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Hoje ({todayStats.countToday})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTimeFilter('THIS_WEEK')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    timeFilter === 'THIS_WEEK'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Esta Semana
                </button>

                <button
                  type="button"
                  onClick={() => setTimeFilter('OVERDUE')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    timeFilter === 'OVERDUE'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Vencidas ({summary.overdueCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTimeFilter('PENDING')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    timeFilter === 'PENDING'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  A Pagar ({summary.pendingCount})
                </button>

                <button
                  type="button"
                  onClick={() => setTimeFilter('PAID')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    timeFilter === 'PAID'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  Pagas ({summary.paidCount})
                </button>
              </div>

              {/* Seletor do Modo de Visualização */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 text-indigo-600" />
                  <span>Cards</span>
                </button>

                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-4 h-4 text-indigo-600" />
                  <span>Tabela</span>
                </button>
              </div>
            </div>

            {/* Linha 2 de Filtros: Busca, Categoria, Competência */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Busca por texto */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por descrição, favorecido, doc..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Filtro por Categoria */}
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">Todas as Categorias</option>
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>
                      {EXPENSE_CATEGORIES_CONFIG[cat].label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    const targetCat = selectedCategoryFilter !== 'ALL'
                      ? (selectedCategoryFilter as ExpenseCategory)
                      : 'ALUGUEL';
                    setPdfModalCategory(targetCat);
                  }}
                  title="Exportar Relatório PDF da categoria"
                  className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200 transition-colors shrink-0 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>

              {/* Filtro por Competência */}
              <div>
                <select
                  value={competenceFilter}
                  onChange={(e) => setCompetenceFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">Todas as Competências</option>
                  {availableMonths.map(m => (
                    <option key={m} value={m}>
                      Competência: {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* MODO CARDS */}
          {viewMode === 'cards' && (
            <div>
              {filteredExpenses.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-2xs">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
                    <ReceiptText className="w-8 h-8" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h3 className="text-base font-bold text-slate-900">
                      Nenhuma despesa localizada
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Nenhuma conta confere com os filtros aplicados. Você pode clicar no botão abaixo para registrar uma nova despesa do dia a dia.
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenAddModal()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Cadastrar Despesa</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredExpenses.map(exp => {
                    const catConfig = EXPENSE_CATEGORIES_CONFIG[exp.category];
                    const isPaid = exp.status === 'PAGA';
                    const isOverdue = exp.status === 'VENCIDA';
                    const isPending = exp.status === 'PENDENTE';
                    const isDueToday = exp.dueDate === todayStr;

                    return (
                      <div
                        key={exp.id}
                        className={`bg-white rounded-2xl border shadow-2xs hover:shadow-xs transition-shadow p-5 flex flex-col justify-between ${
                          isOverdue
                            ? 'border-rose-300'
                            : isPaid
                            ? 'border-emerald-200'
                            : isDueToday
                            ? 'border-indigo-300 ring-2 ring-indigo-500/20'
                            : 'border-slate-200'
                        }`}
                      >
                        <div>
                          {/* Top: Categoria & Status */}
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                              style={{
                                backgroundColor: `${catConfig.color}15`,
                                color: catConfig.color,
                                border: `1px solid ${catConfig.color}30`,
                              }}
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: catConfig.color }}
                              />
                              <span>{catConfig.label}</span>
                            </span>

                            <div className="flex items-center gap-1.5">
                              {isDueToday && !isPaid && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-800">
                                  Vence Hoje
                                </span>
                              )}

                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isPaid
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isOverdue
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {isPaid && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                {isOverdue && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                                {isPending && <Clock className="w-3 h-3 text-amber-600" />}
                                <span>{isPaid ? 'Paga' : isOverdue ? 'Vencida' : 'A Pagar'}</span>
                              </span>
                            </div>
                          </div>

                          {/* Descrição & Valor */}
                          <div className="mt-3">
                            <h4 className="font-black text-slate-900 text-sm line-clamp-2" title={exp.description}>
                              {exp.description}
                            </h4>
                            <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                              {formatBRL(exp.amount)}
                            </div>
                          </div>

                          {/* Detalhes de Favorecido e Vencimento */}
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 text-[11px]">Vencimento:</span>
                              <strong className={`font-mono ${isOverdue ? 'text-rose-600' : isDueToday ? 'text-indigo-600' : 'text-slate-800'}`}>
                                {exp.dueDate.split('-').reverse().join('/')}
                              </strong>
                            </div>

                            {exp.supplierOrBeneficiary && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 text-[11px]">Favorecido:</span>
                                <span className="font-medium text-slate-800 truncate max-w-[170px]" title={exp.supplierOrBeneficiary}>
                                  {exp.supplierOrBeneficiary}
                                </span>
                              </div>
                            )}

                            {isPaid && exp.paymentDate && (
                              <div className="flex items-center justify-between text-emerald-700 pt-0.5">
                                <span className="text-[11px]">Liquidado em:</span>
                                <strong className="font-mono text-[11px]">
                                  {exp.paymentDate.split('-').reverse().join('/')} {exp.paymentTime ? `às ${exp.paymentTime}` : ''}
                                </strong>
                              </div>
                            )}

                            {exp.documentNumber && (
                              <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono">
                                <span>Doc / Fatura:</span>
                                <span>{exp.documentNumber}</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-slate-400 text-[10px]">
                              <span>Forma:</span>
                              <span className="font-semibold text-slate-600">{exp.paymentMethod}</span>
                            </div>
                          </div>
                        </div>

                        {/* Ações do Card */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          {!isPaid ? (
                            <button
                              type="button"
                              onClick={() => setExpenseToPay(exp)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Pagar / Dar Baixa</span>
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-emerald-700 inline-flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              <span>Liquidada</span>
                            </span>
                          )}

                          <div className="flex items-center gap-1 text-slate-400">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(exp)}
                              title="Editar Despesa"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setExpenseToDelete(exp)}
                              title="Excluir Despesa"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* MODO TABELA */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              {filteredExpenses.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  Nenhuma despesa confere com os filtros.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Descrição da Conta</th>
                        <th className="py-3 px-4">Categoria</th>
                        <th className="py-3 px-4">Valor</th>
                        <th className="py-3 px-4">Vencimento</th>
                        <th className="py-3 px-4">Favorecido / Fornecedor</th>
                        <th className="py-3 px-4">Forma</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredExpenses.map(exp => {
                        const catConfig = EXPENSE_CATEGORIES_CONFIG[exp.category];
                        const isPaid = exp.status === 'PAGA';
                        const isOverdue = exp.status === 'VENCIDA';
                        const isDueToday = exp.dueDate === todayStr;

                        return (
                          <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <strong className="text-slate-900 block">{exp.description}</strong>
                              {exp.documentNumber && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  Doc: {exp.documentNumber}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                style={{
                                  backgroundColor: `${catConfig.color}15`,
                                  color: catConfig.color,
                                }}
                              >
                                {catConfig.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-black text-slate-900 whitespace-nowrap">
                              {formatBRL(exp.amount)}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap font-mono">
                              <span className={isOverdue ? 'text-rose-600 font-bold' : isDueToday ? 'text-indigo-600 font-bold' : 'text-slate-700'}>
                                {exp.dueDate.split('-').reverse().join('/')}
                                {isDueToday && !isPaid && (
                                  <span className="ml-1 text-[9px] bg-indigo-100 text-indigo-800 px-1 py-0.2 rounded font-sans">
                                    Hoje
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                              {exp.supplierOrBeneficiary || '-'}
                            </td>
                            <td className="py-3 px-4 text-slate-600 text-[11px] whitespace-nowrap">
                              {exp.paymentMethod}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  isPaid
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isOverdue
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {isPaid ? 'Paga' : isOverdue ? 'Vencida' : 'Pendente'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isPaid && (
                                  <button
                                    type="button"
                                    onClick={() => setExpenseToPay(exp)}
                                    title="Pagar / Dar Baixa"
                                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(exp)}
                                  title="Editar"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExpenseToDelete(exp)}
                                  title="Excluir"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Cadastro / Edição de Despesa */}
      {isAddEditModalOpen && (
        <AddEditExpenseModal
          isOpen={isAddEditModalOpen}
          onClose={() => {
            setIsAddEditModalOpen(false);
            setExpenseToEdit(null);
            setInitialPreset(null);
          }}
          expenseToEdit={expenseToEdit}
          initialPreset={initialPreset}
          onSave={handleSaveModal}
        />
      )}

      {/* MODAL 2: Dar Baixa / Pagamento de Despesa */}
      {expenseToPay && (
        <PayExpenseModal
          isOpen={!!expenseToPay}
          onClose={() => setExpenseToPay(null)}
          expense={expenseToPay}
          onConfirm={handleConfirmPay}
        />
      )}

      {/* MODAL 3: Confirmação de Exclusão */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Excluir Despesa?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Você está prestes a remover o registro de despesa{' '}
                <strong className="text-slate-800">{expenseToDelete.description}</strong> no valor de{' '}
                <strong className="text-slate-800 font-mono">
                  {formatBRL(expenseToDelete.amount)}
                </strong>. Esta ação não poderá ser desfeita.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setExpenseToDelete(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Exportação / Impressão de Relatório PDF da Categoria */}
      {pdfModalCategory && (
        <ExpenseCategoryPdfModal
          isOpen={!!pdfModalCategory}
          onClose={() => setPdfModalCategory(null)}
          selectedCategory={pdfModalCategory}
          onChangeCategory={(cat) => setPdfModalCategory(cat)}
          expenses={expenses}
          competenceMonthFilter={competenceFilter}
          companySettings={companySettings}
        />
      )}
    </div>
  );
};
