import React, { useState, useMemo } from 'react';
import { ExpenseRecord, ExpenseCategory, ExpenseCategorySummary } from '../types';
import { CompanySettings } from '../utils/companySettings';
import {
  EXPENSE_CATEGORIES_CONFIG,
  calculateCategorySummary,
  exportCategoryReportCSV
} from '../utils/expenseStorage';
import { ExpenseCategoryPdfModal } from './ExpenseCategoryPdfModal';
import {
  PieChart as PieChartIcon,
  BarChart3,
  FileSpreadsheet,
  Calendar,
  Filter,
  ArrowUpRight,
  TrendingDown,
  CheckCircle2,
  Clock,
  Layers,
  Building2,
  ChevronDown,
  ChevronUp,
  Tag,
  Printer
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

interface ExpensesCategoryReportProps {
  expenses: ExpenseRecord[];
  competenceMonthFilter: string;
  onChangeCompetenceFilter: (month: string) => void;
  availableMonths: string[];
  companySettings?: CompanySettings;
  onOpenPdfReport?: (cat: ExpenseCategory) => void;
}

function formatBRL(val: number): string {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const ExpensesCategoryReport: React.FC<ExpensesCategoryReportProps> = ({
  expenses,
  competenceMonthFilter,
  onChangeCompetenceFilter,
  availableMonths,
  companySettings,
  onOpenPdfReport,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAGA' | 'PENDENTE'>('ALL');
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [internalPdfCategory, setInternalPdfCategory] = useState<ExpenseCategory | null>(null);

  const handleOpenCategoryPdf = (cat: ExpenseCategory) => {
    if (onOpenPdfReport) {
      onOpenPdfReport(cat);
    } else {
      setInternalPdfCategory(cat);
    }
  };

  // Filtragem das despesas aplicadas ao relatório
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchMonth =
        competenceMonthFilter === 'ALL' || exp.competenceMonth === competenceMonthFilter;
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PAGA' && exp.status === 'PAGA') ||
        (statusFilter === 'PENDENTE' && exp.status !== 'PAGA' && exp.status !== 'CANCELADA');

      return matchMonth && matchStatus;
    });
  }, [expenses, competenceMonthFilter, statusFilter]);

  // Resumo por categoria
  const categorySummaries = useMemo(() => {
    return calculateCategorySummary(filteredExpenses);
  }, [filteredExpenses]);

  // Totais consolidados
  const totalAmountAll = useMemo(() => {
    return filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  const totalPaidAll = useMemo(() => {
    return filteredExpenses
      .filter(e => e.status === 'PAGA')
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  const totalPendingAll = useMemo(() => {
    return filteredExpenses
      .filter(e => e.status !== 'PAGA' && e.status !== 'CANCELADA')
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  // Categoria com maior impacto financeiro
  const topCategory = useMemo(() => {
    const active = categorySummaries.filter(s => s.totalAmount > 0);
    return active.length > 0 ? active[0] : null;
  }, [categorySummaries]);

  // Dados para o Gráfico de Pizza / Donut (somente categorias com valor > 0)
  const pieChartData = useMemo(() => {
    return categorySummaries
      .filter(s => s.totalAmount > 0)
      .map(s => ({
        name: s.label,
        value: s.totalAmount,
        color: s.color,
        category: s.category,
        percentage: s.percentage,
      }));
  }, [categorySummaries]);

  // Dados para o Gráfico de Barras (Top categorias)
  const barChartData = useMemo(() => {
    return categorySummaries
      .filter(s => s.totalAmount > 0)
      .slice(0, 8)
      .map(s => ({
        name: s.label.length > 16 ? s.label.substring(0, 14) + '...' : s.label,
        fullName: s.label,
        Pago: s.paidAmount,
        Pendente: s.pendingAmount,
        Total: s.totalAmount,
      }));
  }, [categorySummaries]);

  const handleExportCSV = () => {
    exportCategoryReportCSV(categorySummaries, competenceMonthFilter);
  };

  const toggleExpandCategory = (cat: string) => {
    setExpandedCategoryId(prev => (prev === cat ? null : cat));
  };

  return (
    <div className="space-y-6">
      {/* Header do Relatório */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold mb-2">
              <PieChartIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>Demonstrativo Gerencial de Custos Fixos & Operacionais</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Relatório de Despesas por Categoria
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Análise discriminada de gastos com aluguel, energia, manutenção predial, água, impostos e fornecedores.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleOpenCategoryPdf(topCategory?.category || 'ALUGUEL')}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
              title="Gerar e imprimir documento PDF formatado com o resumo da categoria"
            >
              <Printer className="w-4 h-4" />
              <span>Exportar Relatório</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar (CSV)</span>
            </button>
          </div>
        </div>

        {/* Filtros de Competência e Status do Relatório */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <Calendar className="w-4 h-4 text-slate-400 ml-1.5" />
              <label className="text-xs font-bold text-slate-600">Competência:</label>
              <select
                value={competenceMonthFilter}
                onChange={(e) => onChangeCompetenceFilter(e.target.value)}
                className="bg-white px-2.5 py-1 text-xs font-bold text-slate-800 border border-slate-300 rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">Todas as Competências</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>
                    {m} ({m === '2026-10' ? 'Outubro/2026' : m === '2026-09' ? 'Setembro/2026' : m})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <Filter className="w-4 h-4 text-slate-400 ml-1.5" />
              <label className="text-xs font-bold text-slate-600">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-white px-2.5 py-1 text-xs font-bold text-slate-800 border border-slate-300 rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">Todas as Despesas</option>
                <option value="PAGA">Apenas Pagas / Liquidadas</option>
                <option value="PENDENTE">Apenas Pendentes / A Vencer</option>
              </select>
            </div>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            {filteredExpenses.length} {filteredExpenses.length === 1 ? 'conta apurada' : 'contas apuradas'} no período
          </span>
        </div>
      </div>

      {/* KPI Cards do Relatório */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Geral de Despesas */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total de Despesas
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {formatBRL(totalAmountAll)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {filteredExpenses.length} despesas computadas
          </span>
        </div>

        {/* Total Liquidado / Pago */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Despesas Pagas
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2 font-mono">
            {formatBRL(totalPaidAll)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {totalAmountAll > 0 ? `${Math.round((totalPaidAll / totalAmountAll) * 100)}% liquidado` : '0%'}
          </span>
        </div>

        {/* Total a Pagar / Pendente */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Pendente a Pagar
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2 font-mono">
            {formatBRL(totalPendingAll)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Previsão de desembolso
          </span>
        </div>

        {/* Categoria Mais Impactante */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
              Maior Categoria
            </span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base font-black text-slate-900 mt-2 truncate" title={topCategory?.label}>
            {topCategory ? topCategory.label : 'N/D'}
          </div>
          <span className="text-[11px] text-purple-700 font-bold mt-0.5 block font-mono">
            {topCategory ? `${formatBRL(topCategory.totalAmount)} (${topCategory.percentage}%)` : '-'}
          </span>
        </div>
      </div>

      {/* Gráficos Recharts: Distribuição de Despesas por Categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Gráfico 1: Pizza / Donut (Participação %) - 5 colunas */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Participação por Categoria (%)
                </h3>
              </div>
              <span className="text-xs text-slate-400">Proporção</span>
            </div>

            {pieChartData.length === 0 ? (
              <div className="py-20 text-center text-xs text-slate-400">
                Sem despesas registradas no período selecionado.
              </div>
            ) : (
              <div className="h-64 sm:h-72 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [formatBRL(Number(val) || 0), 'Valor']}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        color: '#fff',
                        borderRadius: '0.75rem',
                        fontSize: '0.75rem',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Barras Comparativas Pago vs Pendente - 7 colunas */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Comparativo Pago vs Pendente por Categoria
                </h3>
              </div>
              <span className="text-xs text-slate-400">Montantes em R$</span>
            </div>

            {barChartData.length === 0 ? (
              <div className="py-20 text-center text-xs text-slate-400">
                Sem despesas registradas no período selecionado.
              </div>
            ) : (
              <div className="h-64 sm:h-72 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 15, right: 15, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `R$ ${val}`}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatBRL(Number(val) || 0)]}
                      labelFormatter={(label) => `Categoria: ${label}`}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        color: '#fff',
                        borderRadius: '0.75rem',
                        fontSize: '0.75rem',
                        border: 'none',
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                    />
                    <Bar dataKey="Pago" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Pendente" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grade de Cards Detalhados por Categoria */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
          Detalhamento por Centro de Custo / Categoria
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categorySummaries.map(catSummary => {
            const config = EXPENSE_CATEGORIES_CONFIG[catSummary.category];
            const hasExpenses = catSummary.count > 0;
            const avg = catSummary.count > 0 ? catSummary.totalAmount / catSummary.count : 0;
            const isExpanded = expandedCategoryId === catSummary.category;
            const catExpenses = filteredExpenses.filter(e => e.category === catSummary.category);

            return (
              <div
                key={catSummary.category}
                className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between ${
                  hasExpenses ? 'border-slate-200' : 'border-slate-100 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: config.color }}
                      />
                      <h4 className="font-black text-slate-900 text-sm">
                        {catSummary.label}
                      </h4>
                    </div>
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {catSummary.percentage}%
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                    {config.description}
                  </p>

                  {/* Valor Total */}
                  <div className="mt-3">
                    <div className="text-2xl font-black font-mono text-slate-900">
                      {formatBRL(catSummary.totalAmount)}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center justify-between">
                      <span>{catSummary.count} {catSummary.count === 1 ? 'conta' : 'contas'}</span>
                      <span>Média: <strong>{formatBRL(avg)}</strong></span>
                    </div>
                  </div>

                  {/* Barra de Progresso de Participação */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(4, catSummary.percentage))}%`,
                        backgroundColor: config.color,
                      }}
                    />
                  </div>

                  {/* Quebra: Pago vs Pendente */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Pago</span>
                      <span className="font-bold text-emerald-700 font-mono">
                        {formatBRL(catSummary.paidAmount)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Pendente</span>
                      <span className="font-bold text-amber-700 font-mono">
                        {formatBRL(catSummary.pendingAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ações da Categoria */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenCategoryPdf(catSummary.category)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer"
                    title={`Exportar Relatório PDF formatado de ${catSummary.label}`}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Exportar Relatório</span>
                  </button>

                  {hasExpenses && (
                    <button
                      type="button"
                      onClick={() => toggleExpandCategory(catSummary.category)}
                      className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
                    >
                      <span>{isExpanded ? 'Ocultar Contas' : 'Ver Contas'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {/* Lista expandida de despesas individuais da categoria */}
                {hasExpenses && isExpanded && (
                  <div className="mt-2.5 space-y-1.5 text-xs border-t border-slate-100 pt-2">
                    {catExpenses.map(exp => (
                      <div
                        key={exp.id}
                        className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100/80 transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="truncate">
                          <strong className="block text-slate-800 text-[11px] truncate">
                            {exp.description}
                          </strong>
                          <span className="text-[10px] text-slate-400">
                            Venc: {exp.dueDate.split('-').reverse().join('/')}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-[11px] text-slate-900 block">
                            {formatBRL(exp.amount)}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                              exp.status === 'PAGA'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {exp.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabela Sintética Completa por Categoria */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Tabela Sintética de Despesas por Categoria
            </h3>
          </div>
          <button
            onClick={handleExportCSV}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
          >
            Baixar Planilha CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Categoria de Despesa</th>
                <th className="py-3 px-4">Total Gasto</th>
                <th className="py-3 px-4">Total Pago</th>
                <th className="py-3 px-4">Total Pendente</th>
                <th className="py-3 px-4 text-center">Participação (%)</th>
                <th className="py-3 px-4 text-center">Nº Contas</th>
                <th className="py-3 px-4 text-right">Ticket Médio</th>
                <th className="py-3 px-4 text-center">Relatório PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categorySummaries.map(cat => {
                const avg = cat.count > 0 ? cat.totalAmount / cat.count : 0;
                return (
                  <tr key={cat.category} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <strong className="text-slate-900">{cat.label}</strong>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-black text-slate-900 whitespace-nowrap">
                      {formatBRL(cat.totalAmount)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700 whitespace-nowrap">
                      {formatBRL(cat.paidAmount)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-700 whitespace-nowrap">
                      {formatBRL(cat.pendingAmount)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                      {cat.percentage}%
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600 whitespace-nowrap">
                      {cat.count}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700 whitespace-nowrap">
                      {formatBRL(avg)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenCategoryPdf(cat.category)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title={`Exportar Relatório PDF formatado de ${cat.label}`}
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Exportar Relatório</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
              <tr>
                <td className="py-3.5 px-4 uppercase text-[11px] font-black">
                  Total Consolidado
                </td>
                <td className="py-3.5 px-4 font-mono font-black text-sm text-slate-900">
                  {formatBRL(totalAmountAll)}
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">
                  {formatBRL(totalPaidAll)}
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-amber-800">
                  {formatBRL(totalPendingAll)}
                </td>
                <td className="py-3.5 px-4 text-center font-mono font-black">
                  100%
                </td>
                <td className="py-3.5 px-4 text-center font-mono">
                  {filteredExpenses.length}
                </td>
                <td className="py-3.5 px-4 text-right font-mono">
                  {filteredExpenses.length > 0 ? formatBRL(totalAmountAll / filteredExpenses.length) : '-'}
                </td>
                <td className="py-3.5 px-4 text-center font-mono text-[11px] text-slate-400">
                  -
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal de Exportação do Relatório PDF */}
      {internalPdfCategory && (
        <ExpenseCategoryPdfModal
          isOpen={!!internalPdfCategory}
          onClose={() => setInternalPdfCategory(null)}
          selectedCategory={internalPdfCategory}
          onChangeCategory={(cat) => setInternalPdfCategory(cat)}
          expenses={expenses}
          competenceMonthFilter={competenceMonthFilter}
          companySettings={companySettings}
        />
      )}

    </div>
  );
};
