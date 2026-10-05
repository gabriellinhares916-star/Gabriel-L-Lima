import React, { useState, useRef } from 'react';
import { Invoice, InvoiceItem, Product, InvoiceDestination, InvoiceBoleto } from '../types';
import { parseNFeXML, SAMPLE_NFE_XML_1, SAMPLE_NFE_XML_2 } from '../utils/xmlParser';
import { formatBRL, formatDateBR } from '../utils/stockCalculations';
import { formatBarcodeDisplay } from '../utils/boletoStorage';
import { DanfeModal } from './DanfeModal';
import {
  Upload,
  FileCode,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Plus,
  Trash2,
  Eye,
  ArrowRight,
  Boxes,
  Building2,
  Calendar,
  KeyRound,
  TrendingUp,
  Tag,
  Sliders,
  Barcode,
  MapPin,
  Copy,
  Check,
  Split,
  Layers,
  Clock
} from 'lucide-react';

interface ManualBoletoDraft {
  id: string;
  barcode: string;
  amount: number;
  dueDate: string;
  installmentNumber: number;
  totalInstallments: number;
  notes?: string;
}

interface InvoiceEntryProps {
  products: Product[];
  onConfirmEntry: (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'status'>) => void;
  onNavigateToStock: () => void;
}

export const InvoiceEntry: React.FC<InvoiceEntryProps> = ({
  products,
  onConfirmEntry,
  onNavigateToStock,
}) => {
  const [activeMode, setActiveMode] = useState<'xml' | 'manual'>('xml');
  const [xmlText, setXmlText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [stagedInvoice, setStagedInvoice] = useState<Omit<Invoice, 'id' | 'createdAt' | 'status'> | null>(null);
  const [showDanfe, setShowDanfe] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [globalMarkupInput, setGlobalMarkupInput] = useState('40');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formulário Manual State
  const [manualNumber, setManualNumber] = useState('');
  const [manualSeries, setManualSeries] = useState('1');
  const [manualAccessKey, setManualAccessKey] = useState('');
  const [manualDestination, setManualDestination] = useState<InvoiceDestination>('PARNARAMA');
  const [manualSupplierName, setManualSupplierName] = useState('');
  const [manualSupplierCnpj, setManualSupplierCnpj] = useState('');
  const [manualSupplierUf, setManualSupplierUf] = useState('MA');
  const [manualIssueDate, setManualIssueDate] = useState(new Date().toISOString().substring(0, 10));
  const [manualEntryDate, setManualEntryDate] = useState(new Date().toISOString().substring(0, 10));
  const [hasBoletos, setHasBoletos] = useState(false);
  const [manualBoletos, setManualBoletos] = useState<ManualBoletoDraft[]>([]);
  const [copiedBarcodeId, setCopiedBarcodeId] = useState<string | null>(null);

  const [manualItems, setManualItems] = useState<InvoiceItem[]>([
    {
      id: 'item-1',
      code: '',
      description: '',
      ncm: '00000000',
      cfop: '1102',
      unit: 'UN',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
    },
  ]);

  // Manipulação de Arquivo XML
  const handleFileProcess = (file: File) => {
    setParseError(null);
    setSuccessMessage(null);

    if (!file.name.toLowerCase().endsWith('.xml')) {
      setParseError('Por favor, selecione um arquivo no formato XML de NF-e (.xml).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        processXmlString(content);
      }
    };
    reader.onerror = () => {
      setParseError('Erro ao ler o arquivo selecionado.');
    };
    reader.readAsText(file);
  };

  const processXmlString = (xml: string) => {
    setParseError(null);
    const result = parseNFeXML(xml);
    if (!result.success || !result.invoice) {
      setParseError(result.error || 'Falha ao processar o XML da NF-e.');
      return;
    }

    // Pré-carregar preço de venda sugerido:
    // Se o produto já existe e tem preço de venda superior ao novo custo, mantém.
    // Caso contrário, sugere com markup padrão de 40% sobre o custo da nota.
    const enhancedItems = result.invoice.items.map(item => {
      const existing = products.find(
        p => p.code.toLowerCase() === item.code.toLowerCase() ||
             p.name.toLowerCase() === item.description.toLowerCase()
      );

      let suggestedPrice = 0;
      if (existing?.sellingPrice && existing.sellingPrice > item.unitPrice) {
        suggestedPrice = existing.sellingPrice;
      } else {
        suggestedPrice = Number((item.unitPrice * 1.40).toFixed(2));
      }

      const cost = item.unitPrice || 0;
      const margin = cost > 0 ? Number((((suggestedPrice - cost) / cost) * 100).toFixed(1)) : 0;

      return {
        ...item,
        suggestedSalePrice: suggestedPrice,
        marginPercent: margin,
      };
    });

    setStagedInvoice({
      ...result.invoice,
      items: enhancedItems,
    });
    setXmlText(xml);
  };

  // Alterar Preço de Venda Sugerido de um item individual na nota em conferência
  const handleUpdateStagedItemPrice = (itemIndex: number, newPrice: number) => {
    if (!stagedInvoice) return;
    const updatedItems = stagedInvoice.items.map((it, idx) => {
      if (idx !== itemIndex) return it;
      const cost = it.unitPrice || 0;
      const margin = cost > 0 ? Number((((newPrice - cost) / cost) * 100).toFixed(1)) : 0;
      return {
        ...it,
        suggestedSalePrice: newPrice,
        marginPercent: margin,
      };
    });

    setStagedInvoice({
      ...stagedInvoice,
      items: updatedItems,
    });
  };

  // Aplicar Markup (%) em lote a todos os itens da nota fiscal em conferência
  const handleApplyGlobalMarkup = (markupPercent: number) => {
    if (!stagedInvoice) return;
    const updatedItems = stagedInvoice.items.map(it => {
      const cost = it.unitPrice || 0;
      const calculatedPrice = Number((cost * (1 + markupPercent / 100)).toFixed(2));
      return {
        ...it,
        suggestedSalePrice: calculatedPrice,
        marginPercent: markupPercent,
      };
    });

    setStagedInvoice({
      ...stagedInvoice,
      items: updatedItems,
    });
  };

  // Carregar exemplos pré-configurados para teste instantâneo
  const handleLoadSample1 = () => {
    processXmlString(SAMPLE_NFE_XML_1);
  };

  const handleLoadSample2 = () => {
    processXmlString(SAMPLE_NFE_XML_2);
  };

  // Drag and Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  // Funções para Formulário Manual
  const handleAddManualItem = () => {
    setManualItems([
      ...manualItems,
      {
        id: `item-${Date.now()}`,
        code: '',
        description: '',
        ncm: '00000000',
        cfop: '1102',
        unit: 'UN',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
      },
    ]);
  };

  const handleRemoveManualItem = (index: number) => {
    if (manualItems.length === 1) return;
    setManualItems(manualItems.filter((_, i) => i !== index));
  };

  const handleManualItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...manualItems];
    const item = { ...updated[index] };

    if (field === 'quantity') {
      const q = parseFloat(value) || 0;
      item.quantity = q;
      item.totalPrice = Number((q * (Number(item.unitPrice) || 0)).toFixed(2));
    } else if (field === 'unitPrice') {
      const p = parseFloat(value) || 0;
      item.unitPrice = p;
      item.totalPrice = Number(((Number(item.quantity) || 0) * p).toFixed(2));
      
      if (!item.suggestedSalePrice || item.suggestedSalePrice <= 0) {
        item.suggestedSalePrice = Number((p * 1.40).toFixed(2));
      }
      const cost = p;
      item.marginPercent = cost > 0 && item.suggestedSalePrice
        ? Number((((item.suggestedSalePrice - cost) / cost) * 100).toFixed(1))
        : 40;
    } else if (field === 'suggestedSalePrice') {
      const sp = parseFloat(value) || 0;
      item.suggestedSalePrice = sp;
      const cost = Number(item.unitPrice) || 0;
      item.marginPercent = cost > 0
        ? Number((((sp - cost) / cost) * 100).toFixed(1))
        : 0;
    } else {
      (item as any)[field] = value;
    }

    // Se o usuário selecionou um produto existente pelo código, preenche os dados automaticamente
    if (field === 'code') {
      const found = products.find(p => p.code.toLowerCase() === String(value).toLowerCase());
      if (found) {
        item.description = found.name;
        item.unit = found.unit;
        if (found.ncm) item.ncm = found.ncm;
        item.unitPrice = Number(found.averageCost) || 0;
        item.totalPrice = Number(((Number(item.quantity) || 1) * (Number(found.averageCost) || 0)).toFixed(2));
        item.suggestedSalePrice = found.sellingPrice || Number(((Number(found.averageCost) || 0) * 1.40).toFixed(2));
        item.marginPercent = found.marginPercent || 40;
      }
    }

    updated[index] = item;
    setManualItems(updated);
  };

  // Gerar chave de acesso automática da NF-e (44 dígitos)
  const handleGenerateRandomAccessKey = () => {
    const ufCode = manualDestination === 'PARNARAMA' ? '21' : '22'; // 21 MA, 22 PI
    const yy = (manualIssueDate || new Date().toISOString()).substring(2, 4);
    const mm = (manualIssueDate || new Date().toISOString()).substring(5, 7);
    const cleanCnpj = (manualSupplierCnpj || '12345678000190').replace(/\D/g, '').padEnd(14, '0').slice(0, 14);
    const mod = '55';
    const ser = (manualSeries || '1').padStart(3, '0');
    const num = (manualNumber || '1').replace(/\D/g, '').padStart(9, '0');
    const tpEmis = '1';
    const cNF = Math.floor(10000000 + Math.random() * 90000000).toString();
    const raw43 = `${ufCode}${yy}${mm}${cleanCnpj}${mod}${ser}${num}${tpEmis}${cNF}`;
    const dv = (raw43.split('').reduce((acc, c, i) => acc + Number(c) * ((i % 8) + 2), 0) % 11) % 10;
    const finalKey = `${raw43}${dv}`;
    setManualAccessKey(finalKey);
  };

  // Gerar parcelas rápidas de boletos
  const handleQuickInstallments = (count: number) => {
    const totalProd = manualItems.reduce((acc, it) => acc + it.totalPrice, 0);
    const baseAmount = Number((totalProd / count).toFixed(2));
    const drafts: ManualBoletoDraft[] = [];
    const baseDate = new Date(manualIssueDate || new Date());

    let accumulated = 0;
    for (let i = 1; i <= count; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setDate(dueDate.getDate() + (i * 30));
      const dateStr = dueDate.toISOString().substring(0, 10);
      
      const installmentAmount = (i === count)
        ? Number((totalProd - accumulated).toFixed(2))
        : baseAmount;
      accumulated += installmentAmount;

      drafts.push({
        id: `draft-bol-${Date.now()}-${i}`,
        barcode: '',
        amount: Math.max(0, installmentAmount),
        dueDate: dateStr,
        installmentNumber: i,
        totalInstallments: count,
        notes: `Parcela ${i}/${count}`,
      });
    }

    setManualBoletos(drafts);
    setHasBoletos(true);
  };

  const handleAddManualBoleto = () => {
    const totalProd = manualItems.reduce((acc, it) => acc + it.totalPrice, 0);
    const totalCurrentBoletos = manualBoletos.reduce((acc, b) => acc + b.amount, 0);
    const remaining = Math.max(0, Number((totalProd - totalCurrentBoletos).toFixed(2)));
    const newIdx = manualBoletos.length + 1;

    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + (newIdx * 30));

    const updated = [
      ...manualBoletos,
      {
        id: `draft-bol-${Date.now()}-${newIdx}`,
        barcode: '',
        amount: remaining > 0 ? remaining : 0,
        dueDate: nextDueDate.toISOString().substring(0, 10),
        installmentNumber: newIdx,
        totalInstallments: newIdx,
        notes: `Parcela ${newIdx}`,
      },
    ];

    const recalculated = updated.map(b => ({
      ...b,
      totalInstallments: updated.length,
    }));

    setManualBoletos(recalculated);
    setHasBoletos(true);
  };

  const handleUpdateManualBoleto = (index: number, field: keyof ManualBoletoDraft, value: any) => {
    const updated = [...manualBoletos];
    const item = { ...updated[index] };
    if (field === 'amount') {
      item.amount = parseFloat(value) || 0;
    } else {
      (item as any)[field] = value;
    }
    updated[index] = item;
    setManualBoletos(updated);
  };

  const handleRemoveManualBoleto = (index: number) => {
    const filtered = manualBoletos.filter((_, i) => i !== index);
    const updated = filtered.map((b, idx) => ({
      ...b,
      installmentNumber: idx + 1,
      totalInstallments: filtered.length,
    }));
    setManualBoletos(updated);
    if (updated.length === 0) {
      setHasBoletos(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setParseError(null);

    if (!manualNumber.trim()) {
      setParseError('Informe o número da Nota Fiscal.');
      return;
    }
    if (!manualSupplierName.trim()) {
      setParseError('Informe o nome ou razão social do fornecedor.');
      return;
    }

    const invalidItem = manualItems.find(it => !it.code.trim() || !it.description.trim() || it.quantity <= 0);
    if (invalidItem) {
      setParseError('Todos os itens devem conter código, descrição e quantidade maior que zero.');
      return;
    }

    // Validação de boletos se ativado
    if (hasBoletos && manualBoletos.length > 0) {
      const invalidBoleto = manualBoletos.find(b => b.amount <= 0 || !b.dueDate);
      if (invalidBoleto) {
        setParseError('Todos os boletos adicionados precisam ter valor maior que zero e data de vencimento preenchida.');
        return;
      }
    }

    const totalProd = manualItems.reduce((acc, it) => acc + it.totalPrice, 0);

    const cleanAccessKey = manualAccessKey.replace(/\D/g, '').trim();
    const finalAccessKey = cleanAccessKey.length === 44
      ? cleanAccessKey
      : `3526${Date.now()}000199550010000${manualNumber.padStart(6, '0')}1`.slice(0, 44).padEnd(44, '0');

    const builtBoletos: InvoiceBoleto[] = hasBoletos ? manualBoletos.map((b, idx) => ({
      id: `bol-${Date.now()}-${idx}`,
      barcode: b.barcode.trim(),
      amount: b.amount,
      dueDate: b.dueDate,
      installmentNumber: b.installmentNumber || idx + 1,
      totalInstallments: manualBoletos.length,
      destinationBranch: manualDestination,
      supplierName: manualSupplierName.trim(),
      supplierCnpj: manualSupplierCnpj.trim(),
      status: 'PENDENTE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })) : [];

    const invoice: Omit<Invoice, 'id' | 'createdAt' | 'status'> = {
      number: manualNumber.trim(),
      series: manualSeries.trim() || '1',
      accessKey: finalAccessKey,
      destinationBranch: manualDestination,
      issueDate: manualIssueDate,
      entryDate: manualEntryDate,
      supplier: {
        name: manualSupplierName.trim(),
        cnpj: manualSupplierCnpj.trim() || '00.000.000/0001-00',
        uf: manualSupplierUf,
      },
      recipient: {
        name: manualDestination === 'PARNARAMA' ? 'Empresa - Filial Parnarama (MA)' : 'Empresa - Filial Teresina (PI)',
        cnpj: '12.345.678/0001-90',
        uf: manualDestination === 'PARNARAMA' ? 'MA' : 'PI',
      },
      items: manualItems,
      totals: {
        productsValue: totalProd,
        freightValue: 0,
        taxesValue: 0,
        discountValue: 0,
        totalInvoiceValue: totalProd,
      },
      boletos: builtBoletos,
      notes: `Entrada registrada via digitação manual no sistema - Destino: ${manualDestination}${builtBoletos.length > 0 ? ` (${builtBoletos.length} boletos gerados)` : ''}`,
    };

    setStagedInvoice(invoice);
  };

  // Efetivar entrada no estoque
  const handleConfirmStockEntry = () => {
    if (!stagedInvoice) return;

    onConfirmEntry(stagedInvoice);
    const invoiceNumber = stagedInvoice.number;
    const itemsCount = stagedInvoice.items.length;
    const boletosCount = stagedInvoice.boletos?.length || 0;
    const dest = stagedInvoice.destinationBranch || 'PARNARAMA';
    setSuccessMessage(`Nota Fiscal nº ${invoiceNumber} confirmada com sucesso! ${itemsCount} itens deram entrada no estoque de ${dest}${boletosCount > 0 ? ` e ${boletosCount} boleto(s) cadastrados na gestão financeira` : ''}.`);
    setStagedInvoice(null);
    setXmlText('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Entrada de Notas Fiscais (NF-e)</h2>
          <p className="text-sm text-slate-500 mt-1">
            Importe arquivos XML emitidos pela SEFAZ ou cadastre manualmente para atualizar o estoque e custo médio automaticamente.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => {
              setActiveMode('xml');
              setParseError(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeMode === 'xml'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Importar XML (Recomendado)
          </button>
          <button
            onClick={() => {
              setActiveMode('manual');
              setParseError(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeMode === 'manual'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Entrada Manual
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-emerald-800 animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
          <button
            onClick={onNavigateToStock}
            className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 underline whitespace-nowrap"
          >
            Ver no Estoque <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {parseError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="text-sm">{parseError}</span>
        </div>
      )}

      {/* SEÇÃO 1: FORMULÁRIO DE ENTRADA (XML OU MANUAL) - Exibido apenas se nenhuma nota estiver staged */}
      {!stagedInvoice && activeMode === 'xml' && (
        <div className="space-y-4">
          {/* Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition-all bg-white hover:bg-slate-50/80 ${
              dragActive
                ? 'border-indigo-500 bg-indigo-50/50 scale-[1.005]'
                : 'border-slate-300 hover:border-indigo-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileProcess(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              Arraste e solte o arquivo XML da NF-e aqui
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Ou clique para selecionar o arquivo no seu computador. Compatível com layout oficial NF-e versão 4.00 da SEFAZ.
            </p>
            <div className="mt-3 inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
              Extensão suportada: .xml
            </div>
          </div>

          {/* Quick Demo Loaders */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Deseja testar sem ter um arquivo XML em mãos? Use um de nossos modelos de NF-e realistas:</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleLoadSample1}
                className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-indigo-600 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-colors shadow-2xs"
              >
                NF-e Exemplo: Materiais (50 un)
              </button>
              <button
                type="button"
                onClick={handleLoadSample2}
                className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-indigo-600 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-colors shadow-2xs"
              >
                NF-e Exemplo: Autopeças (35 un)
              </button>
            </div>
          </div>

          {/* Opção Colar XML */}
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <details className="group">
              <summary className="cursor-pointer text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-between">
                <span>Ou cole o código XML bruto da nota diretamente</span>
                <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="mt-3 space-y-3">
                <textarea
                  rows={4}
                  value={xmlText}
                  onChange={(e) => setXmlText(e.target.value)}
                  placeholder="Cole aqui o conteúdo <nfeProc> ou <NFe>..."
                  className="w-full font-mono text-xs p-3 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (xmlText.trim()) processXmlString(xmlText);
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Processar XML Colado
                </button>
              </div>
            </details>
          </div>
        </div>
      )}

      {/* SEÇÃO MANUAL ENTRY */}
      {!stagedInvoice && activeMode === 'manual' && (
        <form onSubmit={handleManualSubmit} className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Dados da Nota Fiscal</h3>
              <p className="text-xs text-slate-500">Preencha os dados do documento fiscal de entrada e destino da mercadoria</p>
            </div>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full self-start sm:self-auto">
              Entrada Manual com Gestão de Boletos
            </span>
          </div>

          {/* SELEÇÃO DO DESTINO DA NOTA (PARNARAMA OU TERESINA) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-indigo-600" />
                Destino da Nota Fiscal / Filial de Entrada *
              </label>
              <span className="text-[11px] text-slate-500">Selecione para qual unidade esta mercadoria se destina</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setManualDestination('PARNARAMA')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                  manualDestination === 'PARNARAMA'
                    ? 'border-blue-600 bg-blue-50/80 text-blue-950 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    manualDestination === 'PARNARAMA' ? 'border-blue-600 bg-blue-600' : 'border-slate-400'
                  }`}>
                    {manualDestination === 'PARNARAMA' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold flex items-center gap-1.5">
                      PARNARAMA
                      <span className="text-[10px] px-1.5 py-0.2 bg-blue-200/70 text-blue-900 rounded font-bold">MA</span>
                    </div>
                    <div className="text-xs text-slate-500">Unidade e estoque Parnarama (Maranhão)</div>
                  </div>
                </div>
                {manualDestination === 'PARNARAMA' && (
                  <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setManualDestination('TERESINA')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                  manualDestination === 'TERESINA'
                    ? 'border-teal-600 bg-teal-50/80 text-teal-950 shadow-xs ring-2 ring-teal-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    manualDestination === 'TERESINA' ? 'border-teal-600 bg-teal-600' : 'border-slate-400'
                  }`}>
                    {manualDestination === 'TERESINA' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold flex items-center gap-1.5">
                      TERESINA
                      <span className="text-[10px] px-1.5 py-0.2 bg-teal-200/70 text-teal-900 rounded font-bold">PI</span>
                    </div>
                    <div className="text-xs text-slate-500">Unidade e estoque Teresina (Piauí)</div>
                  </div>
                </div>
                {manualDestination === 'TERESINA' && (
                  <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
                )}
              </button>
            </div>
          </div>

          {/* CHAVE DE ACESSO DA NF-E (44 DÍGITOS) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <KeyRound className="w-4 h-4 text-indigo-600" />
                Chave de Acesso da NF-e (44 dígitos)
              </label>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                  manualAccessKey.replace(/\D/g, '').length === 44
                    ? 'bg-emerald-100 text-emerald-800'
                    : manualAccessKey.replace(/\D/g, '').length > 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {manualAccessKey.replace(/\D/g, '').length === 44
                    ? '44/44 dígitos (Chave Completa)'
                    : `${manualAccessKey.replace(/\D/g, '').length} / 44 dígitos`}
                </span>
                <button
                  type="button"
                  onClick={handleGenerateRandomAccessKey}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-colors shadow-2xs"
                  title="Gerar automaticamente uma chave válida para teste ou caso não tenha a chave em mãos"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Gerar Chave Automática
                </button>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Cole ou digite os 44 dígitos da chave de acesso impressa no DANFE da nota..."
                value={manualAccessKey}
                onChange={(e) => setManualAccessKey(e.target.value.replace(/[^0-9]/g, '').slice(0, 44))}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-xs font-mono font-medium tracking-wider text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Dica: Você pode copiar e colar a chave diretamente do PDF ou DANFE da nota. Se deixar em branco, o sistema gerará uma chave referencial automaticamente.
            </p>
          </div>

          {/* Dados Cabeçalho NF */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número da NF *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 50412"
                value={manualNumber}
                onChange={(e) => setManualNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Série
              </label>
              <input
                type="text"
                placeholder="1"
                value={manualSeries}
                onChange={(e) => setManualSeries(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data de Emissão
              </label>
              <input
                type="date"
                required
                value={manualIssueDate}
                onChange={(e) => setManualIssueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data de Entrada no Estoque
              </label>
              <input
                type="date"
                required
                value={manualEntryDate}
                onChange={(e) => setManualEntryDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Dados Fornecedor */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Razão Social do Fornecedor *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Distribuidora Central Ltda"
                value={manualSupplierName}
                onChange={(e) => setManualSupplierName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                CNPJ do Fornecedor
              </label>
              <input
                type="text"
                placeholder="00.000.000/0001-00"
                value={manualSupplierCnpj}
                onChange={(e) => setManualSupplierCnpj(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                UF
              </label>
              <input
                type="text"
                maxLength={2}
                value={manualSupplierUf}
                onChange={(e) => setManualSupplierUf(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Itens da Nota */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Itens da Nota Fiscal ({manualItems.length})
              </h4>
              <button
                type="button"
                onClick={handleAddManualItem}
                className="flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Item
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Código Item</th>
                    <th className="p-2.5">Descrição do Produto</th>
                    <th className="p-2.5 w-16">UN</th>
                    <th className="p-2.5 w-20">CFOP</th>
                    <th className="p-2.5 w-20 text-right">Qtd.</th>
                    <th className="p-2.5 w-28 text-right">Custo Compra</th>
                    <th className="p-2.5 w-28 text-right">Total Compra</th>
                    <th className="p-2.5 w-32 text-right text-indigo-900 bg-indigo-50/50">Venda Sugerida</th>
                    <th className="p-2.5 w-24 text-center bg-indigo-50/50">Markup %</th>
                    <th className="p-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {manualItems.map((item, idx) => {
                    const cost = item.unitPrice || 0;
                    const sale = item.suggestedSalePrice || 0;
                    const markup = cost > 0 ? ((sale - cost) / cost) * 100 : 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-2">
                          <input
                            type="text"
                            required
                            placeholder="Ex: PROD-10"
                            value={item.code}
                            onChange={(e) => handleManualItemChange(idx, 'code', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            required
                            placeholder="Ex: Parafuso Sextavado M8"
                            value={item.description}
                            onChange={(e) => handleManualItemChange(idx, 'description', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={item.unit}
                            onChange={(e) => handleManualItemChange(idx, 'unit', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                          >
                            <option value="UN">UN</option>
                            <option value="CX">CX</option>
                            <option value="KG">KG</option>
                            <option value="LT">LT</option>
                            <option value="PCT">PCT</option>
                            <option value="M">M</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.cfop}
                            onChange={(e) => handleManualItemChange(idx, 'cfop', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            step="any"
                            required
                            value={item.quantity}
                            onChange={(e) => handleManualItemChange(idx, 'quantity', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-right font-semibold"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={item.unitPrice}
                            onChange={(e) => handleManualItemChange(idx, 'unitPrice', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-right"
                          />
                        </td>
                        <td className="p-2 text-right font-bold text-slate-900">
                          {formatBRL(item.totalPrice)}
                        </td>
                        <td className="p-2 bg-indigo-50/30">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-[11px] text-slate-400 font-medium">R$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0,00"
                              value={item.suggestedSalePrice || ''}
                              onChange={(e) => handleManualItemChange(idx, 'suggestedSalePrice', e.target.value)}
                              className="w-24 px-2 py-1 border border-indigo-200 focus:border-indigo-500 rounded text-xs text-right font-bold text-indigo-900 bg-white"
                            />
                          </div>
                        </td>
                        <td className="p-2 text-center bg-indigo-50/30">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            markup >= 40
                              ? 'bg-emerald-100 text-emerald-800'
                              : markup >= 20
                              ? 'bg-amber-100 text-amber-800'
                              : markup < 0
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {markup >= 0 ? `+${markup.toFixed(0)}%` : `${markup.toFixed(0)}%`}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveManualItem(idx)}
                            disabled={manualItems.length === 1}
                            className="text-slate-400 hover:text-rose-600 disabled:opacity-30 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-right">
                <span className="text-xs text-slate-500 font-medium">Valor Total dos Produtos: </span>
                <span className="text-base font-bold text-indigo-700 ml-2">
                  {formatBRL(manualItems.reduce((acc, it) => acc + it.totalPrice, 0))}
                </span>
              </div>
            </div>
          </div>

          {/* SEÇÃO: BOLETOS / CONTAS A PAGAR VINCULADAS */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-2xs">
                  <Barcode className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    Boletos & Contas a Pagar Vinculadas
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      Opcional
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Cadastre os boletos para controlar vencimentos, código de barras e dar baixa no internet banking ({manualDestination}).
                  </p>
                </div>
              </div>

              {/* Toggle Has Boletos */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (!hasBoletos) {
                      setHasBoletos(true);
                      if (manualBoletos.length === 0) {
                        handleQuickInstallments(1);
                      }
                    } else {
                      setHasBoletos(false);
                    }
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    hasBoletos
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <Barcode className="w-4 h-4" />
                  {hasBoletos ? 'Boletos Ativados' : 'Adicionar Boletos a esta Nota'}
                </button>
              </div>
            </div>

            {hasBoletos && (
              <div className="space-y-4 animate-fadeIn">
                {/* Quick Generator Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3 rounded-lg border border-slate-200 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Gerar parcelas automáticas:</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleQuickInstallments(1)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded text-xs font-semibold text-slate-700 transition-colors border border-slate-200"
                    >
                      1x Integral (30d)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickInstallments(2)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded text-xs font-semibold text-slate-700 transition-colors border border-slate-200"
                    >
                      2x (30 e 60d)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickInstallments(3)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded text-xs font-semibold text-slate-700 transition-colors border border-slate-200"
                    >
                      3x (30, 60 e 90d)
                    </button>
                    <button
                      type="button"
                      onClick={handleAddManualBoleto}
                      className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-xs font-semibold transition-colors border border-indigo-200 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Parcela
                    </button>
                  </div>
                </div>

                {/* List of Boletos Cards */}
                <div className="space-y-3">
                  {manualBoletos.map((boleto, bIdx) => {
                    const cleanBarcode = boleto.barcode.replace(/\D/g, '');
                    return (
                      <div
                        key={boleto.id}
                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[11px] font-bold">
                              Parcela {bIdx + 1} de {manualBoletos.length}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              Destino: <strong>{manualDestination}</strong>
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveManualBoleto(bIdx)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                            title="Remover esta parcela"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                          {/* Código de barras / Linha Digitável */}
                          <div className="md:col-span-6 space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                <Barcode className="w-3.5 h-3.5 text-indigo-600" />
                                Código de Barras / Linha Digitável *
                              </label>
                              <span className="text-[11px] font-mono text-slate-400">
                                {cleanBarcode.length > 0 ? `${cleanBarcode.length} dígitos` : 'Vazio'}
                              </span>
                            </div>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Digite ou cole os 47 ou 48 dígitos do código de barras..."
                                value={boleto.barcode}
                                onChange={(e) => handleUpdateManualBoleto(bIdx, 'barcode', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                              />
                            </div>
                          </div>

                          {/* Valor do Boleto */}
                          <div className="md:col-span-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-700">
                                Valor (R$) *
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const totalProd = manualItems.reduce((acc, it) => acc + it.totalPrice, 0);
                                  const otherBoletosTotal = manualBoletos
                                    .filter((_, i) => i !== bIdx)
                                    .reduce((acc, b) => acc + b.amount, 0);
                                  const remainder = Math.max(0, Number((totalProd - otherBoletosTotal).toFixed(2)));
                                  handleUpdateManualBoleto(bIdx, 'amount', remainder);
                                }}
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold underline"
                              >
                                Restante
                              </button>
                            </div>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              required
                              value={boleto.amount || ''}
                              onChange={(e) => handleUpdateManualBoleto(bIdx, 'amount', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                            />
                          </div>

                          {/* Data de Vencimento */}
                          <div className="md:col-span-3 space-y-1">
                            <label className="block text-xs font-bold text-slate-700">
                              Vencimento *
                            </label>
                            <input
                              type="date"
                              required
                              value={boleto.dueDate}
                              onChange={(e) => handleUpdateManualBoleto(bIdx, 'dueDate', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Resumo Financeiro dos Boletos vs Nota */}
                {manualBoletos.length > 0 && (
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div>
                        <span className="text-slate-500">Total da Nota: </span>
                        <strong className="text-slate-800 font-bold ml-1">
                          {formatBRL(manualItems.reduce((acc, it) => acc + it.totalPrice, 0))}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Total dos Boletos: </span>
                        <strong className="text-indigo-800 font-extrabold ml-1">
                          {formatBRL(manualBoletos.reduce((acc, b) => acc + b.amount, 0))}
                        </strong>
                      </div>
                    </div>

                    <div>
                      {Math.abs(
                        manualItems.reduce((acc, it) => acc + it.totalPrice, 0) -
                        manualBoletos.reduce((acc, b) => acc + b.amount, 0)
                      ) < 0.01 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Valor dos boletos confere com a nota fiscal
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          Diferença: {formatBRL(Math.abs(
                            manualItems.reduce((acc, it) => acc + it.totalPrice, 0) -
                            manualBoletos.reduce((acc, b) => acc + b.amount, 0)
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-xs"
            >
              Avançar para Conferência da NF
            </button>
          </div>
        </form>
      )}

      {/* SEÇÃO 2: TELA DE CONFERÊNCIA DA NF-E (STAGED INVOICE) */}
      {stagedInvoice && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-6 p-6">
          {/* Header da NF Staged */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  NF-e nº {stagedInvoice.number} • Série {stagedInvoice.series}
                </span>

                {/* Destino da Mercadoria */}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 border ${
                  stagedInvoice.destinationBranch === 'TERESINA'
                    ? 'bg-teal-50 text-teal-800 border-teal-200'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}>
                  <MapPin className="w-3.5 h-3.5" />
                  Destino: {stagedInvoice.destinationBranch || 'PARNARAMA'}
                </span>

                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Emissão: {formatDateBR(stagedInvoice.issueDate)}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-500" />
                {stagedInvoice.supplier.name}
              </h3>
              <p className="text-xs text-slate-500">
                CNPJ: {stagedInvoice.supplier.cnpj} • UF: {stagedInvoice.supplier.uf || 'SP'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDanfe(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4 text-slate-500" />
                Visualizar DANFE
              </button>
              <button
                type="button"
                onClick={() => setStagedInvoice(null)}
                className="px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
              >
                Descartar
              </button>
            </div>
          </div>

          {/* Chave de Acesso */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-500">Chave de Acesso:</span>
              <span className="font-mono font-medium text-slate-800 break-all select-all">
                {stagedInvoice.accessKey}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(stagedInvoice.accessKey);
                setCopiedBarcodeId('chave');
                setTimeout(() => setCopiedBarcodeId(null), 2000);
              }}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-xs text-slate-700 font-semibold"
            >
              {copiedBarcodeId === 'chave' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Chave Copiada!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  Copiar Chave
                </>
              )}
            </button>
          </div>

          {/* Boletos Vinculados na Nota em Conferência */}
          {stagedInvoice.boletos && stagedInvoice.boletos.length > 0 && (
            <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-indigo-600" />
                  Boletos Cadastrados nesta Nota ({stagedInvoice.boletos.length})
                </h4>
                <span className="text-xs font-bold text-indigo-900">
                  Total em Boletos: {formatBRL(stagedInvoice.boletos.reduce((acc, b) => acc + b.amount, 0))}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stagedInvoice.boletos.map((bol, bIdx) => (
                  <div key={bIdx} className="bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        Parcela {bol.installmentNumber || bIdx + 1} de {stagedInvoice.boletos?.length}
                      </span>
                      <span className="font-extrabold text-indigo-900">
                        {formatBRL(bol.amount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-500">
                      <span>Vencimento:</span>
                      <strong className="text-slate-800">{formatDateBR(bol.dueDate)}</strong>
                    </div>

                    {bol.barcode && (
                      <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-slate-600 truncate">
                          {formatBarcodeDisplay(bol.barcode)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(bol.barcode);
                            setCopiedBarcodeId(`bol-${bIdx}`);
                            setTimeout(() => setCopiedBarcodeId(null), 2000);
                          }}
                          className="shrink-0 p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                          title="Copiar código de barras"
                        >
                          {copiedBarcodeId === `bol-${bIdx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Itens e Diagnóstico de Estoque */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-indigo-600" />
                  Itens a serem Integrados ao Estoque ({stagedInvoice.items.length})
                </h4>
                <span className="text-xs text-slate-500">
                  O custo médio ponderado móvel (CMPM) e os preços sugeridos serão gravados automaticamente
                </span>
              </div>
            </div>

            {/* Barra de Formação Rápida de Preço de Venda */}
            <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-2xs">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">
                    Definir Preço de Venda Sugerido na Entrada da Nota
                  </span>
                  <span className="text-slate-500">
                    Edite os preços individualmente na tabela abaixo ou aplique uma margem de lucro padrão em todos os itens:
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
                <span className="text-slate-600 font-medium">Markup Rápido:</span>
                {[30, 40, 50, 60, 70].map((percent) => (
                  <button
                    key={percent}
                    type="button"
                    onClick={() => handleApplyGlobalMarkup(percent)}
                    className="px-2.5 py-1 bg-white hover:bg-indigo-600 hover:text-white border border-indigo-200 text-indigo-700 font-bold rounded-md text-xs transition-colors shadow-2xs cursor-pointer"
                  >
                    +{percent}%
                  </button>
                ))}
                <div className="flex items-center gap-1 ml-1">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={globalMarkupInput}
                    onChange={(e) => setGlobalMarkupInput(e.target.value)}
                    placeholder="%"
                    className="w-14 px-2 py-1 bg-white border border-indigo-200 rounded-md text-xs font-semibold text-center"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = parseFloat(globalMarkupInput);
                      if (val > 0) handleApplyGlobalMarkup(val);
                    }}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md text-xs transition-colors shadow-2xs cursor-pointer"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Código</th>
                    <th className="p-3">Descrição do Produto</th>
                    <th className="p-3 text-center">NCM</th>
                    <th className="p-3 text-center">UN</th>
                    <th className="p-3 text-right">Qtd. Entrada</th>
                    <th className="p-3 text-right">Custo Compra</th>
                    <th className="p-3 text-right">Total Compra</th>
                    <th className="p-3 text-right bg-indigo-50/50 text-indigo-900 border-x border-indigo-100">
                      Preço Venda Sugerido (R$)
                    </th>
                    <th className="p-3 text-center bg-indigo-50/50 text-indigo-900">
                      Margem / Lucro Unit.
                    </th>
                    <th className="p-3">Impacto no Estoque</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stagedInvoice.items.map((item, idx) => {
                    const existing = products.find(
                      p => p.code.toLowerCase() === item.code.toLowerCase() ||
                           p.name.toLowerCase() === item.description.toLowerCase()
                    );

                    const cost = item.unitPrice || 0;
                    const sale = item.suggestedSalePrice || 0;
                    const profit = sale - cost;
                    const markup = cost > 0 ? ((profit / cost) * 100) : 0;
                    const isLoss = profit < 0;
                    const isHigh = markup >= 40;
                    const isMedium = markup >= 20 && markup < 40;

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono text-slate-700 font-medium">
                          {item.code}
                        </td>
                        <td className="p-3 font-medium text-slate-900 max-w-xs">
                          {item.description}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-500">
                          {item.ncm}
                        </td>
                        <td className="p-3 text-center font-semibold text-slate-700">
                          {item.unit}
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-600">
                          +{item.quantity}
                        </td>
                        <td className="p-3 text-right font-medium text-slate-800">
                          {formatBRL(item.unitPrice)}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          {formatBRL(item.totalPrice)}
                        </td>
                        <td className="p-2.5 bg-indigo-50/30 border-x border-indigo-100">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-[11px] text-slate-400 font-medium">R$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0,00"
                              value={item.suggestedSalePrice ?? ''}
                              onChange={(e) => handleUpdateStagedItemPrice(idx, parseFloat(e.target.value) || 0)}
                              className="w-28 px-2 py-1.5 bg-white border border-indigo-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden rounded-md text-xs text-right font-bold text-indigo-950 shadow-2xs"
                            />
                          </div>
                        </td>
                        <td className="p-2.5 text-center bg-indigo-50/30">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                              isLoss
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : isHigh
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : isMedium
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {markup >= 0 ? `+${markup.toFixed(1)}%` : `${markup.toFixed(1)}%`}
                            </span>
                            <span className={`text-[10px] font-semibold ${profit < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                              Lucro: {formatBRL(profit)}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          {existing ? (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Atualiza saldo ({existing.currentStock} → {existing.currentStock + item.quantity} {existing.unit})
                              </span>
                              <span className="text-[10px] text-slate-500">
                                Custo médio atual: {formatBRL(existing.averageCost)}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Plus className="w-3 h-3" />
                              Cadastra novo produto no estoque
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totais e Botão de Confirmação */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-xs text-slate-600">
              <div>
                <span>Total dos Produtos: </span>
                <span className="font-semibold text-slate-800">
                  {formatBRL(stagedInvoice.totals.productsValue)}
                </span>
              </div>
              {stagedInvoice.totals.freightValue > 0 && (
                <div>
                  <span>Frete: </span>
                  <span className="font-semibold text-slate-800">
                    {formatBRL(stagedInvoice.totals.freightValue)}
                  </span>
                </div>
              )}
              <div>
                <span className="text-slate-500">Valor Total da Nota: </span>
                <span className="text-lg font-bold text-indigo-900 ml-1">
                  {formatBRL(stagedInvoice.totals.totalInvoiceValue)}
                </span>
              </div>
              {stagedInvoice.boletos && stagedInvoice.boletos.length > 0 && (
                <div className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-900 font-bold">
                  <span>{stagedInvoice.boletos.length} boleto(s): </span>
                  <span>{formatBRL(stagedInvoice.boletos.reduce((acc, b) => acc + b.amount, 0))}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setStagedInvoice(null)}
                className="w-1/2 sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Voltar / Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmStockEntry}
                className="w-1/2 sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                Efetivar Entrada no Estoque
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal DANFE */}
      {showDanfe && stagedInvoice && (
        <DanfeModal
          invoice={{
            ...stagedInvoice,
            id: 'preview',
            status: 'CONFIRMADA',
            createdAt: new Date().toISOString(),
          }}
          onClose={() => setShowDanfe(false)}
        />
      )}
    </div>
  );
};
