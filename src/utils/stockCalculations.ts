import { Product, StockMovement, Invoice, MonthlyReportData, MonthlyProductSummary } from '../types';

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function formatNumberBR(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value || 0);
}

export function formatDateBR(dateString: string): string {
  if (!dateString) return '-';
  const parts = dateString.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

export const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Calcula o novo custo médio ponderado móvel (CMPM)
 */
export function calculateWeightedAverageCost(
  currentStock: number,
  currentAverageCost: number,
  incomingQuantity: number,
  incomingUnitCost: number
): number {
  if (currentStock <= 0) {
    return incomingUnitCost;
  }
  const totalQty = currentStock + incomingQuantity;
  if (totalQty <= 0) return currentAverageCost;

  const totalValue = (currentStock * currentAverageCost) + (incomingQuantity * incomingUnitCost);
  return Number((totalValue / totalQty).toFixed(4));
}

/**
 * Gera o relatório mensal automático para um mês e ano específicos
 */
export function generateMonthlyReport(
  month: number, // 1-12
  year: number,
  products: Product[],
  movements: StockMovement[],
  invoices: Invoice[]
): MonthlyReportData {
  const monthStr = month.toString().padStart(2, '0');
  const monthName = `${MONTH_NAMES_PT[month - 1]} de ${year}`;
  const startOfMonth = `${year}-${monthStr}-01`;
  const endOfMonth = `${year}-${monthStr}-31T23:59:59`;

  // Movimentações ocorridas no mês selecionado
  const monthMovements = movements.filter(m => {
    const d = m.date.substring(0, 10);
    return d >= startOfMonth && d <= `${year}-${monthStr}-31`;
  });

  // Movimentações anteriores a este mês (para calcular saldo inicial do mês)
  const priorMovements = movements.filter(m => {
    const d = m.date.substring(0, 10);
    return d < startOfMonth;
  });

  // Notas fiscais do mês
  const monthInvoices = invoices.filter(inv => {
    const d = inv.entryDate || inv.issueDate;
    return d.substring(0, 7) === `${year}-${monthStr}` && inv.status === 'CONFIRMADA';
  });

  // Calcular saldo inicial e movimentações por produto
  const productSummaries: MonthlyProductSummary[] = [];

  products.forEach(product => {
    // Reconstruir estoque inicial deste produto no início do mês:
    const priorForProd = priorMovements.filter(m => m.productId === product.id);
    let initialStock = 0;
    let initialUnitCost = product.averageCost;

    if (priorForProd.length > 0) {
      // O último movimento anterior dita o saldo que entrou no mês
      const lastPrior = priorForProd.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).pop();
      if (lastPrior) {
        initialStock = lastPrior.resultingStock;
        initialUnitCost = lastPrior.resultingAverageCost;
      }
    } else {
      // Se não há movimentos antes, checamos se todas as movimentações do produto ocorreram no mês ou depois
      // Se a primeira movimentação foi neste mês, saldo inicial era 0.
      initialStock = 0;
    }

    // Movimentações no mês
    const prodMonthMoves = monthMovements.filter(m => m.productId === product.id);

    let incomingQty = 0;
    let incomingValue = 0;
    let outgoingQty = 0;
    let outgoingValue = 0;

    prodMonthMoves.forEach(m => {
      const isIncoming = m.type.startsWith('ENTRADA');
      if (isIncoming) {
        incomingQty += m.quantity;
        incomingValue += m.totalCost;
      } else {
        outgoingQty += m.quantity;
        outgoingValue += (m.quantity * (m.unitCost || product.averageCost));
      }
    });

    const finalStock = initialStock + incomingQty - outgoingQty;
    const finalAvgCost = prodMonthMoves.length > 0
      ? prodMonthMoves[prodMonthMoves.length - 1].resultingAverageCost
      : (product.averageCost || initialUnitCost);
    const finalValue = Math.max(0, finalStock * finalAvgCost);

    // Incluir produto se tem estoque inicial, final ou movimentação
    if (initialStock > 0 || finalStock > 0 || incomingQty > 0 || outgoingQty > 0) {
      productSummaries.push({
        productId: product.id,
        code: product.code,
        name: product.name,
        unit: product.unit,
        initialStock,
        initialValue: initialStock * initialUnitCost,
        incomingQty,
        incomingValue,
        outgoingQty,
        outgoingValue,
        finalStock,
        finalValue,
        averageUnitCost: finalAvgCost,
      });
    }
  });

  // Totais gerais
  const totalIncomingValue = monthMovements
    .filter(m => m.type.startsWith('ENTRADA'))
    .reduce((acc, curr) => acc + curr.totalCost, 0);

  const totalIncomingItemsCount = monthMovements
    .filter(m => m.type.startsWith('ENTRADA'))
    .reduce((acc, curr) => acc + curr.quantity, 0);

  const totalOutgoingValue = monthMovements
    .filter(m => !m.type.startsWith('ENTRADA'))
    .reduce((acc, curr) => acc + (curr.totalCost || (curr.quantity * curr.unitCost)), 0);

  const totalOutgoingItemsCount = monthMovements
    .filter(m => !m.type.startsWith('ENTRADA'))
    .reduce((acc, curr) => acc + curr.quantity, 0);

  const initialInventoryValue = productSummaries.reduce((acc, p) => acc + p.initialValue, 0);
  const finalInventoryValue = productSummaries.reduce((acc, p) => acc + p.finalValue, 0);

  // Top movimentados
  const topMovedProducts = [...productSummaries]
    .map(p => ({
      productId: p.productId,
      name: p.name,
      incomingQty: p.incomingQty,
      outgoingQty: p.outgoingQty,
      totalFlow: p.incomingQty + p.outgoingQty,
    }))
    .sort((a, b) => b.totalFlow - a.totalFlow)
    .slice(0, 5);

  // CFOP Breakdown a partir das NFs do mês
  const cfopMap = new Map<string, { totalValue: number; itemsCount: number }>();
  monthInvoices.forEach(inv => {
    inv.items.forEach(item => {
      const current = cfopMap.get(item.cfop) || { totalValue: 0, itemsCount: 0 };
      current.totalValue += item.totalPrice;
      current.itemsCount += item.quantity;
      cfopMap.set(item.cfop, current);
    });
  });

  const cfopDescriptions: Record<string, string> = {
    '1102': 'Compra para comercialização (Dentro do Estado)',
    '2102': 'Compra para comercialização (Fora do Estado)',
    '1403': 'Compra p/ comercialização c/ Substituição Tributária',
    '2403': 'Compra p/ comercialização c/ ST (Fora do Estado)',
    '1556': 'Compra de material para uso ou consumo',
    '2556': 'Compra de material para uso ou consumo (Fora do Estado)',
    '5102': 'Venda de mercadoria adquirida de terceiros',
    '5405': 'Venda de mercadoria c/ Substituição Tributária',
  };

  const cfopBreakdown = Array.from(cfopMap.entries()).map(([cfop, data]) => ({
    cfop,
    description: cfopDescriptions[cfop] || 'Operação Fiscal Mercantil',
    totalValue: data.totalValue,
    itemsCount: data.itemsCount,
  }));

  // Supplier Breakdown das NFs do mês
  const supplierMap = new Map<string, { cnpj: string; count: number; total: number }>();
  monthInvoices.forEach(inv => {
    const key = inv.supplier.name;
    const current = supplierMap.get(key) || { cnpj: inv.supplier.cnpj, count: 0, total: 0 };
    current.count += 1;
    current.total += inv.totals.totalInvoiceValue;
    supplierMap.set(key, current);
  });

  const supplierBreakdown = Array.from(supplierMap.entries())
    .map(([name, data]) => ({
      supplierName: name,
      cnpj: data.cnpj,
      invoicesCount: data.count,
      totalValue: data.total,
    }))
    .sort((a, b) => b.totalValue - a.totalValue);

  return {
    month,
    year,
    monthName,
    totalInvoicesCount: monthInvoices.length,
    totalIncomingValue,
    totalIncomingItemsCount,
    totalOutgoingValue,
    totalOutgoingItemsCount,
    initialInventoryValue,
    finalInventoryValue,
    movementsCount: monthMovements.length,
    productSummaries,
    topMovedProducts,
    cfopBreakdown,
    supplierBreakdown,
  };
}
