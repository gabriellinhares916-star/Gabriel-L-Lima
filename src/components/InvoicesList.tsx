import React, { useState } from 'react';
import { Invoice } from '../types';
import { formatBRL, formatDateBR } from '../utils/stockCalculations';
import { DanfeModal } from './DanfeModal';
import {
  FileText,
  Search,
  Eye,
  ChevronDown,
  ChevronUp,
  Building2,
  Calendar,
  Layers,
  KeyRound,
  Download
} from 'lucide-react';
import { exportInvoicesCSV } from '../utils/csvExport';

interface InvoicesListProps {
  invoices: Invoice[];
  onNavigateToNewEntry: () => void;
}

export const InvoicesList: React.FC<InvoicesListProps> = ({
  invoices,
  onNavigateToNewEntry,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoiceForDanfe, setSelectedInvoiceForDanfe] = useState<Invoice | null>(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  const filteredInvoices = invoices.filter(inv => {
    const term = searchTerm.toLowerCase();
    return (
      inv.number.toLowerCase().includes(term) ||
      inv.supplier.name.toLowerCase().includes(term) ||
      inv.supplier.cnpj.includes(term) ||
      inv.accessKey.includes(term)
    );
  });

  const totalValueAll = invoices.reduce((acc, inv) => acc + inv.totals.totalInvoiceValue, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Notas Fiscais de Entrada Registradas
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Histórico completo de NF-e recebidas, fornecedores, DANFEs e composição de mercadorias.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => exportInvoicesCSV(filteredInvoices)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors shadow-2xs"
            title="Exportar todas as notas fiscais de entrada para planilha CSV compatível com Excel"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Exportar Notas (CSV)
          </button>

          <button
            onClick={onNavigateToNewEntry}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
          >
            + Dar Entrada em Nova NF-e
          </button>
        </div>
      </div>

      {/* Mini Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">Total de Notas Registradas</div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {invoices.length} notas fiscais
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Com integração direta ao estoque</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">Valor Total Comprado</div>
          <div className="text-xl font-bold text-indigo-700 mt-1">
            {formatBRL(totalValueAll)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Soma de todas as entradas</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">Itens Totais Faturados</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">
            {invoices.reduce((acc, inv) => acc + inv.items.reduce((s, it) => s + it.quantity, 0), 0)} unidades
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Em {invoices.reduce((acc, inv) => acc + inv.items.length, 0)} linhas de produto</div>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por número da NF, fornecedor, CNPJ ou chave de acesso de 44 dígitos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Lista de Notas Fiscais */}
      <div className="space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">Nenhuma nota fiscal encontrada com o filtro digitado.</p>
          </div>
        ) : (
          filteredInvoices.map((invoice) => {
            const isExpanded = expandedInvoiceId === invoice.id;
            const itemsCount = invoice.items.length;
            const totalUnits = invoice.items.reduce((acc, it) => acc + it.quantity, 0);

            return (
              <div
                key={invoice.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-slate-300"
              >
                {/* Linha Principal da Nota */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">
                          NF-e nº {invoice.number}
                        </span>
                        <span className="text-xs text-slate-400">Série {invoice.series}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {invoice.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 mt-1 flex items-center gap-1.5 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{invoice.supplier.name}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">CNPJ: {invoice.supplier.cnpj}</span>
                      </div>

                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Emissão: {formatDateBR(invoice.issueDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          Recebimento: {formatDateBR(invoice.entryDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" /> {itemsCount} produtos ({totalUnits} un)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Valor e Ações */}
                  <div className="flex items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-left md:text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Valor Total</div>
                      <div className="text-base font-bold text-indigo-900">
                        {formatBRL(invoice.totals.totalInvoiceValue)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedInvoiceForDanfe(invoice)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        DANFE
                      </button>

                      <button
                        onClick={() => setExpandedInvoiceId(isExpanded ? null : invoice.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title={isExpanded ? 'Recolher detalhes' : 'Expandir itens'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Detalhes expandidos dos itens da nota */}
                {isExpanded && (
                  <div className="bg-slate-50 border-t border-slate-200 p-4 space-y-3">
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-mono">
                      <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                      <span>Chave: {invoice.accessKey}</span>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Código</th>
                            <th className="p-2.5">Descrição</th>
                            <th className="p-2.5 text-center">NCM</th>
                            <th className="p-2.5 text-center">CFOP</th>
                            <th className="p-2.5 text-center">UN</th>
                            <th className="p-2.5 text-right">Qtd.</th>
                            <th className="p-2.5 text-right">Preço Unit.</th>
                            <th className="p-2.5 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {invoice.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2.5 font-mono text-slate-700">{item.code}</td>
                              <td className="p-2.5 font-medium text-slate-900">{item.description}</td>
                              <td className="p-2.5 text-center font-mono text-slate-500">{item.ncm}</td>
                              <td className="p-2.5 text-center font-mono text-slate-500">{item.cfop}</td>
                              <td className="p-2.5 text-center font-semibold text-slate-700">{item.unit}</td>
                              <td className="p-2.5 text-right font-bold text-slate-900">{item.quantity}</td>
                              <td className="p-2.5 text-right text-slate-600">{formatBRL(item.unitPrice)}</td>
                              <td className="p-2.5 text-right font-bold text-slate-900">{formatBRL(item.totalPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal DANFE */}
      {selectedInvoiceForDanfe && (
        <DanfeModal
          invoice={selectedInvoiceForDanfe}
          onClose={() => setSelectedInvoiceForDanfe(null)}
        />
      )}
    </div>
  );
};
