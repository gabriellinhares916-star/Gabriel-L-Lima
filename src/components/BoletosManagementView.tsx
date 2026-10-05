import React, { useState, useMemo } from 'react';
import { InvoiceBoleto, BoletoStatus, InvoiceDestination, Invoice } from '../types';
import { formatBRL, formatDateBR } from '../utils/stockCalculations';
import {
  getTodayDateStr,
  formatBarcodeDisplay,
  exportBoletosCSV,
  calculateBoletoStatus,
} from '../utils/boletoStorage';
import {
  Barcode,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Building2,
  Copy,
  Check,
  Plus,
  Trash2,
  Edit2,
  Download,
  Printer,
  FileText,
  DollarSign,
  ChevronRight,
  ArrowUpDown,
  RotateCcw,
  Sparkles,
  MapPin,
  X,
  CreditCard
} from 'lucide-react';

interface BoletosManagementViewProps {
  boletos: InvoiceBoleto[];
  invoices?: Invoice[];
  onAddBoleto: (boleto: Omit<InvoiceBoleto, 'id' | 'createdAt' | 'status'> & { status?: BoletoStatus }) => void;
  onUpdateBoleto: (id: string, updates: Partial<InvoiceBoleto>) => void;
  onPayBoleto: (id: string, paymentData: { paidAt?: string; paymentTime?: string; paidAmount?: number; paymentMethod?: string; notes?: string }) => void;
  onReopenBoleto: (id: string) => void;
  onDeleteBoleto: (id: string) => void;
  onNavigateToInvoiceEntry?: () => void;
}

export const BoletosManagementView: React.FC<BoletosManagementViewProps> = ({
  boletos,
  invoices = [],
  onAddBoleto,
  onUpdateBoleto,
  onPayBoleto,
  onReopenBoleto,
  onDeleteBoleto,
  onNavigateToInvoiceEntry,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [destinationFilter, setDestinationFilter] = useState<'ALL' | InvoiceDestination>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | BoletoStatus>('ALL');
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'TODAY' | 'NEXT_7_DAYS' | 'THIS_MONTH' | 'OVERDUE'>('ALL');
  const [sortBy, setSortBy] = useState<'dueDate' | 'amount' | 'supplier'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal States
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedBoletoForPay, setSelectedBoletoForPay] = useState<InvoiceBoleto | null>(null);
  const [payDate, setPayDate] = useState(getTodayDateStr());
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState('PIX');
  const [payNotes, setPayNotes] = useState('');

  // Add/Edit Modal
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingBoletoId, setEditingBoletoId] = useState<string | null>(null);
  const [formSupplier, setFormSupplier] = useState('');
  const [formCnpj, setFormCnpj] = useState('');
  const [formInvoiceNumber, setFormInvoiceNumber] = useState('');
  const [formDestination, setFormDestination] = useState<InvoiceDestination>('PARNARAMA');
  const [formBarcode, setFormBarcode] = useState('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDueDate, setFormDueDate] = useState(getTodayDateStr());
  const [formInstallment, setFormInstallment] = useState('1');
  const [formTotalInstallments, setFormTotalInstallments] = useState('1');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Clipboard toast
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const todayStr = getTodayDateStr();

  // Handle Copy Barcode
  const handleCopyBarcode = (id: string, barcode: string) => {
    const clean = barcode.trim();
    if (!clean) return;
    navigator.clipboard.writeText(clean).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }).catch(() => {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = clean;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  // KPIs
  const kpis = useMemo(() => {
    let pendingCount = 0;
    let pendingTotal = 0;
    let overdueCount = 0;
    let overdueTotal = 0;
    let todayCount = 0;
    let todayTotal = 0;
    let paidCount = 0;
    let paidTotal = 0;

    boletos.forEach(b => {
      const dynamicStatus = calculateBoletoStatus(b);
      const isPaid = dynamicStatus === 'PAGO';
      const isOverdue = dynamicStatus === 'VENCIDO';
      const isToday = !isPaid && b.dueDate === todayStr;

      if (isPaid) {
        paidCount++;
        paidTotal += (b.paidAmount ?? b.amount);
      } else {
        pendingCount++;
        pendingTotal += b.amount;

        if (isOverdue) {
          overdueCount++;
          overdueTotal += b.amount;
        }
        if (isToday) {
          todayCount++;
          todayTotal += b.amount;
        }
      }
    });

    const parnaramaPending = boletos.filter(
      b => b.destinationBranch === 'PARNARAMA' && calculateBoletoStatus(b) !== 'PAGO'
    ).reduce((acc, b) => acc + b.amount, 0);

    const teresinaPending = boletos.filter(
      b => b.destinationBranch === 'TERESINA' && calculateBoletoStatus(b) !== 'PAGO'
    ).reduce((acc, b) => acc + b.amount, 0);

    return {
      pendingCount,
      pendingTotal,
      overdueCount,
      overdueTotal,
      todayCount,
      todayTotal,
      paidCount,
      paidTotal,
      parnaramaPending,
      teresinaPending,
    };
  }, [boletos, todayStr]);

  // Filtered & Sorted Boletos
  const filteredBoletos = useMemo(() => {
    return boletos.filter(b => {
      const dynamicStatus = calculateBoletoStatus(b);

      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchSupplier = (b.supplierName || '').toLowerCase().includes(term);
        const matchInvoice = (b.invoiceNumber || '').toLowerCase().includes(term);
        const matchBarcode = (b.barcode || '').replace(/\D/g, '').includes(term.replace(/\D/g, ''));
        const matchNotes = (b.notes || '').toLowerCase().includes(term);
        if (!matchSupplier && !matchInvoice && !matchBarcode && !matchNotes) {
          return false;
        }
      }

      // Destination
      if (destinationFilter !== 'ALL' && b.destinationBranch !== destinationFilter) {
        return false;
      }

      // Status
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'VENCIDO' && dynamicStatus !== 'VENCIDO') return false;
        if (statusFilter === 'PENDENTE' && dynamicStatus !== 'PENDENTE') return false;
        if (statusFilter === 'PAGO' && dynamicStatus !== 'PAGO') return false;
      }

      // Time
      if (timeFilter === 'TODAY') {
        if (b.dueDate !== todayStr) return false;
      } else if (timeFilter === 'OVERDUE') {
        if (dynamicStatus !== 'VENCIDO') return false;
      } else if (timeFilter === 'NEXT_7_DAYS') {
        const d = new Date(b.dueDate).getTime();
        const now = new Date(todayStr).getTime();
        const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
        if (diffDays < 0 || diffDays > 7 || dynamicStatus === 'PAGO') return false;
      } else if (timeFilter === 'THIS_MONTH') {
        const currentMonth = todayStr.substring(0, 7);
        if (!b.dueDate.startsWith(currentMonth)) return false;
      }

      return true;
    }).sort((a, b) => {
      let result = 0;
      if (sortBy === 'dueDate') {
        result = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (sortBy === 'amount') {
        result = a.amount - b.amount;
      } else if (sortBy === 'supplier') {
        result = (a.supplierName || '').localeCompare(b.supplierName || '');
      }
      return sortOrder === 'asc' ? result : -result;
    });
  }, [boletos, searchTerm, destinationFilter, statusFilter, timeFilter, sortBy, sortOrder, todayStr]);

  // Open Pay Modal
  const handleOpenPay = (b: InvoiceBoleto) => {
    setSelectedBoletoForPay(b);
    setPayDate(todayStr);
    setPayAmount(b.amount);
    setPayMethod('PIX');
    setPayNotes('');
    setIsPayModalOpen(true);
  };

  // Submit Pay
  const handleConfirmPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBoletoForPay) return;
    onPayBoleto(selectedBoletoForPay.id, {
      paidAt: payDate,
      paidAmount: Number(payAmount) || selectedBoletoForPay.amount,
      paymentMethod: payMethod,
      notes: payNotes,
    });
    setIsPayModalOpen(false);
    setSelectedBoletoForPay(null);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingBoletoId(null);
    setFormSupplier('');
    setFormCnpj('');
    setFormInvoiceNumber('');
    setFormDestination('PARNARAMA');
    setFormBarcode('');
    setFormAmount('');
    setFormDueDate(todayStr);
    setFormInstallment('1');
    setFormTotalInstallments('1');
    setFormNotes('');
    setFormError(null);
    setIsAddEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (b: InvoiceBoleto) => {
    setEditingBoletoId(b.id);
    setFormSupplier(b.supplierName || '');
    setFormCnpj(b.supplierCnpj || '');
    setFormInvoiceNumber(b.invoiceNumber || '');
    setFormDestination(b.destinationBranch || 'PARNARAMA');
    setFormBarcode(b.barcode || '');
    setFormAmount(b.amount ? b.amount.toString() : '');
    setFormDueDate(b.dueDate || todayStr);
    setFormInstallment(b.installmentNumber ? b.installmentNumber.toString() : '1');
    setFormTotalInstallments(b.totalInstallments ? b.totalInstallments.toString() : '1');
    setFormNotes(b.notes || '');
    setFormError(null);
    setIsAddEditModalOpen(true);
  };

  // Save Add/Edit
  const handleSaveAddEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const val = parseFloat(formAmount.replace(',', '.'));
    if (!val || val <= 0) {
      setFormError('Informe um valor numérico válido maior que zero.');
      return;
    }
    if (!formDueDate) {
      setFormError('Informe a data de vencimento do boleto.');
      return;
    }
    if (!formBarcode.trim()) {
      setFormError('Informe o código de barras ou linha digitável do boleto.');
      return;
    }

    if (editingBoletoId) {
      onUpdateBoleto(editingBoletoId, {
        supplierName: formSupplier.trim() || 'Fornecedor Avulso',
        supplierCnpj: formCnpj.trim(),
        invoiceNumber: formInvoiceNumber.trim(),
        destinationBranch: formDestination,
        barcode: formBarcode.trim(),
        amount: val,
        dueDate: formDueDate,
        installmentNumber: parseInt(formInstallment) || 1,
        totalInstallments: parseInt(formTotalInstallments) || 1,
        notes: formNotes.trim(),
      });
    } else {
      onAddBoleto({
        supplierName: formSupplier.trim() || 'Fornecedor Avulso',
        supplierCnpj: formCnpj.trim(),
        invoiceNumber: formInvoiceNumber.trim(),
        destinationBranch: formDestination,
        barcode: formBarcode.trim(),
        amount: val,
        dueDate: formDueDate,
        installmentNumber: parseInt(formInstallment) || 1,
        totalInstallments: parseInt(formTotalInstallments) || 1,
        notes: formNotes.trim(),
      });
    }

    setIsAddEditModalOpen(false);
  };

  // Print Report
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Barcode className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Gestão de Boletos & Contas a Pagar
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Controle financeiro de boletos bancários de fornecedores, linhas digitáveis, datas de vencimento e baixas por filial (Parnarama e Teresina).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={() => exportBoletosCSV(filteredBoletos)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors shadow-2xs"
            title="Exportar para Excel / CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Exportar CSV
          </button>

          <button
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors shadow-2xs"
            title="Imprimir relatório financeiro de boletos"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            Imprimir
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Novo Boleto Avulso
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        {/* Total a Pagar Pendente */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total a Pagar (Aberto)</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1.5">
            {formatBRL(kpis.pendingTotal)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>{kpis.pendingCount} boletos pendentes</span>
            <span className="font-semibold text-indigo-600">
              {boletos.length > 0 ? `${Math.round((kpis.pendingCount / boletos.length) * 100)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* Vencem Hoje */}
        <div className={`p-5 rounded-xl border shadow-2xs transition-all ${
          kpis.todayCount > 0 ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-medium">
            <span className={kpis.todayCount > 0 ? 'text-amber-800' : 'text-slate-500'}>Vencendo Hoje</span>
            <AlertTriangle className={`w-4 h-4 ${kpis.todayCount > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-bold mt-1.5 ${kpis.todayCount > 0 ? 'text-amber-900' : 'text-slate-900'}`}>
            {formatBRL(kpis.todayTotal)}
          </div>
          <div className={`text-xs mt-1 ${kpis.todayCount > 0 ? 'text-amber-700 font-semibold' : 'text-slate-500'}`}>
            {kpis.todayCount === 1 ? '1 boleto para liquidar hoje' : `${kpis.todayCount} boletos para liquidar hoje`}
          </div>
        </div>

        {/* Vencidos (Alerta Vermelho) */}
        <div className={`p-5 rounded-xl border shadow-2xs transition-all ${
          kpis.overdueCount > 0 ? 'bg-rose-50/60 border-rose-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-medium">
            <span className={kpis.overdueCount > 0 ? 'text-rose-800 font-bold' : 'text-slate-500'}>Boletos Vencidos</span>
            <AlertTriangle className={`w-4 h-4 ${kpis.overdueCount > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-bold mt-1.5 ${kpis.overdueCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
            {formatBRL(kpis.overdueTotal)}
          </div>
          <div className={`text-xs mt-1 ${kpis.overdueCount > 0 ? 'text-rose-700 font-semibold' : 'text-slate-500'}`}>
            {kpis.overdueCount === 1 ? '1 boleto em atraso' : `${kpis.overdueCount} boletos em atraso`}
          </div>
        </div>

        {/* Total Pago / Liquidado */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Boletos Pagos (Baixados)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1.5">
            {formatBRL(kpis.paidTotal)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>{kpis.paidCount} boletos liquidados</span>
            <span className="font-semibold text-emerald-600">100% quitados</span>
          </div>
        </div>
      </div>

      {/* Destination Balance Breakdown Strip */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
            <MapPin className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Contas em Aberto por Destino / Filial
            </div>
            <div className="text-xs text-slate-500">
              Distribuição dos boletos a vencer entre as duas unidades
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span className="text-xs font-bold text-blue-900">PARNARAMA:</span>
            <span className="text-xs font-extrabold text-blue-800">{formatBRL(kpis.parnaramaPending)}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
            <span className="text-xs font-bold text-teal-900">TERESINA:</span>
            <span className="text-xs font-extrabold text-teal-800">{formatBRL(kpis.teresinaPending)}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por fornecedor, NF, código de barras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Destino Filter */}
          <div className="md:col-span-3">
            <div className="inline-flex w-full p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setDestinationFilter('ALL')}
                className={`flex-1 py-1 rounded-md font-semibold transition-all ${
                  destinationFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setDestinationFilter('PARNARAMA')}
                className={`flex-1 py-1 rounded-md font-semibold transition-all ${
                  destinationFilter === 'PARNARAMA'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Parnarama
              </button>
              <button
                type="button"
                onClick={() => setDestinationFilter('TERESINA')}
                className={`flex-1 py-1 rounded-md font-semibold transition-all ${
                  destinationFilter === 'TERESINA'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Teresina
              </button>
            </div>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="ALL">Status: Todos</option>
              <option value="PENDENTE">Status: A Vencer / Pendentes</option>
              <option value="VENCIDO">Status: Vencidos em Atraso</option>
              <option value="PAGO">Status: Pagos / Liquidados</option>
            </select>
          </div>

          {/* Time Filter */}
          <div className="md:col-span-2">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="ALL">Período: Todos</option>
              <option value="TODAY">Vencem Hoje</option>
              <option value="NEXT_7_DAYS">Próximos 7 Dias</option>
              <option value="THIS_MONTH">Este Mês</option>
              <option value="OVERDUE">Apenas Vencidos</option>
            </select>
          </div>
        </div>

        {/* Sort and Count Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">
              {filteredBoletos.length} boletos encontrados
            </span>
            <span>•</span>
            <span>
              Total filtrado: <strong className="text-indigo-900">{formatBRL(filteredBoletos.reduce((acc, b) => acc + b.amount, 0))}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="py-1 px-2 border border-slate-300 rounded text-xs text-slate-700"
              >
                <option value="dueDate">Data de Vencimento</option>
                <option value="amount">Valor do Boleto</option>
                <option value="supplier">Fornecedor</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-1 border border-slate-300 rounded hover:bg-slate-50"
                title={sortOrder === 'asc' ? 'Ordem Crescente' : 'Ordem Decrescente'}
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-600" />
              </button>
            </div>

            {(searchTerm || destinationFilter !== 'ALL' || statusFilter !== 'ALL' || timeFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDestinationFilter('ALL');
                  setStatusFilter('ALL');
                  setTimeFilter('ALL');
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Printable Title (visible only on print) */}
      <div className="hidden print:block p-4 border-b border-slate-300 mb-4">
        <h1 className="text-xl font-bold">Relatório de Boletos a Pagar</h1>
        <p className="text-xs text-slate-600 mt-1">
          Emissão em: {formatDateBR(todayStr)} • Destino: {destinationFilter === 'ALL' ? 'Todas as Filiais' : destinationFilter}
        </p>
      </div>

      {/* List of Boletos */}
      <div className="space-y-3">
        {filteredBoletos.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400 shadow-xs">
            <Barcode className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <h3 className="text-base font-semibold text-slate-700">Nenhum boleto encontrado</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Não existem boletos bancários cadastrados com os filtros selecionados. Você pode adicionar boletos diretamente ao lançar uma Nota Fiscal ou clicar no botão acima para adicionar um boleto avulso.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                + Cadastrar Novo Boleto
              </button>
              {onNavigateToInvoiceEntry && (
                <button
                  onClick={onNavigateToInvoiceEntry}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  Lançar Nova NF-e
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredBoletos.map((boleto) => {
            const dynamicStatus = calculateBoletoStatus(boleto);
            const isPaid = dynamicStatus === 'PAGO';
            const isOverdue = dynamicStatus === 'VENCIDO';
            const isToday = !isPaid && boleto.dueDate === todayStr;

            // Difference in days
            const dDue = new Date(boleto.dueDate).getTime();
            const dToday = new Date(todayStr).getTime();
            const diffDays = Math.ceil((dDue - dToday) / (1000 * 60 * 60 * 24));

            return (
              <div
                key={boleto.id}
                className={`bg-white rounded-xl border shadow-xs transition-all hover:shadow-sm overflow-hidden ${
                  isOverdue
                    ? 'border-rose-200'
                    : isToday
                    ? 'border-amber-200'
                    : isPaid
                    ? 'border-slate-200 opacity-90'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Info Column */}
                  <div className="flex-1 space-y-2.5">
                    {/* Header line with Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Destination Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 border ${
                        boleto.destinationBranch === 'TERESINA'
                          ? 'bg-teal-50 text-teal-700 border-teal-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        <MapPin className="w-3 h-3" />
                        {boleto.destinationBranch || 'PARNARAMA'}
                      </span>

                      {/* Status Badge */}
                      {isPaid ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> PAGO
                        </span>
                      ) : isOverdue ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3" /> VENCIDO ({Math.abs(diffDays)}d)
                        </span>
                      ) : isToday ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> VENCE HOJE
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Em {diffDays} dias
                        </span>
                      )}

                      {/* NF Link */}
                      {boleto.invoiceNumber && (
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          NF nº {boleto.invoiceNumber}
                        </span>
                      )}

                      {/* Parcela */}
                      {boleto.installmentNumber && (
                        <span className="text-xs text-slate-500 font-medium">
                          Parcela {boleto.installmentNumber} de {boleto.totalInstallments || 1}
                        </span>
                      )}
                    </div>

                    {/* Fornecedor */}
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-base font-bold text-slate-900">
                        {boleto.supplierName || 'Fornecedor Avulso'}
                      </span>
                      {boleto.supplierCnpj && (
                        <span className="text-xs text-slate-500 hidden sm:inline">
                          • CNPJ: {boleto.supplierCnpj}
                        </span>
                      )}
                    </div>

                    {/* Barcode Display Box */}
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Barcode className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-mono text-xs font-semibold text-slate-800 break-all select-all">
                          {formatBarcodeDisplay(boleto.barcode)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyBarcode(boleto.id, boleto.barcode)}
                        className={`shrink-0 flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all border ${
                          copiedId === boleto.id
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                        title="Copiar código de barras para internet banking"
                      >
                        {copiedId === boleto.id ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            Copiar Código
                          </>
                        )}
                      </button>
                    </div>

                    {/* Payment Receipt Info if Paid */}
                    {isPaid && (
                      <div className="text-xs text-emerald-800 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200/80 flex items-center justify-between flex-wrap gap-2">
                        <span>
                          Liquidado em: <strong>{formatDateBR(boleto.paidAt || todayStr)}</strong> {boleto.paymentTime ? `às ${boleto.paymentTime}` : ''}
                        </span>
                        <span>
                          Valor Pago: <strong>{formatBRL(boleto.paidAmount ?? boleto.amount)}</strong>
                        </span>
                        {boleto.paymentMethod && (
                          <span className="px-2 py-0.5 bg-emerald-100 rounded text-[11px] font-bold">
                            Via {boleto.paymentMethod}
                          </span>
                        )}
                      </div>
                    )}

                    {boleto.notes && (
                      <p className="text-xs text-slate-500 italic">
                        Obs: {boleto.notes}
                      </p>
                    )}
                  </div>

                  {/* Amount, Due Date & Actions Column */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                    <div className="text-left lg:text-right">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {isPaid ? 'Valor Liquidado' : 'Valor a Pagar'}
                      </div>
                      <div className={`text-xl font-black ${
                        isPaid ? 'text-emerald-700' : isOverdue ? 'text-rose-700' : 'text-indigo-900'
                      }`}>
                        {formatBRL(boleto.amount)}
                      </div>
                      <div className="text-xs font-semibold text-slate-600 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Vencimento: {formatDateBR(boleto.dueDate)}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 print:hidden w-full sm:w-auto">
                      {!isPaid ? (
                        <button
                          type="button"
                          onClick={() => handleOpenPay(boleto)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Dar Baixa
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onReopenBoleto(boleto.id)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200"
                          title="Reverter pagamento e reabrir boleto"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reabrir
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(boleto)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-200"
                        title="Editar boleto"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Tem certeza que deseja excluir o boleto de R$ ${boleto.amount.toFixed(2)} de ${boleto.supplierName || 'Fornecedor'}?`)) {
                            onDeleteBoleto(boleto.id);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                        title="Excluir boleto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: DAR BAIXA / PAGAR BOLETO */}
      {isPayModalOpen && selectedBoletoForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn">
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-base">Liquidar / Dar Baixa no Boleto</h3>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPay} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Fornecedor:</span>
                  <span className="font-bold text-slate-800">{selectedBoletoForPay.supplierName || 'Fornecedor'}</span>
                </div>
                {selectedBoletoForPay.invoiceNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nota Fiscal:</span>
                    <span className="font-semibold text-slate-800">NF nº {selectedBoletoForPay.invoiceNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Destino:</span>
                  <span className="font-bold text-indigo-700">{selectedBoletoForPay.destinationBranch || 'PARNARAMA'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Valor Original:</span>
                  <span className="font-extrabold text-slate-900">{formatBRL(selectedBoletoForPay.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vencimento Original:</span>
                  <span className="font-semibold text-slate-800">{formatDateBR(selectedBoletoForPay.dueDate)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data do Pagamento *
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor Pago (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Forma de Pagamento
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="PIX">PIX</option>
                  <option value="DEBITO_CONTA">Débito em Conta / Internet Banking</option>
                  <option value="TRANSFERENCIA_TED">Transferência TED / DOC</option>
                  <option value="DINHEIRO">Dinheiro / Caixa Físico</option>
                  <option value="OUTRO">Outro Meio</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações / Autenticação Bancária (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Comprovante arquivado na pasta de pagamentos..."
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                >
                  Confirmar Liquidação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR / EDITAR BOLETO */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn">
            <div className="p-5 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-indigo-200" />
                <h3 className="font-bold text-base">
                  {editingBoletoId ? 'Editar Boleto' : 'Cadastrar Novo Boleto'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddEdit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Destino Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Destino / Filial *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormDestination('PARNARAMA')}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                      formDestination === 'PARNARAMA'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-950 font-bold ring-2 ring-blue-500/30'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                      formDestination === 'PARNARAMA' ? 'border-blue-600 bg-blue-600' : 'border-slate-400'
                    }`}>
                      {formDestination === 'PARNARAMA' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold">Parnarama</div>
                      <div className="text-[10px] text-slate-500">Maranhão (MA)</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormDestination('TERESINA')}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                      formDestination === 'TERESINA'
                        ? 'border-teal-600 bg-teal-50/70 text-teal-950 font-bold ring-2 ring-teal-500/30'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                      formDestination === 'TERESINA' ? 'border-teal-600 bg-teal-600' : 'border-slate-400'
                    }`}>
                      {formDestination === 'TERESINA' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold">Teresina</div>
                      <div className="text-[10px] text-slate-500">Piauí (PI)</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Fornecedor e NF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fornecedor / Favorecido *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Distribuidora Central Ltda"
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nº da Nota Fiscal (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 50412"
                    value={formInvoiceNumber}
                    onChange={(e) => setFormInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Código de Barras / Linha Digitável */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Código de Barras / Linha Digitável *
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {formBarcode.replace(/\D/g, '').length} dígitos
                  </span>
                </div>
                <div className="relative">
                  <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Digite ou cole os 47 ou 48 dígitos do boleto..."
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Ex: 23793.38128 60000.000003 01000.654321 1 89000000150000
                </div>
              </div>

              {/* Valor e Vencimento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor do Boleto (R$) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0,00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data de Vencimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Parcelas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número da Parcela
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formInstallment}
                    onChange={(e) => setFormInstallment(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total de Parcelas
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formTotalInstallments}
                    onChange={(e) => setFormTotalInstallments(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Referente a peças automotivas, entrega rápida..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                >
                  {editingBoletoId ? 'Salvar Alterações' : 'Cadastrar Boleto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
