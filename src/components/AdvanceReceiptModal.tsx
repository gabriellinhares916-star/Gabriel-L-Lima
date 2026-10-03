import React, { useState } from 'react';
import { SalaryAdvance, Employee, AdvanceMovement } from '../types';
import { CompanySettings } from '../utils/companySettings';
import { Printer, X, ShieldCheck, Banknote, Calendar, Clock, User, FileText, Building2, CheckCircle2, ArrowDownCircle, PlusCircle } from 'lucide-react';

interface AdvanceReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  advance: SalaryAdvance;
  employee?: Employee;
  companySettings?: CompanySettings;
  movement?: AdvanceMovement | null;
}

function formatCurrency(val: number): string {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const AdvanceReceiptModal: React.FC<AdvanceReceiptModalProps> = ({
  isOpen,
  onClose,
  advance,
  employee,
  companySettings,
  movement,
}) => {
  const [logoError, setLogoError] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const paymentMethodMap: Record<string, string> = {
    DINHEIRO: 'Dinheiro em Espécie (Cédulas)',
    PIX: 'Transferência Instantânea (Pix)',
    TRANSFERENCIA: 'Transferência Bancária (TED/DOC)',
    CHEQUE: 'Cheque Nominal',
    OUTRO: 'Outro Meio',
  };

  const [compYear, compMonth] = (advance.competenceMonth || '2026-09').split('-');
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const competenceText = `${monthNames[Number(compMonth) - 1] || 'Mês'} de ${compYear || '2026'}`;

  const currentBalance = Number(advance.balanceAmount ?? advance.amount ?? 0);
  const totalPaid = Number(advance.totalPaidAmount || 0);
  const totalAmount = Number(advance.amount || 0);

  // Se for um recibo de movimentação específica
  const isSingleMovement = !!movement;
  const isBaixa = movement?.type === 'BAIXA_VALOR';

  const formatDateTime = (dateStr: string, timeStr?: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const formattedDate = `${d}/${m}/${y}`;
    return timeStr ? `${formattedDate} às ${timeStr}` : formattedDate;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden animate-scale-in">
        {/* Header do Modal (oculto na impressão) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">
              {isSingleMovement
                ? isBaixa
                  ? 'Recibo de Baixa / Pagamento de Vale'
                  : 'Recibo de Adiantamento Salarial / Adição de Valor'
                : 'Extrato & Recibo Consolidado do Vale'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Documento</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
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
                  {isSingleMovement
                    ? isBaixa
                      ? 'Comprovante Oficial de Quitação / Baixa de Vale'
                      : 'Comprovante Oficial de Adiantamento Salarial (CLT Art. 462)'
                    : 'Extrato Consolidado da Conta Corrente de Vales · Registro por Data e Hora'}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Nº Registro
              </span>
              <span className="font-mono font-bold text-sm text-slate-800">
                {isSingleMovement ? movement.id.toUpperCase() : advance.id.toUpperCase()}
              </span>
              <span className="text-xs block text-slate-500 mt-0.5">
                Emissão: <strong>{new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</strong>
              </span>
            </div>
          </div>

          {/* Destaque do Valor */}
          {isSingleMovement ? (
            <div
              className={`p-4 rounded-xl border-2 flex items-center justify-between ${
                isBaixa
                  ? 'bg-blue-50 border-blue-300 print:border-blue-600'
                  : 'bg-emerald-50 border-emerald-300 print:border-emerald-600'
              }`}
            >
              <div>
                <span
                  className={`text-xs uppercase font-bold block ${
                    isBaixa ? 'text-blue-800' : 'text-emerald-800'
                  }`}
                >
                  {isBaixa ? 'Valor da Baixa / Pagamento' : 'Valor Adicionado ao Vale'}
                </span>
                <div
                  className={`text-3xl font-black font-mono mt-0.5 ${
                    isBaixa ? 'text-blue-900' : 'text-emerald-900'
                  }`}
                >
                  {formatCurrency(movement.amount)}
                </div>
                <div className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Registrado em: <strong>{formatDateTime(movement.date, movement.time)}</strong>
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Meio Utilizado
                </span>
                <span className="font-bold text-xs text-slate-900 block">
                  {paymentMethodMap[movement.paymentMethod] || movement.paymentMethod}
                </span>
                <span className="text-[11px] text-slate-600 mt-1 block">
                  Competência: <strong>{competenceText}</strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Total Concedido
                </span>
                <div className="text-xl font-black text-emerald-800 font-mono">
                  {formatCurrency(totalAmount)}
                </div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Total Baixado / Quitado
                </span>
                <div className="text-xl font-black text-blue-800 font-mono">
                  {formatCurrency(totalPaid)}
                </div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-amber-700 block">
                  Saldo Devedor Atual
                </span>
                <div className="text-xl font-black text-amber-800 font-mono">
                  {formatCurrency(currentBalance)}
                </div>
              </div>
            </div>
          )}

          {/* Tabela de Movimentações Registradas com Data e Hora (quando no modo extrato consolidado) */}
          {!isSingleMovement && advance.movements && advance.movements.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>Histórico Detalhado de Lançamentos e Baixas (Data e Hora)</span>
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">
                  {advance.movements.length} lançamentos registrados
                </span>
              </div>

              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase tracking-wider border-b border-slate-300">
                    <tr>
                      <th className="py-2 px-3">Data e Hora</th>
                      <th className="py-2 px-3">Tipo</th>
                      <th className="py-2 px-3">Valor</th>
                      <th className="py-2 px-3">Meio</th>
                      <th className="py-2 px-3">Motivo / Descrição</th>
                      <th className="py-2 px-3">Responsável</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {advance.movements.map(m => {
                      const isMovBaixa = m.type === 'BAIXA_VALOR';
                      return (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 whitespace-nowrap font-mono font-bold text-slate-800">
                            {formatDateTime(m.date, m.time)}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isMovBaixa
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isMovBaixa ? '- Baixa' : '+ Adição'}
                            </span>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap font-mono font-bold">
                            <span className={isMovBaixa ? 'text-blue-700' : 'text-emerald-700'}>
                              {isMovBaixa ? '-' : '+'} {formatCurrency(m.amount)}
                            </span>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap text-slate-600 text-[11px]">
                            {paymentMethodMap[m.paymentMethod] || m.paymentMethod}
                          </td>
                          <td className="py-2 px-3 text-slate-700 max-w-xs truncate" title={m.reason}>
                            {m.reason}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap text-slate-500 text-[11px]">
                            {m.approvedBy || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Declaração Formal de Recebimento ou Quitação */}
          <div className="space-y-3 text-xs leading-relaxed text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {isSingleMovement ? (
              isBaixa ? (
                <p>
                  Confirmamos que foi registrada e processada a respectiva <strong>baixa / quitação</strong> no valor de <strong className="text-slate-900 font-mono">{formatCurrency(movement.amount)}</strong>, referente ao adiantamento concedido ao colaborador <strong className="text-slate-900">{advance.employeeName}</strong>, restando um saldo devedor atual de <strong className="text-slate-900 font-mono">{formatCurrency(currentBalance)}</strong>.
                </p>
              ) : (
                <p>
                  Declaro que recebi da empresa <strong className="text-slate-900">{companySettings?.name || 'acima qualificada'}</strong>, a título de <strong>adiantamento salarial (vale)</strong>, a quantia líquida de <strong className="text-slate-900 font-mono">{formatCurrency(movement.amount)}</strong>, na data e hora discriminadas acima, autorizando o desconto em folha referente ao mês de <strong className="text-slate-900">{competenceText}</strong> nos termos do Art. 462 da CLT.
                </p>
              )
            ) : (
              <p>
                Este documento constitui o extrato consolidado de concessões de adiantamentos salariais e baixas/descontos em folha de pagamento do colaborador <strong className="text-slate-900">{advance.employeeName}</strong> para a competência de <strong className="text-slate-900">{competenceText}</strong>. Todas as operações foram devidamente registradas com data e hora exatas nos termos do Artigo 462 da CLT.
              </p>
            )}

            {(movement?.reason || advance.reason) && (
              <div className="pt-2 border-t border-slate-200 text-slate-600">
                <strong>Motivo / Informação registrada:</strong> {movement?.reason || advance.reason}
              </div>
            )}
            {(movement?.notes || advance.notes) && (
              <div className="text-[11px] text-slate-500 italic">
                Observações internas: {movement?.notes || advance.notes}
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
                {employee?.cpf ? `CPF: ${employee.cpf}` : 'Cadastro ativo no sistema'}
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
                {movement?.approvedBy || advance.approvedBy || 'Responsável Financeiro'}
              </div>
              <span className="text-[11px] text-slate-500 block">
                {companySettings?.tradeName || 'Empresa'} / Liberação & Baixa
              </span>
            </div>
          </div>

          {/* Rodapé Legal */}
          <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Comprovante emitido pelo {companySettings?.tradeName || 'Gestor NF-e'}</span>
            <span>Certificado com carimbo de data e hora • CLT Art. 462</span>
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
