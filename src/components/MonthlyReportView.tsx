import React, { useState, useMemo } from 'react';
import { Product, StockMovement, Invoice } from '../types';
import { generateMonthlyReport, formatBRL, formatNumberBR, MONTH_NAMES_PT } from '../utils/stockCalculations';
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
  FileSpreadsheet
} from 'lucide-react';

interface MonthlyReportViewProps {
  products: Product[];
  movements: StockMovement[];
  invoices: Invoice[];
}

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  products,
  movements,
  invoices,
}) => {
  // Mês e ano inicial baseado na data local atual (2026-09)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(9); // Setembro
  const [activeTab, setActiveTab] = useState<'products' | 'suppliers' | 'cfop' | 'top'>('products');

  // Gerar relatório automaticamente sempre que os dados ou mês mudarem
  const report = useMemo(() => {
    return generateMonthlyReport(selectedMonth, selectedYear, products, movements, invoices);
  }, [selectedMonth, selectedYear, products, movements, invoices]);

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

  const handlePrint = () => {
    window.print();
  };

  // Cálculo da variação percentual do inventário
  const inventoryDelta = report.finalInventoryValue - report.initialInventoryValue;
  const inventoryDeltaPercent = report.initialInventoryValue > 0
    ? ((inventoryDelta / report.initialInventoryValue) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Controls Bar - Oculto na Impressão */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-indigo-600" />
            Relatório Automático de Movimentação Mensal
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Balanço físico-financeiro consolidado, entradas de NF-e, saídas e valoração contábil por custo médio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Mês e Ano */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors"
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
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportActiveTabCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-2xs"
              title={`Exportar planilha CSV da aba atual: ${activeTab === 'products' ? 'Produtos' : activeTab === 'suppliers' ? 'Fornecedores' : activeTab === 'cfop' ? 'CFOP' : 'Top Giro'}`}
            >
              <Download className="w-4 h-4 text-slate-500" />
              Exportar {activeTab === 'products' ? 'Produtos' : activeTab === 'suppliers' ? 'Fornecedores' : activeTab === 'cfop' ? 'CFOP' : 'Top Giro'} (CSV)
            </button>

            <button
              onClick={handleExportAllTablesCSV}
              className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-2xs"
              title="Baixar todas as tabelas mensais (Produtos, Fornecedores e CFOPs)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Exportar Pacote Completo (CSV)
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Salvar PDF
            </button>
          </div>
        </div>
      </div>

      {/* CABEÇALHO DO RELATÓRIO (Visível na impressão e na tela) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
        {/* Document Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
          <div>
            <div className="text-[11px] uppercase tracking-wider font-bold text-indigo-600">
              Gestor NF-e & Controle de Estoque
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              Demonstrativo Mensal de Movimentação de Estoque
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Competência: <strong className="text-slate-800">{report.monthName}</strong> • Emitido em: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>

          <div className="text-left sm:text-right text-xs">
            <span className="px-2.5 py-1 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block">
              {report.totalInvoicesCount} NF-e Processadas
            </span>
          </div>
        </div>

        {/* Quadro Resumo Executivo / Balanço do Mês */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              1. Estoque Inicial (01/{selectedMonth.toString().padStart(2, '0')})
            </span>
            <div className="text-base font-bold text-slate-900 mt-1">
              {formatBRL(report.initialInventoryValue)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Posição no início do mês</span>
          </div>

          <div className="p-3.5 bg-emerald-50/70 rounded-lg border border-emerald-200">
            <span className="text-[10px] uppercase font-bold text-emerald-700 flex items-center gap-1">
              <ArrowDownRight className="w-3.5 h-3.5" /> 2. Entradas no Mês (+)
            </span>
            <div className="text-base font-bold text-emerald-800 mt-1">
              {formatBRL(report.totalIncomingValue)}
            </div>
            <span className="text-[10px] text-emerald-600 block mt-0.5">
              +{report.totalIncomingItemsCount} un • {report.totalInvoicesCount} NFs
            </span>
          </div>

          <div className="p-3.5 bg-rose-50/70 rounded-lg border border-rose-200">
            <span className="text-[10px] uppercase font-bold text-rose-700 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> 3. Saídas no Mês (-)
            </span>
            <div className="text-base font-bold text-rose-800 mt-1">
              {formatBRL(report.totalOutgoingValue)}
            </div>
            <span className="text-[10px] text-rose-600 block mt-0.5">
              -{report.totalOutgoingItemsCount} un (Vendas & Consumo)
            </span>
          </div>

          <div className="p-3.5 bg-indigo-50/70 rounded-lg border border-indigo-200">
            <span className="text-[10px] uppercase font-bold text-indigo-700 block">
              4. Estoque Final (Posição Final)
            </span>
            <div className="text-base font-bold text-indigo-950 mt-1">
              {formatBRL(report.finalInventoryValue)}
            </div>
            <span className="text-[10px] text-indigo-700 block mt-0.5">
              Variação: {inventoryDelta >= 0 ? '+' : ''}{formatBRL(inventoryDelta)} ({inventoryDeltaPercent.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Abas de Navegação Analítica - Oculto na Impressão */}
        <div className="flex border-b border-slate-200 print:hidden">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'products'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            Movimentação por Produto ({report.productSummaries.length})
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'suppliers'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Compras por Fornecedor ({report.supplierBreakdown.length})
          </button>

          <button
            onClick={() => setActiveTab('cfop')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'cfop'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Operações por CFOP ({report.cfopBreakdown.length})
          </button>

          <button
            onClick={() => setActiveTab('top')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'top'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Top Movimentados
          </button>
        </div>

        {/* CONTEÚDO 1: TABELA POR PRODUTO (Sempre visível na impressão) */}
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors shadow-2xs self-start sm:self-auto print:hidden"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Exportar Tabela de Itens (CSV)
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Código</th>
                  <th className="p-2.5">Descrição do Produto</th>
                  <th className="p-2.5 text-center">UN</th>
                  <th className="p-2.5 text-right">Estoque Inicial</th>
                  <th className="p-2.5 text-right bg-emerald-50/50 text-emerald-800">Entradas (Qtd)</th>
                  <th className="p-2.5 text-right bg-emerald-50/50 text-emerald-800">Entradas (R$)</th>
                  <th className="p-2.5 text-right bg-rose-50/50 text-rose-800">Saídas (Qtd)</th>
                  <th className="p-2.5 text-right bg-rose-50/50 text-rose-800">Saídas (R$)</th>
                  <th className="p-2.5 text-right bg-slate-50 font-bold">Estoque Final</th>
                  <th className="p-2.5 text-right bg-slate-50 font-bold">Valor Final (R$)</th>
                  <th className="p-2.5 text-right">Custo Médio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
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
                      <td className="p-2.5 text-right font-semibold text-emerald-600 bg-emerald-50/30">
                        {p.incomingQty > 0 ? `+${p.incomingQty}` : '-'}
                      </td>
                      <td className="p-2.5 text-right text-emerald-700 bg-emerald-50/30">
                        {p.incomingValue > 0 ? formatBRL(p.incomingValue) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-semibold text-rose-600 bg-rose-50/30">
                        {p.outgoingQty > 0 ? `-${p.outgoingQty}` : '-'}
                      </td>
                      <td className="p-2.5 text-right text-rose-700 bg-rose-50/30">
                        {p.outgoingValue > 0 ? formatBRL(p.outgoingValue) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900 bg-slate-50/60">
                        {p.finalStock}
                      </td>
                      <td className="p-2.5 text-right font-bold text-indigo-950 bg-slate-50/60">
                        {formatBRL(p.finalValue)}
                      </td>
                      <td className="p-2.5 text-right text-slate-700 font-medium">
                        {formatBRL(p.averageUnitCost)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {report.productSummaries.length > 0 && (
                <tfoot className="bg-slate-100 font-bold border-t border-slate-300 text-slate-900 text-xs">
                  <tr>
                    <td colSpan={3} className="p-2.5 text-right uppercase">Totais Consolidados:</td>
                    <td className="p-2.5 text-right">{report.productSummaries.reduce((a, b) => a + b.initialStock, 0)}</td>
                    <td className="p-2.5 text-right text-emerald-700">+{report.totalIncomingItemsCount}</td>
                    <td className="p-2.5 text-right text-emerald-700">{formatBRL(report.totalIncomingValue)}</td>
                    <td className="p-2.5 text-right text-rose-700">-{report.totalOutgoingItemsCount}</td>
                    <td className="p-2.5 text-right text-rose-700">{formatBRL(report.totalOutgoingValue)}</td>
                    <td className="p-2.5 text-right bg-slate-200/60">{report.productSummaries.reduce((a, b) => a + b.finalStock, 0)}</td>
                    <td className="p-2.5 text-right text-indigo-900 bg-slate-200/60">{formatBRL(report.finalInventoryValue)}</td>
                    <td className="p-2.5"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* CONTEÚDO 2: COMPRAS POR FORNECEDOR */}
        <div className={`space-y-3 ${activeTab !== 'suppliers' ? 'hidden print:block' : ''}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Compras por Fornecedor no Mês de {report.monthName}
            </h3>
            {report.supplierBreakdown.length > 0 && (
              <button
                onClick={() => exportMonthlySuppliersCSV(report)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors shadow-2xs self-start sm:self-auto print:hidden"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Exportar Fornecedores (CSV)
              </button>
            )}
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Razão Social do Fornecedor</th>
                  <th className="p-2.5">CNPJ</th>
                  <th className="p-2.5 text-center">NFs Recebidas</th>
                  <th className="p-2.5 text-right">Valor Total Faturado</th>
                  <th className="p-2.5 text-right">% do Volume de Compras</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.supplierBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      Nenhum fornecedor com compras registradas neste mês.
                    </td>
                  </tr>
                ) : (
                  report.supplierBreakdown.map((s, idx) => {
                    const pct = report.totalIncomingValue > 0
                      ? ((s.totalValue / report.totalIncomingValue) * 100).toFixed(1)
                      : '0';

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-semibold text-slate-900">{s.supplierName}</td>
                        <td className="p-2.5 font-mono text-slate-500">{s.cnpj}</td>
                        <td className="p-2.5 text-center font-bold text-slate-800">{s.invoicesCount} NF(s)</td>
                        <td className="p-2.5 text-right font-bold text-indigo-900">{formatBRL(s.totalValue)}</td>
                        <td className="p-2.5 text-right font-semibold text-slate-700">
                          <div className="flex items-center justify-end gap-2">
                            <span>{pct}%</span>
                            <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-indigo-600 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, parseFloat(pct))}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CONTEÚDO 3: FISCAL POR CFOP */}
        <div className={`space-y-3 ${activeTab !== 'cfop' ? 'hidden print:block' : ''}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-indigo-600" />
              Entradas Fiscais por CFOP (Código Fiscal de Operações)
            </h3>
            {report.cfopBreakdown.length > 0 && (
              <button
                onClick={() => exportMonthlyCfopCSV(report)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors shadow-2xs self-start sm:self-auto print:hidden"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Exportar CFOPs (CSV)
              </button>
            )}
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5 text-center w-24">CFOP</th>
                  <th className="p-2.5">Descrição da Operação Fiscal</th>
                  <th className="p-2.5 text-right">Qtd. Itens</th>
                  <th className="p-2.5 text-right">Total das Entradas (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.cfopBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400">
                      Nenhuma operação de CFOP registrada neste mês.
                    </td>
                  </tr>
                ) : (
                  report.cfopBreakdown.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center font-mono font-bold text-indigo-700 bg-indigo-50/40">
                        {c.cfop}
                      </td>
                      <td className="p-2.5 font-medium text-slate-800">{c.description}</td>
                      <td className="p-2.5 text-right font-medium text-slate-700">{c.itemsCount}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">{formatBRL(c.totalValue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CONTEÚDO 4: TOP MOVIMENTADOS */}
        <div className={`space-y-3 ${activeTab !== 'top' ? 'hidden print:block' : ''}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Produtos com Maior Giro de Estoque no Mês
            </h3>
            {report.topMovedProducts.length > 0 && (
              <button
                onClick={() => exportMonthlyTopMovedCSV(report)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors shadow-2xs self-start sm:self-auto print:hidden"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Exportar Top Giro (CSV)
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
        <div className="hidden print:block pt-12 mt-12 border-t border-slate-300 text-xs">
          <div className="grid grid-cols-2 gap-12 text-center">
            <div>
              <div className="border-t border-slate-900 pt-2 font-semibold text-slate-900">
                Responsável pelo Almoxarifado / Estoque
              </div>
              <div className="text-[10px] text-slate-500">Conferência Física e Inventário</div>
            </div>
            <div>
              <div className="border-t border-slate-900 pt-2 font-semibold text-slate-900">
                Setor Fiscal / Contabilidade
              </div>
              <div className="text-[10px] text-slate-500">Validação e Lançamento de Custos</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
