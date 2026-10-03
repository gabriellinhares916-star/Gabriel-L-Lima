import React, { useState, useEffect } from 'react';
import { ExpenseRecord, ExpenseCategory, ExpensePaymentMethod, ExpenseStatus } from '../types';
import { EXPENSE_CATEGORIES_CONFIG } from '../utils/expenseStorage';
import { X, Save, PlusCircle, Calendar, DollarSign, Building2, FileText, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface AddEditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseToEdit?: ExpenseRecord | null;
  onSave: (data: Omit<ExpenseRecord, 'id' | 'createdAt'>, editId?: string) => void;
}

export const AddEditExpenseModal: React.FC<AddEditExpenseModalProps> = ({
  isOpen,
  onClose,
  expenseToEdit,
  onSave,
}) => {
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('ALUGUEL');
  const [amount, setAmount] = useState<string>('500.00');
  const [dueDate, setDueDate] = useState<string>('');
  const [competenceMonth, setCompetenceMonth] = useState<string>('2026-10');
  const [supplierOrBeneficiary, setSupplierOrBeneficiary] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>('BOLETO');
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [status, setStatus] = useState<ExpenseStatus>('PENDENTE');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        setDescription(expenseToEdit.description);
        setCategory(expenseToEdit.category);
        setAmount(expenseToEdit.amount.toString());
        setDueDate(expenseToEdit.dueDate);
        setCompetenceMonth(expenseToEdit.competenceMonth);
        setSupplierOrBeneficiary(expenseToEdit.supplierOrBeneficiary || '');
        setPaymentMethod(expenseToEdit.paymentMethod);
        setDocumentNumber(expenseToEdit.documentNumber || '');
        setStatus(expenseToEdit.status);
        setPaymentDate(expenseToEdit.paymentDate || '');
        setIsRecurring(expenseToEdit.isRecurring ?? false);
        setNotes(expenseToEdit.notes || '');
      } else {
        const todayStr = new Date().toISOString().substring(0, 10);
        setDescription('');
        setCategory('ALUGUEL');
        setAmount('350.00');
        setDueDate(todayStr);
        setCompetenceMonth(todayStr.substring(0, 7));
        setSupplierOrBeneficiary('');
        setPaymentMethod('BOLETO');
        setDocumentNumber('');
        setStatus('PENDENTE');
        setPaymentDate('');
        setIsRecurring(true);
        setNotes('');
      }
    }
  }, [isOpen, expenseToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Informe um valor de despesa válido maior que zero.');
      return;
    }

    if (!description.trim()) {
      alert('Informe a descrição da despesa.');
      return;
    }

    if (!dueDate) {
      alert('Informe a data de vencimento da despesa.');
      return;
    }

    onSave({
      description: description.trim(),
      category,
      amount: numAmount,
      dueDate,
      competenceMonth,
      supplierOrBeneficiary: supplierOrBeneficiary.trim(),
      paymentMethod,
      documentNumber: documentNumber.trim() || undefined,
      status,
      paymentDate: status === 'PAGA' ? (paymentDate || dueDate) : undefined,
      isRecurring,
      notes: notes.trim() || undefined,
    }, expenseToEdit?.id);

    onClose();
  };

  const categoriesList = Object.keys(EXPENSE_CATEGORIES_CONFIG) as ExpenseCategory[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-black text-base">
                {expenseToEdit ? 'Editar Despesa' : 'Cadastrar Nova Despesa'}
              </h3>
              <p className="text-slate-300 text-xs mt-0.5">
                Aluguel, energia, água, manutenção predial, impostos e fornecedores
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

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Descrição */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Descrição da Despesa *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Aluguel do Galpão, Conta de Luz CEMIG, Manutenção do Telhado..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Categoria e Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Categoria da Despesa *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
              >
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>
                    {EXPENSE_CATEGORIES_CONFIG[cat].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Valor da Despesa (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
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
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Vencimento e Competência */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Data de Vencimento *</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mês de Competência *
              </label>
              <input
                type="month"
                required
                value={competenceMonth}
                onChange={(e) => setCompetenceMonth(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-indigo-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
              />
            </div>
          </div>

          {/* Fornecedor / Concessionária e Forma de Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Fornecedor / Beneficiário / Concessionária
              </label>
              <input
                type="text"
                value={supplierOrBeneficiary}
                onChange={(e) => setSupplierOrBeneficiary(e.target.value)}
                placeholder="Ex: CEMIG, Imobiliária, Sabesp, Prestador..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Forma de Pagamento Prevista
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as ExpensePaymentMethod)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
              >
                <option value="BOLETO">📄 Boleto Bancário</option>
                <option value="PIX">⚡ Pix Instantâneo</option>
                <option value="DEBITO_AUTOMATICO">🔄 Débito Automático</option>
                <option value="TRANSFERENCIA">🏦 Transferência Bancária (TED/DOC)</option>
                <option value="DINHEIRO">💵 Dinheiro em Espécie</option>
                <option value="CARTAO_CREDITO">💳 Cartão de Crédito</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>
          </div>

          {/* Status Inicial da Conta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status Atual da Despesa
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ExpenseStatus)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
              >
                <option value="PENDENTE">⏳ Pendente / A Pagar</option>
                <option value="PAGA">✅ Já Paga / Liquidada</option>
                <option value="VENCIDA">⚠️ Vencida</option>
                <option value="CANCELADA">❌ Cancelada</option>
              </select>
            </div>

            {status === 'PAGA' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data do Pagamento Efetivo
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Nº do Documento e Recorrência */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nº Fatura / Código de Barras / Documento
              </label>
              <input
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Ex: FAT-88912, Linha Digitável..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="pt-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span>Despesa fixa mensal recorrente</span>
              </label>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observações Adicionais
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Contrato de 12 meses, reajuste anual pelo IGP-M..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
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
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{expenseToEdit ? 'Salvar Alterações' : 'Cadastrar Despesa'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
