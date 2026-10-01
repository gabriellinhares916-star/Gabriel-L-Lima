import React from 'react';
import { ServiceOrder } from '../types';
import { formatCurrencyBRL } from '../utils/osSimulationCalculations';
import { Printer, CheckCircle, ShieldCheck, Wrench } from 'lucide-react';

interface OSDocumentViewerProps {
  order: ServiceOrder;
  isSimulated?: boolean;
  simulationNotes?: string;
  onPrint?: () => void;
}

export const OSDocumentViewer: React.FC<OSDocumentViewerProps> = ({
  order,
  isSimulated = false,
  simulationNotes,
  onPrint,
}) => {
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de controle de impressão */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 p-3 rounded-xl border border-slate-200 print:hidden">
        <div className="flex items-center gap-2 text-xs text-slate-700">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold ${
            isSimulated 
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
              : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
          }`}>
            {isSimulated ? '✓ Novo Documento Gerado com Diluição' : 'Documento Original'}
          </span>
          <span className="text-slate-500">•</span>
          <span className="font-semibold text-slate-800">OS Nº {order.orderNumber}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-600">Total: {formatCurrencyBRL(order.totalAmount)}</span>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir / Salvar PDF da OS</span>
        </button>
      </div>

      {/* Folha do Documento no Formato A4 / Layout Oficial */}
      <div
        id="printable-os-document"
        className="bg-white text-slate-900 border border-slate-300 rounded-xl shadow-lg p-6 sm:p-10 max-w-4xl mx-auto font-sans leading-tight print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full print:rounded-none"
      >
        {/* Cabeçalho da Empresa */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            {/* Logo estilizado Lord Lub */}
            <div className="w-14 h-14 rounded-xl bg-amber-500/10 border-2 border-amber-500 flex flex-col items-center justify-center text-amber-600 shrink-0">
              <Wrench className="w-7 h-7" />
              <span className="text-[9px] font-black tracking-tighter uppercase">Lord Lub</span>
            </div>
            <div>
              <div className="text-xl font-black tracking-tight text-slate-900">
                {order.company.name}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">{order.company.phone}</div>
              <div className="text-xs text-slate-600">{order.company.email}</div>
              <div className="text-xs text-slate-500">{order.company.address}</div>
            </div>
          </div>

          <div className="text-right sm:self-center">
            <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Ordem de servico Numero {order.orderNumber}
            </div>
            {isSimulated && (
              <div className="inline-block px-2 py-0.5 bg-amber-50 border border-amber-300 rounded text-[11px] font-bold text-amber-800 mt-1">
                Via Reajustada / Cartão de Crédito
              </div>
            )}
          </div>
        </div>

        {/* Dados do Cliente */}
        <div className="mt-4 border border-slate-300 rounded-lg p-3 text-xs bg-slate-50/50 print:bg-transparent">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4">
            <div>
              <span className="font-bold text-slate-800">Cliente: </span>
              <span className="font-semibold text-slate-900">{order.client.code ? `${order.client.code} ` : ''}{order.client.name}</span>
            </div>
            <div>
              <span className="font-bold text-slate-800">CPF: </span>
              <span className="font-mono font-medium text-slate-900">{order.client.cpf}</span>
            </div>
            <div>
              <span className="font-bold text-slate-800">Endereco: </span>
              <span className="text-slate-700">{order.client.address || 'Não informado'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-800">Telefone: </span>
              <span className="text-slate-700">{order.client.phone}</span>
            </div>
          </div>
        </div>

        {/* Dados do Veículo */}
        <div className="mt-3 border border-slate-300 rounded-lg p-3 text-xs bg-slate-50/50 print:bg-transparent">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-1.5 gap-x-4">
            <div className="sm:col-span-2">
              <span className="font-bold text-slate-800">Veiculo: </span>
              <span className="font-semibold text-slate-900">{order.vehicle.model}</span>
            </div>
            <div>
              <span className="font-bold text-slate-800">Placa: </span>
              <span className="font-mono font-black text-slate-900 uppercase px-1.5 py-0.5 bg-slate-200/70 rounded">
                {order.vehicle.plate}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-800">Entrada: </span>
              <span className="text-slate-700">{order.vehicle.entryDate}</span>
            </div>
            <div>
              <span className="font-bold text-slate-800">Previsao: </span>
              <span className="text-slate-700">{order.vehicle.deliveryEstimate}</span>
            </div>
            <div>
              <span className="font-bold text-slate-800">Km: </span>
              <span className="text-slate-700">{order.vehicle.km || '-'}</span>
            </div>
            {order.vehicle.chassis && (
              <div className="sm:col-span-2">
                <span className="font-bold text-slate-800">Chassi: </span>
                <span className="font-mono text-[11px] text-slate-700">{order.vehicle.chassis}</span>
              </div>
            )}
          </div>
        </div>

        {/* Seção de Produtos */}
        <div className="mt-5">
          <div className="text-sm font-black tracking-tight text-slate-900 uppercase border-b-2 border-slate-900 pb-1 flex items-center justify-between">
            <span>Produtos</span>
            <span className="text-[11px] font-semibold text-slate-500 lowercase">
              ({order.products.length} itens)
            </span>
          </div>

          <table className="w-full text-left text-xs border-collapse mt-2">
            <thead>
              <tr className="border-b border-slate-300 text-[11px] font-bold text-slate-600 bg-slate-50 print:bg-transparent">
                <th className="py-1.5 px-2 w-14">Codigo</th>
                <th className="py-1.5 px-2 w-20">Quantidade</th>
                <th className="py-1.5 px-2">Descricao</th>
                <th className="py-1.5 px-2 text-right w-24">Valor</th>
                <th className="py-1.5 px-2 text-right w-28">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {order.products.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-50/50">
                  <td className="py-1.5 px-2 font-mono text-slate-600">{item.code || '0'}</td>
                  <td className="py-1.5 px-2 font-semibold text-slate-800">
                    {item.quantity} {item.unit ? `- ${item.unit}` : ''}
                  </td>
                  <td className="py-1.5 px-2 font-medium text-slate-900">{item.description}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                    {formatCurrencyBRL(item.unitPrice)}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                    {formatCurrencyBRL(item.totalPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-right text-xs font-black text-slate-900 mt-2 pr-2">
            Total De Produtos: {formatCurrencyBRL(order.totalProducts)}
          </div>
        </div>

        {/* Seção de Serviços */}
        <div className="mt-5">
          <div className="text-sm font-black tracking-tight text-slate-900 uppercase border-b-2 border-slate-900 pb-1 flex items-center justify-between">
            <span>Servicos</span>
            <span className="text-[11px] font-semibold text-slate-500 lowercase">
              ({order.services.length} itens)
            </span>
          </div>

          <table className="w-full text-left text-xs border-collapse mt-2">
            <thead>
              <tr className="border-b border-slate-300 text-[11px] font-bold text-slate-600 bg-slate-50 print:bg-transparent">
                <th className="py-1.5 px-2 w-14">Codigo</th>
                <th className="py-1.5 px-2 w-20">Quantidade</th>
                <th className="py-1.5 px-2">Descricao</th>
                <th className="py-1.5 px-2 text-right w-24">Valor</th>
                <th className="py-1.5 px-2 text-right w-28">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {order.services.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-50/50">
                  <td className="py-1.5 px-2 font-mono text-slate-600">{item.code || '1'}</td>
                  <td className="py-1.5 px-2 font-semibold text-slate-800">{item.quantity}</td>
                  <td className="py-1.5 px-2 font-medium text-slate-900">{item.description}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                    {formatCurrencyBRL(item.unitPrice)}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                    {formatCurrencyBRL(item.totalPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-right text-xs font-black text-slate-900 mt-2 pr-2">
            Total De Servicos: {formatCurrencyBRL(order.totalServices)}
          </div>
        </div>

        {/* Grande Totalizador Final */}
        <div className="mt-6 pt-3 border-t-2 border-slate-900 flex flex-col sm:flex-row items-end sm:items-center justify-between gap-2">
          {simulationNotes && (
            <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg max-w-md">
              <span className="font-bold text-slate-800">Condição / Pagamento: </span>
              <span>{simulationNotes}</span>
            </div>
          )}
          <div className="text-right ml-auto">
            <span className="text-sm font-bold text-slate-700 mr-2">Total:</span>
            <span className="text-xl sm:text-2xl font-black text-slate-950 font-mono">
              {formatCurrencyBRL(order.totalAmount)}
            </span>
          </div>
        </div>

        {/* Rodapé Institucional & Garantia */}
        <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-800">
            {order.warrantyNotes || 'Todos os nossos servicos e produtos possuem 3 meses de garantia.'}
          </p>
          <p className="italic text-slate-500">
            {order.thanksNotes || 'Obrigado pela preferência!'}
          </p>
        </div>

        {/* Campos de Assinatura */}
        <div className="mt-12 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs">
          <div className="space-y-1">
            <div className="border-t border-slate-900 w-4/5 mx-auto pt-1" />
            <div className="font-bold text-slate-900">{order.signatures.responsible}</div>
            <div className="text-[10px] text-slate-500">Responsável Técnico / Oficina</div>
          </div>

          <div className="space-y-1">
            <div className="border-t border-slate-900 w-4/5 mx-auto pt-1" />
            <div className="font-bold text-slate-900">{order.signatures.client}</div>
            <div className="text-[10px] text-slate-500">Cliente / Proprietário do Veículo</div>
          </div>
        </div>
      </div>
    </div>
  );
};
