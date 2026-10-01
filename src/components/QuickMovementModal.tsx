import React, { useState } from 'react';
import { Product, MovementType } from '../types';
import { formatBRL } from '../utils/stockCalculations';
import { X, ArrowUpRight, ArrowDownRight, AlertCircle } from 'lucide-react';

interface QuickMovementModalProps {
  product: Product | null;
  onClose: () => void;
  onSave: (params: {
    productId: string;
    type: MovementType;
    quantity: number;
    date: string;
    documentNumber?: string;
    supplierOrCustomer?: string;
    notes?: string;
  }) => void;
}

export const QuickMovementModal: React.FC<QuickMovementModalProps> = ({
  product,
  onClose,
  onSave,
}) => {
  if (!product) return null;

  const [type, setType] = useState<MovementType>('SAIDA_CONSUMO');
  const [quantity, setQuantity] = useState<number>(1);
  const [documentNumber, setDocumentNumber] = useState('');
  const [supplierOrCustomer, setSupplierOrCustomer] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isIncoming = type.startsWith('ENTRADA');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (quantity <= 0) {
      setError('A quantidade deve ser maior que zero.');
      return;
    }

    if (!isIncoming && quantity > product.currentStock) {
      setError(
        `Quantidade solicitada (${quantity}) é maior que o saldo em estoque (${product.currentStock} ${product.unit}).`
      );
      return;
    }

    onSave({
      productId: product.id,
      type,
      quantity,
      date: new Date().toISOString(),
      documentNumber: documentNumber.trim() || undefined,
      supplierOrCustomer: supplierOrCustomer.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div>
            <h3 className="font-semibold text-lg">Movimentar Estoque Manualmente</h3>
            <p className="text-xs text-slate-300">
              {product.code} - {product.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status info */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
          <div>
            <span className="text-slate-500">Saldo Atual:</span>{' '}
            <span className="font-bold text-slate-800 text-sm">
              {product.currentStock} {product.unit}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Custo Médio:</span>{' '}
            <span className="font-semibold text-slate-700">
              {formatBRL(product.averageCost)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Tipo de Movimento */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Tipo de Movimentação
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('SAIDA_CONSUMO')}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                  type === 'SAIDA_CONSUMO'
                    ? 'border-rose-500 bg-rose-50/50 text-rose-800 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <div>
                  <div className="text-xs">Consumo Interno</div>
                  <div className="text-[10px] text-slate-500 font-normal">Uso em setores</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('SAIDA_VENDA')}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                  type === 'SAIDA_VENDA'
                    ? 'border-rose-500 bg-rose-50/50 text-rose-800 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <div>
                  <div className="text-xs">Saída por Venda</div>
                  <div className="text-[10px] text-slate-500 font-normal">Faturamento/Pedido</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('SAIDA_PERDA')}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                  type === 'SAIDA_PERDA'
                    ? 'border-rose-500 bg-rose-50/50 text-rose-800 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <div>
                  <div className="text-xs">Baixa / Avaria</div>
                  <div className="text-[10px] text-slate-500 font-normal">Perda ou validade</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('ENTRADA_AJUSTE')}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                  type === 'ENTRADA_AJUSTE'
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                <div>
                  <div className="text-xs">Ajuste de Entrada (+)</div>
                  <div className="text-[10px] text-slate-500 font-normal">Sobra de inventário</div>
                </div>
              </button>
            </div>
          </div>

          {/* Quantidade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantidade ({product.unit})
              </label>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Saldo Resultante
              </label>
              <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-bold">
                {isIncoming
                  ? product.currentStock + quantity
                  : Math.max(0, product.currentStock - quantity)}{' '}
                {product.unit}
              </div>
            </div>
          </div>

          {/* Documento / Referência */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Documento / Ref. (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: REQ-104 ou PED-89"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Destinatário / Setor
              </label>
              <input
                type="text"
                placeholder="Ex: Oficina, Cliente X"
                value={supplierOrCustomer}
                onChange={(e) => setSupplierOrCustomer(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Justificativa / Observações */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observações / Justificativa
            </label>
            <textarea
              rows={2}
              placeholder="Descreva o motivo desta movimentação..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-xs resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-xs ${
                isIncoming
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              Confirmar Movimentação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
