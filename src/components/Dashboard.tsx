import React, { useState, useMemo } from 'react';
import { Product, StockMovement, Invoice, Employee, TimePunch } from '../types';
import { formatBRL, formatDateBR } from '../utils/stockCalculations';
import { CompanySettings } from '../utils/companySettings';
import {
  Boxes,
  FileText,
  TrendingUp,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Upload,
  Calendar,
  CalendarDays,
  FileBarChart,
  Eye,
  CheckCircle2,
  Download,
  Tag,
  Clock,
  Banknote,
  Building2,
  ChevronRight,
  Sparkles,
  Database,
  Receipt,
  ReceiptText,
  DollarSign,
  ArrowLeftRight,
  UserCheck,
  Users,
  Activity,
  Layers
} from 'lucide-react';
import { MovementsBarChart } from './MovementsBarChart';
import { BillingBarChart } from './BillingBarChart';
import { exportMovementsHistoryCSV } from '../utils/csvExport';
import { BillingRecord } from '../types';

interface DashboardProps {
  products: Product[];
  movements: StockMovement[];
  invoices: Invoice[];
  billings?: BillingRecord[];
  employees?: Employee[];
  punches?: TimePunch[];
  companySettings: CompanySettings;
  onNavigate: (tab: 'dashboard' | 'billing' | 'expenses' | 'entry' | 'stock' | 'prices' | 'timeclock' | 'advances' | 'invoices' | 'reports' | 'users') => void;
  onOpenDanfe: (invoice: Invoice) => void;
  onOpenCompanySettings?: () => void;
  onOpenSupabaseSync?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  products,
  movements,
  invoices,
  billings = [],
  employees = [],
  punches = [],
  companySettings,
  onNavigate,
  onOpenDanfe,
  onOpenCompanySettings,
  onOpenSupabaseSync,
}) => {
  const [logoLoadError, setLogoLoadError] = useState(false);

  // Data de referência de Hoje (formato YYYY-MM-DD local)
  const todayIsoStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const [selectedDayDate, setSelectedDayDate] = useState<string>(todayIsoStr);

  // Faturamento do Dia Selecionado
  const dayBillings = useMemo(() => {
    return billings.filter(b => b.date === selectedDayDate);
  }, [billings, selectedDayDate]);

  const dayBillingTotal = useMemo(() => {
    return dayBillings.reduce((acc, curr) => acc + (Number(curr.grandTotal) || 0), 0);
  }, [dayBillings]);

  const dayProductsTotal = useMemo(() => {
    return dayBillings.reduce((acc, curr) => acc + (Number(curr.productsTotal) || 0), 0);
  }, [dayBillings]);

  const dayServicesTotal = useMemo(() => {
    return dayBillings.reduce(
      (acc, curr) => acc + (Number(curr.servicesTotal) || 0) + (Number(curr.alignmentBalancingTotal) || 0),
      0
    );
  }, [dayBillings]);

  // Movimentações de Estoque do Dia Selecionado
  const dayMovements = useMemo(() => {
    return movements.filter(m => m.date === selectedDayDate);
  }, [movements, selectedDayDate]);

  const dayIncomingMovements = useMemo(() => {
    return dayMovements.filter(m => m.type.startsWith('ENTRADA'));
  }, [dayMovements]);

  const dayOutgoingMovements = useMemo(() => {
    return dayMovements.filter(m => !m.type.startsWith('ENTRADA'));
  }, [dayMovements]);

  const dayTotalMovedUnits = useMemo(() => {
    return dayMovements.reduce((acc, m) => acc + Math.abs(Number(m.quantity) || 0), 0);
  }, [dayMovements]);

  // Funcionários Presentes no Dia Selecionado (com registro de batida de ponto)
  const dayPunches = useMemo(() => {
    return punches.filter(p => p.date === selectedDayDate);
  }, [punches, selectedDayDate]);

  const presentEmployeesSet = useMemo(() => {
    return new Set(dayPunches.map(p => p.employeeId));
  }, [dayPunches]);

  const presentEmployeesCount = presentEmployeesSet.size;
  const totalEmployeesCount = employees.length;
  const presencePercentage = totalEmployeesCount > 0 
    ? Math.round((presentEmployeesCount / totalEmployeesCount) * 100) 
    : 0;

  // Formatação amigável da data em português
  const formattedDayTitle = useMemo(() => {
    try {
      const [year, month, day] = selectedDayDate.split('-').map(Number);
      if (!year || !month || !day) return selectedDayDate;
      const dateObj = new Date(year, month - 1, day);
      const str = dateObj.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      return str.charAt(0).toUpperCase() + str.slice(1);
    } catch {
      return selectedDayDate;
    }
  }, [selectedDayDate]);

  const isTodaySelected = selectedDayDate === todayIsoStr;

  // Total de Faturamento registrado
  const totalBillingGrand = useMemo(() => {
    return billings.reduce((acc, curr) => acc + (Number(curr.grandTotal) || 0), 0);
  }, [billings]);

  // Faturamentos do mês corrente (Outubro ou Setembro 2026)
  const currentMonthBillings = useMemo(() => {
    if (!billings || billings.length === 0) return [];
    const oct = billings.filter(b => b.date && b.date.startsWith('2026-10'));
    if (oct.length > 0) return oct;
    return billings.filter(b => b.date && b.date.startsWith('2026-09'));
  }, [billings]);

  const currentMonthBillingGrand = useMemo(() => {
    return currentMonthBillings.reduce((acc, b) => acc + (Number(b.grandTotal) || 0), 0);
  }, [currentMonthBillings]);

  // Mês corrente para movimentações (Setembro 2026)
  const currentMonthStr = '2026-09';
  const currentMonthInvoices = invoices.filter(
    inv => (inv.entryDate || inv.issueDate).substring(0, 7) === currentMonthStr && inv.status === 'CONFIRMADA'
  );
  const currentMonthMovements = movements.filter(
    m => m.date.substring(0, 7) === currentMonthStr
  );

  // Totais
  const totalStockValue = products.reduce((acc, p) => acc + (p.currentStock * p.averageCost), 0);
  const totalItemsCount = products.reduce((acc, p) => acc + p.currentStock, 0);

  const monthIncomingValue = currentMonthMovements
    .filter(m => m.type.startsWith('ENTRADA'))
    .reduce((acc, m) => acc + m.totalCost, 0);

  const monthOutgoingValue = currentMonthMovements
    .filter(m => !m.type.startsWith('ENTRADA'))
    .reduce((acc, m) => acc + (m.totalCost || (m.quantity * m.unitCost)), 0);

  // Alertas de estoque crítico
  const lowStockProducts = products.filter(p => p.currentStock <= p.minStock);

  // Últimas 5 notas fiscais
  const recentInvoices = invoices.slice(0, 5);

  // Últimas 6 movimentações
  const recentMovements = movements.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Welcome & Corporate Identity Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-800/80 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Left: Company Logo, Trade Name & Context */}
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            {/* Logo Frame */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-1.5 shadow-md border-2 border-indigo-500/40 flex items-center justify-center overflow-hidden">
                {!logoLoadError && companySettings.logoUrl ? (
                  <img
                    src={companySettings.logoUrl}
                    alt={companySettings.tradeName}
                    referrerPolicy="no-referrer"
                    onError={() => setLogoLoadError(true)}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xl font-black">
                    {companySettings.tradeName?.charAt(0) || 'G'}
                  </div>
                )}
              </div>
            </div>

            {/* Company Info Prose */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  {companySettings.tradeName || 'Gestor NF-e'}
                </span>
                <span className="text-slate-400 text-xs">·</span>
                <span className="text-xs font-mono text-slate-300">
                  CNPJ: {companySettings.cnpj}
                </span>
                {companySettings.cityState && (
                  <>
                    <span className="text-slate-400 text-xs">·</span>
                    <span className="text-xs text-slate-300">{companySettings.cityState}</span>
                  </>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
                {companySettings.name}
              </h1>

              <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
                Plataforma integrada de gestão fiscal, controle físico-financeiro de estoque (CMPM), registro de ponto e emissão de vales em dinheiro.
              </p>
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate('billing')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              <Receipt className="w-4 h-4" />
              <span>Faturamento (OS)</span>
            </button>

            <button
              onClick={() => onNavigate('entry')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-indigo-500/25 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Importar NF-e</span>
            </button>

            <button
              onClick={() => onNavigate('advances')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              <Banknote className="w-4 h-4" />
              <span>Vales</span>
            </button>

            <button
              onClick={() => onNavigate('expenses')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              <ReceiptText className="w-4 h-4" />
              <span>Despesas</span>
            </button>

            {onOpenSupabaseSync && (
              <button
                onClick={onOpenSupabaseSync}
                title="Sincronizar com Banco de Dados Supabase (PostgreSQL)"
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-xl transition-all border border-emerald-400/30 cursor-pointer"
              >
                <Database className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Supabase Nuvem</span>
              </button>
            )}

            {onOpenCompanySettings && (
              <button
                onClick={onOpenCompanySettings}
                title="Configurar Logotipo e Dados da Empresa"
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-all border border-white/10 cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-indigo-300" />
                <span className="hidden sm:inline">Editar Logo</span>
              </button>
            )}
          </div>
        </div>

        {/* Subtle Radial Glow */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* CARD PRINCIPAL: RESUMO DO DIA (Visão Gerencial Instantânea) */}
      <div className="bg-white rounded-2xl border-2 border-indigo-100 shadow-sm p-5 sm:p-6 relative overflow-hidden transition-all hover:border-indigo-200">
        {/* Top Header of the Day Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Resumo do Dia
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Visão Gerencial Instantânea
                </span>
                {isTodaySelected && (
                  <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-md">
                    Hoje
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {formattedDayTitle}
              </p>
            </div>
          </div>

          {/* Quick Date Selector & Controls */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <label className="text-[11px] font-bold text-slate-600 pl-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Data:</span>
            </label>
            <input
              type="date"
              value={selectedDayDate}
              onChange={(e) => e.target.value && setSelectedDayDate(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-white px-2 py-1 rounded-lg border border-slate-300 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            />
            {!isTodaySelected && (
              <button
                type="button"
                onClick={() => setSelectedDayDate(todayIsoStr)}
                title="Retornar para o dia de hoje"
                className="px-2 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors cursor-pointer"
              >
                Voltar p/ Hoje
              </button>
            )}
          </div>
        </div>

        {/* 3 Colunas dos Indicadores Gerenciais do Dia */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
          {/* Indicador 1: Total de Faturamento do Dia */}
          <div className="bg-gradient-to-br from-emerald-50/70 via-white to-slate-50/50 p-4 sm:p-5 rounded-xl border border-emerald-200/80 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  Faturamento do Dia
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {dayBillings.length} {dayBillings.length === 1 ? 'OS' : 'OSs'}
                </span>
              </div>

              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono tabular-nums tracking-tight">
                  {formatBRL(dayBillingTotal)}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {dayBillings.length > 0 ? (
                    <>
                      <span>Peças: <strong className="text-slate-700 font-mono">{formatBRL(dayProductsTotal)}</strong></span>
                      <span>•</span>
                      <span>Serviços: <strong className="text-slate-700 font-mono">{formatBRL(dayServicesTotal)}</strong></span>
                    </>
                  ) : (
                    <span>Nenhum faturamento de OS registrado neste dia</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-emerald-100/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {dayBillings.length > 0
                  ? `Ticket Médio: ${formatBRL(dayBillingTotal / dayBillings.length)}`
                  : 'Pronto para novas ordens'}
              </span>
              <button
                onClick={() => onNavigate('billing')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Faturamento</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Indicador 2: Movimentações de Estoque Registradas */}
          <div className="bg-gradient-to-br from-indigo-50/70 via-white to-slate-50/50 p-4 sm:p-5 rounded-xl border border-indigo-200/80 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                  <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
                  Movimentações de Estoque
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  {dayMovements.length} {dayMovements.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>

              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-indigo-700 font-mono tabular-nums tracking-tight">
                  {dayMovements.length}
                  <span className="text-base font-bold text-slate-500 ml-1.5">movs</span>
                </div>
                <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span>
                    <strong className="text-emerald-600 font-semibold">{dayIncomingMovements.length}</strong> entradas
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="text-rose-600 font-semibold">{dayOutgoingMovements.length}</strong> saídas
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="text-slate-700 font-mono">{dayTotalMovedUnits}</strong> un
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-indigo-100/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {dayMovements.length > 0 ? 'Físico-financeiro atualizado' : 'Nenhuma baixa/entrada hoje'}
              </span>
              <button
                onClick={() => onNavigate('stock')}
                className="text-xs font-bold text-indigo-700 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Ver Estoque</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Indicador 3: Quantidade de Funcionários Presentes */}
          <div className="bg-gradient-to-br from-purple-50/70 via-white to-slate-50/50 p-4 sm:p-5 rounded-xl border border-purple-200/80 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-purple-600" />
                  Funcionários Presentes
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  {presencePercentage}% quórum
                </span>
              </div>

              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-purple-700 tracking-tight">
                  <span className="font-mono tabular-nums">{presentEmployeesCount}</span>
                  <span className="text-lg font-bold text-slate-500 mx-1">/</span>
                  <span className="text-lg font-bold text-slate-600 font-mono tabular-nums">{totalEmployeesCount}</span>
                  <span className="text-xs font-bold text-slate-500 ml-2">colaboradores</span>
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <span>
                    <strong className="text-purple-700 font-semibold">{dayPunches.length}</strong> batidas no terminal
                  </span>
                  <span>•</span>
                  <span className="text-slate-600">Portaria 671</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-purple-100/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {presentEmployeesCount > 0
                  ? `${totalEmployeesCount - presentEmployeesCount} ausentes/folga`
                  : 'Aguardando batidas'}
              </span>
              <button
                onClick={() => onNavigate('timeclock')}
                className="text-xs font-bold text-purple-700 hover:text-purple-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Painel Ponto</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Faturamento de OS no Mês */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Faturamento OS (Mês)
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-700 mt-2 font-mono tabular-nums">
            {formatBRL(currentMonthBillingGrand)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 flex items-center justify-between">
            <span>{currentMonthBillings.length} {currentMonthBillings.length === 1 ? 'OS faturada' : 'OSs faturadas'}</span>
            <button
              onClick={() => onNavigate('billing')}
              className="text-blue-600 font-bold hover:underline cursor-pointer"
            >
              Ver OSs
            </button>
          </div>
        </div>

        {/* Card 2: Valor em Estoque */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Valor Total Estoque
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono tabular-nums">
            {formatBRL(totalStockValue)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 flex items-center justify-between">
            <span>{products.length} itens</span>
            <span className="font-semibold text-indigo-700 font-mono tabular-nums">{totalItemsCount} un</span>
          </div>
        </div>

        {/* Card 3: Entradas no Mês */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Entradas (Setembro)
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2 font-mono tabular-nums">
            {formatBRL(monthIncomingValue)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 flex items-center justify-between">
            <span>{currentMonthInvoices.length} NFs</span>
            <span className="font-semibold text-emerald-700">via SEFAZ</span>
          </div>
        </div>

        {/* Card 4: Saídas no Mês */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
              Saídas (Setembro)
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700 mt-2 font-mono tabular-nums">
            {formatBRL(monthOutgoingValue)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 flex items-center justify-between">
            <span>Vendas & Baixas</span>
            <span className="font-semibold text-rose-700">Custo médio</span>
          </div>
        </div>

        {/* Card 5: Alertas de Reposição */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Alertas Estoque
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2 font-mono tabular-nums">
            {lowStockProducts.length} itens
          </div>
          <div className="text-xs text-slate-500 mt-1.5 flex items-center justify-between">
            <span>Abaixo do mín.</span>
            <button
              onClick={() => onNavigate('stock')}
              className="text-indigo-600 font-bold hover:underline cursor-pointer"
            >
              Verificar
            </button>
          </div>
        </div>
      </div>

      {/* Gráfico de Barras Recharts: Volume de Faturamento de OS dos Últimos 6 Meses */}
      <BillingBarChart billings={billings} onNavigateToBilling={() => onNavigate('billing')} />

      {/* Gráfico de Barras: Entradas vs Saídas nos Últimos 6 Meses */}
      <MovementsBarChart movements={movements} />

      {/* Seção Central Dividida: Alertas Críticos & Últimas NFs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel Esquerdo: Alertas de Reposição Críticos (5 colunas) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-sm">Necessidade de Reposição</h3>
              </div>
              <span className="text-xs font-mono font-bold text-amber-700">
                {lowStockProducts.length} produtos
              </span>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {lowStockProducts.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                  Nenhum produto em nível crítico de estoque no momento!
                </div>
              ) : (
                lowStockProducts.slice(0, 4).map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900 text-xs">{p.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-slate-600">{p.code}</span>
                        <span>·</span>
                        <span>Mínimo: {p.minStock} {p.unit}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-rose-600 font-mono tabular-nums">
                        {p.currentStock} {p.unit}
                      </div>
                      <button
                        onClick={() => onNavigate('entry')}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline mt-0.5 block cursor-pointer"
                      >
                        Comprar / Entrar NF
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-4">
            <button
              onClick={() => onNavigate('stock')}
              className="w-full py-2 text-center text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
            >
              Ver todos os {products.length} itens do catálogo →
            </button>
          </div>
        </div>

        {/* Painel Direito: Últimas Notas Fiscais Recebidas (7 colunas) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Últimas Entradas de NF-e</h3>
              </div>
              <button
                onClick={() => onNavigate('invoices')}
                className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
              >
                Ver todas ({invoices.length})
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-slate-100 text-slate-600 shrink-0 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">NF-e nº {inv.number}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Série {inv.series}</span>
                      </div>
                      <div className="text-xs text-slate-600 font-medium truncate max-w-[240px]">
                        {inv.supplier.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {formatDateBR(inv.entryDate)} · {inv.items.length} itens integrados
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-indigo-950 font-mono tabular-nums">
                      {formatBRL(inv.totals.totalInvoiceValue)}
                    </div>
                    <button
                      onClick={() => onOpenDanfe(inv)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 mt-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> DANFE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Deseja dar entrada em um novo documento fiscal?
            </span>
            <button
              onClick={() => onNavigate('entry')}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer"
            >
              + Nova Entrada
            </button>
          </div>
        </div>
      </div>

      {/* Histórico Recente de Movimentações */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 mb-4 gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Últimas Movimentações Físicas de Estoque
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:inline">Fluxo cronológico de entradas e saídas</span>
            <button
              onClick={() => exportMovementsHistoryCSV(movements)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs cursor-pointer"
              title="Baixar histórico completo de todas as movimentações em formato CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar Histórico (CSV)</span>
            </button>
          </div>
        </div>

        <div className="border border-slate-200/80 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Data / Hora</th>
                <th className="p-3">Produto</th>
                <th className="p-3">Tipo Movimento</th>
                <th className="p-3">Documento</th>
                <th className="p-3 text-right">Qtd.</th>
                <th className="p-3 text-right">Saldo Atual</th>
                <th className="p-3 text-right">Custo Médio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentMovements.map((mov) => {
                const isIncoming = mov.type.startsWith('ENTRADA');
                return (
                  <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 text-slate-500 font-mono">{formatDateBR(mov.date)}</td>
                    <td className="p-3 font-semibold text-slate-900">{mov.productName}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          isIncoming
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isIncoming ? (
                          <ArrowDownRight className="w-3 h-3" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3" />
                        )}
                        {mov.type === 'ENTRADA_NFE' ? 'Entrada NF-e' : 'Saída / Baixa'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-700">{mov.documentNumber || '-'}</td>
                    <td
                      className={`p-3 text-right font-bold font-mono tabular-nums ${
                        isIncoming ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {isIncoming ? `+${mov.quantity}` : `-${mov.quantity}`} {mov.unit}
                    </td>
                    <td className="p-3 text-right font-semibold text-slate-900 font-mono tabular-nums">
                      {mov.resultingStock} {mov.unit}
                    </td>
                    <td className="p-3 text-right text-indigo-700 font-medium font-mono tabular-nums">
                      {formatBRL(mov.resultingAverageCost)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
