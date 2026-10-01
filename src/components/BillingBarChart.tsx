import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { BillingRecord } from '../types';
import { formatBRL, MONTH_NAMES_PT } from '../utils/stockCalculations';
import {
  BarChart3,
  Receipt,
  TrendingUp,
  Layers,
  DollarSign,
  Package,
  Gauge,
  Wrench,
  ArrowUpRight,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface BillingBarChartProps {
  billings: BillingRecord[];
  onNavigateToBilling?: () => void;
}

interface MonthBillingData {
  monthKey: string; // YYYY-MM
  monthLabel: string; // Ex: Mai/26
  monthNameFull: string; // Ex: Maio de 2026
  productsTotal: number;
  alignmentBalancingTotal: number;
  servicesTotal: number;
  grandTotal: number;
  osCount: number;
  averageTicket: number;
}

export const BillingBarChart: React.FC<BillingBarChartProps> = ({
  billings,
  onNavigateToBilling
}) => {
  // Modos de exibição do gráfico:
  // - 'stacked': Composição discriminada (Produtos, Alinhamento/Bal. e Serviços empilhados)
  // - 'total': Valor consolidado do faturamento mensal
  // - 'volume': Volume físico de Ordens de Serviço (Qtd de OS faturadas)
  const [viewMode, setViewMode] = useState<'stacked' | 'total' | 'volume'>('stacked');

  // Gerar dados dos últimos 6 meses com base na data de referência (Outubro/2026 ou data atual)
  const chartData = useMemo<MonthBillingData[]>(() => {
    // Referência padrão: Outubro de 2026 (ou a data do faturamento mais recente se houver no futuro)
    let refYear = 2026;
    let refMonthIndex = 9; // Outubro (0-indexed)

    if (billings.length > 0) {
      // Encontra a data mais recente nos faturamentos
      const sortedDates = [...billings]
        .map(b => b.date)
        .filter(d => Boolean(d))
        .sort()
        .reverse();

      if (sortedDates.length > 0) {
        const latest = new Date(sortedDates[0]);
        if (!isNaN(latest.getTime())) {
          refYear = latest.getFullYear();
          refMonthIndex = latest.getMonth();
        }
      }
    }

    const months: MonthBillingData[] = [];

    // Últimos 6 meses em ordem cronológica (de 5 meses atrás até o mês de referência)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(refYear, refMonthIndex - i, 1);
      const year = d.getFullYear();
      const monthNum = d.getMonth() + 1; // 1 a 12
      const monthKey = `${year}-${monthNum.toString().padStart(2, '0')}`;
      const monthName = MONTH_NAMES_PT[monthNum - 1] || 'Mês';
      const monthLabel = `${monthName.substring(0, 3)}/${year.toString().slice(-2)}`;
      const monthNameFull = `${monthName} de ${year}`;

      // Filtrar faturamentos deste mês específico
      const monthRecords = billings.filter(b => b.date && b.date.substring(0, 7) === monthKey);

      let productsTotal = 0;
      let alignmentBalancingTotal = 0;
      let servicesTotal = 0;
      let grandTotal = 0;

      monthRecords.forEach(b => {
        productsTotal += Number(b.productsTotal) || 0;
        alignmentBalancingTotal += Number(b.alignmentBalancingTotal) || 0;
        servicesTotal += Number(b.servicesTotal) || 0;
        grandTotal += Number(b.grandTotal) || 0;
      });

      const osCount = monthRecords.length;
      const averageTicket = osCount > 0 ? grandTotal / osCount : 0;

      months.push({
        monthKey,
        monthLabel,
        monthNameFull,
        productsTotal,
        alignmentBalancingTotal,
        servicesTotal,
        grandTotal,
        osCount,
        averageTicket,
      });
    }

    return months;
  }, [billings]);

  // Estatísticas acumuladas dos 6 meses
  const total6MGrand = chartData.reduce((acc, d) => acc + d.grandTotal, 0);
  const total6MProducts = chartData.reduce((acc, d) => acc + d.productsTotal, 0);
  const total6MAlignment = chartData.reduce((acc, d) => acc + d.alignmentBalancingTotal, 0);
  const total6MServices = chartData.reduce((acc, d) => acc + d.servicesTotal, 0);
  const total6MOSCount = chartData.reduce((acc, d) => acc + d.osCount, 0);
  const averageTicket6M = total6MOSCount > 0 ? total6MGrand / total6MOSCount : 0;

  // Mês com maior faturamento
  const peakMonth = useMemo(() => {
    return [...chartData].sort((a, b) => b.grandTotal - a.grandTotal)[0];
  }, [chartData]);

  // Custom Tooltip formatado para Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataItem = chartData.find(d => d.monthLabel === label);
      if (!dataItem) return null;

      const grand = dataItem.grandTotal;
      const prodPct = grand > 0 ? ((dataItem.productsTotal / grand) * 100).toFixed(1) : '0';
      const alignPct = grand > 0 ? ((dataItem.alignmentBalancingTotal / grand) * 100).toFixed(1) : '0';
      const servPct = grand > 0 ? ((dataItem.servicesTotal / grand) * 100).toFixed(1) : '0';

      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-xl border border-slate-700/80 shadow-2xl text-xs space-y-2.5 min-w-[240px] pointer-events-none z-50">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-200 text-sm">{dataItem.monthNameFull}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-mono">
              {dataItem.osCount} {dataItem.osCount === 1 ? 'OS' : 'OSs'}
            </span>
          </div>

          <div className="flex items-center justify-between text-emerald-400 font-bold">
            <span className="text-slate-300">Faturamento Total:</span>
            <span className="text-sm font-mono">{formatBRL(grand)}</span>
          </div>

          <div className="flex items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-800">
            <span>Ticket Médio por OS:</span>
            <span className="font-mono text-slate-200 font-medium">{formatBRL(dataItem.averageTicket)}</span>
          </div>

          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-blue-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 shrink-0" />
                <span>Produtos:</span>
              </div>
              <span className="font-mono text-white font-medium">
                {formatBRL(dataItem.productsTotal)} <span className="text-slate-500 text-[10px]">({prodPct}%)</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0" />
                <span>Alinhamento & Bal.:</span>
              </div>
              <span className="font-mono text-white font-medium">
                {formatBRL(dataItem.alignmentBalancingTotal)} <span className="text-slate-500 text-[10px]">({alignPct}%)</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 shrink-0" />
                <span>Serviços Mecânicos:</span>
              </div>
              <span className="font-mono text-white font-medium">
                {formatBRL(dataItem.servicesTotal)} <span className="text-slate-500 text-[10px]">({servPct}%)</span>
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-5">
      
      {/* Header do Gráfico & Controles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <span>Volume de Faturamento de Ordens de Serviço (OS)</span>
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                Últimos 6 Meses
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Acompanhamento mensal da receita discriminada em Produtos, Alinhamento/Balanceamento e Mão de Obra.
          </p>
        </div>

        {/* Botões de Alternância de Visão */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('stacked')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'stacked'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Ver produtos, alinhamento e serviços discriminados por mês"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Composição</span>
            </button>

            <button
              onClick={() => setViewMode('total')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'total'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Ver faturamento total consolidado por mês"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Receita Total (R$)</span>
            </button>

            <button
              onClick={() => setViewMode('volume')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'volume'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Ver quantidade de Ordens de Serviço faturadas por mês"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Qtd de OS</span>
            </button>
          </div>

          {onNavigateToBilling && (
            <button
              onClick={onNavigateToBilling}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-indigo-100"
            >
              <span>Ver Faturamentos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Mini KPIs de Resumo dos 6 Meses */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
        
        {/* KPI 1: Faturamento 6M */}
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Faturamento Acumulado (6M)
          </span>
          <div className="text-base sm:text-lg font-black font-mono text-slate-900 tabular-nums">
            {formatBRL(total6MGrand)}
          </div>
          <span className="text-[10px] text-slate-500">
            Média: {formatBRL(total6MGrand / 6)}/mês
          </span>
        </div>

        {/* KPI 2: Ordens de Serviço 6M */}
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Ordens de Serviço (6M)
          </span>
          <div className="text-base sm:text-lg font-black font-mono text-indigo-700 tabular-nums">
            {total6MOSCount} {total6MOSCount === 1 ? 'OS' : 'OSs'}
          </div>
          <span className="text-[10px] text-slate-500">
            Ticket médio: {formatBRL(averageTicket6M)}
          </span>
        </div>

        {/* KPI 3: Venda de Produtos 6M */}
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
            Peças & Produtos (6M)
          </span>
          <div className="text-base sm:text-lg font-black font-mono text-blue-700 tabular-nums">
            {formatBRL(total6MProducts)}
          </div>
          <span className="text-[10px] text-slate-500">
            {total6MGrand > 0 ? ((total6MProducts / total6MGrand) * 100).toFixed(1) : 0}% da receita
          </span>
        </div>

        {/* KPI 4: Mês Recorde */}
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
            Mês de Maior Receita
          </span>
          <div className="text-base sm:text-lg font-black font-mono text-emerald-700 tabular-nums truncate">
            {peakMonth ? peakMonth.monthLabel : '—'}
          </div>
          <span className="text-[10px] text-slate-500">
            {peakMonth && peakMonth.grandTotal > 0 ? formatBRL(peakMonth.grandTotal) : 'Sem registros'}
          </span>
        </div>
      </div>

      {/* Área do Gráfico Recharts */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            barGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="monthLabel"
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
              tickFormatter={(v) => {
                if (viewMode === 'volume') return `${v} OS`;
                if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
                return `R$ ${v}`;
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Renderização Condicional baseada no Modo de Visualização */}
            {viewMode === 'stacked' && (
              <>
                <Bar
                  dataKey="productsTotal"
                  name="Venda de Produtos"
                  fill="#3b82f6"
                  stackId="billing"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="alignmentBalancingTotal"
                  name="Alinhamento & Balanceamento"
                  fill="#10b981"
                  stackId="billing"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="servicesTotal"
                  name="Total de Serviços"
                  fill="#f59e0b"
                  stackId="billing"
                  radius={[6, 6, 0, 0]}
                />
              </>
            )}

            {viewMode === 'total' && (
              <Bar
                dataKey="grandTotal"
                name="Faturamento Total (R$)"
                fill="#6366f1"
                radius={[6, 6, 0, 0]}
              />
            )}

            {viewMode === 'volume' && (
              <Bar
                dataKey="osCount"
                name="Volume de Ordens de Serviço"
                fill="#8b5cf6"
                radius={[6, 6, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda Visual & Detalhamento */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
        {viewMode === 'stacked' ? (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-blue-500" />
              <span className="text-slate-600 font-medium">Produtos:</span>
              <strong className="text-slate-900 font-mono">{formatBRL(total6MProducts)}</strong>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span className="text-slate-600 font-medium">Alinhamento & Balanceamento:</span>
              <strong className="text-slate-900 font-mono">{formatBRL(total6MAlignment)}</strong>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-500" />
              <span className="text-slate-600 font-medium">Outros Serviços:</span>
              <strong className="text-slate-900 font-mono">{formatBRL(total6MServices)}</strong>
            </div>
          </div>
        ) : viewMode === 'total' ? (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-indigo-500" />
            <span className="text-slate-600">Total Faturado em Ordens de Serviço nos Últimos 6 Meses:</span>
            <strong className="text-indigo-700 font-mono text-sm">{formatBRL(total6MGrand)}</strong>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-purple-500" />
            <span className="text-slate-600">Total de Ordens de Serviço Executadas no Período:</span>
            <strong className="text-purple-700 font-mono text-sm">{total6MOSCount} Ordens de Serviço</strong>
          </div>
        )}

        <div className="text-[11px] text-slate-500 ml-auto">
          Passar o mouse sobre as barras para ver detalhamento e ticket médio
        </div>
      </div>

    </div>
  );
};
