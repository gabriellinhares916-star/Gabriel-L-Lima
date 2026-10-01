import React, { useState, useMemo } from 'react';
import { ServiceOrder, OSItem } from '../types';
import {
  DEFAULT_LORD_LUB_OS,
  calculateProportionalOSDilution,
  generateNewServiceOrder,
  CARD_PRESET_RATES,
  formatCurrencyBRL,
} from '../utils/osSimulationCalculations';
import { OSDocumentViewer } from './OSDocumentViewer';
import {
  CreditCard,
  Percent,
  FileText,
  Printer,
  Sparkles,
  ArrowRight,
  Calculator,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Eye,
  Layers,
  Copy,
  Plus,
  Trash2,
  Edit3,
  FileSpreadsheet,
  HelpCircle,
  FileUp,
  TrendingUp
} from 'lucide-react';

export const OSSimulationView: React.FC = () => {
  // Estado da OS base (inicializada com a OS nº 1634 do documento anexado)
  const [currentOS, setCurrentOS] = useState<ServiceOrder>(DEFAULT_LORD_LUB_OS);

  // Valor Alvo digitado pelo usuário (inicializado com um valor simulado padrão, ex: R$ 2.450,00)
  const [targetTotalInput, setTargetTotalInput] = useState<string>('2450.00');

  // Parcelamento no cartão
  const [installments, setInstallments] = useState<number>(3);

  // Aba de visualização ativa
  const [viewMode, setViewMode] = useState<'new_document' | 'comparison' | 'original' | 'editor'>('new_document');

  // Modal / Área de Importação de Texto ou Nova OS
  const [showImportArea, setShowImportArea] = useState<boolean>(false);
  const [rawTextImport, setRawTextImport] = useState<string>('');

  // Toast de feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Valor numérico alvo
  const targetTotal = useMemo(() => {
    const cleaned = targetTotalInput.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) || parsed <= 0 ? currentOS.totalAmount : parsed;
  }, [targetTotalInput, currentOS.totalAmount]);

  // Cálculo da Diluição Proporcional
  const simulationResult = useMemo(() => {
    return calculateProportionalOSDilution(currentOS, targetTotal);
  }, [currentOS, targetTotal]);

  // Novo Documento gerado da Ordem de Serviço
  const newServiceOrder = useMemo(() => {
    const installmentValue = Math.round((targetTotal / installments) * 100) / 100;
    const paymentNotes = `Cartão de Crédito em ${installments}x de ${formatCurrencyBRL(installmentValue)} (Total: ${formatCurrencyBRL(targetTotal)})`;
    return generateNewServiceOrder(currentOS, simulationResult, paymentNotes);
  }, [currentOS, simulationResult, installments, targetTotal]);

  // Manipular taxa pré-configurada de maquininha
  const handleApplyCardPreset = (ratePercent: number, defaultInstallments: number) => {
    const newTotal = Math.round(currentOS.totalAmount * (1 + ratePercent / 100) * 100) / 100;
    setTargetTotalInput(newTotal.toFixed(2));
    setInstallments(defaultInstallments);
    showToast(`Taxa de +${ratePercent}% aplicada! Novo total: ${formatCurrencyBRL(newTotal)}`);
  };

  // Restaurar dados originais da OS nº 1634
  const handleResetToDefaultOS = () => {
    setCurrentOS(DEFAULT_LORD_LUB_OS);
    setTargetTotalInput('2450.00');
    setInstallments(3);
    showToast('OS nº 1634 (Lord Lub Service) recarregada com sucesso!');
  };

  // Copiar resumo dos valores diluídos
  const handleCopySummary = () => {
    const text = `SIMULAÇÃO DE OS PARA CARTÃO - OS Nº ${currentOS.orderNumber}
Cliente: ${currentOS.client.name} | Veículo: ${currentOS.vehicle.model} (${currentOS.vehicle.plate})

VALOR ORIGINAL DA OS: ${formatCurrencyBRL(currentOS.totalAmount)}
• Produtos Originais: ${formatCurrencyBRL(currentOS.totalProducts)} (${simulationResult.productsWeightPercent.toFixed(1)}%)
• Serviços Originais: ${formatCurrencyBRL(currentOS.totalServices)} (${simulationResult.servicesWeightPercent.toFixed(1)}%)

VALOR NOVO NO CARTÃO (DILUÍDO): ${formatCurrencyBRL(targetTotal)} (${installments}x de ${formatCurrencyBRL(targetTotal / installments)})
• Novos Produtos: ${formatCurrencyBRL(simulationResult.simulatedProductsTotal)} (+${formatCurrencyBRL(simulationResult.simulatedProductsTotal - currentOS.totalProducts)})
• Novos Serviços: ${formatCurrencyBRL(simulationResult.simulatedServicesTotal)} (+${formatCurrencyBRL(simulationResult.simulatedServicesTotal - currentOS.totalServices)})
• Variação Total: ${simulationResult.diffTotal >= 0 ? '+' : ''}${formatCurrencyBRL(simulationResult.diffTotal)} (${simulationResult.diffPercent >= 0 ? '+' : ''}${simulationResult.diffPercent.toFixed(2)}%)`;

    navigator.clipboard.writeText(text);
    showToast('Resumo copiado para a área de transferência!');
  };

  // Exportar CSV de comparação
  const handleExportCSV = () => {
    let csv = 'Categoria;Codigo;Descricao;Quantidade;Valor Unit Original;Total Original;Valor Unit Diluido;Total Diluido;Diferenca (R$);Variacao (%)\n';

    simulationResult.simulatedProducts.forEach(p => {
      csv += `Produto;${p.code};"${p.description}";${p.quantity};${p.unitPrice.toFixed(2)};${p.totalPrice.toFixed(2)};${(p.simulatedUnitPrice || p.unitPrice).toFixed(2)};${(p.simulatedTotalPrice || p.totalPrice).toFixed(2)};${(p.diffAmount || 0).toFixed(2)};${(p.diffPercent || 0).toFixed(2)}%\n`;
    });

    simulationResult.simulatedServices.forEach(s => {
      csv += `Servico;${s.code || '-'};"${s.description}";${s.quantity};${s.unitPrice.toFixed(2)};${s.totalPrice.toFixed(2)};${(s.simulatedUnitPrice || s.unitPrice).toFixed(2)};${(s.simulatedTotalPrice || s.totalPrice).toFixed(2)};${(s.diffAmount || 0).toFixed(2)};${(s.diffPercent || 0).toFixed(2)}%\n`;
    });

    csv += `TOTAL;;;PRODUTOS;;${currentOS.totalProducts.toFixed(2)};;${simulationResult.simulatedProductsTotal.toFixed(2)};${(simulationResult.simulatedProductsTotal - currentOS.totalProducts).toFixed(2)};\n`;
    csv += `TOTAL;;;SERVICOS;;${currentOS.totalServices.toFixed(2)};;${simulationResult.simulatedServicesTotal.toFixed(2)};${(simulationResult.simulatedServicesTotal - currentOS.totalServices).toFixed(2)};\n`;
    csv += `TOTAL GERAL;;;;;${currentOS.totalAmount.toFixed(2)};;${targetTotal.toFixed(2)};${simulationResult.diffTotal.toFixed(2)};${simulationResult.diffPercent.toFixed(2)}%\n`;

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `simulacao_os_${currentOS.orderNumber}_cartao.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Planilha CSV gerada com sucesso!');
  };

  // Parser inteligente para importar texto de outra OS caso o usuário cole texto
  const handleParseImportedText = () => {
    if (!rawTextImport.trim()) return;

    try {
      // Tentar interpretar se for JSON
      if (rawTextImport.trim().startsWith('{')) {
        const parsed = JSON.parse(rawTextImport);
        if (parsed.products && parsed.services) {
          setCurrentOS(parsed);
          setShowImportArea(false);
          setRawTextImport('');
          showToast('OS importada via JSON com sucesso!');
          return;
        }
      }

      // Parser heurístico de texto OCR/OS
      const lines = rawTextImport.split('\n').map(l => l.trim()).filter(Boolean);
      let orderNum = currentOS.orderNumber;
      let clientName = currentOS.client.name;
      let vehicleModel = currentOS.vehicle.model;
      let plate = currentOS.vehicle.plate;

      lines.forEach(l => {
        if (l.toLowerCase().includes('numero') || l.toLowerCase().includes('número')) {
          const match = l.match(/\d{3,6}/);
          if (match) orderNum = match[0];
        }
        if (l.toLowerCase().startsWith('cliente:')) {
          clientName = l.replace(/cliente:/i, '').trim();
        }
        if (l.toLowerCase().startsWith('veiculo:') || l.toLowerCase().startsWith('veículo:')) {
          vehicleModel = l.replace(/ve[ií]culo:/i, '').trim();
        }
        if (l.toLowerCase().includes('placa')) {
          const match = l.match(/[A-Z]{3}-?\d[A-Z0-9]\d{2}/i);
          if (match) plate = match[0].toUpperCase();
        }
      });

      setCurrentOS(prev => ({
        ...prev,
        orderNumber: orderNum,
        client: { ...prev.client, name: clientName },
        vehicle: { ...prev.vehicle, model: vehicleModel, plate: plate },
      }));

      setShowImportArea(false);
      setRawTextImport('');
      showToast('Dados do documento importados com sucesso!');
    } catch {
      showToast('Erro ao processar o texto importado.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-800 text-xs font-semibold flex items-center gap-2 animate-bounce print:hidden">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Banner Principal da Funcionalidade */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 rounded-2xl shadow-xl relative overflow-hidden border border-indigo-950 print:hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-semibold mb-2">
              <CreditCard className="w-3.5 h-3.5" />
              Simulação de Pagamento em Cartão • Diluição Proporcional Automática
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Simulação de OS Cartão
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
              Lê e identifica os valores individuais de <strong>Produtos</strong> e <strong>Serviços</strong> da Ordem de Serviço, permite indicar um valor final desejado e <strong>dilui de forma estritamente proporcional</strong> o acréscimo entre todos os itens, gerando um novo documento oficial pronto para impressão.
            </p>
          </div>

          {/* Ações de Topo */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleResetToDefaultOS}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all border border-white/15 cursor-pointer"
              title="Recarregar OS nº 1634 (Lord Lub Service) do anexo"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Recarregar OS nº 1634</span>
            </button>

            <button
              onClick={() => setShowImportArea(!showImportArea)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all border border-white/15 cursor-pointer"
            >
              <FileUp className="w-4 h-4 text-indigo-300" />
              <span>Importar Outra OS</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Nova OS</span>
            </button>
          </div>
        </div>

        {/* Fita de Status Rápido */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">Documento Identificado:</span>
            <span className="font-mono font-bold text-amber-400">OS #{currentOS.orderNumber}</span>
            <span>({currentOS.company.name})</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Cliente: <strong className="text-white">{currentOS.client.name}</strong></span>
            <span>•</span>
            <span>Veículo: <strong className="text-white">{currentOS.vehicle.model}</strong></span>
          </div>
        </div>
      </div>

      {/* Área retrátil de Importação de Texto de outra OS */}
      {showImportArea && (
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-md space-y-3 print:hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Importar ou Colar Texto de Outro Documento de OS
            </h3>
            <button
              onClick={() => setShowImportArea(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Fechar
            </button>
          </div>
          <p className="text-xs text-slate-600">
            Cole aqui o texto ou OCR de outra Ordem de Serviço ou um objeto JSON estruturado para simulação:
          </p>
          <textarea
            rows={4}
            value={rawTextImport}
            onChange={(e) => setRawTextImport(e.target.value)}
            placeholder="Cole aqui o texto extraído da OS (ex: Cliente, Veículo, Produtos e Serviços)..."
            className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowImportArea(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              onClick={handleParseImportedText}
              className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer"
            >
              Processar Texto
            </button>
          </div>
        </div>
      )}

      {/* Grid de 2 Colunas: Painel de Controle e Configuração da Diluição */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
        {/* Coluna 1 (5 colunas): Leitura do Documento & Definição do Valor */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card 1: Identificação dos Valores de Produtos e Serviços */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Valores Identificados na OS</h2>
                  <p className="text-[11px] text-slate-500">Documento original nº {currentOS.orderNumber}</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-slate-100 text-slate-700">
                Total: {formatCurrencyBRL(currentOS.totalAmount)}
              </span>
            </div>

            {/* Comparativo de Proporção Original */}
            <div className="space-y-2.5">
              {/* Produtos */}
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-blue-950 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Produtos ({currentOS.products.length} itens)
                  </span>
                  <span className="font-mono font-black text-blue-900 text-sm">
                    {formatCurrencyBRL(currentOS.totalProducts)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-blue-700">
                  <span>Peso na Ordem de Serviço:</span>
                  <span className="font-bold font-mono">{simulationResult.productsWeightPercent.toFixed(2)}%</span>
                </div>
              </div>

              {/* Serviços */}
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    Serviços ({currentOS.services.length} itens)
                  </span>
                  <span className="font-mono font-black text-emerald-900 text-sm">
                    {formatCurrencyBRL(currentOS.totalServices)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-emerald-700">
                  <span>Peso na Ordem de Serviço:</span>
                  <span className="font-bold font-mono">{simulationResult.servicesWeightPercent.toFixed(2)}%</span>
                </div>
              </div>

              {/* Barra de Proporção Visual */}
              <div className="pt-1">
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${simulationResult.productsWeightPercent}%` }}
                    className="bg-blue-600 h-full"
                    title={`Produtos: ${simulationResult.productsWeightPercent.toFixed(1)}%`}
                  />
                  <div
                    style={{ width: `${simulationResult.servicesWeightPercent}%` }}
                    className="bg-emerald-500 h-full"
                    title={`Serviços: ${simulationResult.servicesWeightPercent.toFixed(1)}%`}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Produtos: {simulationResult.productsWeightPercent.toFixed(1)}%</span>
                  <span>Serviços: {simulationResult.servicesWeightPercent.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Indicar o Valor Desejado para Cartão */}
          <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  2
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Indicar Novo Valor Total</h2>
                  <p className="text-[11px] text-slate-500">Valor que será diluído proporcionalmente</p>
                </div>
              </div>
            </div>

            {/* Input Principal do Valor Alvo */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Valor Total no Cartão (R$)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-600 font-bold text-sm">
                  R$
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={targetTotalInput}
                  onChange={(e) => setTargetTotalInput(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-indigo-50/40 border-2 border-indigo-300 rounded-xl font-mono text-xl font-black text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition-all"
                  placeholder="2450.00"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Digite livremente o valor acordado ou utilize os atalhos de maquininha abaixo.
              </p>
            </div>

            {/* Atalhos Rápidos por Taxa de Maquininha */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Simular por Taxa de Cartão:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CARD_PRESET_RATES.map((preset) => {
                  const simulatedVal = Math.round(currentOS.totalAmount * (1 + preset.rate / 100) * 100) / 100;
                  const isSelected = Math.abs(targetTotal - simulatedVal) < 0.05;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => handleApplyCardPreset(preset.rate, preset.installments)}
                      className={`p-2 rounded-xl text-left transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 hover:bg-indigo-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="text-[11px] font-bold">{preset.label}</div>
                      <div className="text-[10px] opacity-80">+{preset.rate}%</div>
                      <div className="text-xs font-mono font-black mt-0.5">
                        {formatCurrencyBRL(simulatedVal)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Número de Parcelas no Cartão */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Parcelamento no Cartão:</span>
                <span className="font-mono font-black text-indigo-600 text-sm">
                  {installments}x de {formatCurrencyBRL(targetTotal / installments)}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="12"
                value={installments}
                onChange={(e) => setInstallments(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>1x (à vista)</span>
                <span>3x</span>
                <span>6x</span>
                <span>10x</span>
                <span>12x</span>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna 2 (7 colunas): Resumo da Diluição Proporcional */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card 3: Resultado da Diluição Proporcional */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  3
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Resultado da Diluição Proporcional</h2>
                  <p className="text-[11px] text-slate-500">Distribuição matemática exata entre produtos e serviços</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500">Fator de Diluição:</span>
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                  simulationResult.diffTotal >= 0 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {simulationResult.diffPercent >= 0 ? '+' : ''}{simulationResult.diffPercent.toFixed(2)}% ({simulationResult.ratio.toFixed(4)}x)
                </span>
              </div>
            </div>

            {/* Grid dos Novos Totais */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Produtos Diluídos */}
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1">
                <div className="text-[11px] font-bold text-blue-900 uppercase tracking-wide">
                  Novos Produtos
                </div>
                <div className="text-lg font-black font-mono text-blue-950">
                  {formatCurrencyBRL(simulationResult.simulatedProductsTotal)}
                </div>
                <div className="text-[11px] text-blue-700 flex items-center gap-1">
                  <span>Antes: {formatCurrencyBRL(currentOS.totalProducts)}</span>
                  <span className="font-bold">
                    ({simulationResult.simulatedProductsTotal - currentOS.totalProducts >= 0 ? '+' : ''}
                    {formatCurrencyBRL(simulationResult.simulatedProductsTotal - currentOS.totalProducts)})
                  </span>
                </div>
                <div className="text-[10px] text-blue-600 font-semibold">
                  Proporção: {simulationResult.productsWeightPercent.toFixed(2)}% mantida
                </div>
              </div>

              {/* Serviços Diluídos */}
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                <div className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide">
                  Novos Serviços
                </div>
                <div className="text-lg font-black font-mono text-emerald-950">
                  {formatCurrencyBRL(simulationResult.simulatedServicesTotal)}
                </div>
                <div className="text-[11px] text-emerald-700 flex items-center gap-1">
                  <span>Antes: {formatCurrencyBRL(currentOS.totalServices)}</span>
                  <span className="font-bold">
                    ({simulationResult.simulatedServicesTotal - currentOS.totalServices >= 0 ? '+' : ''}
                    {formatCurrencyBRL(simulationResult.simulatedServicesTotal - currentOS.totalServices)})
                  </span>
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold">
                  Proporção: {simulationResult.servicesWeightPercent.toFixed(2)}% mantida
                </div>
              </div>

              {/* Total Final da Nova OS */}
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-1 shadow-md">
                <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wide">
                  Novo Total da OS
                </div>
                <div className="text-lg font-black font-mono text-emerald-400">
                  {formatCurrencyBRL(targetTotal)}
                </div>
                <div className="text-[11px] text-slate-300">
                  Acréscimo: {simulationResult.diffTotal >= 0 ? '+' : ''}{formatCurrencyBRL(simulationResult.diffTotal)}
                </div>
                <div className="text-[10px] text-slate-400">
                  {installments}x de {formatCurrencyBRL(targetTotal / installments)}
                </div>
              </div>
            </div>

            {/* Resumo e Ações de Exportação */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Fechamento exato: soma de produtos e serviços confere precisamente em <strong>100,00%</strong> dos centavos.</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopySummary}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Copiar Resumo</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Exportar Planilha</span>
                </button>
              </div>
            </div>
          </div>

          {/* Abas de Navegação entre Visualização da Nova OS e Tabela Comparativa */}
          <div className="bg-slate-100 p-1.5 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setViewMode('new_document')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'new_document'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Novo Documento Oficial (OS Gerada)</span>
            </button>

            <button
              onClick={() => setViewMode('comparison')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'comparison'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Tabela Comparativa (Item a Item)</span>
            </button>

            <button
              onClick={() => setViewMode('original')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'original'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>OS Original</span>
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo da Visualização Selecionada */}
      <div className="mt-6">
        {/* Visualização 1: Novo Documento Oficial Gerado com Valores Diluídos */}
        {viewMode === 'new_document' && (
          <div>
            <OSDocumentViewer
              order={newServiceOrder}
              isSimulated={true}
              simulationNotes={`Simulação de pagamento em Cartão: ${installments}x de ${formatCurrencyBRL(targetTotal / installments)} (Total: ${formatCurrencyBRL(targetTotal)})`}
            />
          </div>
        )}

        {/* Visualização 2: Tabela Comparativa Detalhada Item a Item */}
        {viewMode === 'comparison' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 print:hidden">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Detalhamento Comparativo da Diluição Item a Item
              </h3>
              <p className="text-xs text-slate-500">
                Mostra o valor original de cada produto e serviço lado a lado com o novo valor recalculado proporcionalmente.
              </p>
            </div>

            {/* Tabela de Produtos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  Produtos Diluídos
                </span>
                <span className="text-xs font-mono font-bold text-blue-700">
                  Original: {formatCurrencyBRL(currentOS.totalProducts)} ➔ Novo: {formatCurrencyBRL(simulationResult.simulatedProductsTotal)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-2 px-3">Cód</th>
                      <th className="py-2 px-3">Qtd</th>
                      <th className="py-2 px-3">Descrição do Produto</th>
                      <th className="py-2 px-3 text-right">Unit Original</th>
                      <th className="py-2 px-3 text-right">Total Original</th>
                      <th className="py-2 px-3 text-right bg-blue-50/80 text-blue-900 font-bold">Novo Unit</th>
                      <th className="py-2 px-3 text-right bg-blue-50/80 text-blue-900 font-bold">Novo Total</th>
                      <th className="py-2 px-3 text-right">Variação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {simulationResult.simulatedProducts.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-slate-500">{p.code || '0'}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{p.quantity} {p.unit || ''}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{p.description}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">{formatCurrencyBRL(p.unitPrice)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">{formatCurrencyBRL(p.totalPrice)}</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold bg-blue-50/30 text-blue-900">
                          {formatCurrencyBRL(p.simulatedUnitPrice || p.unitPrice)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold bg-blue-50/30 text-blue-950">
                          {formatCurrencyBRL(p.simulatedTotalPrice || p.totalPrice)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-700 font-semibold">
                          +{formatCurrencyBRL(p.diffAmount || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabela de Serviços */}
            <div className="space-y-2 pt-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  Serviços Diluídos
                </span>
                <span className="text-xs font-mono font-bold text-emerald-700">
                  Original: {formatCurrencyBRL(currentOS.totalServices)} ➔ Novo: {formatCurrencyBRL(simulationResult.simulatedServicesTotal)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-2 px-3">Cód</th>
                      <th className="py-2 px-3">Qtd</th>
                      <th className="py-2 px-3">Descrição do Serviço</th>
                      <th className="py-2 px-3 text-right">Unit Original</th>
                      <th className="py-2 px-3 text-right">Total Original</th>
                      <th className="py-2 px-3 text-right bg-emerald-50/80 text-emerald-900 font-bold">Novo Unit</th>
                      <th className="py-2 px-3 text-right bg-emerald-50/80 text-emerald-900 font-bold">Novo Total</th>
                      <th className="py-2 px-3 text-right">Variação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {simulationResult.simulatedServices.map((s, idx) => (
                      <tr key={s.id || idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-slate-500">{s.code || '-'}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{s.quantity}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{s.description}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">{formatCurrencyBRL(s.unitPrice)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">{formatCurrencyBRL(s.totalPrice)}</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold bg-emerald-50/30 text-emerald-900">
                          {formatCurrencyBRL(s.simulatedUnitPrice || s.unitPrice)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold bg-emerald-50/30 text-emerald-950">
                          {formatCurrencyBRL(s.simulatedTotalPrice || s.totalPrice)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-700 font-semibold">
                          +{formatCurrencyBRL(s.diffAmount || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Visualização 3: Documento Original */}
        {viewMode === 'original' && (
          <div>
            <OSDocumentViewer order={currentOS} isSimulated={false} />
          </div>
        )}
      </div>
    </div>
  );
};
