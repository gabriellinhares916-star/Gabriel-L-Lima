import React, { useState } from 'react';
import { SalaryAdvance, Employee } from '../types';
import { CompanySettings } from '../utils/companySettings';
import { Printer, X, ShieldCheck, Banknote, Calendar, User, FileText, Building2 } from 'lucide-react';

interface AdvanceReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  advance: SalaryAdvance;
  employee?: Employee;
  companySettings?: CompanySettings;
}

// Converte número simples para texto aproximado ou moeda
function formatCurrency(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const AdvanceReceiptModal: React.FC<AdvanceReceiptModalProps> = ({
  isOpen,
  onClose,
  advance,
  employee,
  companySettings,
}) => {
  const [logoError, setLogoError] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const paymentMethodLabel = {
    DINHEIRO: 'Dinheiro em Espécie (Cédulas)',
    PIX: 'Transferência Instantânea (Pix)',
    TRANSFERENCIA: 'Transferência Bancária (TED/DOC)',
    CHEQUE: 'Cheque Nominal',
    OUTRO: 'Outro Meio',
  }[advance.paymentMethod] || advance.paymentMethod;

  const [compYear, compMonth] = (advance.competenceMonth || '2026-09').split('-');
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const competenceText = `${monthNames[Number(compMonth) - 1] || 'Setembro'} de ${compYear || '2026'}`;

  const [advYear, advMonth, advDay] = advance.date.split('-');
  const formattedAdvanceDate = `${advDay}/${advMonth}/${advYear}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-scale-in">
        {/* Header do Modal (oculto na impressão) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">
              Recibo de Adiantamento Salarial / Vale
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Recibo</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo Imprimível do Recibo */}
        <div className="p-8 space-y-6 text-slate-900 print:p-6 print:m-0" id="advance-receipt-content">
          {/* Cabeçalho do Recibo com Logo da Empresa */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {companySettings?.logoUrl && !logoError ? (
                <div className="w-14 h-14 rounded-xl border border-slate-300 p-1 flex items-center justify-center bg-white shrink-0">
                  <img
                    src={companySettings.logoUrl}
                    alt={companySettings.tradeName || 'Logo'}
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center text-sm print:border print:border-black shrink-0">
                  VALE
                </div>
              )}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {companySettings?.tradeName || 'Gestor Empresarial'}
                </span>
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
                  {companySettings?.name || 'Recibo de Adiantamento Salarial'}
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  {companySettings?.cnpj ? `CNPJ: ${companySettings.cnpj}` : ''}
                  {companySettings?.cityState ? ` · ${companySettings.cityState}` : ''}
                </p>
                <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                  Comprovante de Adiantamento Salarial (Vale em Dinheiro) · CLT Art. 462
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Nº Registro
              </span>
              <span className="font-mono font-bold text-sm text-slate-800">
                {advance.id.toUpperCase()}
              </span>
              <span className="text-xs block text-slate-500 mt-0.5">
                Data: <strong>{formattedAdvanceDate}</strong>
              </span>
            </div>
          </div>

          {/* Destaque do Valor */}
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 flex items-center justify-between print:border-emerald-600">
            <div>
              <span className="text-xs uppercase font-bold text-emerald-800 block">
                Valor Total do Adiantamento
              </span>
              <div className="text-3xl font-black text-emerald-900 font-mono mt-0.5">
                {formatCurrency(advance.amount)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                Forma de Pagamento
              </span>
              <span className="font-bold text-xs text-emerald-900 block">
                {paymentMethodLabel}
              </span>
              <span className="text-[11px] text-emerald-700 font-medium mt-0.5 block">
                Competência de Desconto: <strong>{competenceText}</strong>
              </span>
            </div>
          </div>

          {/* Declaração Formal de Recebimento */}
          <div className="space-y-3 text-xs leading-relaxed text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p>
              Declaro que recebi da empresa <strong className="text-slate-900">{companySettings?.name || 'acima qualificada'}</strong>, a título de <strong>adiantamento salarial (vale)</strong>, a importância líquida de <strong className="text-slate-900 font-mono">{formatCurrency(advance.amount)}</strong>, paga mediante <strong>{paymentMethodLabel}</strong>.
            </p>
            <p>
              Autorizo expressamente o respectivo desconto integral do valor adiantado na folha de pagamento referente ao mês de <strong className="text-slate-900">{competenceText}</strong>, em conformidade com o Artigo 462 da Consolidação das Leis do Trabalho (CLT).
            </p>
            {advance.reason && (
              <div className="pt-2 border-t border-slate-200 text-slate-600">
                <strong>Finalidade informada:</strong> {advance.reason}
              </div>
            )}
            {advance.notes && (
              <div className="text-[11px] text-slate-500 italic">
                Observações internas: {advance.notes}
              </div>
            )}
          </div>

          {/* Identificação do Colaborador */}
          <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-200">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Colaborador Beneficiário</span>
              <strong className="text-slate-900 block text-sm">{advance.employeeName}</strong>
              <span className="text-slate-600 text-[11px]">{advance.employeeRole} • {advance.employeeDepartment}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Identificação Funcional</span>
              <span className="text-slate-800 font-mono font-bold block">Matrícula: {advance.employeeRegistration}</span>
              <span className="text-slate-600 text-[11px]">
                {employee?.cpf ? `CPF: ${employee.cpf}` : 'Documento ativo no sistema'}
              </span>
            </div>
          </div>

          {/* Campo de Assinaturas */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="border-t border-slate-400 pt-2 font-bold text-slate-800">
                {advance.employeeName}
              </div>
              <span className="text-[11px] text-slate-500 block">
                Assinatura do Colaborador
              </span>
            </div>

            <div>
              <div className="border-t border-slate-400 pt-2 font-bold text-slate-800">
                {advance.approvedBy || 'Responsável pelo Caixa'}
              </div>
              <span className="text-[11px] text-slate-500 block">
                {companySettings?.tradeName || 'Empresa'} / Liberação Financeira
              </span>
            </div>
          </div>

          {/* Rodapé Legal */}
          <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Comprovante emitido pelo {companySettings?.tradeName || 'Gestor NF-e'}</span>
            <span>Válido para fins de conferência fiscal e contábil</span>
          </div>
        </div>

        {/* Botão de Fechar no rodapé (oculto na impressão) */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100 text-xs font-bold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
