import React, { useState, useMemo } from 'react';
import { Product, StockMovement, Invoice, BillingRecord } from '../types';
import { getStoredCompanySettings } from '../utils/companySettings';
import { getStoredBillings } from '../utils/billingStorage';
import {
  generateMonthlyReport,
  formatBRL,
  formatNumberBR,
  formatDateBR,
  MONTH_NAMES_PT
} from '../utils/stockCalculations';
import {
  exportMonthlyReportProductsCSV,
  exportMonthlySuppliersCSV,
  exportMonthlyCfopCSV,
  exportMonthlyTopMovedCSV
} from '../utils/csvExport';
import {
  FileBarChart,
  Printer,
  Download,
  Calendar,
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Building2,
  PieChart,
  Package,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  FileText,
  DollarSign,
  Gauge,
  Wrench,
  User,
  Award,
  Layers,
  CheckCircle2
} from 'lucide-react';

interface MonthlyReportViewProps {
  products: Product[];
  movements: StockMovement[];
  invoices: Invoice[];
  billings?: BillingRecord[];
}

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  products,
  movements,
  invoices,
  billings,
}) => {
  // Mês e ano inicial baseado na data local atual (2026-09 ou 2026-10)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(9); // Setembro
  const [activeTab, setActiveTab] = useState<'products' | 'billing' | 'suppliers' | 'cfop' | 'top'>('products');

  // Gerar relatório de estoque automaticamente sempre que os dados ou mês mudarem
  const companySettings = useMemo(() => getStoredCompanySettings(), []);
  const [logoError, setLogoError] = useState(false);

  const report = useMemo(() => {
    return generateMonthlyReport(selectedMonth, selectedYear, products, movements, invoices);
  }, [selectedMonth, selectedYear, products, movements, invoices]);

  // Faturamentos correspondentes ao mês/ano selecionado
  const monthKey = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;
  const monthBillings = useMemo(() => {
    const list = billings && billings.length > 0 ? billings : getStoredBillings();
    return list.filter(b => b.date && b.date.startsWith(monthKey));
  }, [billings, monthKey]);

  // Métricas de faturamento do mês
  const billingMetrics = useMemo(() => {
    let grandTotal = 0;
    let productsTotal = 0;
    let alignmentBalancingTotal = 0;
    let servicesTotal = 0;
    const collabMap = new Map<string, {
      name: string;
      osCount: number;
      productsTotal: number;
      alignmentBalancingTotal: number;
      servicesTotal: number;
      grandTotal: number;
    }>();

    monthBillings.forEach(b => {
      const g = Number(b.grandTotal) || 0;
      const p = Number(b.productsTotal) || 0;
      const a = Number(b.alignmentBalancingTotal) || 0;
      const s = Number(b.servicesTotal) || 0;

      grandTotal += g;
      productsTotal += p;
      alignmentBalancingTotal += a;
      servicesTotal += s;

      const cName = b.collaboratorName && b.collaboratorName.trim() ? b.collaboratorName.trim() : 'Não informado';
      const cItem = collabMap.get(cName) || {
        name: cName,
        osCount: 0,
        productsTotal: 0,
        alignmentBalancingTotal: 0,
        servicesTotal: 0,
        grandTotal: 0,
      };

      cItem.osCount += 1;
      cItem.productsTotal += p;
      cItem.alignmentBalancingTotal += a;
      cItem.servicesTotal += s;
      cItem.grandTotal += g;
      collabMap.set(cName, cItem);
    });

    const osCount = monthBillings.length;
    const averageTicket = osCount > 0 ? grandTotal / osCount : 0;
    const topCollabs = Array.from(collabMap.values()).sort((a, b) => b.grandTotal - a.grandTotal);

    return {
      grandTotal,
      productsTotal,
      alignmentBalancingTotal,
      servicesTotal,
      osCount,
      averageTicket,
      topCollabs,
    };
  }, [monthBillings]);

  // Navegação de mês
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  // Exportar para CSV da visão ativa ou do balanço físico
  const handleExportActiveTabCSV = () => {
    if (activeTab === 'products') {
      exportMonthlyReportProductsCSV(report);
    } else if (activeTab === 'suppliers') {
      exportMonthlySuppliersCSV(report);
    } else if (activeTab === 'cfop') {
      exportMonthlyCfopCSV(report);
    } else if (activeTab === 'top') {
      exportMonthlyTopMovedCSV(report);
    }
  };

  const handleExportAllTablesCSV = () => {
    exportMonthlyReportProductsCSV(report);
    if (report.supplierBreakdown.length > 0) {
      setTimeout(() => exportMonthlySuppliersCSV(report), 200);
    }
    if (report.cfopBreakdown.length > 0) {
      setTimeout(() => exportMonthlyCfopCSV(report), 400);
    }
  };

  // Geração de PDF via window.print() formatado com CSS de impressão
  const handleExportPDF = () => {
    window.print();
  };

  // Cálculo da variação percentual do inventário
  const inventoryDelta = report.finalInventoryValue - report.initialInventoryValue;
  const inventoryDeltaPercent = report.initialInventoryValue > 0
    ? ((inventoryDelta / report.initialInventoryValue) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Controls Bar - Oculto na Impressão via print:hidden */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-indigo-600" />
            Relatório de Movimentação & Faturamento Mensal
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Balanço físico-financeiro de estoque, entradas de NF-e, valoração por custo médio e receitas de Ordens de Serviço (OS).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Mês e Ano */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-3 text-xs font-bold text-slate-800 flex items-center gap-1.5 min-w-[140px] justify-center">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                {MONTH_NAMES_PT[selectedMonth - 1]} / {selectedYear}
              </span>
            </div>

            <button
              onClick={handleNextMonth}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportActiveTabCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
              title="Exportar planilha CSV da aba atual"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handleExportAllTablesCSV}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
              title="Baixar todas as tabelas mensais (Produtos, Fornecedores e CFOPs)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Pacote Completo (CSV)</span>
            </button>

            {/* Botão Exportar PDF solicitado utilizando window.print() */}
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-98 rounded-lg transition-all shadow-xs cursor-pointer print:hidden"
              title="Gerar e salvar relatório formatado de movimentações e faturamento em PDF (window.print)"
            >
              <FileText className="w-4 h-4 text-white" />
              <span>Exportar PDF</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors shadow-2xs cursor-pointer print:hidden"
              title="Imprimir relatório"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </div>

      {/* CABEÇALHO DO RELATÓRIO (Visível na impressão e na tela) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6 print:border-none print:p-0 print:shadow-none">
        
        {/* Document Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
          <div className="flex items-center gap-3.5">
            {companySettings?.logoUrl && !logoError ? (
              <div className="w-14 h-14 rounded-xl border border-slate-200 p-1 flex items-center justify-center bg-white shrink-0">
                <img
                  src={companySettings.logoUrl}
                  alt={companySettings.tradeName}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : null}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-600">
                  {companySettings?.tradeName || 'LORD LUB • Troca de Óleo & Centro Automotivo'}
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {companySettings?.cnpj || '12.345.678/0001-90'}
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mt-0.5">
                Demonstrativo Mensal Integrado: Movimentações de Estoque & Faturamento de OS
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Empresa: <strong className="text-slate-800">{companySettings?.name || 'LORD LUB SERVICOS AUTOMOTIVOS LTDA'}</strong> • Competência: <strong className="text-slate-800">{report.monthName}</strong> • Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs space-y-1">
            <span className="px-2.5 py-1 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block font-mono">
              {report.totalInvoicesCount} NF-e de Entrada
            </span>
            <span className="px-2.5 py-1 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block font-mono ml-2">
              {billingMetrics.osCount} OS Faturadas
            </span>
          </div>
        </div>

        {/* Quadro 1: Balanço Físico-Financeiro de Estoque */}
        <div>
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-indigo-600" />
              1. Balanço Físico-Financeiro de Estoque
            </span>
            <span className="text-[11px] text-slate-500">Valoração Contábil a Custo Médio</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Estoque Inicial (01/{selectedMonth.toString().padStart(2, '0')})
              </span>
              <div className="text-base font-bold text-slate-900 mt-1 font-mono">
                {formatBRL(report.initialInventoryValue)}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Posição no início do mês</span>
            </div>

            <div className="p-3.5 bg-emerald-50/70 rounded-lg border border-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-700 flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5" /> Entradas no Mês (+)
              </span>
              <div className="text-base font-bold text-emerald-800 mt-1 font-mono">
                {formatBRL(report.totalIncomingValue)}
              </div>
              <span className="text-[10px] text-emerald-600 block mt-0.5">
                +{report.totalIncomingItemsCount} un • {report.totalInvoicesCount} NFs
              </span>
            </div>

            <div className="p-3.5 bg-rose-50/70 rounded-lg border border-rose-200">
              <span className="text-[10px] uppercase font-bold text-rose-700 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> Saídas no Mês (-)
              </span>
              <div className="text-base font-bold text-rose-800 mt-1 font-mono">
                {formatBRL(report.totalOutgoingValue)}
              </div>
              <span className="text-[10px] text-rose-600 block mt-0.5">
                -{report.totalOutgoingItemsCount} un (Vendas & Consumo)
              </span>
            </div>

            <div className="p-3.5 bg-indigo-50/70 rounded-lg border border-indigo-200">
              <span className="text-[10px] uppercase font-bold text-indigo-700 block">
                Estoque Final (Posição Final)
              </span>
              <div className="text-base font-bold text-indigo-950 mt-1 font-mono">
                {formatBRL(report.finalInventoryValue)}
              </div>
              <span className="text-[10px] text-indigo-700 block mt-0.5 font-mono">
                Variação: {inventoryDelta >= 0 ? '+' : ''}{formatBRL(inventoryDelta)} ({inventoryDeltaPercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Quadro 2: Demonstrativo de Faturamento de Ordens de Serviço (OS) */}
        <div>
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-emerald-600" />
              2. Faturamento de Ordens de Serviço (OS)
            </span>
            <span className="text-[11px] text-slate-500">
              {billingMetrics.osCount} {billingMetrics.osCount === 1 ? 'OS faturada' : 'OS faturadas'} • Ticket Médio: <strong className="font-mono text-slate-700">{formatBRL(billingMetrics.averageTicket)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-900 text-white rounded-lg border border-slate-800 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-300 block">
                Faturamento Bruto Total
              </span>
              <div className="text-lg font-black font-mono text-emerald-400 mt-1">
                {formatBRL(billingMetrics.grandTotal)}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Receita consolidada do período
              </span>
            </div>

            <div className="p-3.5 bg-blue-50/70 rounded-lg border border-blue-200">
              <span className="text-[10px] uppercase font-bold text-blue-700 block">
                Venda de Peças & Produtos
              </span>
              <div className="text-base font-bold text-blue-800 mt-1 font-mono">
                {formatBRL(billingMetrics.productsTotal)}
              </div>
              <span className="text-[10px] text-blue-600 block mt-0.5">
                {billingMetrics.grandTotal > 0 ? ((billingMetrics.productsTotal / billingMetrics.grandTotal) * 100).toFixed(1) : 0}% da receita
              </span>
            </div>

            <div className="p-3.5 bg-emerald-50/70 rounded-lg border border-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                Alinhamento & Balanceamento
              </span>
              <div className="text-base font-bold text-emerald-800 mt-1 font-mono">
                {formatBRL(billingMetrics.alignmentBalancingTotal)}
              </div>
              <span className="text-[10px] text-emerald-600 block mt-0.5">
                {billingMetrics.grandTotal > 0 ? ((billingMetrics.alignmentBalancingTotal / billingMetrics.grandTotal) * 100).toFixed(1) : 0}% da receita
              </span>
            </div>

            <div className="p-3.5 bg-amber-50/70 rounded-lg border border-amber-200">
              <span className="text-[10px] uppercase font-bold text-amber-700 block">
                Mão de Obra Mecânica / Serviços
              </span>
              <div className="text-base font-bold text-amber-800 mt-1 font-mono">
                {formatBRL(billingMetrics.servicesTotal)}
              </div>
              <span className="text-[10px] text-amber-600 block mt-0.5">
                {billingMetrics.grandTotal > 0 ? ((billingMetrics.servicesTotal / billingMetrics.grandTotal) * 100).toFixed(1) : 0}% da receita
              </span>
            </div>
          </div>
        </div>

        {/* Abas de Navegação Analítica - Oculto na Impressão via print:hidden */}
        <div className="flex border-b border-slate-200 print:hidden overflow-x-auto">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 cursor-pointer ${
              activeTab === 'products'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Movimentação por Produto ({report.productSummaries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('billing')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 cursor-pointer ${
              activeTab === 'billing'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Faturamento de OS ({billingMetrics.osCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 cursor-pointer ${
              activeTab === 'suppliers'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Compras por Fornecedor ({report.supplierBreakdown.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('cfop')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 cursor-pointer ${
              activeTab === 'cfop'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Operações por CFOP ({report.cfopBreakdown.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('top')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 cursor-pointer ${
              activeTab === 'top'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Top Movimentados</span>
          </button>
        </div>

        {/* ======================================================= */}
        {/* SEÇÃO 1: TABELA POR PRODUTO (Visível na impressão)     */}
        {/* ======================================================= */}
        <div className={`space-y-3 ${activeTab !== 'products' ? 'hidden print:block' : ''}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Movimentação Físico-Financeira Detalhada por Item
              </h3>
              <span className="text-[11px] text-slate-500">
                Valores expressos em Reais (R$) calculados a Custo Médio Ponderado Móvel
              </span>
            </div>
            <button
              onClick={() => exportMonthlyReportProductsCSV(report)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors shadow-2xs self-start sm:self-auto print:hidden cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar Tabela de Itens (CSV)</span>
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto print:border-slate-300">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 print:bg-slate-200 print:text-black">
                <tr>
                  <th className="p-2.5">Código</th>
                  <th className="p-2.5">Descrição do Produto</th>
                  <th className="p-2.5 text-center">UN</th>
                  <th className="p-2.5 text-right">Estoque Inicial</th>
                  <th className="p-2.5 text-right bg-emerald-50/50 text-emerald-800 print:bg-transparent print:text-black">Entradas (Qtd)</th>
                  <th className="p-2.5 text-right bg-emerald-50/50 text-emerald-800 print:bg-transparent print:text-black">Entradas (R$)</th>
                  <th className="p-2.5 text-right bg-rose-50/50 text-rose-800 print:bg-transparent print:text-black">Saídas (Qtd)</th>
                  <th className="p-2.5 text-right bg-rose-50/50 text-rose-800 print:bg-transparent print:text-black">Saídas (R$)</th>
                  <th className="p-2.5 text-right bg-slate-50 font-bold print:bg-transparent">Estoque Final</th>
                  <th className="p-2.5 text-right bg-slate-50 font-bold print:bg-transparent">Valor Final (R$)</th>
                  <th className="p-2.5 text-right">Custo Médio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                {report.productSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400">
                      Nenhuma movimentação registrada no mês de {report.monthName}.
                    </td>
                  </tr>
                ) : (
                  report.productSummaries.map((p) => (
                    <tr key={p.productId} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 font-mono text-slate-600">{p.code}</td>
                      <td className="p-2.5 font-medium text-slate-900">{p.name}</td>
                      <td className="p-2.5 text-center font-semibold text-slate-600">{p.unit}</td>
                      <td className="p-2.5 text-right text-slate-600">{p.initialStock}</td>
                      <td className="p-2.5 text-right font-semibold text-emerald-600 bg-emerald-50/30 print:bg-transparent print:text-black">
                        {p.incomingQty > 0 ? `+${p.incomingQty}` : '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono text-emerald-700 bg-emerald-50/30 print:bg-transparent print:text-black">
                        {p.incomingValue > 0 ? formatBRL(p.incomingValue) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-semibold text-rose-600 bg-rose-50/30 print:bg-transparent print:text-black">
                        {p.outgoingQty > 0 ? `-${p.outgoingQty}` : '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono text-rose-700 bg-rose-50/30 print:bg-transparent print:text-black">
                        {p.outgoingValue > 0 ? formatBRL(p.outgoingValue) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900 bg-slate-50/60 print:bg-transparent">
                        {p.finalStock}
                      </td>
                      <td className="p-2.5 text-right font-bold font-mono text-indigo-950 bg-slate-50/60 print:bg-transparent print:text-black">
                        {formatBRL(p.finalValue)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-600">
                        {formatBRL(p.averageUnitCost)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-100/80 font-bold text-slate-900 border-t border-slate-200 print:bg-slate-100">
                <tr>
                  <td colSpan={3} className="p-2.5 text-right uppercase text-[11px] text-slate-600">
                    Total Geral do Estoque:
                  </td>
                  <td className="p-2.5 text-right font-mono">
                    {formatBRL(report.initialInventoryValue)}
                  </td>
                  <td className="p-2.5 text-right text-emerald-700">
                    +{report.totalIncomingItemsCount}
                  </td>
                  <td className="p-2.5 text-right font-mono text-emerald-700">
                    {formatBRL(report.totalIncomingValue)}
                  </td>
                  <td className="p-2.5 text-right text-rose-700">
                    -{report.totalOutgoingItemsCount}
                  </td>
                  <td className="p-2.5 text-right font-mono text-rose-700">
                    {formatBRL(report.totalOutgoingValue)}
                  </td>
                  <td className="p-2.5 text-right font-bold">
                    {report.productSummaries.reduce((acc, curr) => acc + curr.finalStock, 0)} un
                  </td>
                  <td className="p-2.5 text-right font-mono font-black text-indigo-950 print:text-black">
                    {formatBRL(report.finalInventoryValue)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ======================================================= */}
        {/* SEÇÃO 2: FATURAMENTO DE ORDENS DE SERVIÇO (OS)          */}
        {/* ======================================================= */}
        <div className={`space-y-4 ${activeTab !== 'billing' ? 'hidden print:block' : ''} print:break-before-page`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t print:border-slate-300 pt-4">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Demonstrativo Detalhado de Faturamento de Ordens de Serviço (OS)
              </h3>
              <span className="text-[11px] text-slate-500">
                Ordens faturadas na competência com discriminação de Peças, Alinhamento & Balanceamento e Serviços Gerais
              </span>
            </div>
            <div className="text-right text-xs">
              <span className="font-bold text-slate-700 font-mono">
                Total Faturado no Mês: {formatBRL(billingMetrics.grandTotal)}
              </span>
            </div>
          </div>

          {/* Tabela de OS Faturadas */}
          <div className="border border-slate-200 rounded-lg overflow-x-auto print:border-slate-300">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 print:bg-slate-200 print:text-black">
                <tr>
                  <th className="p-2.5">Nº OS</th>
                  <th className="p-2.5">Data</th>
                  <th className="p-2.5">Colaborador / Mecânico</th>
                  <th className="p-2.5">Cliente</th>
                  <th className="p-2.5">Veículo / Placa</th>
                  <th className="p-2.5 text-right">Peças (R$)</th>
                  <th className="p-2.5 text-right">Alinhamento (R$)</th>
                  <th className="p-2.5 text-right">Serviços (R$)</th>
                  <th className="p-2.5 text-right font-bold">Total OS (R$)</th>
                  <th className="p-2.5 text-center">Pagamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                {monthBillings.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      Nenhum faturamento de Ordem de Serviço registrado no mês de {report.monthName}.
                    </td>
                  </tr>
                ) : (
                  monthBillings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 font-mono font-bold text-indigo-700 print:text-black">
                        {b.serviceOrderNumber}
                      </td>
                      <td className="p-2.5 font-mono text-slate-600">
                        {formatDateBR(b.date)}
                      </td>
                      <td className="p-2.5 font-medium text-slate-900">
                        {b.collaboratorName || 'Não informado'}
                      </td>
                      <td className="p-2.5 text-slate-800 truncate max-w-[150px]">
                        {b.customerName || 'Balcão'}
                      </td>
                      <td className="p-2.5 text-slate-600">
                        {b.vehicleModel ? `${b.vehicleModel} (${b.vehiclePlate || '-'})` : (b.vehiclePlate || '-')}
                      </td>
                      <td className="p-2.5 text-right font-mono text-blue-700 print:text-black">
                        {formatBRL(b.productsTotal)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-emerald-700 print:text-black">
                        {formatBRL(b.alignmentBalancingTotal)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-amber-700 print:text-black">
                        {formatBRL(b.servicesTotal)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-extrabold text-slate-900 print:text-black">
                        {formatBRL(b.grandTotal)}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 print:border-none">
                          {b.paymentMethod || 'PIX'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-100/80 font-bold text-slate-900 border-t border-slate-200 print:bg-slate-100">
                <tr>
                  <td colSpan={5} className="p-2.5 text-right uppercase text-[11px] text-slate-600">
                    Total Faturado no Mês ({billingMetrics.osCount} Ordens de Serviço):
                  </td>
                  <td className="p-2.5 text-right font-mono text-blue-700 print:text-black">
                    {formatBRL(billingMetrics.productsTotal)}
                  </td>
                  <td className="p-2.5 text-right font-mono text-emerald-700 print:text-black">
                    {formatBRL(billingMetrics.alignmentBalancingTotal)}
                  </td>
                  <td className="p-2.5 text-right font-mono text-amber-700 print:text-black">
                    {formatBRL(billingMetrics.servicesTotal)}
                  </td>
                  <td className="p-2.5 text-right font-mono font-black text-slate-900 text-sm print:text-black">
                    {formatBRL(billingMetrics.grandTotal)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Resumo por Colaborador do Mês */}
          {billingMetrics.topCollabs.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                Desempenho por Colaborador no Mês
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {billingMetrics.topCollabs.map((collab, idx) => (
                  <div key={collab.name} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 truncate">
                        #{idx + 1} {collab.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {collab.osCount} {collab.osCount === 1 ? 'OS' : 'OSs'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-mono font-bold text-slate-800">
                      <span>Total:</span>
                      <span className="text-indigo-700 print:text-black">{formatBRL(collab.grandTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 border-t border-slate-200">
                      <span>Peças: {formatBRL(collab.productsTotal)}</span>
                      <span>Serviços: {formatBRL(collab.servicesTotal + collab.alignmentBalancingTotal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ======================================================= */}
        {/* SEÇÃO 3: COMPRAS POR FORNECEDOR                         */}
        {/* ======================================================= */}
        <div className={`space-y-3 ${activeTab !== 'suppliers' ? 'hidden' : ''}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Entradas Agrupadas por Fornecedor (NF-e)
              </h3>
              <span className="text-[11px] text-slate-500">
                Origem das compras registradas e volumes de aquisição
              </span>
            </div>
            {report.supplierBreakdown.length > 0 && (
              <button
                onClick={() => exportMonthlySuppliersCSV(report)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors shadow-2xs self-start sm:self-auto print:hidden cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Exportar Fornecedores (CSV)</span>
              </button>
            )}
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Razão Social do Fornecedor</th>
                  <th className="p-2.5">CNPJ</th>
                  <th className="p-2.5 text-center">Qtd de NF-e</th>
                  <th className="p-2.5 text-right">Valor Total Comprado (R$)</th>
                  <th className="p-2.5 text-right">% do Total de Compras</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.supplierBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Nenhuma nota fiscal de entrada registrada neste mês.
                    </td>
                  </tr>
                ) : (
                  report.supplierBreakdown.map((s) => (
                    <tr key={s.cnpj} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 font-medium text-slate-900">{s.supplierName}</td>
                      <td className="p-2.5 font-mono text-slate-600">{s.cnpj}</td>
                      <td className="p-2.5 text-center font-bold text-slate-700">{s.invoicesCount}</td>
                      <td className="p-2.5 text-right font-mono font-semibold text-emerald-800">
                        {formatBRL(s.totalValue)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-600">
                        {report.totalIncomingValue > 0
                          ? ((s.totalValue / report.totalIncomingValue) * 100).toFixed(1)
                          : 0}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ======================================================= */}
        {/* SEÇÃO 4: OPERAÇÕES POR CFOP                             */}
        {/* ======================================================= */}
        <div className={`space-y-3 ${activeTab !== 'cfop' ? 'hidden' : ''}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Apuração Fiscal de Entradas por CFOP
              </h3>
              <span className="text-[11px] text-slate-500">
                Natureza das operações fiscais tributadas e com substituição tributária (ST)
              </span>
            </div>
            {report.cfopBreakdown.length > 0 && (
              <button
                onClick={() => exportMonthlyCfopCSV(report)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors shadow-2xs self-start sm:self-auto print:hidden cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Exportar CFOPs (CSV)</span>
              </button>
            )}
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">CFOP</th>
                  <th className="p-2.5">Descrição Fiscal da Operação</th>
                  <th className="p-2.5 text-center">Itens Fiscais</th>
                  <th className="p-2.5 text-right">Valor Contábil (R$)</th>
                  <th className="p-2.5 text-right">% do Volume de Entradas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.cfopBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Nenhum lançamento de CFOP encontrado neste mês.
                    </td>
                  </tr>
                ) : (
                  report.cfopBreakdown.map((c) => (
                    <tr key={c.cfop} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 font-mono font-bold text-indigo-700">{c.cfop}</td>
                      <td className="p-2.5 text-slate-800">{c.description}</td>
                      <td className="p-2.5 text-center font-bold text-slate-700">{c.itemsCount}</td>
                      <td className="p-2.5 text-right font-mono font-semibold text-slate-900">
                        {formatBRL(c.totalValue)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-600">
                        {report.totalIncomingValue > 0
                          ? ((c.totalValue / report.totalIncomingValue) * 100).toFixed(1)
                          : 0}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ======================================================= */}
        {/* SEÇÃO 5: TOP MOVIMENTADOS                               */}
        {/* ======================================================= */}
        <div className={`space-y-3 ${activeTab !== 'top' ? 'hidden' : ''}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Top 10 Itens com Maior Giro no Mês
              </h3>
              <span className="text-[11px] text-slate-500">
                Produtos com maior soma de entradas e saídas no período
              </span>
            </div>
            {report.topMovedProducts.length > 0 && (
              <button
                onClick={() => exportMonthlyTopMovedCSV(report)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors shadow-2xs self-start sm:self-auto print:hidden cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Exportar Top Giro (CSV)</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {report.topMovedProducts.length === 0 ? (
              <div className="col-span-2 p-6 text-center text-slate-400 border border-slate-200 rounded-lg">
                Nenhum produto movimentado neste mês.
              </div>
            ) : (
              report.topMovedProducts.map((item, idx) => (
                <div key={item.productId} className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 text-xs truncate max-w-[200px]" title={item.name}>
                      {idx + 1}. {item.name}
                    </span>
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      Fluxo Total: {item.totalFlow} un
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-emerald-50 p-2 rounded border border-emerald-200 text-emerald-800">
                      <span className="text-[10px] text-emerald-600 block font-semibold">Entradas</span>
                      <span className="font-bold">+{item.incomingQty} un</span>
                    </div>
                    <div className="bg-rose-50 p-2 rounded border border-rose-200 text-rose-800">
                      <span className="text-[10px] text-rose-600 block font-semibold">Saídas</span>
                      <span className="font-bold">-{item.outgoingQty} un</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bloco de Assinaturas e Fechamento Contábil (Visível apenas na impressão) */}
        <div className="hidden print:block pt-10 mt-10 border-t border-slate-300 text-xs">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="border-t border-slate-900 pt-2 font-semibold text-slate-900">
                Responsável pelo Almoxarifado / Estoque
              </div>
              <div className="text-[10px] text-slate-500">Conferência Física e Inventário</div>
            </div>
            <div>
              <div className="border-t border-slate-900 pt-2 font-semibold text-slate-900">
                Responsável pelo Faturamento / OS
              </div>
              <div className="text-[10px] text-slate-500">Validação de Receitas e Ordens</div>
            </div>
            <div>
              <div className="border-t border-slate-900 pt-2 font-semibold text-slate-900">
                Setor Fiscal / Contabilidade
              </div>
              <div className="text-[10px] text-slate-500">Auditoria e Lançamento de Custos</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
