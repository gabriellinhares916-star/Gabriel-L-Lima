import { Product, Invoice, StockMovement, MovementType } from '../types';
import { calculateWeightedAverageCost } from './stockCalculations';
import { calculateProductPurchaseSummary } from './purchaseAverageCalculations';

const STORAGE_KEYS = {
  PRODUCTS: 'nfe_stock_products_clean_v1',
  INVOICES: 'nfe_stock_invoices_clean_v1',
  MOVEMENTS: 'nfe_stock_movements_clean_v1',
};

// Base limpa inicial para preenchimento de dados reais a partir de hoje
export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_INVOICES: Invoice[] = [];
export const INITIAL_MOVEMENTS: StockMovement[] = [];

export function getStoredProducts(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
      return [];
    }
    const parsed: Product[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Garantir que todos os produtos tenham preço de venda e margem calculados
    return parsed.map(p => {
      const sellingPrice = p.sellingPrice ?? Number(((p.lastCost || p.averageCost || 10) * 1.45).toFixed(2));
      const costBase = p.averageCost > 0 ? p.averageCost : (p.lastCost || 1);
      const marginPercent = p.marginPercent ?? Number((((sellingPrice - costBase) / costBase) * 100).toFixed(1));
      return {
        ...p,
        sellingPrice,
        marginPercent,
      };
    });
  } catch {
    return [];
  }
}

export function saveStoredProducts(products: Product[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  } catch (err) {
    console.error('Erro ao salvar produtos no localStorage:', err);
  }
}

export function getStoredInvoices(): Invoice[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INVOICES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredInvoices(invoices: Invoice[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  } catch (err) {
    console.error('Erro ao salvar notas fiscais no localStorage:', err);
  }
}

export function getStoredMovements(): StockMovement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredMovements(movements: StockMovement[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));
  } catch (err) {
    console.error('Erro ao salvar movimentos no localStorage:', err);
  }
}

/**
 * Processa a Entrada de uma Nota Fiscal e atualiza automaticamente o Estoque
 */
export function processInvoiceEntry(invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'status'>): {
  invoice: Invoice;
  invoices: Invoice[];
  products: Product[];
  movements: StockMovement[];
} {
  const currentProducts = [...getStoredProducts()];
  const currentInvoices = [...getStoredInvoices()];
  const currentMovements = [...getStoredMovements()];

  const invoiceId = `inv-${Date.now()}`;
  const nowISO = new Date().toISOString();
  const entryDate = invoiceData.entryDate || nowISO.substring(0, 10);

  const newMovements: StockMovement[] = [];
  const processedItems = [...invoiceData.items];

  // Processar cada item da nota
  processedItems.forEach((item, index) => {
    // Tentar localizar produto existente por código ou nome similar
    let existingProdIndex = currentProducts.findIndex(
      p => p.code.trim().toUpperCase() === item.code.trim().toUpperCase()
    );

    if (existingProdIndex === -1) {
      existingProdIndex = currentProducts.findIndex(
        p => p.name.trim().toLowerCase() === item.description.trim().toLowerCase()
      );
    }

    let targetProduct: Product;

    if (existingProdIndex >= 0) {
      // Atualizar produto existente
      const p = currentProducts[existingProdIndex];
      const newAverageCost = calculateWeightedAverageCost(
        p.currentStock,
        p.averageCost,
        item.quantity,
        item.unitPrice
      );
      const newStock = p.currentStock + item.quantity;

      // Se a nota trouxe preço de venda sugerido, atualizamos o preço de venda do produto
      let newSellingPrice = p.sellingPrice;
      if (item.suggestedSalePrice !== undefined && item.suggestedSalePrice > 0) {
        newSellingPrice = item.suggestedSalePrice;
      } else if (!newSellingPrice) {
        newSellingPrice = Number((item.unitPrice * 1.45).toFixed(2));
      }

      const costBase = newAverageCost > 0 ? newAverageCost : item.unitPrice;
      const newMargin = item.marginPercent !== undefined
        ? item.marginPercent
        : Number((((newSellingPrice - costBase) / costBase) * 100).toFixed(1));

      targetProduct = {
        ...p,
        currentStock: newStock,
        averageCost: newAverageCost,
        lastCost: item.unitPrice,
        sellingPrice: newSellingPrice,
        marginPercent: newMargin,
        ncm: item.ncm || p.ncm,
        updatedAt: nowISO,
      };

      currentProducts[existingProdIndex] = targetProduct;
    } else {
      // Criar novo produto automaticamente caso não exista no catálogo
      const initialSellingPrice = item.suggestedSalePrice !== undefined && item.suggestedSalePrice > 0
        ? item.suggestedSalePrice
        : Number((item.unitPrice * 1.40).toFixed(2));
      const initialMargin = item.marginPercent !== undefined
        ? item.marginPercent
        : Number((((initialSellingPrice - item.unitPrice) / item.unitPrice) * 100).toFixed(1));

      targetProduct = {
        id: `prod-${Date.now()}-${index}`,
        code: item.code || `COD-${Date.now().toString().slice(-4)}`,
        name: item.description,
        category: 'Geral',
        unit: item.unit || 'UN',
        ncm: item.ncm || '00000000',
        currentStock: item.quantity,
        minStock: Math.max(5, Math.round(item.quantity * 0.2)),
        averageCost: item.unitPrice,
        lastCost: item.unitPrice,
        sellingPrice: initialSellingPrice,
        marginPercent: initialMargin,
        createdAt: nowISO,
        updatedAt: nowISO,
      };
      currentProducts.push(targetProduct);
    }

    // Vincular item da nota ao produto
    item.productId = targetProduct.id;

    // Gerar registro de movimentação de estoque
    const movement: StockMovement = {
      id: `mov-${Date.now()}-${index}`,
      productId: targetProduct.id,
      productCode: targetProduct.code,
      productName: targetProduct.name,
      unit: targetProduct.unit,
      date: entryDate.length === 10 ? `${entryDate}T12:00:00` : entryDate,
      type: 'ENTRADA_NFE',
      documentType: 'NFE',
      documentNumber: `NF ${invoiceData.number}`,
      invoiceId: invoiceId,
      supplierOrCustomer: invoiceData.supplier.name,
      quantity: item.quantity,
      unitCost: item.unitPrice,
      totalCost: item.totalPrice,
      resultingStock: targetProduct.currentStock,
      resultingAverageCost: targetProduct.averageCost,
      notes: `Entrada automática via NF-e nº ${invoiceData.number} - Série ${invoiceData.series}`,
    };

    newMovements.push(movement);
  });

  const finalInvoice: Invoice = {
    ...invoiceData,
    id: invoiceId,
    items: processedItems,
    status: 'CONFIRMADA',
    createdAt: nowISO,
  };

  const updatedInvoices = [finalInvoice, ...currentInvoices];
  const updatedMovements = [...newMovements, ...currentMovements];

  // Recalcular o PREÇO MÉDIO ponderado das 4 últimas notas fiscais de entrada para os produtos afetados
  processedItems.forEach(item => {
    const prod = currentProducts.find(p => p.code.trim().toUpperCase() === item.code.trim().toUpperCase());
    if (prod) {
      const summary = calculateProductPurchaseSummary(prod, updatedMovements, updatedInvoices, 4);
      if (summary.averageUnitPrice > 0) {
        prod.averageCost = summary.averageUnitPrice;
      }
    }
  });

  // Persistir tudo
  saveStoredProducts(currentProducts);
  saveStoredInvoices(updatedInvoices);
  saveStoredMovements(updatedMovements);

  return {
    invoice: finalInvoice,
    invoices: updatedInvoices,
    products: currentProducts,
    movements: updatedMovements,
  };
}

/**
 * Registra movimentação manual de estoque (saída, consumo, perda, ajuste)
 */
export function registerStockMovement(params: {
  productId: string;
  type: MovementType;
  quantity: number;
  date: string;
  documentNumber?: string;
  supplierOrCustomer?: string;
  notes?: string;
}): {
  success: boolean;
  error?: string;
  products: Product[];
  movements: StockMovement[];
} {
  const currentProducts = [...getStoredProducts()];
  const currentMovements = [...getStoredMovements()];

  const prodIndex = currentProducts.findIndex(p => p.id === params.productId);
  if (prodIndex === -1) {
    return { success: false, error: 'Produto não encontrado.', products: currentProducts, movements: currentMovements };
  }

  const p = currentProducts[prodIndex];
  const isIncoming = params.type.startsWith('ENTRADA');

  if (!isIncoming && p.currentStock < params.quantity) {
    return {
      success: false,
      error: `Saldo insuficiente em estoque. Saldo atual: ${p.currentStock} ${p.unit}, solicitado: ${params.quantity} ${p.unit}.`,
      products: currentProducts,
      movements: currentMovements,
    };
  }

  const newStock = isIncoming ? p.currentStock + params.quantity : p.currentStock - params.quantity;
  const unitCost = p.averageCost;
  const totalCost = params.quantity * unitCost;

  const updatedProduct: Product = {
    ...p,
    currentStock: newStock,
    updatedAt: new Date().toISOString(),
  };

  currentProducts[prodIndex] = updatedProduct;

  const movement: StockMovement = {
    id: `mov-${Date.now()}`,
    productId: p.id,
    productCode: p.code,
    productName: p.name,
    unit: p.unit,
    date: params.date || new Date().toISOString(),
    type: params.type,
    documentType: 'MANUAL',
    documentNumber: params.documentNumber || 'AVULSO',
    supplierOrCustomer: params.supplierOrCustomer,
    quantity: params.quantity,
    unitCost: unitCost,
    totalCost: totalCost,
    resultingStock: newStock,
    resultingAverageCost: p.averageCost,
    notes: params.notes,
  };

  const updatedMovements = [movement, ...currentMovements];

  saveStoredProducts(currentProducts);
  saveStoredMovements(updatedMovements);

  return {
    success: true,
    products: currentProducts,
    movements: updatedMovements,
  };
}

/**
 * Reseta o banco para base limpa
 */
export function resetDemoDatabase(): {
  products: Product[];
  invoices: Invoice[];
  movements: StockMovement[];
} {
  return clearAllDatabase();
}

/**
 * Limpa todos os produtos, notas e movimentações
 */
export function clearAllDatabase(): {
  products: Product[];
  invoices: Invoice[];
  movements: StockMovement[];
} {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify([]));
  localStorage.removeItem('nfe_stock_products_v1');
  localStorage.removeItem('nfe_stock_products_v2');
  localStorage.removeItem('nfe_stock_invoices_v1');
  localStorage.removeItem('nfe_stock_invoices_v2');
  localStorage.removeItem('nfe_stock_movements_v1');
  localStorage.removeItem('nfe_stock_movements_v2');

  return {
    products: [],
    invoices: [],
    movements: [],
  };
}

/**
 * Atualiza o preço de venda e margem de um produto diretamente
 */
export function updateProductPrice(
  productId: string,
  newSellingPrice: number,
  customMarginPercent?: number
): Product[] {
  const currentProducts = [...getStoredProducts()];
  const index = currentProducts.findIndex(p => p.id === productId);
  if (index === -1) return currentProducts;

  const p = currentProducts[index];
  const costBase = p.averageCost > 0 ? p.averageCost : (p.lastCost || 1);
  const margin = customMarginPercent !== undefined
    ? customMarginPercent
    : Number((((newSellingPrice - costBase) / costBase) * 100).toFixed(1));

  currentProducts[index] = {
    ...p,
    sellingPrice: newSellingPrice,
    marginPercent: margin,
    updatedAt: new Date().toISOString(),
  };

  saveStoredProducts(currentProducts);
  return currentProducts;
}
