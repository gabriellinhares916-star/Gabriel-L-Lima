import React, { useState, useEffect } from 'react';
import { SalaryAdvance, AdvancePaymentMethod } from '../types';
import { CheckCircle2, X, Calendar, Clock, DollarSign, User, ShieldCheck, ArrowDownCircle } from 'lucide-react';

interface PayoffAdvanceModalProps {
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

export const PayoffAdvanceModal: React.FC<PayoffAdvanceModalProps> = ({
  isOpen,
  onClose,
  advance,
  onConfirm,
}) => {
  const currentBalance = Number(advance.balanceAmount ?? advance.amount ?? 0);
  const [amount, setAmount] = useState<string>('0.00');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<AdvancePaymentMethod>('DINHEIRO');
  const [reason, setReason] = useState<string>('Baixa de adiantamento salarial');
  const [approvedBy, setApprovedBy] = useState<string>('RH / Departamento Pessoal');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setDate(now.toISOString().substring(0, 10));
      setTime(now.toTimeString().substring(0, 8));
      const bal = currentBalance > 0 ? currentBalance : Number(advance.amount) || 0;
      setAmount(bal.toFixed(2));
      setPaymentMethod('DINHEIRO');
      setReason(
        `Desconto / Baixa referente à competência ${advance.competenceMonth || 'em curso'}`
      );
      setApprovedBy('RH / Departamento Pessoal');
      setNotes('');
    }
  }, [isOpen, advance, currentBalance]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Informe um valor de baixa válido maior que zero.');
      return;
    }

    if (!date) {
      alert('Informe a data da baixa.');
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
      reason: reason.trim() || 'Baixa de vale registrada',
      approvedBy: approvedBy.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  const handleSetFullPayoff = () => {
    setAmount(currentBalance.toFixed(2));
  };

  const handleSetHalfPayoff = () => {
    setAmount((currentBalance / 2).toFixed(2));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <ArrowDownCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base">Dar Baixa no Vale</h3>
              <p className="text-blue-100 text-xs mt-0.5">
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

        {/* Resumo do Saldo Devedor Atual */}
        <div className="bg-blue-50/70 p-4 border-b border-blue-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-800 tracking-wider block">
              Saldo Devedor Atual
            </span>
            <div className="text-2xl font-black font-mono text-blue-900 mt-0.5">
              R$ {currentBalance.toFixed(2).replace('.', ',')}
            </div>
            <span className="text-[11px] text-slate-500">
              Total Concedido: R$ {(advance.amount || 0).toFixed(2).replace('.', ',')} • Já Baixado: R$ {(advance.totalPaidAmount || 0).toFixed(2).replace('.', ',')}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 text-right">
            <button
              type="button"
              onClick={handleSetFullPayoff}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Quitar Saldo Total
            </button>
            {currentBalance > 0 && (
              <button
                type="button"
                onClick={handleSetHalfPayoff}
                className="px-2 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Abater 50%
              </button>
            )}
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Valor da Baixa */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Valor da Baixa / Pagamento (R$) *</span>
              {parseFloat(amount) >= currentBalance && currentBalance > 0 && (
                <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  ✓ Quitação Total
                </span>
              )}
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
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-lg font-black font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            {parseFloat(amount) > currentBalance && (
              <p className="text-[11px] text-amber-600 font-medium mt-1">
                Atenção: O valor digitado é maior que o saldo devedor atual de R$ {currentBalance.toFixed(2).replace('.', ',')}.
              </p>
            )}
          </div>

          {/* Data e Hora Exatas da Baixa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Data da Baixa *</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Hora Exata (HH:mm:ss) *</span>
              </label>
              <input
                type="time"
                step="1"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
              />
            </div>
            <div className="sm:col-span-2 text-[10px] text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-blue-600" />
              <span>A baixa será registrada permanentemente no extrato com data e hora.</span>
            </div>
          </div>

          {/* Forma da Baixa */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Forma / Canal de Baixa *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as AdvancePaymentMethod)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
            >
              <option value="DINHEIRO">💵 Desconto em Folha de Pagamento / Dinheiro em Espécie</option>
              <option value="PIX">⚡ Devolução via Pix</option>
              <option value="TRANSFERENCIA">🏦 Transferência Bancária</option>
              <option value="CHEQUE">📝 Cheque / Compensação</option>
              <option value="OUTRO">Outro / Abatimento Salarial</option>
            </select>
          </div>

          {/* Motivo / Descrição */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Histórico / Descrição da Baixa *
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Desconto em folha de pagamento de Outubro/2026, devolução no caixa..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Responsável e Observações */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Responsável pelo Recebimento / Baixa
              </label>
              <input
                type="text"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                placeholder="Ex: RH / Departamento Pessoal"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Observações do Recibo
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Quitado no fechamento da folha"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
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
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar Baixa</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
