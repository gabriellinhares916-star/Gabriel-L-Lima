import { Product, StockMovement, Invoice } from '../types';

export interface ProductPurchaseItem {
  id?: string;
  date: string;
  documentNumber: string;
  supplier: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  type: string;
}

export interface ProductPurchaseSummary {
  purchases: ProductPurchaseItem[]; // Até as 4 últimas notas fiscais de entrada (mais recente para a mais antiga)
  invoicesCount: number; // Quantidade de notas consideradas no cálculo (máximo 4)
  purchasesCount: number; // Alias para compatibilidade
  totalQuantity: number; // Soma NUMÉRICA das quantidades das 4 últimas notas
  totalValue: number; // Soma NUMÉRICA dos valores (Qtd × Preço Unitário) das 4 últimas notas
  averageUnitPrice: number; // PREÇO MÉDIO: Valor total considerado ÷ Quantidade total considerada
  weightedAverageUnitPrice: number; // Alias para o Preço Médio Ponderado
  minUnitPrice: number;
  maxUnitPrice: number;
  lastUnitPrice: number;
  hasRealHistory: boolean;
}

/**
 * REGRA DE CÁLCULO DO PREÇO MÉDIO:
 * Para cada produto, calcula o custo médio unitário considerando exclusivamente
 * as 4 últimas notas fiscais de entrada desse produto.
 * Todas as notas fiscais anteriores às 4 últimas são ignoradas.
 * 
 * Fórmula:
 * Para cada uma das 4 últimas notas:
 *   Valor da entrada = Quantidade × Preço Unitário
 * 
 * Quantidade total considerada = soma das quantidades das 4 notas
 * Valor total considerado = soma dos valores das 4 notas
 * Preço médio unitário = Valor total considerado ÷ Quantidade total considerada (Média Ponderada)
 */
export function calculateProductPurchaseSummary(
  product: Product,
  movements: StockMovement[] = [],
  invoices: Invoice[] = [],
  maxPurchases: number = 4
): ProductPurchaseSummary {
  const purchaseItems: ProductPurchaseItem[] = [];
  const processedKeys = new Set<string>();

  // 1. Filtrar movimentos de estoque que representem compras / notas fiscais de entrada
  const prodMovements = movements.filter((m) => {
    const matchesId = m.productId === product.id;
    const matchesCode = m.productCode && product.code && m.productCode.toUpperCase() === product.code.toUpperCase();
    return matchesId || matchesCode;
  });

  prodMovements.forEach((m) => {
    const isPurchase =
      m.type === 'ENTRADA_NFE' ||
      m.type === 'ENTRADA_AJUSTE' ||
      (m.documentType === 'NFE' && Number(m.quantity) > 0);

    const numUnitCost = Number(m.unitCost) || 0;
    const numQty = Number(m.quantity) || 0;

    if (isPurchase && numUnitCost > 0 && numQty > 0) {
      const docNum = m.documentNumber || 'NF-e Entrada';
      const key = `${m.date}_${docNum}_${numUnitCost}`;
      if (!processedKeys.has(key)) {
        processedKeys.add(key);
        const itemVal = Number(m.totalCost) > 0 ? Number(m.totalCost) : Number((numQty * numUnitCost).toFixed(2));
        purchaseItems.push({
          id: m.id,
          date: m.date,
          documentNumber: docNum,
          supplier: m.supplierOrCustomer || 'Fornecedor',
          quantity: numQty,
          unit: m.unit || product.unit,
          unitPrice: numUnitCost,
          totalPrice: itemVal,
          type: m.type === 'ENTRADA_NFE' ? 'NF-e de Compra' : 'Entrada / NF-e',
        });
      }
    }
  });

  // 2. Verificar se há itens em notas fiscais confirmadas que ainda não constem nos movimentos
  invoices.forEach((inv) => {
    if (inv.status === 'CONFIRMADA' && inv.items) {
      inv.items.forEach((item) => {
        const matchesId = item.productId === product.id;
        const matchesCode = item.code && product.code && item.code.toUpperCase() === product.code.toUpperCase();
        const numUnitPrice = Number(item.unitPrice) || 0;
        const numQty = Number(item.quantity) || 0;

        if ((matchesId || matchesCode) && numUnitPrice > 0 && numQty > 0) {
          const docNum = `NF ${inv.number}`;
          const dateStr = inv.entryDate || inv.issueDate;
          const key = `${dateStr}_${docNum}_${numUnitPrice}`;

          if (!processedKeys.has(key)) {
            processedKeys.add(key);
            const itemVal = Number(item.totalPrice) > 0 ? Number(item.totalPrice) : Number((numQty * numUnitPrice).toFixed(2));
            purchaseItems.push({
              id: item.id || `${inv.id}-${item.code}`,
              date: dateStr,
              documentNumber: docNum,
              supplier: inv.supplier?.name || inv.supplier?.tradeName || 'Fornecedor',
              quantity: numQty,
              unit: item.unit || product.unit,
              unitPrice: numUnitPrice,
              totalPrice: itemVal,
              type: 'NF-e de Compra',
            });
          }
        }
      });
    }
  });

  // 3. Ordenar as notas pela data de entrada, da mais recente para a mais antiga
  // Caso existam duas notas na mesma data, utilizar hora do lançamento ou ID
  purchaseItems.sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    if (timeB !== timeA) {
      return timeB - timeA; // Mais recente primeiro
    }
    const idA = String(a.id || a.documentNumber);
    const idB = String(b.id || b.documentNumber);
    return idB.localeCompare(idA);
  });

  // 4. Selecionar estritamente somente as 4 notas fiscais mais recentes (desconsiderando anteriores)
  const lastInvoices = purchaseItems.slice(0, maxPurchases);

  // Se encontramos notas fiscais de entrada
  if (lastInvoices.length > 0) {
    // Garantir soma estritamente numérica: sem concatenação de strings
    const totalQuantity = Number(
      lastInvoices.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0).toFixed(4)
    );
    const totalValue = Number(
      lastInvoices.reduce((acc, p) => acc + (Number(p.totalPrice) || 0), 0).toFixed(2)
    );

    // PREÇO MÉDIO PONDERADO: Valor total considerado ÷ Quantidade total considerada
    const averageUnitPrice = totalQuantity > 0
      ? Number((totalValue / totalQuantity).toFixed(2))
      : Number(lastInvoices[0].unitPrice);

    const unitPrices = lastInvoices.map((p) => Number(p.unitPrice));
    const minUnitPrice = Math.min(...unitPrices);
    const maxUnitPrice = Math.max(...unitPrices);
    const lastUnitPrice = Number(lastInvoices[0].unitPrice);

    return {
      purchases: lastInvoices,
      invoicesCount: lastInvoices.length,
      purchasesCount: lastInvoices.length,
      totalQuantity,
      totalValue,
      averageUnitPrice,
      weightedAverageUnitPrice: averageUnitPrice,
      minUnitPrice,
      maxUnitPrice,
      lastUnitPrice,
      hasRealHistory: true,
    };
  }

  // Caso o produto não tenha notas fiscais de entrada registradas ainda
  // (ex: cadastro inicial de implantação)
  const fallbackPrice = Number(product.lastCost) > 0
    ? Number(product.lastCost)
    : Number(product.averageCost) > 0
    ? Number(product.averageCost)
    : 10.0;

  const fallbackStock = Number(product.currentStock) > 0 ? Number(product.currentStock) : 1;
  const fallbackVal = Number((fallbackStock * fallbackPrice).toFixed(2));

  const fallbackItem: ProductPurchaseItem = {
    date: product.updatedAt || product.createdAt || new Date().toISOString(),
    documentNumber: 'Saldo Inicial',
    supplier: 'Implantação de Estoque',
    quantity: fallbackStock,
    unit: product.unit,
    unitPrice: fallbackPrice,
    totalPrice: fallbackVal,
    type: 'Saldo de Entrada',
  };

  return {
    purchases: [fallbackItem],
    invoicesCount: 1,
    purchasesCount: 1,
    totalQuantity: fallbackStock,
    totalValue: fallbackVal,
    averageUnitPrice: fallbackPrice,
    weightedAverageUnitPrice: fallbackPrice,
    minUnitPrice: fallbackPrice,
    maxUnitPrice: fallbackPrice,
    lastUnitPrice: fallbackPrice,
    hasRealHistory: false,
  };
}
