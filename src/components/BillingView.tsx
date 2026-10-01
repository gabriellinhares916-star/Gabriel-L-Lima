import React, { useState, useMemo } from 'react';
import { BillingRecord, BillingPaymentMethod, Employee } from '../types';
import { formatBRL, formatDateBR } from '../utils/stockCalculations';
import { CompanySettings } from '../utils/companySettings';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  DollarSign,
  Wrench,
  Gauge,
  Package,
  Car,
  CreditCard,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  ArrowUpDown,
  Percent,
  Check,
  User,
  UserCheck,
  Users,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Layers
} from 'lucide-react';
import { BillingAnalytics } from './BillingAnalytics';

interface BillingViewProps {
  billings: BillingRecord[];
  onAddBilling: (record: Omit<BillingRecord, 'id' | 'createdAt' | 'grandTotal'>) => void;
  onUpdateBilling: (id: string, updates: Partial<BillingRecord>) => void;
  onDeleteBilling: (id: string) => void;
  onResetDemo: () => void;
  companySettings?: CompanySettings;
  employees?: Employee[];
}

const PAYMENT_METHOD_LABELS: Record<BillingPaymentMethod, string> = {
  PIX: 'PIX',
  DINHEIRO: 'Dinheiro',
  CARTAO_CREDITO: 'Cartão de Crédito',
  CARTAO_DEBITO: 'Cartão de Débito',
  BOLETO: 'Boleto',
  FATURADO: 'Faturado (A Prazo)',
  OUTRO: 'Outro',
};

export const BillingView: React.FC<BillingViewProps> = ({
  billings,
  onAddBilling,
  onUpdateBilling,
  onDeleteBilling,
  onResetDemo,
  companySettings,
  employees = [],
}) => {
  // Modal de Cadastro / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BillingRecord | null>(null);

  // Filtros
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL'); // 'ALL' ou 'YYYY-MM'
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [collaboratorFilter, setCollaboratorFilter] = useState<string>('ALL');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Estado do Formulário
  const todayStr = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    date: todayStr,
    serviceOrderNumber: '',
    collaboratorName: '',
    collaboratorId: '',
    productsTotal: '',
    alignmentBalancingTotal: '',
    servicesTotal: '',
    customerName: '',
    vehiclePlate: '',
    vehicleModel: '',
    paymentMethod: 'PIX' as BillingPaymentMethod,
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Obter meses únicos disponíveis nos registros para o filtro
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    billings.forEach((b) => {
      if (b.date && b.date.length >= 7) {
        months.add(b.date.substring(0, 7));
      }
    });
    return Array.from(months).sort().reverse();
  }, [billings]);

  // Obter lista única de colaboradores para o filtro
  const availableCollaborators = useMemo(() => {
    const collabs = new Set<string>();
    billings.forEach((b) => {
      if (b.collaboratorName && b.collaboratorName.trim()) {
        collabs.add(b.collaboratorName.trim());
      }
    });
    employees.forEach((emp) => {
      if (emp.name && emp.name.trim()) {
        collabs.add(emp.name.trim());
      }
    });
    return Array.from(collabs).sort();
  }, [billings, employees]);

  // Filtragem dos registros
  const filteredBillings = useMemo(() => {
    return billings.filter((b) => {
      // Filtro de mês
      if (selectedMonth !== 'ALL') {
        if (!b.date.startsWith(selectedMonth)) return false;
      }

      // Filtro de pagamento
      if (paymentFilter !== 'ALL') {
        if (b.paymentMethod !== paymentFilter) return false;
      }

      // Filtro de colaborador
      if (collaboratorFilter !== 'ALL') {
        if (b.collaboratorName !== collaboratorFilter) return false;
      }

      // Busca por OS, Colaborador, Cliente, Placa ou Modelo
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const osMatch = b.serviceOrderNumber.toLowerCase().includes(query);
        const collaboratorMatch = b.collaboratorName?.toLowerCase().includes(query) ?? false;
        const customerMatch = b.customerName?.toLowerCase().includes(query) ?? false;
        const plateMatch = b.vehiclePlate?.toLowerCase().includes(query) ?? false;
        const modelMatch = b.vehicleModel?.toLowerCase().includes(query) ?? false;
        if (!osMatch && !collaboratorMatch && !customerMatch && !plateMatch && !modelMatch) return false;
      }

      return true;
    });
  }, [billings, selectedMonth, paymentFilter, collaboratorFilter, searchTerm]);

  // Totais e Métricas
  const metrics = useMemo(() => {
    let totalGrand = 0;
    let totalProducts = 0;
    let totalAlignment = 0;
    let totalServices = 0;
    const collaboratorSet = new Set<string>();

    filteredBillings.forEach((b) => {
      totalGrand += b.grandTotal;
      totalProducts += b.productsTotal;
      totalAlignment += b.alignmentBalancingTotal;
      totalServices += b.servicesTotal;
      if (b.collaboratorName?.trim()) {
        collaboratorSet.add(b.collaboratorName.trim());
      }
    });

    const count = filteredBillings.length;
    const averageTicket = count > 0 ? totalGrand / count : 0;

    const productsPercent = totalGrand > 0 ? (totalProducts / totalGrand) * 100 : 0;
    const alignmentPercent = totalGrand > 0 ? (totalAlignment / totalGrand) * 100 : 0;
    const servicesPercent = totalGrand > 0 ? (totalServices / totalGrand) * 100 : 0;

    return {
      totalGrand,
      totalProducts,
      totalAlignment,
      totalServices,
      count,
      averageTicket,
      productsPercent,
      alignmentPercent,
      servicesPercent,
      collaboratorCount: collaboratorSet.size,
    };
  }, [filteredBillings]);

  // Total da OS calculado ao vivo no modal
  const liveModalGrandTotal = useMemo(() => {
    const prod = parseFloat(formData.productsTotal) || 0;
    const align = parseFloat(formData.alignmentBalancingTotal) || 0;
    const serv = parseFloat(formData.servicesTotal) || 0;
    return Math.round((prod + align + serv) * 100) / 100;
  }, [formData.productsTotal, formData.alignmentBalancingTotal, formData.servicesTotal]);

  const handleOpenAddModal = () => {
    setEditingRecord(null);
    setFormData({
      date: todayStr,
      serviceOrderNumber: '',
      collaboratorName: '',
      collaboratorId: '',
      productsTotal: '',
      alignmentBalancingTotal: '',
      servicesTotal: '',
      customerName: '',
      vehiclePlate: '',
      vehicleModel: '',
      paymentMethod: 'PIX',
      notes: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record: BillingRecord) => {
    setEditingRecord(record);
    setFormData({
      date: record.date,
      serviceOrderNumber: record.serviceOrderNumber,
      collaboratorName: record.collaboratorName || '',
      collaboratorId: record.collaboratorId || '',
      productsTotal: record.productsTotal.toString(),
      alignmentBalancingTotal: record.alignmentBalancingTotal.toString(),
      servicesTotal: record.servicesTotal.toString(),
      customerName: record.customerName || '',
      vehiclePlate: record.vehiclePlate || '',
      vehicleModel: record.vehicleModel || '',
      paymentMethod: record.paymentMethod || 'PIX',
      notes: record.notes || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.date) {
      errors.date = 'A data do faturamento é obrigatória.';
    }

    if (!formData.serviceOrderNumber.trim()) {
      errors.serviceOrderNumber = 'O número da Ordem de Serviço (OS) é obrigatório.';
    }

    if (formData.productsTotal === '' || isNaN(parseFloat(formData.productsTotal)) || parseFloat(formData.productsTotal) < 0) {
      errors.productsTotal = 'Informe o total de produtos (digite 0 se não houver).';
    }

    if (formData.alignmentBalancingTotal === '' || isNaN(parseFloat(formData.alignmentBalancingTotal)) || parseFloat(formData.alignmentBalancingTotal) < 0) {
      errors.alignmentBalancingTotal = 'Informe o total de alinhamento e balanceamento (digite 0 se não houver).';
    }

    if (formData.servicesTotal === '' || isNaN(parseFloat(formData.servicesTotal)) || parseFloat(formData.servicesTotal) < 0) {
      errors.servicesTotal = 'Informe o total de serviços (digite 0 se não houver).';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      date: formData.date,
      serviceOrderNumber: formData.serviceOrderNumber.trim(),
      collaboratorName: formData.collaboratorName.trim() || undefined,
      collaboratorId: formData.collaboratorId.trim() || undefined,
      productsTotal: parseFloat(formData.productsTotal) || 0,
      alignmentBalancingTotal: parseFloat(formData.alignmentBalancingTotal) || 0,
      servicesTotal: parseFloat(formData.servicesTotal) || 0,
      customerName: formData.customerName.trim() || undefined,
      vehiclePlate: formData.vehiclePlate.trim().toUpperCase() || undefined,
      vehicleModel: formData.vehicleModel.trim() || undefined,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes.trim() || undefined,
    };

    if (editingRecord) {
      onUpdateBilling(editingRecord.id, payload);
    } else {
      onAddBilling(payload);
    }

    setIsModalOpen(false);
  };

  const handleExportCSV = () => {
    if (filteredBillings.length === 0) return;

    const headers = [
      'Data',
      'Ordem de Serviço',
      'Colaborador / Mecânico',
      'Cliente',
      'Placa',
      'Veículo',
      'Total Produtos (R$)',
      'Total Alinhamento/Balanceamento (R$)',
      'Total Serviços (R$)',
      'Total Geral OS (R$)',
      'Forma de Pagamento',
      'Observações'
    ];

    const rows = filteredBillings.map((b) => [
      formatDateBR(b.date),
      `"${b.serviceOrderNumber}"`,
      `"${b.collaboratorName || ''}"`,
      `"${b.customerName || ''}"`,
      `"${b.vehiclePlate || ''}"`,
      `"${b.vehicleModel || ''}"`,
      b.productsTotal.toFixed(2).replace('.', ','),
      b.alignmentBalancingTotal.toFixed(2).replace('.', ','),
      b.servicesTotal.toFixed(2).replace('.', ','),
      b.grandTotal.toFixed(2).replace('.', ','),
      `"${PAYMENT_METHOD_LABELS[b.paymentMethod || 'PIX']}"`,
      `"${(b.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Faturamento_LORD_LUB_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
            <Receipt className="w-3.5 h-3.5" />
            Controle de Receitas & Ordens de Serviço
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Faturamento {companySettings?.tradeName ? `• ${companySettings.tradeName}` : ''}
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Gestão diária de OS com discriminação obrigatória de <strong>Produtos</strong>, <strong>Alinhamento & Balanceamento</strong> e <strong>Serviços Gerais</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shadow-2xs ${
              showAnalytics
                ? 'bg-indigo-600/90 hover:bg-indigo-600 text-white border-indigo-400/40'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
            }`}
            title="Alternar visibilidade do painel de análises detalhadas"
          >
            <BarChart3 className="w-4 h-4 text-indigo-200" />
            <span>{showAnalytics ? 'Ocultar Análises' : 'Exibir Análises'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredBillings.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/15 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-300" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Lançar Faturamento (OS)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Faturamento Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Faturamento Total
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold font-mono text-slate-900 tabular-nums">
              {formatBRL(metrics.totalGrand)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>{metrics.count} {metrics.count === 1 ? 'OS lançada' : 'OS lançadas'}</span>
            <span className="font-semibold text-slate-700">Méd: {formatBRL(metrics.averageTicket)}</span>
          </div>
        </div>

        {/* Card 2: Total Venda de Produtos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Venda de Produtos
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold font-mono text-blue-700 tabular-nums">
              {formatBRL(metrics.totalProducts)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Peças, óleos e filtros</span>
            <span className="font-bold text-blue-700 font-mono">
              {metrics.productsPercent.toFixed(1)}% do total
            </span>
          </div>
        </div>

        {/* Card 3: Total Alinhamento e Balanceamento */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Alinhamento & Balanceamento
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Gauge className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold font-mono text-emerald-700 tabular-nums">
              {formatBRL(metrics.totalAlignment)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Alinhamento 3D / Rodas</span>
            <span className="font-bold text-emerald-700 font-mono">
              {metrics.alignmentPercent.toFixed(1)}% do total
            </span>
          </div>
        </div>

        {/* Card 4: Total de Serviços */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Total de Serviços
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold font-mono text-amber-700 tabular-nums">
              {formatBRL(metrics.totalServices)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Mão de obra mecânica</span>
            <span className="font-bold text-amber-700 font-mono">
              {metrics.servicesPercent.toFixed(1)}% do total
            </span>
          </div>
        </div>
      </div>

      {/* Proporção Visual do Faturamento */}
      {metrics.totalGrand > 0 && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Percent className="w-4 h-4 text-indigo-600" />
              Composição da Receita no Período
            </span>
            <span className="text-slate-500 text-[11px]">
              Base: {formatBRL(metrics.totalGrand)}
            </span>
          </div>

          {/* Barra de Proporção Tripla */}
          <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-100 p-0.5 border border-slate-200">
            <div
              style={{ width: `${metrics.productsPercent}%` }}
              title={`Produtos: ${metrics.productsPercent.toFixed(1)}% (${formatBRL(metrics.totalProducts)})`}
              className="bg-blue-600 h-full rounded-l-full transition-all duration-500"
            />
            <div
              style={{ width: `${metrics.alignmentPercent}%` }}
              title={`Alinhamento/Balanceamento: ${metrics.alignmentPercent.toFixed(1)}% (${formatBRL(metrics.totalAlignment)})`}
              className="bg-emerald-500 h-full transition-all duration-500"
            />
            <div
              style={{ width: `${metrics.servicesPercent}%` }}
              title={`Serviços: ${metrics.servicesPercent.toFixed(1)}% (${formatBRL(metrics.totalServices)})`}
              className="bg-amber-500 h-full rounded-r-full transition-all duration-500"
            />
          </div>

          {/* Legenda Informativa */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
              <span className="text-slate-600">Produtos:</span>
              <strong className="text-slate-900 font-mono ml-auto">
                {formatBRL(metrics.totalProducts)} ({metrics.productsPercent.toFixed(1)}%)
              </strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-slate-600">Alinhamento/Balanceamento:</span>
              <strong className="text-slate-900 font-mono ml-auto">
                {formatBRL(metrics.totalAlignment)} ({metrics.alignmentPercent.toFixed(1)}%)
              </strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
              <span className="text-slate-600">Outros Serviços:</span>
              <strong className="text-slate-900 font-mono ml-auto">
                {formatBRL(metrics.totalServices)} ({metrics.servicesPercent.toFixed(1)}%)
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Central de Novas Análises de Faturamento (Colaboradores, Datas, Pagamento, Clientes, Eficiência) */}
      {showAnalytics && (
        <BillingAnalytics
          billings={filteredBillings}
          allBillings={billings}
          employees={employees}
          selectedMonth={selectedMonth}
          onFilterByCollaborator={(collabName) => {
            setCollaboratorFilter(collabName);
            const tableEl = document.getElementById('billing-table-section');
            if (tableEl) {
              tableEl.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          onFilterByPayment={(payMethod) => {
            setPaymentFilter(payMethod);
            const tableEl = document.getElementById('billing-table-section');
            if (tableEl) {
              tableEl.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          onFilterByMonth={(m) => {
            setSelectedMonth(m);
          }}
        />
      )}

      {/* Toolbar de Busca e Filtros */}
      <div id="billing-table-section" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 scroll-mt-20">
        
        {/* Campo de Busca */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por OS, Colaborador / Mecânico, Cliente, Placa ou Modelo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        {/* Filtros de Mês, Colaborador e Forma de Pagamento */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Filtro Mês */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todos os Meses</option>
              {availableMonths.map((m) => {
                const [year, month] = m.split('-');
                return (
                  <option key={m} value={m}>
                    {month}/{year}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Filtro Colaborador */}
          {availableCollaborators.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              <select
                value={collaboratorFilter}
                onChange={(e) => setCollaboratorFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer max-w-[150px] truncate"
              >
                <option value="ALL">Todos Colaboradores</option>
                {availableCollaborators.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro Pagamento */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todas Formas de Pgto</option>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Contador de Resultados */}
          <span className="text-xs text-slate-500 font-medium px-2 py-1">
            {filteredBillings.length} {filteredBillings.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>
      </div>

      {/* Tabela de Ordens de Serviço Faturadas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredBillings.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-500 flex items-center justify-center mx-auto">
              <Receipt className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                Nenhum faturamento encontrado
              </h3>
              <p className="text-xs text-slate-500">
                Não há ordens de serviço correspondentes aos filtros selecionados. Clique em "Lançar Faturamento (OS)" para registrar a primeira ordem de serviço.
              </p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Lançar Faturamento Agora</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Ordem de Serviço (OS)</th>
                  <th className="py-3 px-4">Colaborador / Mecânico</th>
                  <th className="py-3 px-4">Cliente / Veículo</th>
                  <th className="py-3 px-4 text-right">Venda Produtos</th>
                  <th className="py-3 px-4 text-right">Alinhamento / Balanceamento</th>
                  <th className="py-3 px-4 text-right">Total Serviços</th>
                  <th className="py-3 px-4 text-right font-extrabold text-slate-900 bg-slate-100/60">
                    Total Geral da OS
                  </th>
                  <th className="py-3 px-4 text-center">Pagamento</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBillings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    
                    {/* Data */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                      {formatDateBR(b.date)}
                    </td>

                    {/* Ordem de Serviço */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-indigo-700 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100">
                          {b.serviceOrderNumber}
                        </span>
                      </div>
                    </td>

                    {/* Colaborador / Mecânico que Fez o Serviço */}
                    <td className="py-3.5 px-4">
                      {b.collaboratorName ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black shrink-0 border border-indigo-200 shadow-2xs">
                            {b.collaboratorName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-800 truncate max-w-[130px] block" title={b.collaboratorName}>
                            {b.collaboratorName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">—</span>
                      )}
                    </td>

                    {/* Cliente & Veículo */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-900 block truncate max-w-[200px]">
                          {b.customerName || <span className="text-slate-400 italic">Cliente Balcão</span>}
                        </span>
                        {(b.vehiclePlate || b.vehicleModel) && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            {b.vehiclePlate && (
                              <span className="font-mono font-bold uppercase bg-slate-100 border border-slate-300 text-slate-800 px-1.5 py-0.2 rounded text-[10px]">
                                {b.vehiclePlate}
                              </span>
                            )}
                            {b.vehicleModel && (
                              <span className="truncate max-w-[140px]">{b.vehicleModel}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Venda Produtos */}
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-blue-700 tabular-nums">
                      {formatBRL(b.productsTotal)}
                    </td>

                    {/* Alinhamento & Balanceamento */}
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-emerald-700 tabular-nums">
                      {formatBRL(b.alignmentBalancingTotal)}
                    </td>

                    {/* Total Serviços */}
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-amber-700 tabular-nums">
                      {formatBRL(b.servicesTotal)}
                    </td>

                    {/* Total Geral da OS */}
                    <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 tabular-nums text-sm bg-slate-50/50">
                      {formatBRL(b.grandTotal)}
                    </td>

                    {/* Pagamento */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {PAYMENT_METHOD_LABELS[b.paymentMethod || 'PIX']}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(b)}
                          title="Editar lançamento da OS"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeleteConfirmId(b.id)}
                          title="Excluir lançamento da OS"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                Excluir faturamento da OS?
              </h3>
              <p className="text-xs text-slate-500">
                Esta ação removerá o registro e atualizará os totais do período.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirmId) {
                    onDeleteBilling(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }
                }}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Principal: Lançar / Editar Faturamento de OS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header do Modal */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    {editingRecord ? 'Editar Faturamento de OS' : 'Lançar Novo Faturamento (OS)'}
                  </h2>
                  <p className="text-xs text-slate-300">
                    Preencha a data, o número da OS e os 3 valores obrigatórios.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Linha 1: Data e Número da OS (Obrigatórios) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 1. Data */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <span>1. Data do Faturamento</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.date ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-white'
                    }`}
                  />
                  {formErrors.date && (
                    <span className="text-[11px] text-rose-600 block mt-1">{formErrors.date}</span>
                  )}
                </div>

                {/* 2. Ordem de Serviço (OS) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <span>2. Ordem de Serviço (OS)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: OS-1052 ou 1052"
                    value={formData.serviceOrderNumber}
                    onChange={(e) => setFormData({ ...formData, serviceOrderNumber: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.serviceOrderNumber ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-white'
                    }`}
                  />
                  {formErrors.serviceOrderNumber && (
                    <span className="text-[11px] text-rose-600 block mt-1">{formErrors.serviceOrderNumber}</span>
                  )}
                </div>
              </div>

              {/* Colaborador / Mecânico que Realizou o Serviço */}
              <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-150 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Colaborador / Mecânico que Fez o Serviço</span>
                  </label>
                  <span className="text-[11px] text-indigo-600 font-medium">Responsável pela execução</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Seletor de Colaboradores da Equipe */}
                  <div>
                    <select
                      value={formData.collaboratorId || (employees?.some(e => e.name === formData.collaboratorName) ? employees.find(e => e.name === formData.collaboratorName)?.id : '')}
                      onChange={(e) => {
                        const empId = e.target.value;
                        if (!empId) {
                          setFormData({ ...formData, collaboratorId: '', collaboratorName: '' });
                        } else {
                          const emp = employees?.find((item) => item.id === empId);
                          if (emp) {
                            setFormData({
                              ...formData,
                              collaboratorId: emp.id,
                              collaboratorName: emp.name,
                            });
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border border-indigo-200 bg-white rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="">-- Selecionar da Equipe Cadastrada --</option>
                      {(employees || []).map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Campo de Texto Livre para Colaborador / Terceirizado */}
                  <div>
                    <input
                      type="text"
                      placeholder="Ou digite o nome do colaborador..."
                      value={formData.collaboratorName}
                      onChange={(e) => {
                        const val = e.target.value;
                        const matchingEmp = employees?.find(emp => emp.name.toLowerCase() === val.toLowerCase());
                        setFormData({
                          ...formData,
                          collaboratorName: val,
                          collaboratorId: matchingEmp ? matchingEmp.id : '',
                        });
                      }}
                      className="w-full px-3 py-2 border border-indigo-200 bg-white rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Atalhos Rápidos com os Colaboradores */}
                {employees && employees.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-indigo-700 font-semibold uppercase tracking-wider mr-1">
                      Atalhos Rápidos:
                    </span>
                    {employees.slice(0, 5).map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            collaboratorId: emp.id,
                            collaboratorName: emp.name,
                          });
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                          formData.collaboratorName === emp.name
                            ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                            : 'bg-white text-indigo-900 border border-indigo-200 hover:bg-indigo-100'
                        }`}
                      >
                        {emp.name.split(' ')[0]} {emp.name.split(' ').slice(-1)[0]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Bloco Destaque: Os 3 Valores Obrigatórios Solicitados */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/90 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Discriminação Obrigatória dos Valores da OS:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* 3. Total de Venda de Produto */}
                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1 flex items-center gap-1">
                      <Package className="w-3.5 h-3.5 text-blue-600" />
                      <span>Total Produtos (R$)</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={formData.productsTotal}
                        onChange={(e) => setFormData({ ...formData, productsTotal: e.target.value })}
                        className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          formErrors.productsTotal ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-white'
                        }`}
                      />
                    </div>
                    {formErrors.productsTotal && (
                      <span className="text-[10px] text-rose-600 block mt-1">{formErrors.productsTotal}</span>
                    )}
                  </div>

                  {/* 4. Total de Venda de Alinhamento e Balanceamento */}
                  <div>
                    <label className="block text-xs font-bold text-emerald-900 mb-1 flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Alinhamento & Bal. (R$)</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={formData.alignmentBalancingTotal}
                        onChange={(e) => setFormData({ ...formData, alignmentBalancingTotal: e.target.value })}
                        className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          formErrors.alignmentBalancingTotal ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-white'
                        }`}
                      />
                    </div>
                    {formErrors.alignmentBalancingTotal && (
                      <span className="text-[10px] text-rose-600 block mt-1">{formErrors.alignmentBalancingTotal}</span>
                    )}
                  </div>

                  {/* 5. Total de Serviço */}
                  <div>
                    <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-amber-600" />
                      <span>Total Serviços (R$)</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={formData.servicesTotal}
                        onChange={(e) => setFormData({ ...formData, servicesTotal: e.target.value })}
                        className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                          formErrors.servicesTotal ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-white'
                        }`}
                      />
                    </div>
                    {formErrors.servicesTotal && (
                      <span className="text-[10px] text-rose-600 block mt-1">{formErrors.servicesTotal}</span>
                    )}
                  </div>
                </div>

                {/* Caixa de Soma Automática do Total Geral */}
                <div className="bg-white p-3 rounded-xl border border-indigo-200 flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                      Total Geral Calculado da OS:
                    </span>
                    <span className="text-xs text-slate-500">
                      Soma automática (Produtos + Alinhamento/Bal. + Serviços)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black font-mono text-emerald-700 tabular-nums">
                      {formatBRL(liveModalGrandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Informações Complementares Opcionais (Cliente, Veículo, Pagamento) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* Cliente */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome do Cliente (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Carlos Eduardo"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Placa do Veículo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Placa do Veículo (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: ABC1D23"
                    value={formData.vehiclePlate}
                    onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Forma de Pagamento */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as BillingPaymentMethod })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Modelo do Veículo e Observações */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Modelo do Veículo (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Corolla 2.0 / Hilux / Onix"
                    value={formData.vehicleModel}
                    onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Observações / Descrição (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Troca de 4 pneus, óleo sintético e revisão"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingRecord ? 'Salvar Alterações' : 'Confirmar e Lançar Faturamento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
