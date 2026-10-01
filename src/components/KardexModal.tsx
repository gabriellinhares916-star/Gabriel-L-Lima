import React from 'react';
import { Product, StockMovement } from '../types';
import { formatBRL, formatDateBR } from '../utils/stockCalculations';
import { exportProductKardexCSV } from '../utils/csvExport';
import { X, ArrowDownRight, ArrowUpRight, History, Package, AlertTriangle, CheckCircle2, Download } from 'lucide-react';

interface KardexModalProps {
  product: Product | null;
  movements: StockMovement[];
  onClose: () => void;
}

export const KardexModal: React.FC<KardexModalProps> = ({ product, movements, onClose }) => {
  if (!product) return null;

  // Filtrar e ordenar movimentações deste produto cronologicamente
  const productMovements = movements
    .filter(m => m.productId === product.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const isLowStock = product.currentStock <= product.minStock;
  const isOutOfStock = product.currentStock === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl my-8 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-700">
                  {product.code}
                </span>
                <h3 className="font-semibold text-lg text-white">{product.name}</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Ficha Kardex • Histórico Analítico de Movimentações e Custo Médio
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportProductKardexCSV(product, movements)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg transition-colors border border-indigo-500 shadow-2xs"
              title="Baixar planilha CSV com o histórico de movimentações deste produto"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar Kardex (CSV)
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Resumo do Produto */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 bg-slate-50 border-b border-slate-200">
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
            <div className="text-xs text-slate-500 font-medium">Saldo Atual</div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-slate-900">{product.currentStock}</span>
              <span className="text-xs font-semibold text-slate-600">{product.unit}</span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px]">
              {isOutOfStock ? (
                <span className="text-rose-600 font-medium flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" /> Esgotado
                </span>
              ) : isLowStock ? (
                <span className="text-amber-600 font-medium flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" /> Reposição necessária
                </span>
              ) : (
                <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Estoque regular
                </span>
              )}
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
            <div className="text-xs text-slate-500 font-medium">Estoque Mínimo</div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-slate-700">{product.minStock}</span>
              <span className="text-xs text-slate-500">{product.unit}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Ponto de reposição</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
            <div className="text-xs text-slate-500 font-medium">Custo Médio Unitário</div>
            <div className="text-xl font-bold text-indigo-600 mt-1">
              {formatBRL(product.averageCost)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Último: {formatBRL(product.lastCost)}
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
            <div className="text-xs text-slate-500 font-medium">Valor Total em Estoque</div>
            <div className="text-xl font-bold text-emerald-700 mt-1">
              {formatBRL(product.currentStock * product.averageCost)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Patrimônio estocado</div>
          </div>
        </div>

        {/* Tabela Kardex */}
        <div className="p-5 overflow-y-auto flex-1">
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Linha do Tempo de Movimentações ({productMovements.length})</span>
            <span className="text-slate-400 font-normal lowercase">ordem cronológica</span>
          </div>

          {productMovements.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>Nenhuma movimentação registrada para este produto ainda.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Data / Hora</th>
                    <th className="p-3">Tipo Movimento</th>
                    <th className="p-3">Documento / Ref.</th>
                    <th className="p-3">Parceiro / Setor</th>
                    <th className="p-3 text-right">Qtd. Entrada</th>
                    <th className="p-3 text-right">Qtd. Saída</th>
                    <th className="p-3 text-right">Saldo</th>
                    <th className="p-3 text-right">Custo Unit.</th>
                    <th className="p-3 text-right">Custo Médio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productMovements.map((mov) => {
                    const isIncoming = mov.type.startsWith('ENTRADA');
                    return (
                      <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          {formatDateBR(mov.date)}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
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
                            {mov.type === 'ENTRADA_NFE'
                              ? 'Entrada NF-e'
                              : mov.type === 'ENTRADA_AJUSTE'
                              ? 'Ajuste (+)'
                              : mov.type === 'SAIDA_VENDA'
                              ? 'Venda'
                              : mov.type === 'SAIDA_CONSUMO'
                              ? 'Consumo Interno'
                              : 'Baixa / Perda'}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-medium text-slate-800">
                          {mov.documentNumber || '-'}
                        </td>
                        <td className="p-3 text-slate-600 max-w-[160px] truncate" title={mov.supplierOrCustomer}>
                          {mov.supplierOrCustomer || '-'}
                        </td>
                        <td className="p-3 text-right font-semibold text-emerald-600">
                          {isIncoming ? `+${mov.quantity}` : '-'}
                        </td>
                        <td className="p-3 text-right font-semibold text-rose-600">
                          {!isIncoming ? `-${mov.quantity}` : '-'}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900 bg-slate-50/50">
                          {mov.resultingStock} {mov.unit}
                        </td>
                        <td className="p-3 text-right text-slate-600">
                          {formatBRL(mov.unitCost)}
                        </td>
                        <td className="p-3 text-right font-semibold text-indigo-700">
                          {formatBRL(mov.resultingAverageCost)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => exportProductKardexCSV(product, movements)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Baixar Ficha em Planilha (CSV)
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Fechar Ficha Kardex
          </button>
        </div>
      </div>
    </div>
  );
};
