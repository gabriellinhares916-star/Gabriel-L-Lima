import React, { useState } from 'react';
import { Product, StockMovement, MovementType } from '../types';
import { formatBRL } from '../utils/stockCalculations';
import { KardexModal } from './KardexModal';
import { QuickMovementModal } from './QuickMovementModal';
import {
  Boxes,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  History,
  ArrowUpDown,
  Filter,
  DollarSign,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { exportProductsStockCSV, exportMovementsHistoryCSV } from '../utils/csvExport';

interface InventoryManagerProps {
  products: Product[];
  movements: StockMovement[];
  onSaveMovement: (params: {
    productId: string;
    type: MovementType;
    quantity: number;
    date: string;
    documentNumber?: string;
    supplierOrCustomer?: string;
    notes?: string;
  }) => void;
  onAddNewProduct: (newProduct: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  products,
  movements,
  onSaveMovement,
  onAddNewProduct,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'NORMAL' | 'LOW' | 'OUT'>('ALL');
  const [kardexProduct, setKardexProduct] = useState<Product | null>(null);
  const [quickMovementProduct, setQuickMovementProduct] = useState<Product | null>(null);
  const [showNewProductModal, setShowNewProductModal] = useState(false);

  // New product form state
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Geral');
  const [newUnit, setNewUnit] = useState('UN');
  const [newNcm, setNewNcm] = useState('');
  const [newCurrentStock, setNewCurrentStock] = useState<number>(0);
  const [newMinStock, setNewMinStock] = useState<number>(10);
  const [newCost, setNewCost] = useState<number>(0);
  const [newLocation, setNewLocation] = useState('');

  // Obter categorias únicas
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  // Filtragem
  const filteredProducts = products.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.ncm && p.ncm.includes(searchTerm));

    const matchCategory = selectedCategory === 'ALL' || p.category === selectedCategory;

    let matchStatus = true;
    if (selectedStatus === 'OUT') matchStatus = p.currentStock <= 0;
    else if (selectedStatus === 'LOW') matchStatus = p.currentStock > 0 && p.currentStock <= p.minStock;
    else if (selectedStatus === 'NORMAL') matchStatus = p.currentStock > p.minStock;

    return matchSearch && matchCategory && matchStatus;
  });

  // Estatísticas do Estoque
  const totalStockValue = products.reduce((acc, p) => acc + (p.currentStock * p.averageCost), 0);
  const lowStockCount = products.filter(p => p.currentStock > 0 && p.currentStock <= p.minStock).length;
  const outOfStockCount = products.filter(p => p.currentStock <= 0).length;

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;

    onAddNewProduct({
      code: newCode.trim(),
      name: newName.trim(),
      category: newCategory.trim() || 'Geral',
      unit: newUnit,
      ncm: newNcm.trim() || '00000000',
      currentStock: Number(newCurrentStock) || 0,
      minStock: Number(newMinStock) || 0,
      averageCost: Number(newCost) || 0,
      lastCost: Number(newCost) || 0,
      location: newLocation.trim() || undefined,
    });

    // Resetar form
    setNewCode('');
    setNewName('');
    setNewCategory('Geral');
    setNewUnit('UN');
    setNewNcm('');
    setNewCurrentStock(0);
    setNewMinStock(10);
    setNewCost(0);
    setNewLocation('');
    setShowNewProductModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-indigo-600" />
            Controle de Estoque & Inventário
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Acompanhamento de saldos, custo médio ponderado móvel, pontos de reposição e ficha Kardex.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => exportProductsStockCSV(products)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors shadow-2xs"
            title="Baixar planilha completa do saldo atual de todos os produtos"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Exportar Saldo (CSV)
          </button>

          <button
            onClick={() => exportMovementsHistoryCSV(movements)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors shadow-2xs"
            title="Baixar planilha completa de todas as movimentações físicas e financeiras de estoque"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Exportar Histórico (CSV)
          </button>

          <button
            onClick={() => setShowNewProductModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Novo Produto Manual
          </button>
        </div>
      </div>

      {/* Mini KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Patrimônio em Estoque</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1">
            {formatBRL(totalStockValue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Valoração a custo médio</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Itens Cadastrados</span>
            <Boxes className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1">
            {products.length} produtos
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {products.reduce((acc, p) => acc + p.currentStock, 0)} unidades no total
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Estoque Baixo</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-amber-600 mt-1">
            {lowStockCount} itens
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Abaixo do estoque mínimo</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Estoque Esgotado</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-lg font-bold text-rose-600 mt-1">
            {outOfStockCount} itens
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Saldo zerado</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código, descrição ou NCM..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Category filter */}
        <div className="w-full md:w-48">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Todas Categorias</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="w-full md:w-48">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Todos os Status</option>
            <option value="NORMAL">Estoque Normal</option>
            <option value="LOW">Estoque Baixo / Reposição</option>
            <option value="OUT">Esgotado (Zero)</option>
          </select>
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="text-slate-600 font-medium">
            Exibindo <strong className="text-slate-900 font-bold">{filteredProducts.length}</strong> de <strong className="text-slate-900 font-bold">{products.length}</strong> produtos cadastrados
            {(searchTerm || selectedCategory !== 'ALL' || selectedStatus !== 'ALL') && (
              <span className="ml-2 text-indigo-600 font-medium">(filtros ativos)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportProductsStockCSV(filteredProducts, 'filtrado')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors shadow-2xs"
              title="Exportar exatamente os produtos visíveis na tabela com os filtros atuais"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Exportar Tabela (CSV)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Descrição do Produto</th>
                <th className="p-3">Categoria</th>
                <th className="p-3 text-center">UN</th>
                <th className="p-3 text-right">Saldo Atual</th>
                <th className="p-3 text-right">Estoque Mínimo</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Custo Médio</th>
                <th className="p-3 text-right">Valor em Estoque</th>
                <th className="p-3 text-center">Ações</th>
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
                filteredProducts.map((product) => {
                  const isLow = product.currentStock > 0 && product.currentStock <= product.minStock;
                  const isOut = product.currentStock <= 0;
                  const totalValue = product.currentStock * product.averageCost;

                  return (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-medium text-slate-800">
                        {product.code}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{product.name}</div>
                        {product.location && (
                          <div className="text-[10px] text-slate-400">Loc: {product.location}</div>
                        )}
                      </td>
                      <td className="p-3 text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                          {product.category}
                        </span>
                      </td>
                      <td className="p-3 text-center font-semibold text-slate-700">
                        {product.unit}
                      </td>
                      <td className="p-3 text-right font-bold text-sm text-slate-900">
                        {product.currentStock}
                      </td>
                      <td className="p-3 text-right text-slate-500">
                        {product.minStock}
                      </td>
                      <td className="p-3 text-center">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3" /> Esgotado
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3 h-3" /> Reposição
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Normal
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right text-slate-700 font-medium">
                        {formatBRL(product.averageCost)}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        {formatBRL(totalValue)}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            title="Ver Ficha Kardex"
                            onClick={() => setKardexProduct(product)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="Movimentar / Baixar Estoque"
                            onClick={() => setQuickMovementProduct(product)}
                            className="px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                          >
                            Movimentar
                          </button>
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

      {/* Modal Ficha Kardex */}
      {kardexProduct && (
        <KardexModal
          product={kardexProduct}
          movements={movements}
          onClose={() => setKardexProduct(null)}
        />
      )}

      {/* Modal Movimentação Manual / Baixa */}
      {quickMovementProduct && (
        <QuickMovementModal
          product={quickMovementProduct}
          onClose={() => setQuickMovementProduct(null)}
          onSave={(params) => {
            onSaveMovement(params);
            setQuickMovementProduct(null);
          }}
        />
      )}

      {/* Modal Cadastro Novo Produto Manual */}
      {showNewProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-semibold text-base">Cadastrar Novo Produto Manualmente</h3>
              <button
                onClick={() => setShowNewProductModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Código do Produto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: PROD-99"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unidade de Medida</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="UN">UN - Unidade</option>
                    <option value="CX">CX - Caixa</option>
                    <option value="KG">KG - Quilograma</option>
                    <option value="LT">LT - Litro</option>
                    <option value="PCT">PCT - Pacote</option>
                    <option value="M">M - Metro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descrição do Produto *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome completo do item"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Categoria</label>
                  <input
                    type="text"
                    placeholder="Ex: Ferramentas, Elétrica"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NCM Fiscal</label>
                  <input
                    type="text"
                    placeholder="8 dígitos"
                    value={newNcm}
                    onChange={(e) => setNewNcm(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Saldo Inicial</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newCurrentStock}
                    onChange={(e) => setNewCurrentStock(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estoque Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Custo Unitário (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newCost}
                    onChange={(e) => setNewCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Localização no Depósito</label>
                <input
                  type="text"
                  placeholder="Ex: Corredor B, Gaveta 3"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewProductModal(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
