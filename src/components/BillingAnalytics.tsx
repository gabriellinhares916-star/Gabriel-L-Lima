import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { BillingRecord, BillingPaymentMethod, Employee } from '../types';
import { formatBRL, formatDateBR, MONTH_NAMES_PT } from '../utils/stockCalculations';
import {
  Users,
  Calendar,
  CreditCard,
  Car,
  TrendingUp,
  DollarSign,
  Package,
  Gauge,
  Wrench,
  Award,
  Filter,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  BarChart3,
  Clock,
  Layers,
  ArrowUpRight,
  Zap,
  Target,
  UserCheck
} from 'lucide-react';

interface BillingAnalyticsProps {
  billings: BillingRecord[];
  allBillings?: BillingRecord[];
  employees?: Employee[];
  selectedMonth?: string;
  onFilterByCollaborator?: (collaboratorName: string) => void;
  onFilterByPayment?: (payment: BillingPaymentMethod | 'ALL') => void;
  onFilterByMonth?: (month: string) => void;
}

type AnalyticsTab = 'collaborator' | 'date' | 'payment' | 'customers' | 'efficiency';

const PAYMENT_COLORS: Record<string, string> = {
  PIX: '#10b981', // Emerald
  CARTAO_CREDITO: '#6366f1', // Indigo
  CARTAO_DEBITO: '#0ea5e9', // Sky
  DINHEIRO: '#f59e0b', // Amber
  FATURADO: '#8b5cf6', // Purple
  BOLETO: '#64748b', // Slate
  OUTRO: '#ec4899', // Pink
};

const PAYMENT_LABELS: Record<string, string> = {
  PIX: 'PIX',
  CARTAO_CREDITO: 'Cartão de Crédito',
  CARTAO_DEBITO: 'Cartão de Débito',
  DINHEIRO: 'Dinheiro',
  FATURADO: 'Faturado / Empresa',
  BOLETO: 'Boleto Bancário',
  OUTRO: 'Outro',
};

const WEEKDAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

export const BillingAnalytics: React.FC<BillingAnalyticsProps> = ({
  billings,
  allBillings,
  employees = [],
  selectedMonth = 'ALL',
  onFilterByCollaborator,
  onFilterByPayment,
  onFilterByMonth
}) => {
  // Aba de análise ativa
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('collaborator');

  // Escopo de análise: 'scoped' (apenas registros filtrados atualmente) ou 'all' (todo o histórico da oficina)
  const [scope, setScope] = useState<'scoped' | 'all'>('scoped');

  // Sub-modo do gráfico por data: diário ou por dia da semana
  const [dateViewMode, setDateViewMode] = useState<'daily' | 'weekday'>('daily');

  // Modo de exibição do gráfico de colaborador: empilhado ou total
  const [collabChartMode, setCollabChartMode] = useState<'stacked' | 'total'>('stacked');

  // Conjunto de dados base a ser analisado
  const dataset = useMemo(() => {
    if (scope === 'all' && allBillings && allBillings.length > 0) {
      return allBillings;
    }
    return billings;
  }, [scope, allBillings, billings]);

  // Totais do dataset analisado
  const totalAnalyzedRevenue = useMemo(() => {
    return dataset.reduce((acc, curr) => acc + (Number(curr.grandTotal) || 0), 0);
  }, [dataset]);

  const totalAnalyzedOS = dataset.length;

  // ----------------------------------------------------
  // 1. ANÁLISE POR COLABORADOR
  // ----------------------------------------------------
  const collaboratorAnalysis = useMemo(() => {
    const map = new Map<string, {
      name: string;
      id?: string;
      osCount: number;
      productsTotal: number;
      alignmentBalancingTotal: number;
      servicesTotal: number;
      grandTotal: number;
      averageTicket: number;
      percentage: number;
      plates: Set<string>;
    }>();

    dataset.forEach((b) => {
      const name = b.collaboratorName && b.collaboratorName.trim() ? b.collaboratorName.trim() : 'Não informado';
      const existing = map.get(name) || {
        name,
        id: b.collaboratorId,
        osCount: 0,
        productsTotal: 0,
        alignmentBalancingTotal: 0,
        servicesTotal: 0,
        grandTotal: 0,
        averageTicket: 0,
        percentage: 0,
        plates: new Set<string>()
      };

      existing.osCount += 1;
      existing.productsTotal += Number(b.productsTotal) || 0;
      existing.alignmentBalancingTotal += Number(b.alignmentBalancingTotal) || 0;
      existing.servicesTotal += Number(b.servicesTotal) || 0;
      existing.grandTotal += Number(b.grandTotal) || 0;
      if (b.vehiclePlate) existing.plates.add(b.vehiclePlate);

      map.set(name, existing);
    });

    const list = Array.from(map.values()).map(item => {
      item.averageTicket = item.osCount > 0 ? item.grandTotal / item.osCount : 0;
      item.percentage = totalAnalyzedRevenue > 0 ? (item.grandTotal / totalAnalyzedRevenue) * 100 : 0;
      return item;
    });

    // Ordena do maior faturamento para o menor
    list.sort((a, b) => b.grandTotal - a.grandTotal);

    // Destaques
    const topRevenue = list[0] || null;
    const topServices = [...list].sort((a, b) => (b.servicesTotal + b.alignmentBalancingTotal) - (a.servicesTotal + a.alignmentBalancingTotal))[0] || null;
    const topProducts = [...list].sort((a, b) => b.productsTotal - a.productsTotal)[0] || null;
    const topTicket = [...list].filter(c => c.osCount >= 1).sort((a, b) => b.averageTicket - a.averageTicket)[0] || null;

    return {
      list,
      topRevenue,
      topServices,
      topProducts,
      topTicket,
    };
  }, [dataset, totalAnalyzedRevenue]);

  // ----------------------------------------------------
  // 2. ANÁLISE POR DATA (DIÁRIA & DIA DA SEMANA)
  // ----------------------------------------------------
  const dateAnalysis = useMemo(() => {
    // 2.1 Por Dia Específico (YYYY-MM-DD)
    const dayMap = new Map<string, {
      date: string;
      dateFormatted: string;
      weekday: string;
      productsTotal: number;
      alignmentBalancingTotal: number;
      servicesTotal: number;
      grandTotal: number;
      osCount: number;
      averageTicket: number;
    }>();

    // 2.2 Por Dia da Semana (0 a 6)
    const weekdayMap = new Map<number, {
      weekdayIndex: number;
      weekdayName: string;
      grandTotal: number;
      osCount: number;
      averageTicket: number;
    }>();

    for (let i = 0; i < 7; i++) {
      weekdayMap.set(i, {
        weekdayIndex: i,
        weekdayName: WEEKDAY_NAMES[i],
        grandTotal: 0,
        osCount: 0,
        averageTicket: 0,
      });
    }

    dataset.forEach((b) => {
      if (!b.date) return;
      const dateStr = b.date;
      const dObj = new Date(dateStr + 'T12:00:00');
      const weekdayIndex = !isNaN(dObj.getTime()) ? dObj.getDay() : 0;
      const weekdayName = WEEKDAY_NAMES[weekdayIndex] || '';

      // Day Map
      const dayItem = dayMap.get(dateStr) || {
        date: dateStr,
        dateFormatted: formatDateBR(dateStr),
        weekday: weekdayName,
        productsTotal: 0,
        alignmentBalancingTotal: 0,
        servicesTotal: 0,
        grandTotal: 0,
        osCount: 0,
        averageTicket: 0,
      };

      dayItem.productsTotal += Number(b.productsTotal) || 0;
      dayItem.alignmentBalancingTotal += Number(b.alignmentBalancingTotal) || 0;
      dayItem.servicesTotal += Number(b.servicesTotal) || 0;
      dayItem.grandTotal += Number(b.grandTotal) || 0;
      dayItem.osCount += 1;
      dayMap.set(dateStr, dayItem);

      // Weekday Map
      const wdItem = weekdayMap.get(weekdayIndex);
      if (wdItem) {
        wdItem.grandTotal += Number(b.grandTotal) || 0;
        wdItem.osCount += 1;
      }
    });

    // Lista de dias em ordem cronológica
    const dailyList = Array.from(dayMap.values()).map(d => {
      d.averageTicket = d.osCount > 0 ? d.grandTotal / d.osCount : 0;
      return d;
    }).sort((a, b) => a.date.localeCompare(b.date));

    // Lista por dia da semana
    const weekdayList = Array.from(weekdayMap.values()).map(w => {
      w.averageTicket = w.osCount > 0 ? w.grandTotal / w.osCount : 0;
      return w;
    });

    // Dia de maior faturamento
    const peakDay = [...dailyList].sort((a, b) => b.grandTotal - a.grandTotal)[0] || null;

    // Média diária (somente considerando dias com movimentação)
    const activeDaysCount = dailyList.length;
    const averageDailyRevenue = activeDaysCount > 0 ? totalAnalyzedRevenue / activeDaysCount : 0;

    // Dia da semana de maior movimento
    const busiestWeekday = [...weekdayList].sort((a, b) => b.grandTotal - a.grandTotal)[0] || null;

    return {
      dailyList,
      weekdayList,
      peakDay,
      averageDailyRevenue,
      activeDaysCount,
      busiestWeekday,
    };
  }, [dataset, totalAnalyzedRevenue]);

  // ----------------------------------------------------
  // 3. ANÁLISE POR FORMA DE PAGAMENTO
  // ----------------------------------------------------
  const paymentAnalysis = useMemo(() => {
    const map = new Map<string, {
      method: string;
      label: string;
      grandTotal: number;
      osCount: number;
      percentage: number;
      averageTicket: number;
      color: string;
    }>();

    dataset.forEach((b) => {
      const method = b.paymentMethod || 'OUTRO';
      const item = map.get(method) || {
        method,
        label: PAYMENT_LABELS[method] || method,
        grandTotal: 0,
        osCount: 0,
        percentage: 0,
        averageTicket: 0,
        color: PAYMENT_COLORS[method] || '#94a3b8',
      };

      item.grandTotal += Number(b.grandTotal) || 0;
      item.osCount += 1;
      map.set(method, item);
    });

    const list = Array.from(map.values()).map(item => {
      item.percentage = totalAnalyzedRevenue > 0 ? (item.grandTotal / totalAnalyzedRevenue) * 100 : 0;
      item.averageTicket = item.osCount > 0 ? item.grandTotal / item.osCount : 0;
      return item;
    });

    // Ordena pelo maior faturamento
    list.sort((a, b) => b.grandTotal - a.grandTotal);

    const topPayment = list[0] || null;

    return {
      list,
      topPayment,
    };
  }, [dataset, totalAnalyzedRevenue]);

  // ----------------------------------------------------
  // 4. ANÁLISE DE CLIENTES & VEÍCULOS
  // ----------------------------------------------------
  const customerAndVehicleAnalysis = useMemo(() => {
    const customerMap = new Map<string, {
      name: string;
      osCount: number;
      grandTotal: number;
      averageTicket: number;
      vehicles: Set<string>;
      lastVisit: string;
    }>();

    const vehicleMap = new Map<string, {
      model: string;
      osCount: number;
      grandTotal: number;
      averageTicket: number;
    }>();

    dataset.forEach((b) => {
      // Cliente
      const custName = b.customerName && b.customerName.trim() ? b.customerName.trim() : 'Balcão / Consumidor Final';
      const custItem = customerMap.get(custName) || {
        name: custName,
        osCount: 0,
        grandTotal: 0,
        averageTicket: 0,
        vehicles: new Set<string>(),
        lastVisit: b.date || '',
      };
      custItem.osCount += 1;
      custItem.grandTotal += Number(b.grandTotal) || 0;
      if (b.vehicleModel) custItem.vehicles.add(b.vehicleModel);
      if (!custItem.lastVisit || b.date > custItem.lastVisit) custItem.lastVisit = b.date;
      customerMap.set(custName, custItem);

      // Veículo
      const model = b.vehicleModel && b.vehicleModel.trim() ? b.vehicleModel.trim() : 'Outros / Não informado';
      const vehItem = vehicleMap.get(model) || {
        model,
        osCount: 0,
        grandTotal: 0,
        averageTicket: 0,
      };
      vehItem.osCount += 1;
      vehItem.grandTotal += Number(b.grandTotal) || 0;
      vehicleMap.set(model, vehItem);
    });

    const topCustomers = Array.from(customerMap.values()).map(c => {
      c.averageTicket = c.osCount > 0 ? c.grandTotal / c.osCount : 0;
      return c;
    }).sort((a, b) => b.grandTotal - a.grandTotal);

    const topVehicles = Array.from(vehicleMap.values()).map(v => {
      v.averageTicket = v.osCount > 0 ? v.grandTotal / v.osCount : 0;
      return v;
    }).sort((a, b) => b.grandTotal - a.grandTotal);

    return {
      topCustomers,
      topVehicles,
    };
  }, [dataset]);

  // ----------------------------------------------------
  // 5. EFICIÊNCIA & INDICADORES 360°
  // ----------------------------------------------------
  const efficiencyMetrics = useMemo(() => {
    let productsSum = 0;
    let servicesSum = 0;
    let alignmentSum = 0;
    let osWithAlignment = 0;
    let osWithProducts = 0;
    let osWithServices = 0;
    let osComplete = 0; // Contém produtos + alinhamento + serviços simultâneos

    dataset.forEach(b => {
      const p = Number(b.productsTotal) || 0;
      const a = Number(b.alignmentBalancingTotal) || 0;
      const s = Number(b.servicesTotal) || 0;

      productsSum += p;
      alignmentSum += a;
      servicesSum += s;

      if (a > 0) osWithAlignment++;
      if (p > 0) osWithProducts++;
      if (s > 0) osWithServices++;
      if (p > 0 && a > 0 && s > 0) osComplete++;
    });

    const totalGrand = productsSum + alignmentSum + servicesSum;
    const avgTicketGeneral = totalAnalyzedOS > 0 ? totalGrand / totalAnalyzedOS : 0;
    const avgTicketProducts = osWithProducts > 0 ? productsSum / osWithProducts : 0;
    const avgTicketServices = (osWithServices + osWithAlignment) > 0 ? (servicesSum + alignmentSum) / (osWithServices + osWithAlignment) : 0;

    const alignmentConversionRate = totalAnalyzedOS > 0 ? (osWithAlignment / totalAnalyzedOS) * 100 : 0;
    const completeOrderRate = totalAnalyzedOS > 0 ? (osComplete / totalAnalyzedOS) * 100 : 0;

    // Relação Produtos por cada R$ 1 de Serviço
    const laborTotal = servicesSum + alignmentSum;
    const productToLaborRatio = laborTotal > 0 ? productsSum / laborTotal : 0;

    return {
      productsSum,
      servicesSum,
      alignmentSum,
      laborTotal,
      avgTicketGeneral,
      avgTicketProducts,
      avgTicketServices,
      alignmentConversionRate,
      completeOrderRate,
      productToLaborRatio,
    };
  }, [dataset, totalAnalyzedOS]);

  // Tooltip customizado para gráfico de colaborador
  const CollabTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = collaboratorAnalysis.list.find(c => c.name === label);
      if (!item) return null;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl border border-slate-700/80 shadow-2xl text-xs space-y-2 min-w-[220px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-slate-100">{item.name}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              {item.osCount} {item.osCount === 1 ? 'OS' : 'OSs'}
            </span>
          </div>

          <div className="flex items-center justify-between font-bold text-emerald-400">
            <span className="text-slate-300">Total Faturado:</span>
            <span className="font-mono text-sm">{formatBRL(item.grandTotal)}</span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-800">
            <span>Ticket Médio:</span>
            <span className="font-mono text-slate-200">{formatBRL(item.averageTicket)}</span>
          </div>

          <div className="space-y-1 pt-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-blue-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> Peças/Óleos:
              </span>
              <span className="font-mono font-medium">{formatBRL(item.productsTotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Alinhamento/Bal.:
              </span>
              <span className="font-mono font-medium">{formatBRL(item.alignmentBalancingTotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Serviços Mecânicos:
              </span>
              <span className="font-mono font-medium">{formatBRL(item.servicesTotal)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Tooltip customizado para gráfico de data
  const DateTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isDaily = dateViewMode === 'daily';
      const item = isDaily 
        ? dateAnalysis.dailyList.find(d => d.dateFormatted === label || d.date === label)
        : dateAnalysis.weekdayList.find(w => w.weekdayName === label);

      if (!item) return null;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl border border-slate-700/80 shadow-2xl text-xs space-y-1.5 min-w-[210px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <span className="font-bold text-slate-100">{label}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
              {item.osCount} {item.osCount === 1 ? 'OS' : 'OSs'}
            </span>
          </div>
          <div className="flex items-center justify-between font-bold text-emerald-400">
            <span className="text-slate-300">Faturamento:</span>
            <span className="font-mono text-sm">{formatBRL(item.grandTotal)}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Ticket Médio do Dia:</span>
            <span className="font-mono text-slate-200">{formatBRL(item.averageTicket)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-5 p-5 sm:p-6 transition-all">
      
      {/* Top Header do Módulo de Análises */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Central de Análises & Inteligência de Faturamento</span>
                <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Ao Vivo
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Métricas detalhadas por colaborador, evolução temporal por data, meios de pagamento e perfil de clientes.
              </p>
            </div>
          </div>
        </div>

        {/* Controles de Escopo (Filtro Atual vs Todo o Histórico) */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setScope('scoped')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                scope === 'scoped'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Analisar apenas os registros que atendem aos filtros ativos na tela"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Período Filtrado ({totalAnalyzedOS} OS)</span>
            </button>

            <button
              onClick={() => setScope('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                scope === 'all'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Analisar todo o histórico consolidado de faturamento"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Todo o Histórico ({allBillings ? allBillings.length : billings.length} OS)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Navegação entre Categorias de Análise */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 scrollbar-none">
        
        <button
          onClick={() => setActiveTab('collaborator')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'collaborator'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Por Colaborador / Mecânico</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            activeTab === 'collaborator' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {collaboratorAnalysis.list.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('date')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'date'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Por Data & Linha do Tempo</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            activeTab === 'date' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {dateAnalysis.activeDaysCount} dias
          </span>
        </button>

        <button
          onClick={() => setActiveTab('payment')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'payment'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Formas de Pagamento</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            activeTab === 'payment' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {paymentAnalysis.list.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'customers'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Clientes & Veículos</span>
        </button>

        <button
          onClick={() => setActiveTab('efficiency')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'efficiency'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Eficiência & Ticket Médio</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: ANÁLISE POR COLABORADOR                           */}
      {/* ======================================================== */}
      {activeTab === 'collaborator' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          {/* Cards de Destaque dos Colaboradores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* Destaque 1: Top Faturamento */}
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-4 rounded-xl border border-amber-200/80 shadow-2xs relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Líder em Faturamento
                </span>
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="font-bold text-slate-900 text-sm truncate">
                  {collaboratorAnalysis.topRevenue ? collaboratorAnalysis.topRevenue.name : '—'}
                </div>
                <div className="text-xl font-extrabold font-mono text-amber-700 tabular-nums mt-0.5">
                  {collaboratorAnalysis.topRevenue ? formatBRL(collaboratorAnalysis.topRevenue.grandTotal) : 'R$ 0,00'}
                </div>
              </div>
              <div className="mt-2 text-[11px] text-amber-800 flex items-center justify-between pt-1 border-t border-amber-200/50">
                <span>{collaboratorAnalysis.topRevenue?.osCount || 0} ordens executadas</span>
                <span className="font-bold font-mono">
                  {collaboratorAnalysis.topRevenue?.percentage.toFixed(1)}% do total
                </span>
              </div>
            </div>

            {/* Destaque 2: Líder em Mão de Obra & Serviços */}
            <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-4 rounded-xl border border-emerald-200/80 shadow-2xs relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Destaque em Mão de Obra
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <Wrench className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="font-bold text-slate-900 text-sm truncate">
                  {collaboratorAnalysis.topServices ? collaboratorAnalysis.topServices.name : '—'}
                </div>
                <div className="text-xl font-extrabold font-mono text-emerald-700 tabular-nums mt-0.5">
                  {collaboratorAnalysis.topServices
                    ? formatBRL(collaboratorAnalysis.topServices.servicesTotal + collaboratorAnalysis.topServices.alignmentBalancingTotal)
                    : 'R$ 0,00'}
                </div>
              </div>
              <div className="mt-2 text-[11px] text-emerald-800 flex items-center justify-between pt-1 border-t border-emerald-200/50">
                <span>Serviços + Alinhamento</span>
                <span className="font-bold">Alta produtividade</span>
              </div>
            </div>

            {/* Destaque 3: Líder em Venda de Produtos */}
            <div className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent p-4 rounded-xl border border-blue-200/80 shadow-2xs relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
                  Destaque em Peças/Óleos
                </span>
                <div className="w-7 h-7 rounded-lg bg-blue-500 text-white flex items-center justify-center shadow-xs">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="font-bold text-slate-900 text-sm truncate">
                  {collaboratorAnalysis.topProducts ? collaboratorAnalysis.topProducts.name : '—'}
                </div>
                <div className="text-xl font-extrabold font-mono text-blue-700 tabular-nums mt-0.5">
                  {collaboratorAnalysis.topProducts ? formatBRL(collaboratorAnalysis.topProducts.productsTotal) : 'R$ 0,00'}
                </div>
              </div>
              <div className="mt-2 text-[11px] text-blue-800 flex items-center justify-between pt-1 border-t border-blue-200/50">
                <span>Pneus, óleos e filtros</span>
                <span className="font-bold">Maior volume</span>
              </div>
            </div>

            {/* Destaque 4: Maior Ticket Médio */}
            <div className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent p-4 rounded-xl border border-purple-200/80 shadow-2xs relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800">
                  Maior Ticket Médio
                </span>
                <div className="w-7 h-7 rounded-lg bg-purple-500 text-white flex items-center justify-center shadow-xs">
                  <Target className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="font-bold text-slate-900 text-sm truncate">
                  {collaboratorAnalysis.topTicket ? collaboratorAnalysis.topTicket.name : '—'}
                </div>
                <div className="text-xl font-extrabold font-mono text-purple-700 tabular-nums mt-0.5">
                  {collaboratorAnalysis.topTicket ? formatBRL(collaboratorAnalysis.topTicket.averageTicket) : 'R$ 0,00'}
                </div>
              </div>
              <div className="mt-2 text-[11px] text-purple-800 flex items-center justify-between pt-1 border-t border-purple-200/50">
                <span>Média por Ordem de Serviço</span>
                <span className="font-bold">Valor agregado</span>
              </div>
            </div>
          </div>

          {/* Gráfico de Barras por Colaborador */}
          <div className="bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  <span>Comparativo Financeiro por Colaborador</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Faturamento consolidado e proporção entre peças, alinhamento e serviços mecânicos de cada profissional.
                </p>
              </div>

              <div className="inline-flex p-1 bg-white rounded-xl border border-slate-200 text-xs self-start sm:self-auto">
                <button
                  onClick={() => setCollabChartMode('stacked')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    collabChartMode === 'stacked'
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Composição
                </button>
                <button
                  onClick={() => setCollabChartMode('total')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    collabChartMode === 'total'
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Faturamento Total
                </button>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={collaboratorAnalysis.list}
                  margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                    tickFormatter={(v) => v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`}
                  />
                  <Tooltip content={<CollabTooltip />} />
                  
                  {collabChartMode === 'stacked' ? (
                    <>
                      <Bar
                        dataKey="productsTotal"
                        name="Produtos"
                        fill="#3b82f6"
                        stackId="collab"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="alignmentBalancingTotal"
                        name="Alinhamento/Bal."
                        fill="#10b981"
                        stackId="collab"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="servicesTotal"
                        name="Serviços"
                        fill="#f59e0b"
                        stackId="collab"
                        radius={[6, 6, 0, 0]}
                      />
                    </>
                  ) : (
                    <Bar
                      dataKey="grandTotal"
                      name="Faturamento Total"
                      fill="#6366f1"
                      radius={[6, 6, 0, 0]}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legenda do Gráfico */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 border-t border-slate-200 text-slate-600">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Peças/Produtos
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Alinhamento & Bal.
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Serviços Mecânicos
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Total de colaboradores ativos: <strong>{collaboratorAnalysis.list.length}</strong>
              </span>
            </div>
          </div>

          {/* Tabela de Ranking dos Colaboradores */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Ranking & Produtividade Individual dos Colaboradores</span>
              </h3>
              <span className="text-xs text-slate-500">
                Ordenado pelo faturamento decrescente
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">Pos.</th>
                    <th className="py-3 px-4">Colaborador / Especialidade</th>
                    <th className="py-3 px-3 text-center">Qtd OS</th>
                    <th className="py-3 px-3 text-right">Peças & Produtos</th>
                    <th className="py-3 px-3 text-right">Alinhamento & Bal.</th>
                    <th className="py-3 px-3 text-right">Mão de Obra</th>
                    <th className="py-3 px-4 text-right">Faturamento Total</th>
                    <th className="py-3 px-3 text-right">Ticket Médio</th>
                    <th className="py-3 px-4 w-32">Participação</th>
                    <th className="py-3 px-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {collaboratorAnalysis.list.map((c, index) => {
                    const initials = c.name
                      .split(' ')
                      .map(p => p[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    return (
                      <tr key={c.name} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center font-bold font-mono">
                          {index === 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs shadow-2xs">
                              🥇
                            </span>
                          ) : index === 1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs shadow-2xs">
                              🥈
                            </span>
                          ) : index === 2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-50 text-amber-800 text-xs border border-amber-200 shadow-2xs">
                              🥉
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">#{index + 1}</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs">{c.name}</div>
                              <div className="text-[11px] text-slate-500">
                                {c.plates.size} {c.plates.size === 1 ? 'veículo atendido' : 'veículos atendidos'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center font-bold font-mono text-slate-700">
                          {c.osCount}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-blue-700">
                          {formatBRL(c.productsTotal)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-emerald-700">
                          {formatBRL(c.alignmentBalancingTotal)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-amber-700">
                          {formatBRL(c.servicesTotal)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                          {formatBRL(c.grandTotal)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-semibold text-indigo-700">
                          {formatBRL(c.averageTicket)}
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                              <span>{c.percentage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${Math.min(100, c.percentage)}%` }}
                                className="bg-indigo-600 h-full rounded-full"
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          {onFilterByCollaborator && (
                            <button
                              onClick={() => onFilterByCollaborator(c.name)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                              title={`Filtrar listagem de OS para ${c.name}`}
                            >
                              Filtrar OS
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: ANÁLISE POR DATA & LINHA DO TEMPO                  */}
      {/* ======================================================== */}
      {activeTab === 'date' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          {/* Top KPIs Temporais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* KPI 1: Dia Recorde */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                Dia com Maior Faturamento
              </span>
              <div className="text-xl font-black font-mono text-emerald-700 tabular-nums">
                {dateAnalysis.peakDay ? formatBRL(dateAnalysis.peakDay.grandTotal) : 'R$ 0,00'}
              </div>
              <div className="text-xs text-slate-600 flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="font-semibold text-slate-800">
                  {dateAnalysis.peakDay ? `${dateAnalysis.peakDay.dateFormatted} (${dateAnalysis.peakDay.weekday})` : '—'}
                </span>
                <span className="font-mono text-indigo-600 font-bold">
                  {dateAnalysis.peakDay?.osCount || 0} OS
                </span>
              </div>
            </div>

            {/* KPI 2: Média Diária */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                Média de Faturamento Diário
              </span>
              <div className="text-xl font-black font-mono text-slate-900 tabular-nums">
                {formatBRL(dateAnalysis.averageDailyRevenue)}
              </div>
              <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200">
                <span>Calculado em {dateAnalysis.activeDaysCount} dias com OS</span>
                <span className="font-mono font-medium text-slate-700">
                  {(totalAnalyzedOS / Math.max(1, dateAnalysis.activeDaysCount)).toFixed(1)} OS/dia
                </span>
              </div>
            </div>

            {/* KPI 3: Dia da Semana Mais Forte */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Dia da Semana Mais Rentável
              </span>
              <div className="text-xl font-black text-indigo-700 truncate">
                {dateAnalysis.busiestWeekday?.weekdayName || '—'}
              </div>
              <div className="text-xs text-slate-600 flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="font-mono font-bold text-slate-800">
                  {dateAnalysis.busiestWeekday ? formatBRL(dateAnalysis.busiestWeekday.grandTotal) : 'R$ 0,00'}
                </span>
                <span className="font-mono text-slate-500">
                  {dateAnalysis.busiestWeekday?.osCount || 0} OS
                </span>
              </div>
            </div>

          </div>

          {/* Gráfico Temporal Recharts */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>
                    {dateViewMode === 'daily'
                      ? 'Linha do Tempo de Faturamento Diário'
                      : 'Concentração de Faturamento por Dia da Semana'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  {dateViewMode === 'daily'
                    ? 'Acompanhe a curva diária de receita gerada e picos de demanda da oficina'
                    : 'Compare quais dias da semana trazem maior fluxo de clientes e receita'}
                </p>
              </div>

              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs self-start sm:self-auto">
                <button
                  onClick={() => setDateViewMode('daily')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    dateViewMode === 'daily'
                      ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Evolução Diária
                </button>
                <button
                  onClick={() => setDateViewMode('weekday')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    dateViewMode === 'weekday'
                      ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Por Dia da Semana
                </button>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {dateViewMode === 'daily' ? (
                  <AreaChart
                    data={dateAnalysis.dailyList}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorGrandTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="dateFormatted"
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                      tickFormatter={(v) => v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`}
                    />
                    <Tooltip content={<DateTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="grandTotal"
                      name="Faturamento (R$)"
                      stroke="#4f46e5"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorGrandTotal)"
                    />
                  </AreaChart>
                ) : (
                  <BarChart
                    data={dateAnalysis.weekdayList}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="weekdayName"
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                      tickFormatter={(v) => v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`}
                    />
                    <Tooltip content={<DateTooltip />} />
                    <Bar
                      dataKey="grandTotal"
                      name="Faturamento Total"
                      fill="#8b5cf6"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>{dateAnalysis.dailyList.length} datas registradas no período analisado</span>
              <span>Passe o cursor sobre os pontos ou barras para ver dados de OS e ticket</span>
            </div>
          </div>

          {/* Tabela de Detalhamento Cronológico */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                Detalhamento Cronológico por Data
              </h3>
              <span className="text-xs text-slate-500">
                Valores consolidados por dia
              </span>
            </div>

            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">Data</th>
                    <th className="py-2.5 px-4">Dia da Semana</th>
                    <th className="py-2.5 px-4 text-center">Qtd OS</th>
                    <th className="py-2.5 px-4 text-right">Peças & Produtos</th>
                    <th className="py-2.5 px-4 text-right">Alinhamento & Bal.</th>
                    <th className="py-2.5 px-4 text-right">Serviços</th>
                    <th className="py-2.5 px-4 text-right">Faturamento do Dia</th>
                    <th className="py-2.5 px-4 text-right">Ticket Médio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dateAnalysis.dailyList.map(d => (
                    <tr key={d.date} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        {d.dateFormatted}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {d.weekday}
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold font-mono text-indigo-700">
                        {d.osCount}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-blue-700">
                        {formatBRL(d.productsTotal)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-emerald-700">
                        {formatBRL(d.alignmentBalancingTotal)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-amber-700">
                        {formatBRL(d.servicesTotal)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-extrabold text-slate-900">
                        {formatBRL(d.grandTotal)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                        {formatBRL(d.averageTicket)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 3: FORMAS DE PAGAMENTO                               */}
      {/* ======================================================== */}
      {activeTab === 'payment' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Gráfico Donut de Formas de Pagamento (5 colunas) */}
            <div className="lg:col-span-5 bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span>Distribuição por Forma de Pagamento</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Participação percentual de cada método na receita líquida faturada.
                </p>
              </div>

              <div className="h-56 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentAnalysis.list}
                      dataKey="grandTotal"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {paymentAnalysis.list.map((entry) => (
                        <Cell key={entry.method} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [formatBRL(Number(value)), 'Faturamento']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Centro do Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
                  <span className="text-sm font-black font-mono text-slate-800">
                    {formatBRL(totalAnalyzedRevenue)}
                  </span>
                </div>
              </div>

              {/* Destaque do Método Campeão */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Forma Mais Utilizada
                  </span>
                  <span className="font-bold text-slate-900">
                    {paymentAnalysis.topPayment?.label || '—'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-emerald-700 block text-sm">
                    {formatBRL(paymentAnalysis.topPayment?.grandTotal || 0)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {paymentAnalysis.topPayment?.percentage.toFixed(1)}% da receita
                  </span>
                </div>
              </div>
            </div>

            {/* Lista e Cards de Meios de Pagamento (7 colunas) */}
            <div className="lg:col-span-7 space-y-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>Detalhamento dos Meios de Pagamento</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {paymentAnalysis.list.map((item) => (
                  <div
                    key={item.method}
                    className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-2 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-bold text-slate-900 text-xs">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>

                    <div className="text-lg font-black font-mono text-slate-900 tabular-nums">
                      {formatBRL(item.grandTotal)}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
                      <span>{item.osCount} {item.osCount === 1 ? 'OS atendida' : 'OS atendidas'}</span>
                      <span className="font-semibold text-slate-700">
                        Ticket Médio: {formatBRL(item.averageTicket)}
                      </span>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                      <div
                        style={{
                          width: `${Math.min(100, item.percentage)}%`,
                          backgroundColor: item.color
                        }}
                        className="h-full rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Botão de Filtro Rápido */}
              {onFilterByPayment && (
                <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs text-indigo-900 flex items-center justify-between">
                  <span>Dica: É possível filtrar a listagem geral por qualquer meio de pagamento.</span>
                  <button
                    onClick={() => onFilterByPayment('PIX')}
                    className="font-bold text-indigo-700 hover:underline cursor-pointer"
                  >
                    Filtrar por PIX
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 4: CLIENTES & VEÍCULOS                                */}
      {/* ======================================================== */}
      {activeTab === 'customers' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* Top Clientes / Empresas */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Top Clientes por Receita Faturada</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Frotas, empresas parceiras e clientes particulares de maior volume
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {customerAndVehicleAnalysis.topCustomers.map((c, idx) => (
                  <div key={c.name} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{c.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{c.osCount} {c.osCount === 1 ? 'OS' : 'OSs'}</span>
                          <span>·</span>
                          <span>Última: {formatDateBR(c.lastVisit)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        {formatBRL(c.grandTotal)}
                      </div>
                      <div className="text-[11px] text-indigo-600 font-mono">
                        Ticket: {formatBRL(c.averageTicket)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modelos de Veículos Mais Atendidos */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-emerald-600" />
                    <span>Veículos & Frotas Mais Frequentes</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Modelos mais recorrentes e faturamento gerado na oficina
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {customerAndVehicleAnalysis.topVehicles.map((v, idx) => (
                  <div key={v.model} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{v.model}</div>
                        <div className="text-[11px] text-slate-500">
                          {v.osCount} {v.osCount === 1 ? 'passagem' : 'passagens'} pela oficina
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-emerald-700 text-sm">
                        {formatBRL(v.grandTotal)}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Ticket: {formatBRL(v.averageTicket)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 5: EFICIÊNCIA & INDICADORES 360°                      */}
      {/* ======================================================== */}
      {activeTab === 'efficiency' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Indicador 1: Relação Peças x Mão de Obra */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Relação Peças / Mão de Obra
              </span>
              <div className="text-2xl font-black font-mono text-slate-900">
                R$ {efficiencyMetrics.productToLaborRatio.toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                Para cada R$ 1,00 de serviço executado, a LORD LUB vende <strong>R$ {efficiencyMetrics.productToLaborRatio.toFixed(2)}</strong> em peças/óleos.
              </p>
            </div>

            {/* Indicador 2: Conversão de Alinhamento & Geometria */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                Taxa de Adesão a Alinhamento
              </span>
              <div className="text-2xl font-black font-mono text-emerald-700">
                {efficiencyMetrics.alignmentConversionRate.toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                Porcentagem de ordens de serviço que incluíram Alinhamento 3D ou Balanceamento.
              </p>
            </div>

            {/* Indicador 3: Taxa de OS Completa (Combo) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                Ordens Completas (Combo Triplo)
              </span>
              <div className="text-2xl font-black font-mono text-indigo-700">
                {efficiencyMetrics.completeOrderRate.toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                OSs com venda simultânea de Peças + Alinhamento + Mão de Obra geral.
              </p>
            </div>

            {/* Indicador 4: Ticket Médio Global */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800">
                Ticket Médio Geral
              </span>
              <div className="text-2xl font-black font-mono text-purple-700">
                {formatBRL(efficiencyMetrics.avgTicketGeneral)}
              </div>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                Média líquida por passagem de veículo na oficina.
              </p>
            </div>

          </div>

          {/* Resumo de Metas e Alavancas de Negócio */}
          <div className="bg-indigo-900 text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Dica Estratégica para Aumento de Faturamento
              </span>
              <h4 className="text-base font-bold text-white">
                Foco no Combo: Óleo + Filtros + Alinhamento 3D Computadorizado
              </h4>
              <p className="text-xs text-indigo-200 max-w-2xl">
                Ordens que agregam alinhamento e geometria geram em média 38% mais margem líquida para o centro automotivo. Incentive os aplicadores com a aba de ranking individual.
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <button
                onClick={() => setActiveTab('collaborator')}
                className="px-4 py-2 bg-white text-indigo-900 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <span>Ver Produtividade da Equipe</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
