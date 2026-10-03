import React, { useState, useMemo } from 'react';
import { SalaryAdvance, Employee, AdvanceMovement, AdvancePaymentMethod } from '../types';
import { CompanySettings } from '../utils/companySettings';
import {
  exportSalaryAdvancesCSV,
  addMovementToAdvance,
  deleteMovementFromAdvance
} from '../utils/salaryAdvancesStorage';
import { AddEditAdvanceModal } from './AddEditAdvanceModal';
import { AdvanceReceiptModal } from './AdvanceReceiptModal';
import { AddValueToAdvanceModal } from './AddValueToAdvanceModal';
import { PayoffAdvanceModal } from './PayoffAdvanceModal';
import {
  Banknote,
  PlusCircle,
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  AlertTriangle,
  FileText,
  DollarSign,
  Wallet,
  ShieldCheck,
  Check,
  X,
  LayoutGrid,
  List,
  ArrowDownCircle,
  History,
  ChevronDown,
  ChevronUp,
  Receipt
} from 'lucide-react';

interface SalaryAdvancesViewProps {
  employees: Employee[];
  advances: SalaryAdvance[];
  companySettings?: CompanySettings;
  onAddAdvance: (advanceData: Omit<SalaryAdvance, 'id' | 'createdAt'>) => void;
  onUpdateAdvance: (updatedAdvance: SalaryAdvance) => void;
  onDeleteAdvance: (id: string) => void;
}

function formatCurrency(val: number): string {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateTime(dateStr: string, timeStr?: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const dateFormatted = `${d}/${m}/${y}`;
  return timeStr ? `${dateFormatted} às ${timeStr}` : dateFormatted;
}

export const SalaryAdvancesView: React.FC<SalaryAdvancesViewProps> = ({
  employees,
  advances,
  companySettings,
  onAddAdvance,
  onUpdateAdvance,
  onDeleteAdvance,
}) => {
  // Modo de visualização: 'cards' (Cards com Adicionar Valor, Baixa e Histórico Data/Hora) ou 'table' (Planilha)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Filtros
  const [currentMonthFilter, setCurrentMonthFilter] = useState<string>('ALL');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modais de Controle
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState<boolean>(false);
  const [advanceToEdit, setAdvanceToEdit] = useState<SalaryAdvance | null>(null);
  const [receiptAdvance, setReceiptAdvance] = useState<SalaryAdvance | null>(null);
  const [receiptMovement, setReceiptMovement] = useState<AdvanceMovement | null>(null);
  const [advanceToDelete, setAdvanceToDelete] = useState<SalaryAdvance | null>(null);

  // Modais específicos para Adição de Valor e Baixa no Card
  const [selectedAdvanceForAddValue, setSelectedAdvanceForAddValue] = useState<SalaryAdvance | null>(null);
  const [selectedAdvanceForPayoff, setSelectedAdvanceForPayoff] = useState<SalaryAdvance | null>(null);

  // Cards com histórico aberto/fechado
  const [collapsedHistoryCardIds, setCollapsedHistoryCardIds] = useState<Set<string>>(new Set());

  const toggleHistoryCollapse = (id: string) => {
    setCollapsedHistoryCardIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Competências disponíveis para o filtro
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add('2026-09');
    set.add('2026-10');
    advances.forEach(a => {
      if (a.competenceMonth) set.add(a.competenceMonth);
    });
    return Array.from(set).sort().reverse();
  }, [advances]);

  // Filtragem dos Vales
  const filteredAdvances = useMemo(() => {
    return advances.filter(adv => {
      const matchMonth = currentMonthFilter === 'ALL' || adv.competenceMonth === currentMonthFilter;
      const matchEmployee = selectedEmployeeFilter === 'ALL' || adv.employeeId === selectedEmployeeFilter;
      const matchStatus = selectedStatusFilter === 'ALL' || adv.status === selectedStatusFilter;
      const matchMethod = selectedMethodFilter === 'ALL' || adv.paymentMethod === selectedMethodFilter;
      const matchSearch =
        adv.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adv.employeeRegistration.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adv.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (adv.notes && adv.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchMonth && matchEmployee && matchStatus && matchMethod && matchSearch;
    });
  }, [advances, currentMonthFilter, selectedEmployeeFilter, selectedStatusFilter, selectedMethodFilter, searchTerm]);

  // Totais e Indicadores dos Vales Filtrados
  const summary = useMemo(() => {
    const totalAmount = filteredAdvances.reduce((acc, a) => acc + (Number(a.amount) || 0), 0);
    const totalPaidAmount = filteredAdvances.reduce((acc, a) => acc + (Number(a.totalPaidAmount) || 0), 0);
    const totalBalance = filteredAdvances.reduce(
      (acc, a) => acc + Number(a.balanceAmount ?? a.amount ?? 0),
      0
    );
    const pendingAmount = filteredAdvances
      .filter(a => a.status === 'PENDENTE_DESCONTO' || a.status === 'PARCIALMENTE_BAIXADO')
      .reduce((acc, a) => acc + Number(a.balanceAmount ?? a.amount ?? 0), 0);
    const discountedAmount = filteredAdvances
      .filter(a => a.status === 'DESCONTADO_FOLHA')
      .reduce((acc, a) => acc + (Number(a.amount) || 0), 0);
    const cashAmount = filteredAdvances
      .filter(a => a.paymentMethod === 'DINHEIRO')
      .reduce((acc, a) => acc + (Number(a.amount) || 0), 0);

    const uniqueEmployeesCount = new Set(filteredAdvances.map(a => a.employeeId)).size;

    return {
      totalAmount,
      totalPaidAmount,
      totalBalance,
      pendingAmount,
      discountedAmount,
      cashAmount,
      uniqueEmployeesCount,
      totalCount: filteredAdvances.length,
    };
  }, [filteredAdvances]);

  const handleOpenAddModal = () => {
    setAdvanceToEdit(null);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (adv: SalaryAdvance) => {
    setAdvanceToEdit(adv);
    setIsAddEditModalOpen(true);
  };

  const handleSaveModal = (data: Omit<SalaryAdvance, 'id' | 'createdAt'>, editId?: string) => {
    if (editId && advanceToEdit) {
      onUpdateAdvance({
        ...data,
        id: editId,
        createdAt: advanceToEdit.createdAt,
      });
    } else {
      onAddAdvance(data);
    }
  };

  // Alternar rapidamente o status entre Pendente e Descontado
  const handleToggleStatus = (adv: SalaryAdvance) => {
    const nextStatus = adv.status === 'PENDENTE_DESCONTO' ? 'DESCONTADO_FOLHA' : 'PENDENTE_DESCONTO';
    onUpdateAdvance({
      ...adv,
      status: nextStatus,
    });
  };

  const handleConfirmDelete = () => {
    if (advanceToDelete) {
      onDeleteAdvance(advanceToDelete.id);
      setAdvanceToDelete(null);
    }
  };

  const handleExportCSV = () => {
    exportSalaryAdvancesCSV(filteredAdvances, currentMonthFilter);
  };

  // Confirmar adição de valor no card com data e hora
  const handleConfirmAddValueToCard = (movementData: {
    amount: number;
    date: string;
    time: string;
    dateTime: string;
    paymentMethod: AdvancePaymentMethod;
    reason: string;
    approvedBy?: string;
    notes?: string;
  }) => {
    if (!selectedAdvanceForAddValue) return;

    const res = addMovementToAdvance(selectedAdvanceForAddValue.id, {
      type: 'ADICAO_VALOR',
      ...movementData,
    });

    if (res.success && res.advance) {
      onUpdateAdvance(res.advance);
    }
    setSelectedAdvanceForAddValue(null);
  };

  // Confirmar baixa no card com data e hora
  const handleConfirmPayoffCard = (movementData: {
    amount: number;
    date: string;
    time: string;
    dateTime: string;
    paymentMethod: AdvancePaymentMethod;
    reason: string;
    approvedBy?: string;
    notes?: string;
  }) => {
    if (!selectedAdvanceForPayoff) return;

    const res = addMovementToAdvance(selectedAdvanceForPayoff.id, {
      type: 'BAIXA_VALOR',
      ...movementData,
    });

    if (res.success && res.advance) {
      onUpdateAdvance(res.advance);
    }
    setSelectedAdvanceForPayoff(null);
  };

  // Excluir um lançamento individual com data/hora
  const handleDeleteMovement = (advanceId: string, movementId: string) => {
    if (
      !window.confirm(
        'Deseja realmente remover este lançamento com data e hora? O saldo devedor e os totais do card serão recalculados.'
      )
    ) {
      return;
    }

    const res = deleteMovementFromAdvance(advanceId, movementId);
    if (res.success && res.advance) {
      onUpdateAdvance(res.advance);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold mb-2">
              <Banknote className="w-3.5 h-3.5" />
              Controle de Vales por Card • Adição de Valores e Baixas com Data e Hora (CLT 462)
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Vales & Adiantamentos Salariais
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Adicione valores adicionais e dê baixa em cada card de colaborador, mantendo um histórico auditável gravado permanentemente com data, hora e responsável.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all border border-white/10 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar (CSV)</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Novo Card de Vale</span>
            </button>
          </div>
        </div>

        {/* Efeito visual decorativo */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards Rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total em Vales Concedidos */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Concedido
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {formatCurrency(summary.totalAmount)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {summary.totalCount} {summary.totalCount === 1 ? 'vale cadastrado' : 'vales cadastrados'}
          </span>
        </div>

        {/* Saldo Devedor Atual a Baixar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Saldo Devedor a Baixar
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2 font-mono">
            {formatCurrency(summary.totalBalance)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            A descontar em folha ou caixa
          </span>
        </div>

        {/* Já Baixado / Quitado */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Total Já Baixado
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-700 mt-2 font-mono">
            {formatCurrency(summary.totalPaidAmount)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Descontos processados
          </span>
        </div>

        {/* Dinheiro em Espécie */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
              Em Espécie (Caixa)
            </span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-700 mt-2 font-mono">
            {formatCurrency(summary.cashAmount)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Retiradas em cédulas
          </span>
        </div>
      </div>

      {/* Barra de Filtros e Alternância de Visualização (Cards vs Tabela) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Seletor do Modo de Visualização */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-emerald-600" />
              <span>Cards de Vales & Baixas</span>
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-mono">
                {filteredAdvances.length}
              </span>
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4 text-indigo-600" />
              <span>Tabela Geral</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Todos os lançamentos gravam data, hora e responsável.</span>
          </div>
        </div>

        {/* Linha de Busca e Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Busca por texto */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar colaborador, motivo..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Filtro por Mês de Competência */}
          <div>
            <select
              value={currentMonthFilter}
              onChange={(e) => setCurrentMonthFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Todas as Competências</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>Competência: {m}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Colaborador */}
          <div>
            <select
              value={selectedEmployeeFilter}
              onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Todos os Colaboradores ({employees.length})</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.registrationNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Status do Desconto */}
          <div>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Todos os Status</option>
              <option value="PENDENTE_DESCONTO">⏳ Pendentes de Desconto</option>
              <option value="PARCIALMENTE_BAIXADO">🔄 Parcialmente Baixados</option>
              <option value="DESCONTADO_FOLHA">✅ Totalmente Quitados / Baixados</option>
              <option value="CANCELADO">❌ Cancelados</option>
            </select>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODO 1: CARDS INTERATIVOS DE VALES COM ADIÇÃO E BAIXA    */}
      {/* ======================================================== */}
      {viewMode === 'cards' && (
        <div>
          {filteredAdvances.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-2xs">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                <Banknote className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Nenhum card de vale encontrado
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {advances.length === 0
                    ? 'Não há vales cadastrados no sistema. Clique no botão abaixo para criar o primeiro card.'
                    : 'Nenhum vale corresponde aos filtros aplicados.'}
                </p>
              </div>
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Cadastrar Primeiro Card</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {filteredAdvances.map(adv => {
                const emp = employees.find(e => e.id === adv.employeeId);
                const isPending = adv.status === 'PENDENTE_DESCONTO';
                const isPartial = adv.status === 'PARCIALMENTE_BAIXADO';
                const isDiscounted = adv.status === 'DESCONTADO_FOLHA';
                const currentBalance = Number(adv.balanceAmount ?? adv.amount ?? 0);
                const movements = adv.movements || [];
                const isHistoryCollapsed = collapsedHistoryCardIds.has(adv.id);

                return (
                  <div
                    key={adv.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header do Card */}
                      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 text-white font-black flex items-center justify-center text-sm shadow-md shadow-indigo-500/20 shrink-0">
                            {emp?.avatarInitials || adv.employeeName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-black text-slate-900 text-sm sm:text-base tracking-tight">
                                {adv.employeeName}
                              </h3>
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-md font-mono">
                                Mat: {adv.employeeRegistration}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {adv.employeeRole} • <strong className="text-slate-600">{adv.employeeDepartment}</strong>
                            </p>
                          </div>
                        </div>

                        {/* Status e Mês de Referência */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                            Ref: {adv.competenceMonth}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              isPending
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : isPartial
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : isDiscounted
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}
                          >
                            {isPending && <Clock className="w-3 h-3 text-amber-600" />}
                            {isPartial && <ArrowDownCircle className="w-3 h-3 text-blue-600" />}
                            {isDiscounted && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            <span>
                              {isPending
                                ? 'Pendente'
                                : isPartial
                                ? 'Parcialmente Baixado'
                                : isDiscounted
                                ? 'Totalmente Quitado'
                                : adv.status}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Painel Financeiro Triplo do Card */}
                      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50/70 via-slate-50/40 to-slate-50/70 border-b border-slate-100 grid grid-cols-3 gap-2.5 text-center">
                        {/* 1. Saldo Devedor a Baixar */}
                        <div
                          className={`p-2.5 rounded-xl border ${
                            currentBalance > 0
                              ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                              : 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                          }`}
                        >
                          <span className="text-[10px] uppercase font-extrabold tracking-wider block opacity-75">
                            Saldo a Baixar
                          </span>
                          <div className="text-lg sm:text-xl font-black font-mono mt-0.5">
                            {formatCurrency(currentBalance)}
                          </div>
                          <span className="text-[10px] block opacity-75 mt-0.5">
                            {currentBalance > 0 ? 'Pendente de desconto' : '✓ 100% quitado'}
                          </span>
                        </div>

                        {/* 2. Total Concedido (Adições) */}
                        <div className="p-2.5 rounded-xl border border-emerald-100 bg-white">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                            Total Adiantado
                          </span>
                          <div className="text-lg sm:text-xl font-black font-mono text-emerald-700 mt-0.5">
                            {formatCurrency(adv.amount)}
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Concedido em vales
                          </span>
                        </div>

                        {/* 3. Total Baixado (Quitações) */}
                        <div className="p-2.5 rounded-xl border border-blue-100 bg-white">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                            Total Baixado
                          </span>
                          <div className="text-lg sm:text-xl font-black font-mono text-blue-700 mt-0.5">
                            {formatCurrency(adv.totalPaidAmount || 0)}
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Descontado/pago
                          </span>
                        </div>
                      </div>

                      {/* Botões de Ação Direta no Card (Adicionar Valor, Dar Baixa, Recibo) */}
                      <div className="p-4 sm:p-5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Botão Adicionar Valor */}
                          <button
                            type="button"
                            onClick={() => setSelectedAdvanceForAddValue(adv)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                          >
                            <PlusCircle className="w-4 h-4" />
                            <span>Adicionar Valor</span>
                          </button>

                          {/* Botão Dar Baixa */}
                          <button
                            type="button"
                            onClick={() => setSelectedAdvanceForPayoff(adv)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                          >
                            <ArrowDownCircle className="w-4 h-4" />
                            <span>Dar Baixa</span>
                          </button>

                          {/* Botão Imprimir Extrato Geral do Card */}
                          <button
                            type="button"
                            onClick={() => {
                              setReceiptMovement(null);
                              setReceiptAdvance(adv);
                            }}
                            title="Visualizar e Imprimir Extrato / Recibo Consolidado"
                            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4 text-slate-500" />
                            <span>Extrato / Recibo</span>
                          </button>
                        </div>

                        {/* Ações Secundárias */}
                        <div className="flex items-center gap-1 text-slate-400">
                          <button
                            onClick={() => handleOpenEditModal(adv)}
                            title="Editar Dados do Vale"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setAdvanceToDelete(adv)}
                            title="Excluir Card do Vale"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Seção de Histórico Gravado com Data e Hora */}
                      <div className="p-4 sm:p-5">
                        <div className="flex items-center justify-between pb-2">
                          <div className="flex items-center gap-2">
                            <History className="w-4 h-4 text-indigo-600" />
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                              Histórico Registrado (Data e Hora)
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 font-mono">
                              {movements.length} {movements.length === 1 ? 'registro' : 'registros'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleHistoryCollapse(adv.id)}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isHistoryCollapsed ? 'Ver Histórico' : 'Recolher'}</span>
                            {isHistoryCollapsed ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronUp className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Lista de Movimentos */}
                        {!isHistoryCollapsed && (
                          <div className="space-y-2 mt-2">
                            {movements.length === 0 ? (
                              <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                                Nenhum lançamento registrado ainda.
                              </div>
                            ) : (
                              movements.map((mov, idx) => {
                                const isMovBaixa = mov.type === 'BAIXA_VALOR';
                                return (
                                  <div
                                    key={mov.id || idx}
                                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
                                      isMovBaixa
                                        ? 'bg-blue-50/40 border-blue-100 hover:bg-blue-50/70'
                                        : 'bg-emerald-50/40 border-emerald-100 hover:bg-emerald-50/70'
                                    }`}
                                  >
                                    {/* Lado Esquerdo: Tag, Valor, Data e Hora */}
                                    <div className="flex items-start sm:items-center gap-3">
                                      <div
                                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                          isMovBaixa
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-emerald-100 text-emerald-700'
                                        }`}
                                      >
                                        {isMovBaixa ? (
                                          <ArrowDownCircle className="w-4 h-4" />
                                        ) : (
                                          <PlusCircle className="w-4 h-4" />
                                        )}
                                      </div>

                                      <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span
                                            className={`font-mono font-black text-xs ${
                                              isMovBaixa ? 'text-blue-800' : 'text-emerald-800'
                                            }`}
                                          >
                                            {isMovBaixa ? '-' : '+'} {formatCurrency(mov.amount)}
                                          </span>
                                          <span
                                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                                              isMovBaixa
                                                ? 'bg-blue-100/80 text-blue-800'
                                                : 'bg-emerald-100/80 text-emerald-800'
                                            }`}
                                          >
                                            {isMovBaixa ? 'Baixa / Pagamento' : 'Adição de Valor'}
                                          </span>
                                          <span className="text-[11px] text-slate-500 font-medium">
                                            ({mov.paymentMethod})
                                          </span>
                                        </div>

                                        <p className="text-xs text-slate-700 font-medium mt-0.5">
                                          {mov.reason}
                                        </p>

                                        {/* Timestamp Exato: Data e Hora */}
                                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                          <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-700">
                                            <Calendar className="w-3 h-3 text-slate-400" />
                                            {formatDateTime(mov.date, mov.time)}
                                          </span>
                                          {mov.approvedBy && (
                                            <>
                                              <span>•</span>
                                              <span>Resp: <strong className="text-slate-700">{mov.approvedBy}</strong></span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Lado Direito: Ações por Lançamento */}
                                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReceiptMovement(mov);
                                          setReceiptAdvance(adv);
                                        }}
                                        title="Imprimir Comprovante Deste Lançamento Específico"
                                        className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                                      >
                                        <Printer className="w-3.5 h-3.5" />
                                      </button>

                                      {movements.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteMovement(adv.id, mov.id)}
                                          title="Excluir este lançamento do histórico"
                                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rodapé do Card */}
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Criado em: {new Date(adv.createdAt).toLocaleDateString('pt-BR')}</span>
                      <span>Assinado recibo: <strong className={adv.receiptSigned ? 'text-emerald-700' : 'text-slate-500'}>{adv.receiptSigned ? 'Sim' : 'Não'}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODO 2: VISUALIZAÇÃO EM TABELA TRADICIONAL               */}
      {/* ======================================================== */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {filteredAdvances.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                <Banknote className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Nenhum vale encontrado
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Nenhum adiantamento confere com os filtros de busca selecionados.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Data / Mês</th>
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Total Concedido</th>
                    <th className="py-3 px-4">Total Baixado</th>
                    <th className="py-3 px-4">Saldo a Baixar</th>
                    <th className="py-3 px-4">Histórico Data/Hora</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAdvances.map(adv => {
                    const emp = employees.find(e => e.id === adv.employeeId);
                    const isPending = adv.status === 'PENDENTE_DESCONTO';
                    const isPartial = adv.status === 'PARCIALMENTE_BAIXADO';
                    const isDiscounted = adv.status === 'DESCONTADO_FOLHA';
                    const currentBalance = Number(adv.balanceAmount ?? adv.amount ?? 0);
                    const [y, m, d] = adv.date.split('-');
                    const formattedDate = `${d}/${m}/${y}`;

                    return (
                      <tr key={adv.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Data / Mês */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <strong className="text-slate-900 block font-mono text-xs">{formattedDate}</strong>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">
                            Ref: {adv.competenceMonth}
                          </span>
                        </td>

                        {/* Colaborador */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                              {emp?.avatarInitials || adv.employeeName.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <strong className="text-slate-900 text-xs block leading-tight">
                                {adv.employeeName}
                              </strong>
                              <div className="text-[11px] text-slate-500 font-mono">
                                Mat: {adv.employeeRegistration} • {adv.employeeRole}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Total Concedido */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-xs font-bold font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                            {formatCurrency(adv.amount)}
                          </span>
                        </td>

                        {/* Total Baixado */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-xs font-bold font-mono text-blue-800 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                            {formatCurrency(adv.totalPaidAmount || 0)}
                          </span>
                        </td>

                        {/* Saldo Devedor */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`text-xs font-black font-mono px-2.5 py-1 rounded-lg border ${
                              currentBalance > 0
                                ? 'text-amber-800 bg-amber-50 border-amber-200'
                                : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                            }`}
                          >
                            {formatCurrency(currentBalance)}
                          </span>
                        </td>

                        {/* Histórico e Movimentos */}
                        <td className="py-3.5 px-4">
                          <span className="text-[11px] text-slate-600 font-medium">
                            {adv.movements?.length || 1} lançamentos registrados
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              isPending
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : isPartial
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : isDiscounted
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}
                          >
                            {isPending ? 'Pendente' : isPartial ? 'Parcial' : isDiscounted ? 'Quitado' : adv.status}
                          </span>
                        </td>

                        {/* Ações Rápidas */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Adicionar Valor */}
                            <button
                              type="button"
                              onClick={() => setSelectedAdvanceForAddValue(adv)}
                              title="Adicionar Valor a este Vale"
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                            </button>

                            {/* Dar Baixa */}
                            <button
                              type="button"
                              onClick={() => setSelectedAdvanceForPayoff(adv)}
                              title="Dar Baixa neste Vale"
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                            >
                              <ArrowDownCircle className="w-3.5 h-3.5" />
                            </button>

                            {/* Imprimir Recibo */}
                            <button
                              onClick={() => {
                                setReceiptMovement(null);
                                setReceiptAdvance(adv);
                              }}
                              title="Visualizar e Imprimir Recibo"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Excluir */}
                            <button
                              onClick={() => setAdvanceToDelete(adv)}
                              title="Excluir este vale"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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

      {/* ======================================================== */}
      {/* MODAIS DO SISTEMA                                        */}
      {/* ======================================================== */}

      {/* Modal 1: Adicionar Valor Adicional no Card */}
      {selectedAdvanceForAddValue && (
        <AddValueToAdvanceModal
          isOpen={!!selectedAdvanceForAddValue}
          onClose={() => setSelectedAdvanceForAddValue(null)}
          advance={selectedAdvanceForAddValue}
          onConfirm={handleConfirmAddValueToCard}
        />
      )}

      {/* Modal 2: Dar Baixa / Registrar Pagamento no Card */}
      {selectedAdvanceForPayoff && (
        <PayoffAdvanceModal
          isOpen={!!selectedAdvanceForPayoff}
          onClose={() => setSelectedAdvanceForPayoff(null)}
          advance={selectedAdvanceForPayoff}
          onConfirm={handleConfirmPayoffCard}
        />
      )}

      {/* Modal 3: Recibo / Extrato com Data e Hora */}
      {receiptAdvance && (
        <AdvanceReceiptModal
          isOpen={!!receiptAdvance}
          onClose={() => {
            setReceiptAdvance(null);
            setReceiptMovement(null);
          }}
          advance={receiptAdvance}
          movement={receiptMovement}
          employee={employees.find(e => e.id === receiptAdvance.employeeId)}
          companySettings={companySettings}
        />
      )}

      {/* Modal 4: Cadastro ou Edição Geral do Vale */}
      {isAddEditModalOpen && (
        <AddEditAdvanceModal
          isOpen={isAddEditModalOpen}
          onClose={() => {
            setIsAddEditModalOpen(false);
            setAdvanceToEdit(null);
          }}
          employees={employees}
          advanceToEdit={advanceToEdit}
          onSave={handleSaveModal}
        />
      )}

      {/* Modal 5: Confirmação de Exclusão de Vale */}
      {advanceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Excluir Card de Vale?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Você está prestes a remover o vale de{' '}
                <strong className="text-slate-800">{advanceToDelete.employeeName}</strong> no valor total de{' '}
                <strong className="text-slate-800 font-mono">
                  {formatCurrency(advanceToDelete.amount)}
                </strong>{' '}
                e todo o histórico de adições e baixas vinculado. Essa ação não pode ser desfeita.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setAdvanceToDelete(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                Sim, Excluir Vale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
