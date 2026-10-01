import React, { useState } from 'react';
import { Product, StockMovement, Invoice } from '../types';
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
  Receipt
} from 'lucide-react';
import { MovementsBarChart } from './MovementsBarChart';
import { exportMovementsHistoryCSV } from '../utils/csvExport';
import { BillingRecord } from '../types';

interface DashboardProps {
  products: Product[];
  movements: StockMovement[];
  invoices: Invoice[];
  billings?: BillingRecord[];
  companySettings: CompanySettings;
  onNavigate: (tab: 'dashboard' | 'billing' | 'entry' | 'stock' | 'prices' | 'timeclock' | 'advances' | 'invoices' | 'reports') => void;
  onOpenDanfe: (invoice: Invoice) => void;
  onOpenCompanySettings?: () => void;
  onOpenSupabaseSync?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  products,
  movements,
  invoices,
  billings = [],
  companySettings,
  onNavigate,
  onOpenDanfe,
  onOpenCompanySettings,
  onOpenSupabaseSync,
}) => {
  const [logoLoadError, setLogoLoadError] = useState(false);

  // Total de Faturamento registrado
  const totalBillingGrand = useMemo(() => {
    return billings.reduce((acc, curr) => acc + curr.grandTotal, 0);
  }, [billings]);

  // Mês corrente (Setembro 2026)
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

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Valor em Estoque */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Valor Total do Estoque
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono tabular-nums">
            {formatBRL(totalStockValue)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 flex items-center justify-between">
            <span>{products.length} itens cadastrados</span>
            <span className="font-semibold text-indigo-700 font-mono tabular-nums">{totalItemsCount} un físicas</span>
          </div>
        </div>

        {/* Card 2: Entradas no Mês */}
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
            <span>{currentMonthInvoices.length} Notas Fiscais</span>
            <span className="font-semibold text-emerald-700">via NF-e SEFAZ</span>
          </div>
        </div>

        {/* Card 3: Saídas no Mês */}
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
            <span className="font-semibold text-rose-700">A custo médio</span>
          </div>
        </div>

        {/* Card 4: Alertas de Reposição */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Alertas de Estoque
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2 font-mono tabular-nums">
            {lowStockProducts.length} itens
          </div>
          <div className="text-xs text-slate-500 mt-1.5 flex items-center justify-between">
            <span>Abaixo do estoque mínimo</span>
            <button
              onClick={() => onNavigate('stock')}
              className="text-indigo-600 font-bold hover:underline cursor-pointer"
            >
              Verificar
            </button>
          </div>
        </div>
      </div>

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
