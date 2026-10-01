import React, { useState, useMemo } from 'react';
import { SalaryAdvance, Employee } from '../types';
import { CompanySettings } from '../utils/companySettings';
import { exportSalaryAdvancesCSV } from '../utils/salaryAdvancesStorage';
import { AddEditAdvanceModal } from './AddEditAdvanceModal';
import { AdvanceReceiptModal } from './AdvanceReceiptModal';
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
  ArrowUpDown,
  FileText,
  DollarSign,
  Wallet,
  ShieldCheck,
  Check,
  X
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

export const SalaryAdvancesView: React.FC<SalaryAdvancesViewProps> = ({
  employees,
  advances,
  companySettings,
  onAddAdvance,
  onUpdateAdvance,
  onDeleteAdvance,
}) => {
  const [currentMonthFilter, setCurrentMonthFilter] = useState<string>('2026-09');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modais
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState<boolean>(false);
  const [advanceToEdit, setAdvanceToEdit] = useState<SalaryAdvance | null>(null);
  const [receiptAdvance, setReceiptAdvance] = useState<SalaryAdvance | null>(null);
  const [advanceToDelete, setAdvanceToDelete] = useState<SalaryAdvance | null>(null);

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
    const pendingAmount = filteredAdvances
      .filter(a => a.status === 'PENDENTE_DESCONTO')
      .reduce((acc, a) => acc + (Number(a.amount) || 0), 0);
    const discountedAmount = filteredAdvances
      .filter(a => a.status === 'DESCONTADO_FOLHA')
      .reduce((acc, a) => acc + (Number(a.amount) || 0), 0);
    const cashAmount = filteredAdvances
      .filter(a => a.paymentMethod === 'DINHEIRO')
      .reduce((acc, a) => acc + (Number(a.amount) || 0), 0);

    const uniqueEmployeesCount = new Set(filteredAdvances.map(a => a.employeeId)).size;

    return {
      totalAmount,
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

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold mb-2">
              <Banknote className="w-3.5 h-3.5" />
              Controle de Adiantamentos • CLT Art. 462
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Vales & Adiantamentos Salariais
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Gestão de retiradas em dinheiro em espécie e adiantamentos solicitados pelos colaboradores, com emissão de recibos assinados e apuração para desconto em folha.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all border border-white/10 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar Vales (CSV)</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Novo Vale / Adiantamento</span>
            </button>
          </div>
        </div>

        {/* Efeito visual decorativo */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards Rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total do Período */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total em Vales
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {formatCurrency(summary.totalAmount)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {summary.totalCount} {summary.totalCount === 1 ? 'vale registrado' : 'vales registrados'}
          </span>
        </div>

        {/* Em Dinheiro Físico */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Dinheiro em Espécie
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-100/70 text-emerald-700">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2 font-mono">
            {formatCurrency(summary.cashAmount)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Entregue em cédulas no caixa
          </span>
        </div>

        {/* Pendente de Desconto em Folha */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Pendente de Desconto
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2 font-mono">
            {formatCurrency(summary.pendingAmount)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            A descontar no próximo holerite
          </span>
        </div>

        {/* Já Descontados em Folha */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
              Descontados na Folha
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-900 mt-2 font-mono">
            {formatCurrency(summary.discountedAmount)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {summary.uniqueEmployeesCount} colaboradores beneficiados
          </span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            Filtros de Apuração de Vales
          </h2>
          <span className="text-xs text-slate-500">
            Exibindo <strong>{filteredAdvances.length}</strong> de {advances.length} vales
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Busca por texto */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por colaborador, matrícula ou motivo..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Filtro por Mês de Competência */}
          <div>
            <select
              value={currentMonthFilter}
              onChange={(e) => setCurrentMonthFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
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
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
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
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="ALL">Todos os Status</option>
              <option value="PENDENTE_DESCONTO">⏳ Pendentes de Desconto</option>
              <option value="DESCONTADO_FOLHA">✅ Já Descontados em Folha</option>
              <option value="CANCELADO">❌ Cancelados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Vales Cadastrados */}
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
                {advances.length === 0
                  ? 'Não há adiantamentos em dinheiro registrados no sistema. Clique no botão abaixo para lançar o primeiro vale.'
                  : 'Nenhum adiantamento confere com os filtros de busca selecionados.'}
              </p>
            </div>
            {advances.length === 0 ? (
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Cadastrar Primeiro Vale</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setCurrentMonthFilter('ALL');
                  setSelectedEmployeeFilter('ALL');
                  setSelectedStatusFilter('ALL');
                  setSelectedMethodFilter('ALL');
                  setSearchTerm('');
                }}
                className="px-4 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
              >
                Limpar filtros de busca
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Data / Mês</th>
                  <th className="py-3 px-4">Colaborador</th>
                  <th className="py-3 px-4">Valor do Vale</th>
                  <th className="py-3 px-4">Forma de Pagamento</th>
                  <th className="py-3 px-4">Finalidade / Motivo</th>
                  <th className="py-3 px-4 text-center">Status Desconto</th>
                  <th className="py-3 px-4 text-center">Recibo</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdvances.map(adv => {
                  const emp = employees.find(e => e.id === adv.employeeId);
                  const isPending = adv.status === 'PENDENTE_DESCONTO';
                  const isDiscounted = adv.status === 'DESCONTADO_FOLHA';

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

                      {/* Valor do Vale */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-sm font-black font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          {formatCurrency(adv.amount)}
                        </span>
                      </td>

                      {/* Forma de Pagamento */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {adv.paymentMethod === 'DINHEIRO' && '💵 Dinheiro em Espécie'}
                          {adv.paymentMethod === 'PIX' && '⚡ Pix'}
                          {adv.paymentMethod === 'TRANSFERENCIA' && '🏦 Transferência'}
                          {adv.paymentMethod === 'CHEQUE' && '📝 Cheque'}
                          {adv.paymentMethod === 'OUTRO' && 'Outro'}
                        </span>
                      </td>

                      {/* Finalidade / Motivo */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-800 truncate" title={adv.reason}>
                          {adv.reason}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {adv.category.replace(/_/g, ' ')}
                          {adv.approvedBy ? ` • Lib: ${adv.approvedBy}` : ''}
                        </span>
                      </td>

                      {/* Status do Desconto */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(adv)}
                          title="Clique para alternar o status do desconto em folha"
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                            isPending
                              ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                              : isDiscounted
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          {isPending && <Clock className="w-3 h-3 text-amber-600" />}
                          {isDiscounted && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          <span>{isPending ? 'Pendente' : isDiscounted ? 'Descontado' : adv.status}</span>
                        </button>
                      </td>

                      {/* Recibo Assinado */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {adv.receiptSigned ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Assinado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                            Sem Recibo
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Imprimir Recibo */}
                          <button
                            onClick={() => setReceiptAdvance(adv)}
                            title="Visualizar e Imprimir Recibo de Vale"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4 text-slate-600 hover:text-indigo-600" />
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => handleOpenEditModal(adv)}
                            title="Editar informações do vale"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Excluir */}
                          <button
                            onClick={() => setAdvanceToDelete(adv)}
                            title="Excluir este vale"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-900">
                <tr>
                  <td colSpan={2} className="py-3 px-4 text-slate-600 uppercase text-[11px]">
                    Totais Filtrados ({filteredAdvances.length} registros)
                  </td>
                  <td className="py-3 px-4 font-mono font-black text-sm text-emerald-900">
                    {formatCurrency(summary.totalAmount)}
                  </td>
                  <td colSpan={5} className="py-3 px-4 text-right text-xs text-slate-500">
                    Pendentes: <strong className="text-amber-700 mr-3">{formatCurrency(summary.pendingAmount)}</strong>
                    Já Descontados: <strong className="text-emerald-700">{formatCurrency(summary.discountedAmount)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Cadastro e Edição */}
      {isAddEditModalOpen && (
        <AddEditAdvanceModal
          isOpen={isAddEditModalOpen}
          onClose={() => setIsAddEditModalOpen(false)}
          employees={employees}
          advanceToEdit={advanceToEdit}
          onSave={handleSaveModal}
        />
      )}

      {/* Modal de Impressão de Recibo */}
      {receiptAdvance && (
        <AdvanceReceiptModal
          isOpen={!!receiptAdvance}
          onClose={() => setReceiptAdvance(null)}
          advance={receiptAdvance}
          employee={employees.find(e => e.id === receiptAdvance.employeeId)}
          companySettings={companySettings}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      {advanceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Excluir Vale / Adiantamento
                </h3>
                <p className="text-xs text-slate-500">
                  Confirmação de remoção de lançamento
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Colaborador:</span>
                <strong className="text-slate-900">{advanceToDelete.employeeName}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Valor do Vale:</span>
                <strong className="text-emerald-800 font-mono">{formatCurrency(advanceToDelete.amount)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Data da Retirada:</span>
                <span className="font-medium text-slate-800">{advanceToDelete.date}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Forma de Pagamento:</span>
                <span className="font-medium text-slate-800">{advanceToDelete.paymentMethod}</span>
              </div>
            </div>

            <p className="text-xs text-rose-700">
              Tem certeza que deseja excluir este vale? O registro deixará de constar na apuração de descontos da folha de pagamento.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdvanceToDelete(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Excluir Vale</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
