import React from 'react';
import { Product, StockMovement, Invoice } from '../types';
import { formatBRL, formatDateBR } from '../utils/stockCalculations';
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
  Tag
} from 'lucide-react';
import { MovementsBarChart } from './MovementsBarChart';
import { exportMovementsHistoryCSV } from '../utils/csvExport';

interface DashboardProps {
  products: Product[];
  movements: StockMovement[];
  invoices: Invoice[];
  onNavigate: (tab: 'dashboard' | 'entry' | 'stock' | 'prices' | 'timeclock' | 'invoices' | 'reports' | 'os_simulation') => void;
  onOpenDanfe: (invoice: Invoice) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  products,
  movements,
  invoices,
  onNavigate,
  onOpenDanfe,
}) => {
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
      {/* Welcome & Quick Actions Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-8 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-semibold mb-3">
              <Calendar className="w-3.5 h-3.5" />
              Competência Ativa: Setembro / 2026
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Gestor de NF-e & Controle de Estoque
            </h1>
            <p className="text-slate-300 text-sm mt-2 max-w-2xl leading-relaxed">
              Importação automatizada de arquivos XML de Notas Fiscais eletrônicas com atualização instantânea de saldos, recalculo do custo médio ponderado móvel (CMPM) e geração automática de relatórios mensais.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('entry')}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-indigo-500/25"
            >
              <Upload className="w-4 h-4" />
              Importar XML de NF-e
            </button>

            <button
              onClick={() => onNavigate('prices')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all backdrop-blur-xs border border-white/10"
            >
              <Tag className="w-4 h-4 text-indigo-300" />
              Consulta de Preços
            </button>

            <button
              onClick={() => onNavigate('reports')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all backdrop-blur-xs border border-white/10"
            >
              <FileBarChart className="w-4 h-4 text-indigo-300" />
              Relatórios
            </button>
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Valor em Estoque */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Valor Total do Estoque
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatBRL(totalStockValue)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>{products.length} itens cadastrados</span>
            <span className="font-semibold text-indigo-700">{totalItemsCount} un físicas</span>
          </div>
        </div>

        {/* Card 2: Entradas no Mês */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Entradas (Setembro)
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            {formatBRL(monthIncomingValue)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>{currentMonthInvoices.length} Notas Fiscais</span>
            <span className="font-medium text-emerald-700">via NF-e SEFAZ</span>
          </div>
        </div>

        {/* Card 3: Saídas no Mês */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
              Saídas (Setembro)
            </span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700 mt-2">
            {formatBRL(monthOutgoingValue)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Vendas & Consumo interno</span>
            <span className="font-medium text-rose-700">A custo médio</span>
          </div>
        </div>

        {/* Card 4: Alertas de Reposição */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Alertas de Estoque
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">
            {lowStockProducts.length} itens
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Abaixo do estoque mínimo</span>
            <button
              onClick={() => onNavigate('stock')}
              className="text-indigo-600 font-semibold hover:underline"
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
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-sm">Necessidade de Reposição</h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
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
                        <span>•</span>
                        <span>Mínimo: {p.minStock} {p.unit}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-rose-600">
                        {p.currentStock} {p.unit}
                      </div>
                      <button
                        onClick={() => onNavigate('entry')}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline mt-0.5 block"
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
              className="w-full py-2 text-center text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              Ver todos os {products.length} itens do catálogo →
            </button>
          </div>
        </div>

        {/* Painel Direito: Últimas Notas Fiscais Recebidas (7 colunas) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Últimas Entradas de NF-e</h3>
              </div>
              <button
                onClick={() => onNavigate('invoices')}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Ver todas ({invoices.length})
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-slate-100 text-slate-600 shrink-0 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">NF-e nº {inv.number}</span>
                        <span className="text-[10px] text-slate-400">Série {inv.series}</span>
                      </div>
                      <div className="text-xs text-slate-600 font-medium truncate max-w-[240px]">
                        {inv.supplier.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {formatDateBR(inv.entryDate)} • {inv.items.length} itens integrados
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-indigo-950">
                      {formatBRL(inv.totals.totalInvoiceValue)}
                    </div>
                    <button
                      onClick={() => onOpenDanfe(inv)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 mt-1"
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
              className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              + Nova Entrada
            </button>
          </div>
        </div>
      </div>

      {/* Histórico Recente de Movimentações */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 mb-4 gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Últimas Movimentações Físicas de Estoque
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:inline">Fluxo cronológico de entradas e saídas</span>
            <button
              onClick={() => exportMovementsHistoryCSV(movements)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-2xs"
              title="Baixar histórico completo de todas as movimentações em formato CSV compatível com Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Exportar Histórico (CSV)
            </button>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-2.5">Data / Hora</th>
                <th className="p-2.5">Produto</th>
                <th className="p-2.5">Tipo Movimento</th>
                <th className="p-2.5">Documento</th>
                <th className="p-2.5 text-right">Qtd.</th>
                <th className="p-2.5 text-right">Saldo Atual</th>
                <th className="p-2.5 text-right">Custo Médio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentMovements.map((mov) => {
                const isIncoming = mov.type.startsWith('ENTRADA');
                return (
                  <tr key={mov.id} className="hover:bg-slate-50">
                    <td className="p-2.5 text-slate-500">{formatDateBR(mov.date)}</td>
                    <td className="p-2.5 font-medium text-slate-900">{mov.productName}</td>
                    <td className="p-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
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
                    <td className="p-2.5 font-mono text-slate-700">{mov.documentNumber || '-'}</td>
                    <td
                      className={`p-2.5 text-right font-bold ${
                        isIncoming ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {isIncoming ? `+${mov.quantity}` : `-${mov.quantity}`} {mov.unit}
                    </td>
                    <td className="p-2.5 text-right font-semibold text-slate-900">
                      {mov.resultingStock} {mov.unit}
                    </td>
                    <td className="p-2.5 text-right text-indigo-700 font-medium">
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
