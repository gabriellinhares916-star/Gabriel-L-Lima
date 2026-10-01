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
import { StockMovement } from '../types';
import { formatBRL, MONTH_NAMES_PT } from '../utils/stockCalculations';
import { ArrowDownRight, ArrowUpRight, BarChart3, TrendingUp, Layers } from 'lucide-react';

interface MovementsBarChartProps {
  movements: StockMovement[];
}

interface MonthMovementData {
  monthKey: string;
  monthLabel: string;
  monthNameFull: string;
  incomingQty: number;
  outgoingQty: number;
  incomingValue: number;
  outgoingValue: number;
  netQty: number;
  netValue: number;
}

export const MovementsBarChart: React.FC<MovementsBarChartProps> = ({ movements }) => {
  const [metricMode, setMetricMode] = useState<'quantity' | 'value'>('quantity');

  // Gerar dados dos últimos 6 meses com base na referência de Setembro de 2026
  const chartData = useMemo<MonthMovementData[]>(() => {
    const refYear = 2026;
    const refMonthIndex = 8; // Setembro (0-indexed)

    const months: MonthMovementData[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(refYear, refMonthIndex - i, 1);
      const year = d.getFullYear();
      const monthNum = d.getMonth() + 1; // 1 a 12
      const monthKey = `${year}-${monthNum.toString().padStart(2, '0')}`;
      const monthLabel = `${MONTH_NAMES_PT[monthNum - 1].substring(0, 3)}/${year.toString().slice(-2)}`;
      const monthNameFull = `${MONTH_NAMES_PT[monthNum - 1]} de ${year}`;

      // Filtrar movimentos deste mês
      const monthMovs = movements.filter(m => m.date.substring(0, 7) === monthKey);

      let incomingQty = 0;
      let outgoingQty = 0;
      let incomingValue = 0;
      let outgoingValue = 0;

      monthMovs.forEach(m => {
        const isEntry = m.type.startsWith('ENTRADA');
        const qty = Number(m.quantity) || 0;
        const value = Number(m.totalCost) || (qty * (Number(m.unitCost) || 0));

        if (isEntry) {
          incomingQty += qty;
          incomingValue += value;
        } else {
          outgoingQty += qty;
          outgoingValue += value;
        }
      });

      months.push({
        monthKey,
        monthLabel,
        monthNameFull,
        incomingQty,
        outgoingQty,
        incomingValue,
        outgoingValue,
        netQty: incomingQty - outgoingQty,
        netValue: incomingValue - outgoingValue,
      });
    }

    return months;
  }, [movements]);

  // Totais acumulados dos 6 meses
  const total6MIncomingQty = chartData.reduce((acc, d) => acc + d.incomingQty, 0);
  const total6MOutgoingQty = chartData.reduce((acc, d) => acc + d.outgoingQty, 0);
  const total6MIncomingVal = chartData.reduce((acc, d) => acc + d.incomingValue, 0);
  const total6MOutgoingVal = chartData.reduce((acc, d) => acc + d.outgoingValue, 0);

  // Mês com maior giro físico
  const peakMonth = [...chartData].sort((a, b) => (b.incomingQty + b.outgoingQty) - (a.incomingQty + a.outgoingQty))[0];

  // Custom Tooltip para o Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataItem = chartData.find(d => d.monthLabel === label);
      const isQty = metricMode === 'quantity';

      const entryVal = payload.find((p: any) => p.dataKey === (isQty ? 'incomingQty' : 'incomingValue'))?.value || 0;
      const exitVal = payload.find((p: any) => p.dataKey === (isQty ? 'outgoingQty' : 'outgoingValue'))?.value || 0;
      const balance = entryVal - exitVal;

      return (
        <div className="bg-slate-900/95 backdrop-blur-xs text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs min-w-[210px]">
          <div className="font-bold text-slate-200 border-b border-slate-700/80 pb-1.5 mb-2 flex items-center justify-between">
            <span>{dataItem ? dataItem.monthNameFull : label}</span>
            <span className="text-[10px] text-slate-400 font-mono">Últimos 6 Meses</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-emerald-400">
              <span className="flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5" /> Entradas:
              </span>
              <span className="font-bold">
                {isQty ? `${entryVal} un` : formatBRL(entryVal)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 text-rose-400">
              <span className="flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> Saídas:
              </span>
              <span className="font-bold">
                {isQty ? `${exitVal} un` : formatBRL(exitVal)}
              </span>
            </div>

            <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between gap-3 font-semibold text-slate-300">
              <span>Saldo Líquido:</span>
              <span className={balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {balance >= 0 ? '+' : ''}{isQty ? `${balance} un` : formatBRL(balance)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
      {/* Header com Título e Seletor de Métrica */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Volume de Entradas e Saídas (Últimos 6 Meses)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Comparativo semestral de fluxo físico de mercadorias recebidas via NF-e versus requisições/baixas.
          </p>
        </div>

        {/* Toggle Unidades vs Valor Financeiro */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setMetricMode('quantity')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              metricMode === 'quantity'
                ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Unidades (Físico)
          </button>

          <button
            onClick={() => setMetricMode('value')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              metricMode === 'value'
                ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Valor (R$)
          </button>
        </div>
      </div>

      {/* Gráfico Recharts */}
      <div className="w-full h-72 sm:h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
            barGap={6}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="monthLabel"
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
            />
            <YAxis
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickFormatter={(val) => {
                if (metricMode === 'value') {
                  if (val >= 1000) return `R$ ${(val / 1000).toFixed(1)}k`;
                  return `R$ ${val}`;
                }
                return `${val}`;
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
              formatter={(value) => {
                if (value === 'incomingQty' || value === 'incomingValue') {
                  return <span className="text-slate-700 font-semibold mr-3">Entradas (NF-e)</span>;
                }
                return <span className="text-slate-700 font-semibold">Saídas (Consumo/Vendas)</span>;
              }}
            />
            <Bar
              dataKey={metricMode === 'quantity' ? 'incomingQty' : 'incomingValue'}
              name={metricMode === 'quantity' ? 'incomingQty' : 'incomingValue'}
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              maxBarSize={44}
            />
            <Bar
              dataKey={metricMode === 'quantity' ? 'outgoingQty' : 'outgoingValue'}
              name={metricMode === 'quantity' ? 'outgoingQty' : 'outgoingValue'}
              fill="#f43f5e"
              radius={[4, 4, 0, 0]}
              maxBarSize={44}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Mini Métricas Resumo dos 6 Meses */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
        <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100">
          <span className="text-[10px] uppercase font-bold text-emerald-700 flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3" /> Entradas 6M
          </span>
          <div className="text-sm sm:text-base font-bold text-emerald-900 mt-0.5">
            {metricMode === 'quantity' ? `${total6MIncomingQty} un` : formatBRL(total6MIncomingVal)}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-rose-50/50 border border-rose-100">
          <span className="text-[10px] uppercase font-bold text-rose-700 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> Saídas 6M
          </span>
          <div className="text-sm sm:text-base font-bold text-rose-900 mt-0.5">
            {metricMode === 'quantity' ? `${total6MOutgoingQty} un` : formatBRL(total6MOutgoingVal)}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">
            Saldo Líquido 6M
          </span>
          <div className="text-sm sm:text-base font-bold text-indigo-900 mt-0.5">
            {metricMode === 'quantity'
              ? `${total6MIncomingQty - total6MOutgoingQty >= 0 ? '+' : ''}${total6MIncomingQty - total6MOutgoingQty} un`
              : `${total6MIncomingVal - total6MOutgoingVal >= 0 ? '+' : ''}${formatBRL(total6MIncomingVal - total6MOutgoingVal)}`}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100">
          <span className="text-[10px] uppercase font-bold text-indigo-700 block">
            Pico de Movimento
          </span>
          <div className="text-sm sm:text-base font-bold text-indigo-950 mt-0.5 truncate">
            {peakMonth ? peakMonth.monthLabel : '-'}
          </div>
        </div>
      </div>
    </div>
  );
};
