import React, { useState, useEffect } from 'react';
import { ExpenseRecord, ExpensePaymentMethod } from '../types';
import { EXPENSE_CATEGORIES_CONFIG } from '../utils/expenseStorage';
import { X, CheckCircle2, Calendar, Clock, DollarSign, CreditCard } from 'lucide-react';

interface PayExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: ExpenseRecord;
  onConfirm: (paymentData: {
    paymentDate: string;
    paymentTime: string;
    paymentMethod: ExpensePaymentMethod;
    notes?: string;
  }) => void;
}

export const PayExpenseModal: React.FC<PayExpenseModalProps> = ({
  isOpen,
  onClose,
  expense,
  onConfirm,
}) => {
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentTime, setPaymentTime] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>('BOLETO');
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      const now = new Date();
      setPaymentDate(now.toISOString().substring(0, 10));
      setPaymentTime(now.toTimeString().substring(0, 8));
      setPaymentMethod(expense.paymentMethod || 'PIX');
      setNotes('Liquidado pontualmente');
    }
  }, [isOpen, expense]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!paymentDate) {
      setErrorMessage('Informe a data do pagamento.');
      return;
    }

    onConfirm({
      paymentDate,
      paymentTime: paymentTime || new Date().toTimeString().substring(0, 8),
      paymentMethod,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base">Dar Baixa / Pagar Despesa</h3>
              <p className="text-emerald-100 text-xs mt-0.5">
                {EXPENSE_CATEGORIES_CONFIG[expense.category]?.label || expense.category}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo da Despesa */}
        <div className="bg-emerald-50/70 p-4 border-b border-emerald-100 space-y-1">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
            {expense.description}
          </span>
          <div className="text-2xl font-black font-mono text-emerald-900">
            R$ {(expense.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
            <span>Vencimento: <strong>{expense.dueDate.split('-').reverse().join('/')}</strong></span>
            {expense.supplierOrBeneficiary && (
              <span>Favorecido: <strong>{expense.supplierOrBeneficiary}</strong></span>
            )}
          </div>
        </div>

        {/* Formulário de Baixa */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {errorMessage}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Data do Pagamento *</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Hora (HH:mm:ss)</span>
              </label>
              <input
                type="time"
                step="1"
                value={paymentTime}
                onChange={(e) => setPaymentTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Forma de Pagamento Utilizada *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as ExpensePaymentMethod)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
            >
              <option value="PIX">⚡ Pix Instantâneo</option>
              <option value="BOLETO">📄 Boleto Bancário Liquidado</option>
              <option value="TRANSFERENCIA">🏦 Transferência Bancária (TED/DOC)</option>
              <option value="DEBITO_AUTOMATICO">🔄 Débito em Conta Automático</option>
              <option value="DINHEIRO">💵 Dinheiro em Espécie (Caixa)</option>
              <option value="CARTAO_CREDITO">💳 Cartão de Crédito Corporativo</option>
              <option value="OUTRO">Outro Meio</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observações do Comprovante / Liquidação
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Comprovante arquivado na pasta de Outubro"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Botões */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar Pagamento</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
