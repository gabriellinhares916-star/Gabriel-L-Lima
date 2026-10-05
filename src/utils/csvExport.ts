import { Product, StockMovement, Invoice, MonthlyReportData } from '../types';
import { formatDateBR } from './stockCalculations';
import { calculateProductPurchaseSummary } from './purchaseAverageCalculations';

/**
 * Utilitário para geração de arquivos CSV 100% compatíveis com o Microsoft Excel
 * no Brasil e América Latina:
 * - Prefixo UTF-8 BOM (\uFEFF) para garantir caracteres e acentos corretos no Excel
 * - Separador de colunas: ponto-e-vírgula (;) padrão em sistemas pt-BR
 * - Formatação de números decimais com vírgula (ex: 1234,56)
 * - Escape seguro de aspas e quebras de linha
 */

function formatCSVValue(value: string | number | undefined | null): string {
  if (value === undefined || value === null) {
    return '""';
  }

  if (typeof value === 'number') {
    return `"${value.toString().replace('.', ',')}"`;
  }

  const stringValue = String(value);
  // Escapar aspas duplas internas duplicando-as
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function downloadCSV(
  filename: string,
  headers: string[],
  rows: (string | number | undefined | null)[][]
): void {
  const BOM = '\uFEFF';
  const headerLine = headers.map(formatCSVValue).join(';');
  const rowLines = rows.map(row => row.map(formatCSVValue).join(';'));
  const csvContent = BOM + [headerLine, ...rowLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 1. Exportação do Saldo Atual dos Produtos (Inventário)
 */
export function exportProductsStockCSV(products: Product[], filenameSuffix: string = ''): void {
  const headers = [
    'Código',
    'Descrição do Produto',
    'Categoria',
    'Unidade',
    'NCM',
    'Estoque Atual',
    'Estoque Mínimo',
    'Status do Estoque',
    'Custo Médio Unitário (R$)',
    'Último Custo de Entrada (R$)',
    'Valor Total em Estoque (R$)',
    'Localização Almoxarifado',
    'Última Atualização',
  ];

  const rows = products.map(p => {
    let status = 'Regular';
    if (p.currentStock <= 0) {
      status = 'Esgotado';
    } else if (p.currentStock <= p.minStock) {
      status = 'Abaixo do Mínimo';
    }

    const totalVal = p.currentStock * p.averageCost;

    return [
      p.code,
      p.name,
      p.category || 'Geral',
      p.unit,
      p.ncm || '00000000',
      p.currentStock,
      p.minStock,
      status,
      p.averageCost.toFixed(2).replace('.', ','),
      p.lastCost.toFixed(2).replace('.', ','),
      totalVal.toFixed(2).replace('.', ','),
      p.location || 'Não informada',
      p.updatedAt ? formatDateBR(p.updatedAt) : '-',
    ];
  });

  const dateStr = new Date().toISOString().substring(0, 10);
  const suffix = filenameSuffix ? `_${filenameSuffix}` : '';
  downloadCSV(`Saldo_Estoque_Produtos_${dateStr}${suffix}.csv`, headers, rows);
}

/**
 * 2. Exportação do Histórico de Movimentações (Kardex Geral ou Filtrado)
 */
export function exportMovementsHistoryCSV(
  movements: StockMovement[],
  filenamePrefix: string = 'Historico_Movimentacoes_Estoque'
): void {
  const headers = [
    'ID Movimento',
    'Data / Hora',
    'Código do Produto',
    'Nome do Produto',
    'Unidade',
    'Tipo de Movimento',
    'Tipo de Documento',
    'Nº Documento / Referência',
    'Fornecedor / Cliente / Setor',
    'Sentido',
    'Quantidade Movimentada',
    'Custo Unitário (R$)',
    'Valor Total do Movimento (R$)',
    'Saldo Resultante em Estoque',
    'Custo Médio Resultante (R$)',
    'Patrimônio Resultante (R$)',
    'Observações',
  ];

  const sortedMovements = [...movements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const rows = sortedMovements.map(m => {
    const isIncoming = m.type.startsWith('ENTRADA');
    const direction = isIncoming ? 'ENTRADA (+)' : 'SAÍDA (-)';
    const totalCost = m.totalCost || (m.quantity * m.unitCost);
    const resultingValue = m.resultingStock * m.resultingAverageCost;

    let movementTypeDesc: string = m.type;
    if (m.type === 'ENTRADA_NFE') movementTypeDesc = 'Entrada via NF-e';
    else if (m.type === 'ENTRADA_AJUSTE') movementTypeDesc = 'Entrada por Ajuste';
    else if (m.type === 'SAIDA_VENDA') movementTypeDesc = 'Saída por Venda';
    else if (m.type === 'SAIDA_CONSUMO') movementTypeDesc = 'Saída por Consumo Interno';
    else if (m.type === 'SAIDA_PERDA') movementTypeDesc = 'Baixa por Perda / Avaria';
    else if (m.type === 'AJUSTE_BALANCO') movementTypeDesc = 'Ajuste de Balanço / Inventário';

    return [
      m.id,
      formatDateBR(m.date),
      m.productCode,
      m.productName,
      m.unit,
      movementTypeDesc,
      m.documentType || 'N/A',
      m.documentNumber || '-',
      m.supplierOrCustomer || '-',
      direction,
      m.quantity,
      m.unitCost.toFixed(2).replace('.', ','),
      totalCost.toFixed(2).replace('.', ','),
      m.resultingStock,
      m.resultingAverageCost.toFixed(2).replace('.', ','),
      resultingValue.toFixed(2).replace('.', ','),
      m.notes || '',
    ];
  });

  const dateStr = new Date().toISOString().substring(0, 10);
  downloadCSV(`${filenamePrefix}_${dateStr}.csv`, headers, rows);
}

/**
 * 3. Exportação da Ficha Kardex de um Produto Específico
 */
export function exportProductKardexCSV(product: Product, movements: StockMovement[]): void {
  const productMovements = movements
    .filter(m => m.productId === product.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const headers = [
    'Data / Hora',
    'Tipo Movimentação',
    'Documento',
    'Parceiro / Setor',
    'Entrada (Qtd)',
    'Saída (Qtd)',
    'Saldo Resultante',
    'Unidade',
    'Custo Unitário (R$)',
    'Custo Médio Resultante (R$)',
    'Valor Total Resultante (R$)',
    'Observações',
  ];

  const rows = productMovements.map(m => {
    const isIncoming = m.type.startsWith('ENTRADA');
    const resultingTotal = m.resultingStock * m.resultingAverageCost;

    let typeLabel = 'Movimentação';
    if (m.type === 'ENTRADA_NFE') typeLabel = 'Entrada NF-e';
    else if (m.type === 'ENTRADA_AJUSTE') typeLabel = 'Ajuste (+)';
    else if (m.type === 'SAIDA_VENDA') typeLabel = 'Venda';
    else if (m.type === 'SAIDA_CONSUMO') typeLabel = 'Consumo Interno';
    else if (m.type === 'SAIDA_PERDA') typeLabel = 'Baixa / Perda';
    else if (m.type === 'AJUSTE_BALANCO') typeLabel = 'Ajuste Balanço';

    return [
      formatDateBR(m.date),
      typeLabel,
      m.documentNumber || '-',
      m.supplierOrCustomer || '-',
      isIncoming ? m.quantity : '-',
      !isIncoming ? m.quantity : '-',
      m.resultingStock,
      m.unit,
      m.unitCost.toFixed(2).replace('.', ','),
      m.resultingAverageCost.toFixed(2).replace('.', ','),
      resultingTotal.toFixed(2).replace('.', ','),
      m.notes || '',
    ];
  });

  const cleanCode = product.code.replace(/[^a-zA-Z0-9_-]/g, '_');
  downloadCSV(`Kardex_Produto_${cleanCode}_${product.name.substring(0, 20)}.csv`, headers, rows);
}

/**
 * 4. Exportação do Relatório Mensal: Movimentação Físico-Financeira de Produtos
 */
export function exportMonthlyReportProductsCSV(report: MonthlyReportData): void {
  const headers = [
    'Código',
    'Descrição do Produto',
    'UN',
    'Estoque Inicial (Qtd)',
    'Valor Inicial (R$)',
    'Entradas no Mês (Qtd)',
    'Entradas no Mês (R$)',
    'Saídas no Mês (Qtd)',
    'Saídas no Mês (R$)',
    'Estoque Final (Qtd)',
    'Valor Final (R$)',
    'Custo Médio Unitário (R$)',
  ];

  const rows = report.productSummaries.map(p => [
    p.code,
    p.name,
    p.unit,
    p.initialStock,
    p.initialValue.toFixed(2).replace('.', ','),
    p.incomingQty,
    p.incomingValue.toFixed(2).replace('.', ','),
    p.outgoingQty,
    p.outgoingValue.toFixed(2).replace('.', ','),
    p.finalStock,
    p.finalValue.toFixed(2).replace('.', ','),
    p.averageUnitCost.toFixed(2).replace('.', ','),
  ]);

  downloadCSV(
    `Relatorio_Movimentacao_Produtos_${report.month.toString().padStart(2, '0')}_${report.year}.csv`,
    headers,
    rows
  );
}

/**
 * 5. Exportação do Relatório Mensal: Compras por Fornecedor
 */
export function exportMonthlySuppliersCSV(report: MonthlyReportData): void {
  const headers = [
    'Fornecedor',
    'CNPJ',
    'Notas Fiscais Emitidas',
    'Valor Total Faturado (R$)',
    '% do Volume de Compras',
  ];

  const rows = report.supplierBreakdown.map(s => {
    const pct = report.totalIncomingValue > 0
      ? ((s.totalValue / report.totalIncomingValue) * 100).toFixed(2).replace('.', ',')
      : '0,00';

    return [
      s.supplierName,
      s.cnpj,
      s.invoicesCount,
      s.totalValue.toFixed(2).replace('.', ','),
      `${pct}%`,
    ];
  });

  downloadCSV(
    `Relatorio_Compras_Fornecedores_${report.month.toString().padStart(2, '0')}_${report.year}.csv`,
    headers,
    rows
  );
}

/**
 * 6. Exportação do Relatório Mensal: Entradas por CFOP
 */
export function exportMonthlyCfopCSV(report: MonthlyReportData): void {
  const headers = [
    'CFOP',
    'Descrição da Operação Fiscal',
    'Qtd. de Itens Faturados',
    'Valor Total das Entradas (R$)',
  ];

  const rows = report.cfopBreakdown.map(c => [
    c.cfop,
    c.description,
    c.itemsCount,
    c.totalValue.toFixed(2).replace('.', ','),
  ]);

  downloadCSV(
    `Relatorio_Entradas_CFOP_${report.month.toString().padStart(2, '0')}_${report.year}.csv`,
    headers,
    rows
  );
}

/**
 * 7. Exportação do Relatório Mensal: Top Produtos Movimentados
 */
export function exportMonthlyTopMovedCSV(report: MonthlyReportData): void {
  const headers = [
    'Posição',
    'Código do Produto',
    'Descrição',
    'Entradas no Mês (Qtd)',
    'Saídas no Mês (Qtd)',
    'Fluxo Total de Giro (Qtd)',
  ];

  const rows = report.topMovedProducts.map((t, idx) => {
    const matchedProduct = report.productSummaries.find(p => p.productId === t.productId);
    const code = matchedProduct ? matchedProduct.code : '-';

    return [
      idx + 1,
      code,
      t.name,
      t.incomingQty,
      t.outgoingQty,
      t.totalFlow,
    ];
  });

  downloadCSV(
    `Relatorio_Top_Produtos_Giro_${report.month.toString().padStart(2, '0')}_${report.year}.csv`,
    headers,
    rows
  );
}

/**
 * 8. Exportação do Relatório de Notas Fiscais Recebidas
 */
export function exportInvoicesCSV(invoices: Invoice[]): void {
  const headers = [
    'Número da NF-e',
    'Série',
    'Chave de Acesso (44 dígitos)',
    'Destino / Filial',
    'Fornecedor',
    'CNPJ Fornecedor',
    'UF',
    'Data de Emissão',
    'Data de Entrada / Recebimento',
    'Status',
    'Qtd. de Itens na Nota',
    'Valor dos Produtos (R$)',
    'Valor do Frete (R$)',
    'Valor de Tributos / Impostos (R$)',
    'Valor de Descontos (R$)',
    'Valor Total da Nota Fiscal (R$)',
    'Qtd. de Boletos',
    'Total em Boletos (R$)',
  ];

  const rows = invoices.map(inv => {
    const boletosTotal = (inv.boletos || []).reduce((acc, b) => acc + b.amount, 0);
    return [
      inv.number,
      inv.series,
      inv.accessKey,
      inv.destinationBranch || 'PARNARAMA',
      inv.supplier.name,
      inv.supplier.cnpj,
      inv.supplier.uf || 'SP',
      formatDateBR(inv.issueDate),
      formatDateBR(inv.entryDate),
      inv.status,
      inv.items.length,
      inv.totals.productsValue.toFixed(2).replace('.', ','),
      inv.totals.freightValue.toFixed(2).replace('.', ','),
      inv.totals.taxesValue.toFixed(2).replace('.', ','),
      inv.totals.discountValue.toFixed(2).replace('.', ','),
      inv.totals.totalInvoiceValue.toFixed(2).replace('.', ','),
      inv.boletos?.length || 0,
      boletosTotal.toFixed(2).replace('.', ','),
    ];
  });

  const dateStr = new Date().toISOString().substring(0, 10);
  downloadCSV(`Relatorio_Notas_Fiscais_Entrada_${dateStr}.csv`, headers, rows);
}

/**
 * 9. Exportação da Tabela Comparativa de Preços de Compra e Venda (Margens e Markups)
 * Atualizado: PREÇO MÉDIO ponderado considerando exclusivamente as últimas até 4 notas fiscais de entrada
 */
export function exportPriceTableCSV(
  products: Product[],
  movements: StockMovement[] = [],
  invoices: Invoice[] = []
): void {
  const headers = [
    'Código',
    'Descrição do Produto',
    'Categoria',
    'Unidade',
    'Estoque Atual',
    'Preço de Compra - Último Custo NF-e (R$)',
    'PREÇO MÉDIO - Últimas 4 NFs Ponderadas (R$)',
    'Qtd. NFs Consideradas no Preço Médio',
    'Quantidade Total das NFs (UN)',
    'Valor Total Considerado das NFs (R$)',
    'Preço de Venda Sugerido / Atual (R$)',
    'Lucro Bruto Unitário s/ Preço Médio (R$)',
    'Markup / Margem s/ Preço Médio (%)',
    'Faixa de Margem',
    'Valor Total Estoque a Preço de Venda (R$)',
    'Valor Total Estoque a Preço Médio (R$)',
    'Localização Almoxarifado',
  ];

  const rows = products.map(p => {
    const summary = calculateProductPurchaseSummary(p, movements, invoices, 4);
    const buyPrice = summary.averageUnitPrice > 0 ? summary.averageUnitPrice : (p.lastCost || p.averageCost);
    const salePrice = p.sellingPrice || Number(((buyPrice || 10) * 1.45).toFixed(2));
    const profitUnit = salePrice - buyPrice;
    const markup = buyPrice > 0 ? ((profitUnit / buyPrice) * 100) : 0;
    const totalSale = p.currentStock * salePrice;
    const totalCost = p.currentStock * buyPrice;

    let marginCategory = 'Saudável (30% a 50%)';
    if (markup > 50) marginCategory = 'Alta (> 50%)';
    else if (markup < 15) marginCategory = 'Crítica / Baixa (< 15%)';
    else if (markup < 30) marginCategory = 'Moderada (15% a 30%)';

    return [
      p.code,
      p.name,
      p.category || 'Geral',
      p.unit,
      p.currentStock,
      p.lastCost.toFixed(2).replace('.', ','),
      summary.averageUnitPrice.toFixed(2).replace('.', ','),
      `${summary.invoicesCount} NF(s)`,
      summary.totalQuantity,
      summary.totalValue.toFixed(2).replace('.', ','),
      salePrice.toFixed(2).replace('.', ','),
      profitUnit.toFixed(2).replace('.', ','),
      `${markup.toFixed(1).replace('.', ',')}%`,
      marginCategory,
      totalSale.toFixed(2).replace('.', ','),
      totalCost.toFixed(2).replace('.', ','),
      p.location || 'Não informada',
    ];
  });

  const dateStr = new Date().toISOString().substring(0, 10);
  downloadCSV(`Tabela_Precos_Compra_e_Venda_${dateStr}.csv`, headers, rows);
}
