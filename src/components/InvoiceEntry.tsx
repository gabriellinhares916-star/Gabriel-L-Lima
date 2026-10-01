import React, { useState, useRef } from 'react';
import { Invoice, InvoiceItem, Product } from '../types';
import { parseNFeXML, SAMPLE_NFE_XML_1, SAMPLE_NFE_XML_2 } from '../utils/xmlParser';
import { formatBRL, formatDateBR } from '../utils/stockCalculations';
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
  Sliders
} from 'lucide-react';

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
  const [manualSupplierName, setManualSupplierName] = useState('');
  const [manualSupplierCnpj, setManualSupplierCnpj] = useState('');
  const [manualSupplierUf, setManualSupplierUf] = useState('SP');
  const [manualIssueDate, setManualIssueDate] = useState(new Date().toISOString().substring(0, 10));
  const [manualEntryDate, setManualEntryDate] = useState(new Date().toISOString().substring(0, 10));
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

    const totalProd = manualItems.reduce((acc, it) => acc + it.totalPrice, 0);

    const invoice: Omit<Invoice, 'id' | 'createdAt' | 'status'> = {
      number: manualNumber.trim(),
      series: manualSeries.trim() || '1',
      accessKey: `3526${Date.now()}000199550010000${manualNumber.padStart(6, '0')}1`.slice(0, 44).padEnd(44, '0'),
      issueDate: manualIssueDate,
      entryDate: manualEntryDate,
      supplier: {
        name: manualSupplierName.trim(),
        cnpj: manualSupplierCnpj.trim() || '00.000.000/0001-00',
        uf: manualSupplierUf,
      },
      recipient: {
        name: 'Sua Empresa Ltda',
        cnpj: '12.345.678/0001-90',
        uf: 'SP',
      },
      items: manualItems,
      totals: {
        productsValue: totalProd,
        freightValue: 0,
        taxesValue: 0,
        discountValue: 0,
        totalInvoiceValue: totalProd,
      },
      notes: 'Entrada registrada via digitação manual no sistema',
    };

    setStagedInvoice(invoice);
  };

  // Efetivar entrada no estoque
  const handleConfirmStockEntry = () => {
    if (!stagedInvoice) return;

    onConfirmEntry(stagedInvoice);
    const invoiceNumber = stagedInvoice.number;
    const itemsCount = stagedInvoice.items.length;
    setSuccessMessage(`Nota Fiscal nº ${invoiceNumber} confirmada com sucesso! ${itemsCount} itens deram entrada no estoque.`);
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
          <div className="border-b border-slate-200 pb-3">
            <h3 className="font-semibold text-slate-800 text-sm">Dados da Nota Fiscal</h3>
            <p className="text-xs text-slate-500">Preencha os dados do documento fiscal de entrada</p>
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
                <span className="text-xs text-slate-500 font-medium">Valor Total da Nota: </span>
                <span className="text-base font-bold text-indigo-700 ml-2">
                  {formatBRL(manualItems.reduce((acc, it) => acc + it.totalPrice, 0))}
                </span>
              </div>
            </div>
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
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  NF-e nº {stagedInvoice.number} • Série {stagedInvoice.series}
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
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-xs">
            <KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-slate-500">Chave de Acesso:</span>
            <span className="font-mono font-medium text-slate-800 break-all select-all">
              {stagedInvoice.accessKey}
            </span>
          </div>

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
