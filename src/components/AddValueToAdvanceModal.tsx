import React, { useState, useEffect } from 'react';
import { SalaryAdvance, AdvancePaymentMethod } from '../types';
import { Banknote, X, PlusCircle, Calendar, Clock, DollarSign, User, ShieldCheck } from 'lucide-react';

interface AddValueToAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  advance: SalaryAdvance;
  onConfirm: (data: {
    amount: number;
    date: string;
    time: string;
    dateTime: string;
    paymentMethod: AdvancePaymentMethod;
    reason: string;
    approvedBy?: string;
    notes?: string;
  }) => void;
}

export const AddValueToAdvanceModal: React.FC<AddValueToAdvanceModalProps> = ({
  isOpen,
  onClose,
  advance,
  onConfirm,
}) => {
  const [amount, setAmount] = useState<string>('100.00');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<AdvancePaymentMethod>('DINHEIRO');
  const [reason, setReason] = useState<string>('Adiantamento adicional concedido');
  const [approvedBy, setApprovedBy] = useState<string>('Caixa / Financeiro');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setDate(now.toISOString().substring(0, 10));
      setTime(now.toTimeString().substring(0, 8));
      setAmount('100.00');
      setPaymentMethod('DINHEIRO');
      setReason('Adiantamento adicional concedido');
      setApprovedBy(advance.approvedBy || 'Caixa / Financeiro');
      setNotes('');
    }
  }, [isOpen, advance]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Informe um valor válido maior que zero.');
      return;
    }

    if (!date) {
      alert('Informe a data do lançamento.');
      return;
    }

    const cleanTime = time.trim() || new Date().toTimeString().substring(0, 8);
    const dateTime = `${date}T${cleanTime}`;

    onConfirm({
      amount: numAmount,
      date,
      time: cleanTime,
      dateTime,
      paymentMethod,
      reason: reason.trim() || 'Adição de valor no vale',
      approvedBy: approvedBy.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  const quickAmounts = [50, 100, 150, 200, 300, 500];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <PlusCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base">Adicionar Valor ao Vale</h3>
              <p className="text-emerald-100 text-xs mt-0.5">
                {advance.employeeName} ({advance.employeeRegistration})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo do Card Atual */}
        <div className="bg-emerald-50/60 p-4 border-b border-emerald-100 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-white p-2 rounded-xl border border-emerald-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Concedido</span>
            <span className="font-black font-mono text-emerald-800 text-sm">
              R$ {(advance.amount || 0).toFixed(2).replace('.', ',')}
            </span>
          </div>
          <div className="bg-white p-2 rounded-xl border border-emerald-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Baixado</span>
            <span className="font-black font-mono text-blue-700 text-sm">
              R$ {(advance.totalPaidAmount || 0).toFixed(2).replace('.', ',')}
            </span>
          </div>
          <div className="bg-white p-2 rounded-xl border border-emerald-100">
            <span className="text-[10px] uppercase font-bold text-amber-700 block">Saldo Devedor</span>
            <span className="font-black font-mono text-amber-800 text-sm">
              R$ {(advance.balanceAmount ?? advance.amount ?? 0).toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Valor a Adicionar */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Valor a Adicionar (R$) *</span>
              <span className="text-[11px] text-emerald-600 font-semibold">Novo Adiantamento</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-lg font-black font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Botões Rápidos de Valor */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickAmounts.map(val => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setAmount(val.toFixed(2))}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                >
                  + R$ {val}
                </button>
              ))}
            </div>
          </div>

          {/* Data e Hora Exatas do Lançamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Data do Lançamento *</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Hora Exata (HH:mm:ss) *</span>
              </label>
              <input
                type="time"
                step="1"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              />
            </div>
            <div className="sm:col-span-2 text-[10px] text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Ficará permanentemente registrado no histórico deste card com data e hora.</span>
            </div>
          </div>

          {/* Forma de Pagamento */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Forma de Liberação / Meio de Pagamento *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as AdvancePaymentMethod)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
            >
              <option value="DINHEIRO">💵 Dinheiro em Espécie (Cédulas do Caixa)</option>
              <option value="PIX">⚡ Pix (Transferência Instantânea)</option>
              <option value="TRANSFERENCIA">🏦 Transferência Bancária (TED/DOC)</option>
              <option value="CHEQUE">📝 Cheque Nominal</option>
              <option value="OUTRO">Outro Meio</option>
            </select>
          </div>

          {/* Motivo / Descrição */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Motivo ou Finalidade *
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Compra de remédios, adiantamento emergencial, despesa médica..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Responsável e Observações */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Responsável pela Liberação
              </label>
              <input
                type="text"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                placeholder="Ex: Caixa / Almoxarifado"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Observações Adicionais
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Assinou comprovante físico"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Botões do Rodapé */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
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
              <PlusCircle className="w-4 h-4" />
              <span>Registrar Adição</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
