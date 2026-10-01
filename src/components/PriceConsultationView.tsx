import React, { useState, useMemo } from 'react';
import { Product, StockMovement, Invoice } from '../types';
import { formatBRL, formatDateBR } from '../utils/stockCalculations';
import { exportPriceTableCSV } from '../utils/csvExport';
import {
  calculateProductPurchaseSummary,
  ProductPurchaseSummary,
} from '../utils/purchaseAverageCalculations';
import {
  Tag,
  Search,
  Download,
  Filter,
  ArrowUpDown,
  TrendingUp,
  Boxes,
  DollarSign,
  Plus,
  Percent,
  Check,
  X,
  Edit2,
  Calculator,
  Sliders,
  AlertTriangle,
  ArrowUpRight,
  BadgePercent,
  Receipt,
  History,
  Info,
  Layers,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';

interface PriceConsultationViewProps {
  products: Product[];
  movements?: StockMovement[];
  invoices?: Invoice[];
  onUpdateProductPrice: (productId: string, newSellingPrice: number) => void;
  onNavigateToEntry: () => void;
  onNavigateToKardex?: (product: Product) => void;
}

export const PriceConsultationView: React.FC<PriceConsultationViewProps> = ({
  products,
  movements = [],
  invoices = [],
  onUpdateProductPrice,
  onNavigateToEntry,
  onNavigateToKardex,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [marginFilter, setMarginFilter] = useState<'ALL' | 'HIGH' | 'HEALTHY' | 'MODERATE' | 'LOW'>('ALL');
  const [sortBy, setSortBy] = useState<'MARGIN_DESC' | 'MARGIN_ASC' | 'PRICE_DESC' | 'PRICE_ASC' | 'COST_DESC' | 'NAME_ASC'>('MARGIN_DESC');

  // Inline editing state
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState<string>('');
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);

  // Modal da Origem do PREÇO MÉDIO (4 últimas notas fiscais de entrada)
  const [selectedHistoryProduct, setSelectedHistoryProduct] = useState<Product | null>(null);

  // Simulator state
  const [showSimulator, setShowSimulator] = useState(false);
  const [selectedSimulatorProduct, setSelectedSimulatorProduct] = useState<Product | null>(
    products.length > 0 ? products[0] : null
  );
  const [simCostBasis, setSimCostBasis] = useState<'PURCHASE_AVG' | 'LAST_COST'>('PURCHASE_AVG');
  const [simDesiredMargin, setSimDesiredMargin] = useState<number>(45);
  const [simCustomPrice, setSimCustomPrice] = useState<string>('');

  // Mapa com o cálculo do PREÇO MÉDIO ponderado considerando exclusivamente as 4 últimas NFs de entrada
  const purchaseSummaries = useMemo(() => {
    const map = new Map<string, ProductPurchaseSummary>();
    products.forEach((p) => {
      map.set(p.id, calculateProductPurchaseSummary(p, movements, invoices, 4));
    });
    return map;
  }, [products, movements, invoices]);

  // Categorias únicas disponíveis
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Totais e KPIs gerais do módulo de preços baseados no PREÇO MÉDIO das 4 últimas NFs
  const summaryStats = useMemo(() => {
    let totalStockCost = 0;
    let totalStockSaleValue = 0;
    let totalWeightedMarginSum = 0;
    let totalProductsWithPrice = 0;

    products.forEach((p) => {
      const summary = purchaseSummaries.get(p.id);
      const buyPrice = summary && summary.averageUnitPrice > 0
        ? summary.averageUnitPrice
        : (p.lastCost > 0 ? p.lastCost : p.averageCost);

      const salePrice = p.sellingPrice || Number((buyPrice * 1.45).toFixed(2));
      const stock = Math.max(0, p.currentStock);

      totalStockCost += stock * buyPrice;
      totalStockSaleValue += stock * salePrice;

      if (salePrice > 0) {
        totalProductsWithPrice += 1;
        const margin = buyPrice > 0 ? ((salePrice - buyPrice) / buyPrice) * 100 : 0;
        totalWeightedMarginSum += margin;
      }
    });

    const averageMargin = products.length > 0 ? totalWeightedMarginSum / products.length : 0;
    const projectedGrossProfit = totalStockSaleValue - totalStockCost;
    const generalMarkup = totalStockCost > 0 ? ((projectedGrossProfit / totalStockCost) * 100) : 0;

    return {
      totalProductsWithPrice,
      totalStockCost,
      totalStockSaleValue,
      projectedGrossProfit,
      averageMargin,
      generalMarkup,
    };
  }, [products, purchaseSummaries]);

  // Filtragem e ordenação da lista
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Busca textual
        const query = searchTerm.toLowerCase().trim();
        const matchesQuery =
          !query ||
          p.name.toLowerCase().includes(query) ||
          p.code.toLowerCase().includes(query) ||
          (p.ncm && p.ncm.includes(query)) ||
          (p.category && p.category.toLowerCase().includes(query));

        // Categoria
        const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;

        // Faixa de margem com base no PREÇO MÉDIO
        const summary = purchaseSummaries.get(p.id);
        const buyPrice = summary && summary.averageUnitPrice > 0
          ? summary.averageUnitPrice
          : (p.lastCost > 0 ? p.lastCost : p.averageCost);
        const salePrice = p.sellingPrice || Number((buyPrice * 1.45).toFixed(2));
        const markup = buyPrice > 0 ? ((salePrice - buyPrice) / buyPrice) * 100 : 0;

        let matchesMargin = true;
        if (marginFilter === 'HIGH') matchesMargin = markup >= 50;
        else if (marginFilter === 'HEALTHY') matchesMargin = markup >= 30 && markup < 50;
        else if (marginFilter === 'MODERATE') matchesMargin = markup >= 15 && markup < 30;
        else if (marginFilter === 'LOW') matchesMargin = markup < 15;

        return matchesQuery && matchesCategory && matchesMargin;
      })
      .sort((a, b) => {
        const sumA = purchaseSummaries.get(a.id);
        const buyA = sumA && sumA.averageUnitPrice > 0 ? sumA.averageUnitPrice : (a.lastCost || a.averageCost);
        const saleA = a.sellingPrice || Number((buyA * 1.45).toFixed(2));
        const markupA = buyA > 0 ? ((saleA - buyA) / buyA) * 100 : 0;

        const sumB = purchaseSummaries.get(b.id);
        const buyB = sumB && sumB.averageUnitPrice > 0 ? sumB.averageUnitPrice : (b.lastCost || b.averageCost);
        const saleB = b.sellingPrice || Number((buyB * 1.45).toFixed(2));
        const markupB = buyB > 0 ? ((saleB - buyB) / buyB) * 100 : 0;

        switch (sortBy) {
          case 'MARGIN_DESC':
            return markupB - markupA;
          case 'MARGIN_ASC':
            return markupA - markupB;
          case 'PRICE_DESC':
            return saleB - saleA;
          case 'PRICE_ASC':
            return saleA - saleB;
          case 'COST_DESC':
            return buyB - buyA;
          case 'NAME_ASC':
            return a.name.localeCompare(b.name);
          default:
            return 0;
        }
      });
  }, [products, searchTerm, categoryFilter, marginFilter, sortBy, purchaseSummaries]);

  // Iniciar edição rápida de preço inline
  const handleStartEdit = (p: Product) => {
    const summary = purchaseSummaries.get(p.id);
    const buyPrice = summary && summary.averageUnitPrice > 0
      ? summary.averageUnitPrice
      : (p.lastCost || p.averageCost || 10);
    const currentPrice = p.sellingPrice || Number((buyPrice * 1.45).toFixed(2));
    setEditingProductId(p.id);
    setEditPriceValue(currentPrice.toString());
  };

  // Salvar edição rápida de preço
  const handleSaveEdit = (productId: string) => {
    const val = parseFloat(editPriceValue.replace(',', '.'));
    if (!isNaN(val) && val >= 0) {
      onUpdateProductPrice(productId, val);
      setSaveSuccessId(productId);
      setTimeout(() => setSaveSuccessId(null), 2500);
    }
    setEditingProductId(null);
  };

  // Cancelar edição
  const handleCancelEdit = () => {
    setEditingProductId(null);
  };

  // Abrir simulador para produto específico
  const handleOpenSimulatorFor = (p: Product) => {
    setSelectedSimulatorProduct(p);
    const summary = purchaseSummaries.get(p.id);
    const buyPrice = summary && summary.averageUnitPrice > 0
      ? summary.averageUnitPrice
      : (p.lastCost > 0 ? p.lastCost : p.averageCost);
    const salePrice = p.sellingPrice || Number((buyPrice * 1.45).toFixed(2));
    const currentMarkup = buyPrice > 0 ? Number((((salePrice - buyPrice) / buyPrice) * 100).toFixed(1)) : 40;
    setSimDesiredMargin(currentMarkup);
    setSimCustomPrice(salePrice.toFixed(2));
    setSimCostBasis('PURCHASE_AVG');
    setShowSimulator(true);
  };

  // Cálculos do simulador com suporte ao PREÇO MÉDIO (4 últimas NFs ponderadas)
  const simCalculations = useMemo(() => {
    if (!selectedSimulatorProduct) return null;
    const summary = purchaseSummaries.get(selectedSimulatorProduct.id);
    const avgPurchasePrice = summary ? summary.averageUnitPrice : selectedSimulatorProduct.averageCost;
    const lastCost = selectedSimulatorProduct.lastCost > 0 ? selectedSimulatorProduct.lastCost : avgPurchasePrice;

    // Base de custo selecionada pelo usuário no simulador
    const selectedBaseCost = simCostBasis === 'PURCHASE_AVG' ? avgPurchasePrice : lastCost;

    const calculatedPrice = Number((selectedBaseCost * (1 + simDesiredMargin / 100)).toFixed(2));
    const unitGrossProfit = calculatedPrice - selectedBaseCost;
    const marginOnSelling = calculatedPrice > 0 ? ((unitGrossProfit / calculatedPrice) * 100) : 0;

    const stock = Math.max(0, selectedSimulatorProduct.currentStock);
    const totalInventoryValue = stock * calculatedPrice;
    const totalInventoryProfit = stock * unitGrossProfit;

    return {
      selectedBaseCost,
      avgPurchasePrice,
      lastCost,
      invoicesCount: summary ? summary.invoicesCount : 1,
      totalQuantity: summary ? summary.totalQuantity : stock,
      totalValue: summary ? summary.totalValue : stock * avgPurchasePrice,
      calculatedPrice,
      unitGrossProfit,
      marginOnSelling,
      stock,
      totalInventoryValue,
      totalInventoryProfit,
    };
  }, [selectedSimulatorProduct, simDesiredMargin, simCostBasis, purchaseSummaries]);

  // Aplicar preço do simulador ao produto
  const handleApplySimulatedPrice = () => {
    if (!selectedSimulatorProduct || !simCalculations) return;
    onUpdateProductPrice(selectedSimulatorProduct.id, simCalculations.calculatedPrice);
    setSaveSuccessId(selectedSimulatorProduct.id);
    setTimeout(() => setSaveSuccessId(null), 2500);
    setShowSimulator(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <Tag className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Consulta de Preços (Compra vs. Venda)
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Compare o Preço de Compra (Último custo NF-e e <strong>PREÇO MÉDIO ponderado das 4 últimas notas fiscais de entrada</strong>) com o Preço de Venda Sugerido, margem bruta e lucro de cada produto.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          <button
            onClick={() => exportPriceTableCSV(products, movements, invoices)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="Exportar planilha completa de preços com o PREÇO MÉDIO das 4 últimas notas"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Exportar Tabela (CSV)
          </button>

          <button
            onClick={() => {
              if (products.length > 0 && !selectedSimulatorProduct) {
                setSelectedSimulatorProduct(products[0]);
              }
              setShowSimulator(!showSimulator);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer ${
              showSimulator
                ? 'bg-indigo-700 text-white'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            <Calculator className="w-4 h-4" />
            Simulador de Margem
          </button>

          <button
            onClick={onNavigateToEntry}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nova Entrada de NF-e
          </button>
        </div>
      </div>

      {/* KPI Cards de Preços e Margens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Precificado */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Itens Precificados
            </span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Boxes className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {summaryStats.totalProductsWithPrice}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              de {products.length} itens no catálogo
            </span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-emerald-700 font-medium gap-1">
            <Check className="w-3.5 h-3.5" />
            100% com PREÇO MÉDIO (4 NFs) calculado
          </div>
        </div>

        {/* Margem Média Geral (Markup) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Markup Médio Geral
            </span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <BadgePercent className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">
              +{summaryStats.averageMargin.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500">sobre o PREÇO MÉDIO</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Markup contábil geral: <span className="font-semibold text-slate-700">+{summaryStats.generalMarkup.toFixed(1)}%</span>
          </div>
        </div>

        {/* Valor Total do Estoque a Preço Médio */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Custo Total Estoque
            </span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              {formatBRL(summaryStats.totalStockCost)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Base ponderada das 4 últimas NFs de entrada
          </div>
        </div>

        {/* Potencial de Venda e Lucro Bruto Projetado */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-5 rounded-xl text-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wide">
              Potencial de Venda
            </span>
            <span className="p-2 bg-white/10 text-emerald-400 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white">
              {formatBRL(summaryStats.totalStockSaleValue)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-300 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            Lucro Bruto Projetado: {formatBRL(summaryStats.projectedGrossProfit)}
          </div>
        </div>
      </div>

      {/* Painel do Simulador de Margem e Preço Ideal (Expansível) */}
      {showSimulator && selectedSimulatorProduct && simCalculations && (
        <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-sm transition-all animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Simulador de Formação de Preço de Venda
              </h3>
            </div>
            <button
              onClick={() => setShowSimulator(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            {/* 1. Selecionar Produto & Base de Custo */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block">
                Produto para Simulação:
              </label>
              <select
                value={selectedSimulatorProduct.id}
                onChange={(e) => {
                  const p = products.find((prod) => prod.id === e.target.value);
                  if (p) handleOpenSimulatorFor(p);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 bg-white"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>

              {/* Seletor de Base de Custo para o Markup */}
              <div>
                <span className="text-[11px] font-bold text-slate-700 block mb-1">
                  Base de Custo para Margem:
                </span>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSimCostBasis('PURCHASE_AVG')}
                    className={`py-1.5 px-2 rounded-md font-bold transition-all cursor-pointer ${
                      simCostBasis === 'PURCHASE_AVG'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    PREÇO MÉDIO ({formatBRL(simCalculations.avgPurchasePrice)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimCostBasis('LAST_COST')}
                    className={`py-1.5 px-2 rounded-md font-bold transition-all cursor-pointer ${
                      simCostBasis === 'LAST_COST'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Último Custo ({formatBRL(simCalculations.lastCost)})
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">PREÇO MÉDIO (4 NFs):</span>
                  <span className="font-bold text-indigo-700">{formatBRL(simCalculations.avgPurchasePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Último Custo NF-e:</span>
                  <span className="font-semibold text-slate-700">{formatBRL(simCalculations.lastCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estoque Atual:</span>
                  <span className="font-semibold text-slate-900">
                    {simCalculations.stock} {selectedSimulatorProduct.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Preço Atual de Venda:</span>
                  <span className="font-bold text-slate-900">
                    {formatBRL(selectedSimulatorProduct.sellingPrice || simCalculations.selectedBaseCost * 1.45)}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Definir Margem / Markup Desejado */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Markup sobre {simCostBasis === 'PURCHASE_AVG' ? 'PREÇO MÉDIO' : 'Último Custo'}:</span>
                <span className="text-indigo-700 font-extrabold text-sm">
                  +{simDesiredMargin.toFixed(0)}%
                </span>
              </label>

              <input
                type="range"
                min="5"
                max="150"
                step="1"
                value={simDesiredMargin}
                onChange={(e) => setSimDesiredMargin(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />

              <div className="grid grid-cols-4 gap-1 pt-1">
                {[25, 40, 55, 75].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSimDesiredMargin(m)}
                    className={`py-1 text-[11px] font-semibold rounded-md border cursor-pointer ${
                      simDesiredMargin === m
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    +{m}%
                  </button>
                ))}
              </div>

              <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-xs space-y-1">
                <div className="font-bold text-indigo-900">Margem Bruta sobre a Venda:</div>
                <div className="text-lg font-extrabold text-indigo-700">
                  {simCalculations.marginOnSelling.toFixed(1)}%
                </div>
                <div className="text-[11px] text-slate-500">
                  De cada R$ 100 vendidos, R$ {simCalculations.marginOnSelling.toFixed(2)} é lucro bruto.
                </div>
              </div>
            </div>

            {/* 3. Resultado Sugerido e Aplicação */}
            <div className="space-y-3 flex flex-col justify-between">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Preço de Venda Sugerido:
                </label>
                <div className="p-3.5 bg-gradient-to-br from-indigo-50 to-white border-2 border-indigo-300 rounded-xl">
                  <div className="text-xs text-indigo-700 font-semibold">Novo Preço Praticado:</div>
                  <div className="text-2xl font-black text-indigo-950 font-mono mt-0.5">
                    {formatBRL(simCalculations.calculatedPrice)}
                  </div>
                  <div className="mt-2 text-xs text-emerald-700 font-bold flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Lucro unitário: +{formatBRL(simCalculations.unitGrossProfit)} por {selectedSimulatorProduct.unit}
                  </div>
                </div>

                <div className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Faturamento no Estoque Atual:</span>
                    <span className="font-semibold text-slate-900">
                      {formatBRL(simCalculations.totalInventoryValue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Lucro Total no Estoque Atual:</span>
                    <span className="font-bold text-indigo-900">
                      +{formatBRL(simCalculations.totalInventoryProfit)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplySimulatedPrice}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Salvar este Preço no Produto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback de Preço Salvo com Sucesso */}
      {saveSuccessId && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs font-semibold text-emerald-800">
          <Check className="w-4 h-4 text-emerald-600" />
          Preço de venda atualizado com sucesso no estoque!
        </div>
      )}

      {/* Barra de Busca e Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Campo de Busca */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código, descrição, categoria ou NCM..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Filtro de Categoria */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-medium">Categoria:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="ALL">Todas as Categorias</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Faixa de Margem */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-medium">Margem:</span>
              <select
                value={marginFilter}
                onChange={(e) => setMarginFilter(e.target.value as any)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="ALL">Todas as Margens</option>
                <option value="HIGH">Alta Margem (&ge; 50%)</option>
                <option value="HEALTHY">Saudável (30% a 50%)</option>
                <option value="MODERATE">Moderada (15% a 30%)</option>
                <option value="LOW">Baixa / Crítica (&lt; 15%)</option>
              </select>
            </div>

            {/* Ordenação */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="MARGIN_DESC">Maior Margem (%)</option>
                <option value="MARGIN_ASC">Menor Margem (%)</option>
                <option value="PRICE_DESC">Maior Preço de Venda</option>
                <option value="PRICE_ASC">Menor Preço de Venda</option>
                <option value="COST_DESC">Maior PREÇO MÉDIO</option>
                <option value="NAME_ASC">Nome A-Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Resumo de Resultados */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            Mostrando <strong>{filteredProducts.length}</strong> de {products.length} produtos
          </span>
          <span className="text-slate-400">
            Dica: clique no valor do <strong>PREÇO MÉDIO</strong> para conferir as 4 notas fiscais de entrada utilizadas no cálculo ponderado.
          </span>
        </div>
      </div>

      {/* Tabela Principal Comparativa: Compra vs. Venda */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Código & Produto</th>
                <th className="p-3.5 text-center">UN</th>
                <th className="p-3.5 text-right">Estoque</th>
                <th className="p-3.5 text-right bg-slate-50 text-slate-800">
                  Preço de Compra (Último Custo NF-e)
                </th>
                {/* Coluna solicitada: PREÇO MÉDIO (4 últimas notas ponderadas) */}
                <th className="p-3.5 text-right bg-indigo-50/60 text-indigo-950 font-bold border-l border-indigo-100">
                  <div className="flex flex-col items-end">
                    <span className="flex items-center gap-1 uppercase tracking-wider text-xs">
                      PREÇO MÉDIO
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-indigo-600 text-white">
                        4 NFs
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      (Ponderado por quantidade)
                    </span>
                  </div>
                </th>
                <th className="p-3.5 text-right bg-indigo-50/70 text-indigo-950 font-bold border-r border-indigo-100">
                  Preço de Venda Sugerido / Praticado
                </th>
                <th className="p-3.5 text-right">Lucro Unitário</th>
                <th className="p-3.5 text-center">Markup s/ Preço Médio</th>
                <th className="p-3.5 text-right">Total em Venda</th>
                <th className="p-3.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Nenhum produto encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const summary = purchaseSummaries.get(p.id) || calculateProductPurchaseSummary(p, movements, invoices, 4);
                  const buyPrice = summary.averageUnitPrice > 0
                    ? summary.averageUnitPrice
                    : (p.lastCost > 0 ? p.lastCost : p.averageCost);

                  const salePrice = p.sellingPrice || Number((buyPrice * 1.45).toFixed(2));
                  const unitProfit = salePrice - buyPrice;
                  const markup = buyPrice > 0 ? ((unitProfit / buyPrice) * 100) : 0;
                  const totalInventorySale = p.currentStock * salePrice;

                  const isEditing = editingProductId === p.id;
                  const isLoss = unitProfit < 0;
                  const isHigh = markup >= 50;
                  const isHealthy = markup >= 30 && markup < 50;
                  const isModerate = markup >= 15 && markup < 30;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      {/* Código & Descrição */}
                      <td className="p-3.5 max-w-xs">
                        <div className="font-mono text-slate-500 font-semibold text-[11px]">
                          {p.code}
                        </div>
                        <div className="font-bold text-slate-900 mt-0.5">
                          {p.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                            {p.category}
                          </span>
                          {p.location && (
                            <span className="text-[10px] text-slate-400">
                              {p.location}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* UN */}
                      <td className="p-3.5 text-center font-semibold text-slate-700">
                        {p.unit}
                      </td>

                      {/* Estoque */}
                      <td className="p-3.5 text-right font-bold text-slate-900">
                        {p.currentStock}
                      </td>

                      {/* Preço de Compra (Último Custo NF-e) */}
                      <td className="p-3.5 text-right font-medium text-slate-800 bg-slate-50/40">
                        {formatBRL(p.lastCost)}
                      </td>

                      {/* PREÇO MÉDIO: Ponderado considerando as 4 últimas notas fiscais */}
                      <td className="p-3.5 text-right bg-indigo-50/30 border-l border-indigo-100">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedHistoryProduct(p)}
                            className="cursor-pointer group flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-indigo-100/70 transition-all border border-indigo-200/60"
                            title="Clique para conferir a origem do PREÇO MÉDIO (4 últimas notas)"
                          >
                            <span className="font-bold text-indigo-950 group-hover:text-indigo-700 text-xs font-mono">
                              {formatBRL(summary.averageUnitPrice)}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-white text-indigo-700 shadow-2xs border border-indigo-200">
                              {summary.invoicesCount} {summary.invoicesCount === 1 ? 'NF' : 'NFs'}
                            </span>
                            <Receipt className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-600" />
                          </button>
                        </div>
                      </td>

                      {/* Preço de Venda Sugerido / Praticado (Inline Editing) */}
                      <td className="p-3 text-right bg-indigo-50/30 border-r border-indigo-100">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-slate-400 text-[11px]">R$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              autoFocus
                              value={editPriceValue}
                              onChange={(e) => setEditPriceValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(p.id);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              className="w-24 px-2 py-1 bg-white border border-indigo-500 rounded text-xs text-right font-bold text-indigo-900 shadow-2xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(p.id)}
                              className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                              title="Salvar"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded cursor-pointer"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleStartEdit(p)}
                            className="group flex items-center justify-end gap-1.5 cursor-pointer py-1 px-1.5 rounded hover:bg-indigo-100/60 transition-colors"
                            title="Clique para editar o preço de venda"
                          >
                            <span className="text-sm font-extrabold text-indigo-900 font-mono">
                              {formatBRL(salePrice)}
                            </span>
                            <Edit2 className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </td>

                      {/* Lucro Bruto Unitário */}
                      <td className="p-3.5 text-right font-semibold">
                        <span className={isLoss ? 'text-rose-600' : 'text-emerald-700'}>
                          {unitProfit >= 0 ? `+${formatBRL(unitProfit)}` : formatBRL(unitProfit)}
                        </span>
                      </td>

                      {/* Markup / Margem com Badge */}
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isLoss
                              ? 'bg-rose-100 text-rose-800'
                              : isHigh
                              ? 'bg-emerald-100 text-emerald-800'
                              : isHealthy
                              ? 'bg-blue-100 text-blue-800'
                              : isModerate
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {markup >= 0 ? `+${markup.toFixed(1)}%` : `${markup.toFixed(1)}%`}
                        </span>
                      </td>

                      {/* Total em Estoque a Preço de Venda */}
                      <td className="p-3.5 text-right font-bold text-slate-900">
                        {formatBRL(totalInventorySale)}
                      </td>

                      {/* Ações */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenSimulatorFor(p)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Simular margem e preço para este produto"
                          >
                            <Calculator className="w-4 h-4" />
                          </button>
                          {onNavigateToKardex && (
                            <button
                              type="button"
                              onClick={() => onNavigateToKardex(p)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Ver ficha Kardex de movimentação"
                            >
                              <Boxes className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Modal de Detalhamento da Origem do PREÇO MÉDIO (4 Últimas NFs de Entrada) */}
      {selectedHistoryProduct && (() => {
        const summary = purchaseSummaries.get(selectedHistoryProduct.id) || calculateProductPurchaseSummary(selectedHistoryProduct, movements, invoices, 4);
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95">
              {/* Cabeçalho do Modal */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500">{selectedHistoryProduct.code}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600 text-white font-black tracking-wide uppercase">
                        Origem do PREÇO MÉDIO
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                        Últimas {summary.invoicesCount} de 4 NFs
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">
                      {selectedHistoryProduct.name}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedHistoryProduct(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corpo do Modal */}
              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* 3 Blocos de Totais Conforme Regra de Cálculo */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gradient-to-br from-indigo-50/90 to-blue-50/60 border border-indigo-200 rounded-xl">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wide">
                      PREÇO MÉDIO:
                    </span>
                    <div className="text-2xl font-black text-indigo-950 font-mono mt-0.5">
                      {formatBRL(summary.averageUnitPrice)}
                    </div>
                    <span className="text-[10px] text-indigo-700 font-medium">
                      Valor Total ÷ Qtd Total
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      Quantidade Total:
                    </span>
                    <div className="text-xl font-black text-slate-900 mt-0.5">
                      {Number(summary.totalQuantity)} {selectedHistoryProduct.unit}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Soma das quantidades das {summary.invoicesCount} NFs
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      Valor Total Considerado:
                    </span>
                    <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
                      {formatBRL(summary.totalValue)}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Soma dos valores das {summary.invoicesCount} NFs
                    </span>
                  </div>
                </div>

                {/* Demonstração Detalhada da Fórmula Ponderada Conforme Solicitado */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Calculator className="w-4 h-4 text-indigo-600" />
                    <span>Fórmula Ponderada Aplicada:</span>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-indigo-950 overflow-x-auto space-y-1">
                    <div className="text-slate-500 font-sans font-semibold text-[10px] uppercase">
                      (Soma de cada Quantidade × Preço Unitário) ÷ (Soma das Quantidades):
                    </div>
                    <div>
                      Preço Médio = ({summary.purchases.map(p => `${Number(p.quantity)} × ${formatBRL(Number(p.unitPrice))}`).join(' + ')}) ÷ ({summary.purchases.map(p => Number(p.quantity)).join(' + ')})
                    </div>
                    <div className="font-bold text-indigo-700 pt-1 border-t border-slate-100">
                      Preço Médio = {formatBRL(summary.totalValue)} ÷ {Number(summary.totalQuantity)} = <strong className="text-indigo-950 font-black">{formatBRL(summary.averageUnitPrice)}</strong> por {selectedHistoryProduct.unit}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>
                      Todas as notas fiscais anteriores às 4 últimas foram desconsideradas no cálculo.
                    </span>
                  </div>
                </div>

                {/* Tabela com as 4 Últimas Notas Utilizadas no Cálculo */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="p-3 bg-slate-100 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
                    <span>Notas Fiscais de Entrada Utilizadas no Cálculo</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Exclusivamente as {summary.purchases.length} mais recentes (máximo 4)
                    </span>
                  </div>

                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-8">#</th>
                        <th className="py-2.5 px-3">Data Entrada</th>
                        <th className="py-2.5 px-3">Nota Fiscal / Doc</th>
                        <th className="py-2.5 px-3">Fornecedor</th>
                        <th className="py-2.5 px-3 text-right">Qtd (A)</th>
                        <th className="py-2.5 px-3 text-right bg-indigo-50/50 text-indigo-950 font-bold">
                          Preço Unit. (B)
                        </th>
                        <th className="py-2.5 px-3 text-right font-bold text-slate-900">
                          Total (A × B)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summary.purchases.map((purchase, idx) => (
                        <tr key={purchase.id || idx} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                            {formatDateBR(purchase.date)}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                            {purchase.documentNumber}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 max-w-[150px] truncate" title={purchase.supplier}>
                            {purchase.supplier}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                            {purchase.quantity} {purchase.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-900 bg-indigo-50/30">
                            {formatBRL(purchase.unitPrice)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatBRL(purchase.totalPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-xs text-slate-900">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 text-right uppercase text-slate-600">
                          Totais Considerados:
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-indigo-950">
                          {Number(summary.totalQuantity)} {selectedHistoryProduct.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                          —
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-950">
                          {formatBRL(summary.totalValue)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Rodapé do Modal */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setSelectedHistoryProduct(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const prod = selectedHistoryProduct;
                    setSelectedHistoryProduct(null);
                    handleOpenSimulatorFor(prod);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer shadow-xs"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  Simular Preço com o PREÇO MÉDIO
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
