import React from 'react';
import { Invoice } from '../types';
import { formatBRL, formatDateBR } from '../utils/stockCalculations';
import { X, Printer, CheckCircle, FileText } from 'lucide-react';

interface DanfeModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const DanfeModal: React.FC<DanfeModalProps> = ({ invoice, onClose }) => {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  // Formatar chave de acesso em grupos de 4 dígitos
  const formattedKey = invoice.accessKey.replace(/(.{4})/g, '$1 ').trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl my-8 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800 text-white print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-lg">Visualização DANFE - NF-e nº {invoice.number}</h3>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {invoice.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir DANFE
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Visual DANFE Document */}
        <div className="p-6 overflow-y-auto font-sans text-xs text-slate-800 bg-white">
          <div className="border border-slate-900 p-4 rounded-sm space-y-4">
            {/* Top DANFE Header */}
            <div className="grid grid-cols-12 border-b border-slate-900 pb-3 gap-2">
              <div className="col-span-5 border-r border-slate-400 pr-3">
                <div className="text-[10px] uppercase text-slate-500 font-bold">Identificação do Emitente</div>
                <div className="font-bold text-sm text-slate-900">{invoice.supplier.name}</div>
                {invoice.supplier.tradeName && (
                  <div className="text-slate-600 font-medium">Nome Fantasia: {invoice.supplier.tradeName}</div>
                )}
                <div className="text-slate-600 mt-1">
                  CNPJ: <span className="font-semibold">{invoice.supplier.cnpj}</span>
                </div>
                {invoice.supplier.stateRegistration && (
                  <div className="text-slate-600">
                    Inscrição Estadual: <span className="font-semibold">{invoice.supplier.stateRegistration}</span>
                  </div>
                )}
                <div className="text-slate-600">
                  {invoice.supplier.city || 'São Paulo'} - {invoice.supplier.uf || 'SP'}
                </div>
              </div>

              <div className="col-span-3 text-center border-r border-slate-400 px-2 flex flex-col justify-center">
                <span className="font-black text-base uppercase tracking-wider">DANFE</span>
                <span className="text-[9px] text-slate-600 leading-tight">Documento Auxiliar da Nota Fiscal Eletrônica</span>
                <div className="mt-2 text-left bg-slate-100 p-1.5 rounded border border-slate-300">
                  <div>0 - Entrada</div>
                  <div className="font-bold text-slate-900">1 - Saída [ X ]</div>
                </div>
                <div className="mt-1 font-bold text-xs">
                  Nº {invoice.number}
                </div>
                <div className="text-[10px] text-slate-600">SÉRIE {invoice.series}</div>
              </div>

              <div className="col-span-4 pl-2 flex flex-col justify-between">
                <div>
                  <div className="text-[9px] uppercase font-bold text-slate-500">Chave de Acesso da NF-e</div>
                  <div className="font-mono text-[10px] font-bold text-slate-900 tracking-tight bg-slate-50 p-1 border border-slate-300 break-all select-all">
                    {formattedKey}
                  </div>
                  {/* Código de barras visual simulado */}
                  <div className="h-6 mt-1.5 bg-repeating-linear-stripes border border-slate-400 flex items-center justify-center text-[9px] font-mono text-slate-400 select-none">
                    |||||||| ||||| |||||| |||||||| |||| ||||||||| |||||||
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Consulta de autenticidade no portal nacional da NF-e: www.nfe.fazenda.gov.br
                </div>
              </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-3 border-b border-slate-900 pb-2 text-[11px] gap-2">
              <div className="bg-slate-50 p-1.5 border border-slate-300">
                <span className="text-[9px] uppercase text-slate-500 block font-semibold">Data de Emissão</span>
                <span className="font-bold text-slate-800">{formatDateBR(invoice.issueDate)}</span>
              </div>
              <div className="bg-slate-50 p-1.5 border border-slate-300">
                <span className="text-[9px] uppercase text-slate-500 block font-semibold">Data Entrada / Recebimento</span>
                <span className="font-bold text-slate-800">{formatDateBR(invoice.entryDate)}</span>
              </div>
              <div className="bg-slate-50 p-1.5 border border-slate-300">
                <span className="text-[9px] uppercase text-slate-500 block font-semibold">Protocolo de Autorização</span>
                <span className="font-mono text-slate-800">135260098765432 - SEFAZ</span>
              </div>
            </div>

            {/* Destinatário */}
            <div className="border border-slate-300 p-2 rounded bg-slate-50">
              <div className="text-[10px] uppercase font-bold text-slate-600 mb-1 border-b border-slate-200 pb-0.5">
                Destinatário / Remetente
              </div>
              <div className="grid grid-cols-12 gap-2 text-[11px]">
                <div className="col-span-8">
                  <span className="text-slate-500">Nome / Razão Social: </span>
                  <span className="font-semibold text-slate-900">{invoice.recipient?.name || 'Sua Empresa Ltda'}</span>
                </div>
                <div className="col-span-4">
                  <span className="text-slate-500">CNPJ / CPF: </span>
                  <span className="font-semibold text-slate-900">{invoice.recipient?.cnpj || '12.345.678/0001-90'}</span>
                </div>
              </div>
            </div>

            {/* Totais do Imposto */}
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-700 mb-1">Cálculo do Imposto</div>
              <div className="grid grid-cols-5 gap-1.5 text-center text-[10px]">
                <div className="border border-slate-300 p-1 bg-slate-50">
                  <span className="text-slate-500 block">Total Produtos</span>
                  <span className="font-bold text-slate-800">{formatBRL(invoice.totals.productsValue)}</span>
                </div>
                <div className="border border-slate-300 p-1 bg-slate-50">
                  <span className="text-slate-500 block">Valor do Frete</span>
                  <span className="font-bold text-slate-800">{formatBRL(invoice.totals.freightValue)}</span>
                </div>
                <div className="border border-slate-300 p-1 bg-slate-50">
                  <span className="text-slate-500 block">Desconto</span>
                  <span className="font-bold text-slate-800">{formatBRL(invoice.totals.discountValue)}</span>
                </div>
                <div className="border border-slate-300 p-1 bg-slate-50">
                  <span className="text-slate-500 block">Total Impostos</span>
                  <span className="font-bold text-slate-800">{formatBRL(invoice.totals.taxesValue)}</span>
                </div>
                <div className="border border-indigo-300 p-1 bg-indigo-50 font-bold">
                  <span className="text-indigo-700 block">Total da Nota Fiscal</span>
                  <span className="text-indigo-900 text-xs">{formatBRL(invoice.totals.totalInvoiceValue)}</span>
                </div>
              </div>
            </div>

            {/* Dados dos Produtos / Serviços */}
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-700 mb-1">
                Dados dos Produtos e Serviços ({invoice.items.length} itens)
              </div>
              <div className="border border-slate-300 rounded overflow-hidden">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 text-[10px] font-semibold">
                      <th className="p-1.5">Código</th>
                      <th className="p-1.5">Descrição do Produto / Serviço</th>
                      <th className="p-1.5 text-center">NCM</th>
                      <th className="p-1.5 text-center">CFOP</th>
                      <th className="p-1.5 text-center">UN</th>
                      <th className="p-1.5 text-right">Qtd.</th>
                      <th className="p-1.5 text-right">Vlr. Unitário</th>
                      <th className="p-1.5 text-right">Vlr. Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {invoice.items.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="p-1.5 font-mono text-slate-600">{item.code}</td>
                        <td className="p-1.5 font-medium text-slate-900">{item.description}</td>
                        <td className="p-1.5 text-center font-mono text-slate-600">{item.ncm}</td>
                        <td className="p-1.5 text-center font-mono text-slate-600">{item.cfop}</td>
                        <td className="p-1.5 text-center font-semibold text-slate-700">{item.unit}</td>
                        <td className="p-1.5 text-right font-medium text-slate-900">{item.quantity}</td>
                        <td className="p-1.5 text-right text-slate-700">{formatBRL(item.unitPrice)}</td>
                        <td className="p-1.5 text-right font-bold text-slate-900">{formatBRL(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Informações Complementares */}
            <div className="border border-slate-300 p-2 rounded bg-slate-50 text-[10px] text-slate-600">
              <span className="font-bold text-slate-700 block uppercase mb-0.5">Dados Adicionais / Observações</span>
              <p>{invoice.notes || 'Documento emitido por ME ou EPP optante pelo Simples Nacional ou Regime Normal. Mercadoria com entrada automática no estoque operacional.'}</p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Nota fiscal processada e integrada ao estoque físico</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
