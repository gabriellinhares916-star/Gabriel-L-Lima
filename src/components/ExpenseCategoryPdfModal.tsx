import React, { useState, useMemo } from 'react';
import { ExpenseRecord, ExpenseCategory, ExpenseCategorySummary } from '../types';
import { CompanySettings } from '../utils/companySettings';
import { EXPENSE_CATEGORIES_CONFIG, calculateCategorySummary } from '../utils/expenseStorage';
import {
  Printer,
  X,
  FileText,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingDown,
  Layers,
  ChevronDown,
  Receipt
} from 'lucide-react';

interface ExpenseCategoryPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: ExpenseCategory;
  onChangeCategory?: (cat: ExpenseCategory) => void;
  expenses: ExpenseRecord[];
  competenceMonthFilter?: string;
  companySettings?: CompanySettings;
}

function formatBRL(val: number): string {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBR(dateStr?: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export const ExpenseCategoryPdfModal: React.FC<ExpenseCategoryPdfModalProps> = ({
  isOpen,
  onClose,
  selectedCategory,
  onChangeCategory,
  expenses,
  competenceMonthFilter = 'ALL',
  companySettings,
}) => {
  const [logoLoadError, setLogoLoadError] = useState(false);
  const [currentCat, setCurrentCat] = useState<ExpenseCategory>(selectedCategory);

  // Sincroniza categoria quando prop mudar
  React.useEffect(() => {
    setCurrentCat(selectedCategory);
  }, [selectedCategory]);

  const handleCategoryChange = (newCat: ExpenseCategory) => {
    setCurrentCat(newCat);
    if (onChangeCategory) {
      onChangeCategory(newCat);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtragem das despesas da categoria respeitando o mês de competência se ativo
  const categoryExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchCat = exp.category === currentCat;
      const matchMonth =
        !competenceMonthFilter || competenceMonthFilter === 'ALL' || exp.competenceMonth === competenceMonthFilter;
      return matchCat && matchMonth;
    });
  }, [expenses, currentCat, competenceMonthFilter]);

  // Resumo global de todas as categorias para cálculo de representatividade
  const globalExpenses = useMemo(() => {
    return expenses.filter(exp => {
      return !competenceMonthFilter || competenceMonthFilter === 'ALL' || exp.competenceMonth === competenceMonthFilter;
    });
  }, [expenses, competenceMonthFilter]);

  const totalGlobalAmount = useMemo(() => {
    return globalExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  }, [globalExpenses]);

  // Métricas específicas da categoria selecionada
  const metrics = useMemo(() => {
    const totalAmount = categoryExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const paidAmount = categoryExpenses
      .filter(e => e.status === 'PAGA')
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const pendingAmount = categoryExpenses
      .filter(e => e.status === 'PENDENTE')
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const overdueAmount = categoryExpenses
      .filter(e => e.status === 'VENCIDA')
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    const count = categoryExpenses.length;
    const paidCount = categoryExpenses.filter(e => e.status === 'PAGA').length;
    const pendingCount = categoryExpenses.filter(e => e.status === 'PENDENTE').length;
    const overdueCount = categoryExpenses.filter(e => e.status === 'VENCIDA').length;

    const percentage = totalGlobalAmount > 0 ? (totalAmount / totalGlobalAmount) * 100 : 0;
    const ticketMedio = count > 0 ? totalAmount / count : 0;

    return {
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
      count,
      paidCount,
      pendingCount,
      overdueCount,
      percentage: Math.round(percentage * 10) / 10,
      ticketMedio,
    };
  }, [categoryExpenses, totalGlobalAmount]);

  const catConfig = EXPENSE_CATEGORIES_CONFIG[currentCat] || {
    label: currentCat,
    color: '#6366f1',
    description: 'Despesas da Categoria',
  };

  const categoriesList = Object.keys(EXPENSE_CATEGORIES_CONFIG) as ExpenseCategory[];

  const currentDateFormatted = useMemo(() => {
    const now = new Date();
    return `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-300 overflow-hidden my-auto print:max-w-none print:w-full print:border-none print:shadow-none print:rounded-none">
        {/* Barra de Ações Superior (Oculta na Impressão) */}
        <div className="bg-slate-900 text-white p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Relatório Financeiro em PDF</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300">
                  Visualização Prévia
                </span>
              </h3>
              <p className="text-slate-400 text-xs">
                Documento formatado pronto para impressão e salvamento em PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Seletor Rápido de Categoria na Barra Superior */}
            <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-700 text-xs">
              <span className="text-slate-400 text-[11px] font-semibold">Categoria:</span>
              <select
                value={currentCat}
                onChange={(e) => handleCategoryChange(e.target.value as ExpenseCategory)}
                className="bg-slate-900 text-white font-bold text-xs rounded-lg px-2 py-1 border border-slate-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-400 cursor-pointer"
              >
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>
                    {EXPENSE_CATEGORIES_CONFIG[cat]?.label || cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Botão de Disparo da Impressão / PDF */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            {/* Fechar */}
            <button
              onClick={onClose}
              title="Fechar"
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DOCUMENTO FORMATADO PARA IMPRESSÃO / PDF                                  */}
        {/* ========================================================================= */}
        <div className="p-6 sm:p-10 space-y-6 text-slate-900 bg-white print:p-6 print:m-0 print:space-y-4">
          
          {/* 1. CABEÇALHO CORPORATIVO OFICIAL */}
          <div className="border-b-2 border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              {companySettings?.logoUrl && !logoLoadError ? (
                <div className="w-16 h-16 rounded-xl border border-slate-300 p-1 flex items-center justify-center bg-white shrink-0 print:w-14 print:h-14">
                  <img
                    src={companySettings.logoUrl}
                    alt={companySettings.tradeName || 'Logo'}
                    referrerPolicy="no-referrer"
                    onError={() => setLogoLoadError(true)}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center text-sm print:border print:border-black shrink-0">
                  <Building2 className="w-7 h-7 text-indigo-400" />
                </div>
              )}

              <div>
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">
                  {companySettings?.tradeName || 'GESTÃO EMPRESARIAL INTEGRADA'}
                </span>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                  {companySettings?.name || 'EMPRESA DEMO LTDA'}
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  {companySettings?.cnpj && <span>CNPJ: <strong className="font-mono text-slate-800">{companySettings.cnpj}</strong></span>}
                  {companySettings?.cityState && <span> · {companySettings.cityState}</span>}
                  {companySettings?.phone && <span> · Tel: {companySettings.phone}</span>}
                </p>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  Departamento Financeiro & Contas a Pagar · Relatório Gerencial
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Tipo do Documento
              </span>
              <strong className="text-xs font-black text-slate-900 uppercase tracking-wide block">
                RELATÓRIO FINANCEIRO POR CATEGORIA
              </strong>
              <span className="text-[11px] text-slate-600 block mt-1">
                Emissão: <strong>{currentDateFormatted}</strong>
              </span>
              <span className="text-[11px] text-indigo-700 font-bold block">
                Competência: {competenceMonthFilter === 'ALL' ? 'Todas as Competências' : competenceMonthFilter}
              </span>
            </div>
          </div>

          {/* 2. IDENTIFICAÇÃO DA CATEGORIA SELECIONADA */}
          <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                style={{ backgroundColor: catConfig.color }}
              >
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                  Categoria de Despesa Analisada
                </span>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  {catConfig.label}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  {catConfig.description}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0 bg-white px-3 py-2 rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Participação nos Gastos
              </span>
              <span className="text-lg font-black font-mono text-indigo-700">
                {metrics.percentage}%
              </span>
              <span className="text-[10px] text-slate-500 block">
                do total da empresa
              </span>
            </div>
          </div>

          {/* 3. RESUMO FINANCEIRO EXECUTIVO (QUADRO DE METRICAS) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total da Categoria */}
            <div className="p-3.5 rounded-xl border border-slate-300 bg-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Total da Categoria
              </span>
              <div className="text-xl font-black font-mono text-slate-900 mt-1">
                {formatBRL(metrics.totalAmount)}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {metrics.count} {metrics.count === 1 ? 'conta apurada' : 'contas apuradas'}
              </span>
            </div>

            {/* Total Liquidado / Pago */}
            <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/50 print:bg-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                Total Já Pago
              </span>
              <div className="text-xl font-black font-mono text-emerald-700 mt-1">
                {formatBRL(metrics.paidAmount)}
              </div>
              <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                {metrics.paidCount} {metrics.paidCount === 1 ? 'quitada' : 'quitadas'} ({metrics.totalAmount > 0 ? Math.round((metrics.paidAmount / metrics.totalAmount) * 100) : 0}%)
              </span>
            </div>

            {/* Total Pendente a Pagar */}
            <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/50 print:bg-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                Pendente a Pagar
              </span>
              <div className="text-xl font-black font-mono text-amber-700 mt-1">
                {formatBRL(metrics.pendingAmount)}
              </div>
              <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                {metrics.pendingCount} a liquidar
              </span>
            </div>

            {/* Ticket Médio */}
            <div className="p-3.5 rounded-xl border border-slate-300 bg-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Ticket Médio
              </span>
              <div className="text-xl font-black font-mono text-slate-800 mt-1">
                {formatBRL(metrics.ticketMedio)}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                por documento
              </span>
            </div>
          </div>

          {/* 4. DEMONSTRATIVO ANALÍTICO DE CONTAS (TABELA FORMATADA) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                Demonstrativo Discriminado de Lançamentos ({categoryExpenses.length})
              </h3>
              <span className="text-[10px] text-slate-500">
                Moeda: Real Brasileiro (R$)
              </span>
            </div>

            {categoryExpenses.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                Nenhum lançamento registrado nesta categoria para a competência informada.
              </div>
            ) : (
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-300 font-bold text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Descrição da Despesa</th>
                      <th className="py-2.5 px-3">Favorecido / Fornecedor</th>
                      <th className="py-2.5 px-3">Doc / NF</th>
                      <th className="py-2.5 px-3">Vencimento</th>
                      <th className="py-2.5 px-3">Pagamento</th>
                      <th className="py-2.5 px-3">Forma</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {categoryExpenses.map((exp, idx) => {
                      const isPaid = exp.status === 'PAGA';
                      const isOverdue = exp.status === 'VENCIDA';

                      return (
                        <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2 px-3 text-slate-400 font-mono text-[10px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3">
                            <strong className="text-slate-900 block text-[11px] leading-tight">
                              {exp.description}
                            </strong>
                            {exp.notes && (
                              <span className="text-[10px] text-slate-500 italic block mt-0.5">
                                Obs: {exp.notes}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-700 text-[11px] max-w-[140px] truncate">
                            {exp.supplierOrBeneficiary || '-'}
                          </td>
                          <td className="py-2 px-3 font-mono text-[10px] text-slate-600">
                            {exp.documentNumber || '-'}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px]">
                            <span className={isOverdue ? 'text-rose-700 font-bold' : 'text-slate-800'}>
                              {formatDateBR(exp.dueDate)}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-[10px] text-slate-600">
                            {exp.paymentDate ? formatDateBR(exp.paymentDate) : '-'}
                          </td>
                          <td className="py-2 px-3 text-[10px] text-slate-600">
                            {exp.paymentMethod || '-'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                isPaid
                                  ? 'bg-emerald-100 text-emerald-800 print:border print:border-emerald-600'
                                  : isOverdue
                                  ? 'bg-rose-100 text-rose-800 print:border print:border-rose-600'
                                  : 'bg-amber-100 text-amber-800 print:border print:border-amber-600'
                              }`}
                            >
                              {isPaid ? 'PAGA' : isOverdue ? 'VENCIDA' : 'PENDENTE'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-slate-900 text-xs">
                            {formatBRL(exp.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Totalizador da Tabela */}
                  <tfoot className="bg-slate-100 border-t-2 border-slate-400 font-bold text-slate-900">
                    <tr>
                      <td colSpan={6} className="py-2.5 px-3 uppercase text-[10px] font-black">
                        Total da Categoria ({catConfig.label})
                      </td>
                      <td colSpan={2} className="py-2.5 px-3 text-right text-[10px] text-slate-500 uppercase">
                        {metrics.paidCount} Pagas · {metrics.pendingCount + metrics.overdueCount} Pendentes
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-slate-900">
                        {formatBRL(metrics.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* 5. TERMO DE HOMOLOGAÇÃO & ASSINATURAS */}
          <div className="pt-6 border-t border-slate-300 space-y-8 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] leading-relaxed">
              <strong className="text-slate-800">Termo de Conferência e Quitação:</strong> Declaramos para os devidos fins de controle fiscal, contábil e orçamentário que os valores discriminados acima representam fielmente os compromissos e quitações operacionais da respectiva categoria na data de emissão deste demonstrativo.
            </div>

            <div className="grid grid-cols-2 gap-8 pt-4">
              <div className="text-center">
                <div className="border-b border-slate-400 pb-1 mb-1.5 w-4/5 mx-auto" />
                <span className="font-bold text-slate-800 block text-xs">
                  Responsável Financeiro / Contabilidade
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {companySettings?.name || 'Gestão Financeira'}
                </span>
              </div>

              <div className="text-center">
                <div className="border-b border-slate-400 pb-1 mb-1.5 w-4/5 mx-auto" />
                <span className="font-bold text-slate-800 block text-xs">
                  Gerência Geral / Diretoria Executiva
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Visto e Homologação
                </span>
              </div>
            </div>

            {/* Rodapé com Informações Técnicas */}
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Gestor NF-e & Estoque · Módulo de Contas a Pagar</span>
              <span>Emissão: {currentDateFormatted} · Folha 1/1</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
