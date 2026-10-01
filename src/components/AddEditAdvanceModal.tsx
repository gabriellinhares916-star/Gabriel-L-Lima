import React, { useState, useEffect } from 'react';
import { SalaryAdvance, Employee, AdvancePaymentMethod, AdvanceCategory, AdvanceStatus } from '../types';
import { Banknote, X, Save, User, Calendar, DollarSign, Sparkles, CheckSquare, ShieldCheck, AlertCircle } from 'lucide-react';

interface AddEditAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  advanceToEdit?: SalaryAdvance | null;
  onSave: (advanceData: Omit<SalaryAdvance, 'id' | 'createdAt'>, editId?: string) => void;
}

export const AddEditAdvanceModal: React.FC<AddEditAdvanceModalProps> = ({
  isOpen,
  onClose,
  employees,
  advanceToEdit,
  onSave,
}) => {
  const [employeeId, setEmployeeId] = useState<string>('');
  const [amount, setAmount] = useState<string>('100.00');
  const [date, setDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [competenceMonth, setCompetenceMonth] = useState<string>('2026-09');
  const [paymentMethod, setPaymentMethod] = useState<AdvancePaymentMethod>('DINHEIRO');
  const [category, setCategory] = useState<AdvanceCategory>('ADIANTAMENTO_SALARIAL');
  const [reason, setReason] = useState<string>('Adiantamento salarial em dinheiro solicitado pelo colaborador');
  const [status, setStatus] = useState<AdvanceStatus>('PENDENTE_DESCONTO');
  const [approvedBy, setApprovedBy] = useState<string>('Caixa / Almoxarifado');
  const [receiptSigned, setReceiptSigned] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (advanceToEdit) {
      setEmployeeId(advanceToEdit.employeeId);
      setAmount(advanceToEdit.amount.toString());
      setDate(advanceToEdit.date);
      setCompetenceMonth(advanceToEdit.competenceMonth);
      setPaymentMethod(advanceToEdit.paymentMethod);
      setCategory(advanceToEdit.category);
      setReason(advanceToEdit.reason);
      setStatus(advanceToEdit.status);
      setApprovedBy(advanceToEdit.approvedBy || 'Caixa / Almoxarifado');
      setReceiptSigned(advanceToEdit.receiptSigned ?? true);
      setNotes(advanceToEdit.notes || '');
    } else {
      setEmployeeId(employees[0]?.id || '');
      setAmount('150.00');
      setDate(new Date().toISOString().substring(0, 10));
      setCompetenceMonth('2026-09');
      setPaymentMethod('DINHEIRO');
      setCategory('ADIANTAMENTO_SALARIAL');
      setReason('Adiantamento salarial em dinheiro solicitado pelo colaborador');
      setStatus('PENDENTE_DESCONTO');
      setApprovedBy('Caixa / Almoxarifado');
      setReceiptSigned(true);
      setNotes('');
    }
  }, [advanceToEdit, isOpen, employees]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedEmp = employees.find(e => e.id === employeeId);
    if (!selectedEmp) {
      alert('Selecione um colaborador válido para registrar o vale.');
      return;
    }

    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Informe um valor de adiantamento válido maior que zero.');
      return;
    }

    onSave({
      employeeId: selectedEmp.id,
      employeeName: selectedEmp.name,
      employeeRegistration: selectedEmp.registrationNumber,
      employeeRole: selectedEmp.role,
      employeeDepartment: selectedEmp.department,
      date,
      competenceMonth,
      amount: numAmount,
      paymentMethod,
      category,
      reason: reason.trim() || 'Adiantamento salarial em dinheiro',
      status,
      approvedBy: approvedBy.trim() || undefined,
      receiptSigned,
      notes: notes.trim() || undefined,
    }, advanceToEdit?.id);

    onClose();
  };

  const quickAmounts = [50, 100, 150, 200, 300, 500];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-scale-in">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-400" />
              {advanceToEdit ? 'Editar Vale / Adiantamento' : 'Novo Vale / Adiantamento em Dinheiro'}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Cadastre a retirada de adiantamento salarial para controle e desconto na folha de pagamento.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Colaborador */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="w-4 h-4 text-indigo-600" />
              Colaborador Beneficiário *
            </label>
            <select
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              {employees.length === 0 && (
                <option value="">Nenhum colaborador cadastrado</option>
              )}
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} — Matrícula: {emp.registrationNumber} ({emp.role} • {emp.department})
                </option>
              ))}
            </select>
          </div>

          {/* Valor do Vale e Atalhos */}
          <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-emerald-900">
                Valor do Adiantamento (R$) *
              </label>
              <span className="text-[11px] font-semibold text-emerald-700">
                Dinheiro entregue / adiantado
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-emerald-800 text-sm">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full pl-10 pr-3 py-2.5 bg-white border border-emerald-300 rounded-xl font-mono text-lg font-black text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Botões de valores rápidos */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider mr-1">
                Atalhos:
              </span>
              {quickAmounts.map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val.toFixed(2))}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-600 hover:text-white text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  R$ {val}
                </button>
              ))}
            </div>
          </div>

          {/* Data do Vale e Mês de Competência */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Data da Retirada / Entrega *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Mês para Desconto (Competência) *
              </label>
              <input
                type="month"
                required
                value={competenceMonth}
                onChange={(e) => setCompetenceMonth(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-indigo-700"
              />
            </div>
          </div>

          {/* Forma de Pagamento e Categoria */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Forma de Pagamento *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as AdvancePaymentMethod)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium"
              >
                <option value="DINHEIRO">💵 Dinheiro em Espécie (Físico)</option>
                <option value="PIX">⚡ Pix Instantâneo</option>
                <option value="TRANSFERENCIA">🏦 Transferência Bancária (TED)</option>
                <option value="CHEQUE">📝 Cheque</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Categoria / Finalidade *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AdvanceCategory)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium"
              >
                <option value="ADIANTAMENTO_SALARIAL">Adiantamento Salarial</option>
                <option value="VALE_EMERGENCIAL">Vale Emergencial / Saúde</option>
                <option value="VALE_TRANSPORTE_EXTRA">Vale Transporte Extra</option>
                <option value="VALE_ALIMENTACAO_EXTRA">Alimentação / Refeição Extra</option>
                <option value="AJUDA_DE_CUSTO">Ajuda de Custo Operacional</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>
          </div>

          {/* Motivo ou Justificativa */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Motivo / Descrição do Vale *
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Adiantamento solicitado no balcão do caixa para despesas pessoais"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl"
            />
          </div>

          {/* Status do Desconto e Responsável */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Situação do Desconto em Folha *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AdvanceStatus)}
                className={`w-full px-3 py-2 border rounded-xl font-bold ${
                  status === 'PENDENTE_DESCONTO'
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : status === 'DESCONTADO_FOLHA'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-slate-300 bg-slate-50 text-slate-600'
                }`}
              >
                <option value="PENDENTE_DESCONTO">⏳ Pendente de Desconto na Folha</option>
                <option value="DESCONTADO_FOLHA">✅ Já Descontado na Folha</option>
                <option value="CANCELADO">❌ Cancelado / Estornado</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Responsável pela Liberação
              </label>
              <input
                type="text"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                placeholder="Ex: Almoxarifado / Financeiro"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          {/* Checkbox de Recibo Assinado */}
          <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <input
              type="checkbox"
              id="receiptSigned"
              checked={receiptSigned}
              onChange={(e) => setReceiptSigned(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="receiptSigned" className="text-xs font-semibold text-slate-700 select-none cursor-pointer">
              Recibo / Comprovante físico assinado pelo colaborador (Art. 462 CLT)
            </label>
          </div>

          {/* Observações adicionais */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">
              Observações Adicionais (Opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informações complementares sobre a entrega do dinheiro..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl"
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{advanceToEdit ? 'Atualizar Vale' : 'Registrar Vale'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
