import { Product, Invoice, StockMovement, MovementType } from '../types';
import { calculateWeightedAverageCost } from './stockCalculations';
import { calculateProductPurchaseSummary } from './purchaseAverageCalculations';

const STORAGE_KEYS = {
  PRODUCTS: 'nfe_stock_products_v2',
  INVOICES: 'nfe_stock_invoices_v2',
  MOVEMENTS: 'nfe_stock_movements_v2',
};

// Dados sementes realistas brasileiros para demonstração imediata e rica
const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    code: 'MAT-101',
    name: 'Papel Sulfite A4 75g Pacote 500 Folhas',
    category: 'Escritório & Papelaria',
    unit: 'PCT',
    ncm: '48025610',
    currentStock: 65,
    minStock: 20,
    averageCost: 23.80,
    lastCost: 24.50,
    sellingPrice: 34.90,
    marginPercent: 42.45,
    location: 'Prateleira A-12',
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-09-18T10:30:00Z',
  },
  {
    id: 'prod-2',
    code: 'MAT-205',
    name: 'Fita Adesiva Transparente 45mm x 100m',
    category: 'Embalagens & Expedição',
    unit: 'UN',
    ncm: '39191000',
    currentStock: 140,
    minStock: 30,
    averageCost: 5.45,
    lastCost: 5.80,
    sellingPrice: 9.90,
    marginPercent: 70.69,
    location: 'Prateleira B-04',
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-09-18T10:30:00Z',
  },
  {
    id: 'prod-3',
    code: 'MAT-309',
    name: 'Caixa de Papelão Ondulado Reforçada 40x30x25cm',
    category: 'Embalagens & Expedição',
    unit: 'UN',
    ncm: '48191000',
    currentStock: 235,
    minStock: 50,
    averageCost: 4.10,
    lastCost: 4.20,
    sellingPrice: 7.50,
    marginPercent: 78.57,
    location: 'Palete C-01',
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-09-18T10:30:00Z',
  },
  {
    id: 'prod-4',
    code: 'PEC-550',
    name: 'Rolamento Blindado 6204 DDU',
    category: 'Manutenção & Peças',
    unit: 'UN',
    ncm: '84821010',
    currentStock: 18,
    minStock: 25, // ALERTA: Estoque Baixo!
    averageCost: 46.50,
    lastCost: 48.00,
    sellingPrice: 79.90,
    marginPercent: 66.46,
    location: 'Gaveteiro M-08',
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-09-19T14:15:00Z',
  },
  {
    id: 'prod-5',
    code: 'LUB-890',
    name: 'Graxa Sintética de Alta Performance Pote 1kg',
    category: 'Químicos & Lubrificantes',
    unit: 'KG',
    ncm: '27101999',
    currentStock: 22,
    minStock: 10,
    averageCost: 82.00,
    lastCost: 85.00,
    sellingPrice: 135.00,
    marginPercent: 58.82,
    location: 'Armário Seguro Q-02',
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-09-19T14:15:00Z',
  },
  {
    id: 'prod-6',
    code: 'EPI-104',
    name: 'Luva Nitrílica Descartável Tamanho G (Caixa c/ 100 un)',
    category: 'EPI & Segurança',
    unit: 'CX',
    ncm: '40151900',
    currentStock: 8,
    minStock: 15, // ALERTA: Estoque Crítico!
    averageCost: 38.90,
    lastCost: 39.50,
    sellingPrice: 62.00,
    marginPercent: 56.96,
    location: 'Armário EPI-1',
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-09-10T11:00:00Z',
  },
  {
    id: 'prod-7',
    code: 'LIM-302',
    name: 'Detergente Industrial Desengraxante 5 Litros',
    category: 'Limpeza & Higiene',
    unit: 'GL',
    ncm: '34029039',
    currentStock: 14,
    minStock: 10,
    averageCost: 42.00,
    lastCost: 44.00,
    sellingPrice: 69.90,
    marginPercent: 58.86,
    location: 'Depósito Geral D-03',
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-09-05T09:20:00Z',
  },
];

const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-101',
    number: '45892',
    series: '1',
    accessKey: '35260912345678000199550010000458921123456789',
    issueDate: '2026-09-18',
    entryDate: '2026-09-18',
    supplier: {
      name: 'DISTRIBUIDORA BRASIL DE MATERIAIS S.A.',
      tradeName: 'Brasil Distribuidora',
      cnpj: '12.345.678/0001-99',
      stateRegistration: '114885740112',
      city: 'São Paulo',
      uf: 'SP',
    },
    items: [
      {
        id: 'inv-item-1',
        productId: 'prod-1',
        code: 'MAT-101',
        description: 'Papel Sulfite A4 75g Pacote 500 Folhas',
        ncm: '48025610',
        cfop: '1102',
        unit: 'PCT',
        quantity: 50,
        unitPrice: 24.50,
        totalPrice: 1225.00,
        icms: 220.50,
        pis: 20.21,
        cofins: 93.10,
      },
      {
        id: 'inv-item-2',
        productId: 'prod-2',
        code: 'MAT-205',
        description: 'Fita Adesiva Transparente 45mm x 100m',
        ncm: '39191000',
        cfop: '1102',
        unit: 'UN',
        quantity: 120,
        unitPrice: 5.80,
        totalPrice: 696.00,
        icms: 125.28,
      },
      {
        id: 'inv-item-3',
        productId: 'prod-3',
        code: 'MAT-309',
        description: 'Caixa de Papelão Ondulado Reforçada 40x30x25cm',
        ncm: '48191000',
        cfop: '1102',
        unit: 'UN',
        quantity: 200,
        unitPrice: 4.20,
        totalPrice: 840.00,
        icms: 151.20,
      },
    ],
    totals: {
      productsValue: 2761.00,
      freightValue: 80.00,
      taxesValue: 610.29,
      discountValue: 50.00,
      totalInvoiceValue: 2791.00,
    },
    notes: 'Entrada confirmada via importação XML de NF-e',
    status: 'CONFIRMADA',
    createdAt: '2026-09-18T10:30:00Z',
  },
  {
    id: 'inv-102',
    number: '18443',
    series: '2',
    accessKey: '31260945678901000188550020000184431987654321',
    issueDate: '2026-09-19',
    entryDate: '2026-09-19',
    supplier: {
      name: 'METALURGICA E PECAS INDUSTRIAIS DO VALE LTDA',
      tradeName: 'Vale Peças',
      cnpj: '45.678.901/0001-88',
      stateRegistration: '645123987000',
      city: 'São José dos Campos',
      uf: 'SP',
    },
    items: [
      {
        id: 'inv-item-4',
        productId: 'prod-4',
        code: 'PEC-550',
        description: 'Rolamento Blindado 6204 DDU',
        ncm: '84821010',
        cfop: '1403',
        unit: 'UN',
        quantity: 35,
        unitPrice: 48.00,
        totalPrice: 1680.00,
      },
      {
        id: 'inv-item-5',
        productId: 'prod-5',
        code: 'LUB-890',
        description: 'Graxa Sintética de Alta Performance Pote 1kg',
        ncm: '27101999',
        cfop: '1403',
        unit: 'KG',
        quantity: 15,
        unitPrice: 85.00,
        totalPrice: 1275.00,
      },
    ],
    totals: {
      productsValue: 2955.00,
      freightValue: 0.00,
      taxesValue: 320.00,
      discountValue: 0.00,
      totalInvoiceValue: 2955.00,
    },
    notes: 'Compra de reposição técnica',
    status: 'CONFIRMADA',
    createdAt: '2026-09-19T14:15:00Z',
  },
  {
    id: 'inv-100',
    number: '33109',
    series: '1',
    accessKey: '35260812345678000199550010000331091123456789',
    issueDate: '2026-08-15',
    entryDate: '2026-08-16',
    supplier: {
      name: 'DISTRIBUIDORA BRASIL DE MATERIAIS S.A.',
      tradeName: 'Brasil Distribuidora',
      cnpj: '12.345.678/0001-99',
      city: 'São Paulo',
      uf: 'SP',
    },
    items: [
      {
        id: 'inv-item-prior-1',
        productId: 'prod-1',
        code: 'MAT-101',
        description: 'Papel Sulfite A4 75g Pacote 500 Folhas',
        ncm: '48025610',
        cfop: '1102',
        unit: 'PCT',
        quantity: 40,
        unitPrice: 23.00,
        totalPrice: 920.00,
      },
    ],
    totals: {
      productsValue: 920.00,
      freightValue: 0,
      taxesValue: 165.60,
      discountValue: 0,
      totalInvoiceValue: 920.00,
    },
    notes: 'Lote de Agosto',
    status: 'CONFIRMADA',
    createdAt: '2026-08-16T10:00:00Z',
  },
];

const INITIAL_MOVEMENTS: StockMovement[] = [
  // Movimentos de Abril 2026
  {
    id: 'mov-apr-01',
    productId: 'prod-1',
    productCode: 'MAT-101',
    productName: 'Papel Sulfite A4 75g Pacote 500 Folhas',
    unit: 'PCT',
    date: '2026-04-10T09:00:00',
    type: 'ENTRADA_NFE',
    documentType: 'NFE',
    documentNumber: 'NF 28901',
    supplierOrCustomer: 'DISTRIBUIDORA BRASIL DE MATERIAIS S.A.',
    quantity: 110,
    unitCost: 22.50,
    totalCost: 2475.00,
    resultingStock: 110,
    resultingAverageCost: 22.50,
    notes: 'Entrada de lote Abril',
  },
  {
    id: 'mov-apr-02',
    productId: 'prod-2',
    productCode: 'MAT-205',
    productName: 'Fita Adesiva Transparente 45mm x 100m',
    unit: 'UN',
    date: '2026-04-10T09:00:00',
    type: 'ENTRADA_NFE',
    documentType: 'NFE',
    documentNumber: 'NF 28901',
    supplierOrCustomer: 'DISTRIBUIDORA BRASIL DE MATERIAIS S.A.',
    quantity: 150,
    unitCost: 5.20,
    totalCost: 780.00,
    resultingStock: 150,
    resultingAverageCost: 5.20,
  },
  {
    id: 'mov-apr-03',
    productId: 'prod-1',
    productCode: 'MAT-101',
    productName: 'Papel Sulfite A4 75g Pacote 500 Folhas',
    unit: 'PCT',
    date: '2026-04-22T14:30:00',
    type: 'SAIDA_CONSUMO',
    documentType: 'MANUAL',
    documentNumber: 'REQ-04-12',
    supplierOrCustomer: 'Administração Geral',
    quantity: 75,
    unitCost: 22.50,
    totalCost: 1687.50,
    resultingStock: 35,
    resultingAverageCost: 22.50,
  },
  {
    id: 'mov-apr-04',
    productId: 'prod-2',
    productCode: 'MAT-205',
    productName: 'Fita Adesiva Transparente 45mm x 100m',
    unit: 'UN',
    date: '2026-04-25T16:00:00',
    type: 'SAIDA_CONSUMO',
    documentType: 'MANUAL',
    documentNumber: 'REQ-04-18',
    supplierOrCustomer: 'Expedição',
    quantity: 90,
    unitCost: 5.20,
    totalCost: 468.00,
    resultingStock: 60,
    resultingAverageCost: 5.20,
  },

  // Movimentos de Maio 2026
  {
    id: 'mov-may-01',
    productId: 'prod-3',
    productCode: 'MAT-309',
    productName: 'Caixa de Papelão Ondulado Reforçada 40x30x25cm',
    unit: 'UN',
    date: '2026-05-08T10:00:00',
    type: 'ENTRADA_NFE',
    documentType: 'NFE',
    documentNumber: 'NF 30120',
    supplierOrCustomer: 'DISTRIBUIDORA BRASIL DE MATERIAIS S.A.',
    quantity: 260,
    unitCost: 3.90,
    totalCost: 1014.00,
    resultingStock: 260,
    resultingAverageCost: 3.90,
  },
  {
    id: 'mov-may-02',
    productId: 'prod-4',
    productCode: 'PEC-550',
    productName: 'Rolamento Blindado 6204 DDU',
    unit: 'UN',
    date: '2026-05-12T11:00:00',
    type: 'ENTRADA_NFE',
    documentType: 'NFE',
    documentNumber: 'NF 14502',
    supplierOrCustomer: 'METALURGICA E PECAS INDUSTRIAIS DO VALE LTDA',
    quantity: 60,
    unitCost: 45.00,
    totalCost: 2700.00,
    resultingStock: 60,
    resultingAverageCost: 45.00,
  },
  {
    id: 'mov-may-03',
    productId: 'prod-3',
    productCode: 'MAT-309',
    productName: 'Caixa de Papelão Ondulado Reforçada 40x30x25cm',
    unit: 'UN',
    date: '2026-05-20T15:00:00',
    type: 'SAIDA_CONSUMO',
    documentType: 'MANUAL',
    documentNumber: 'REQ-05-09',
    supplierOrCustomer: 'Logística',
    quantity: 180,
    unitCost: 3.90,
    totalCost: 702.00,
    resultingStock: 80,
    resultingAverageCost: 3.90,
  },
  {
    id: 'mov-may-04',
    productId: 'prod-4',
    productCode: 'PEC-550',
    productName: 'Rolamento Blindado 6204 DDU',
    unit: 'UN',
    date: '2026-05-28T16:00:00',
    type: 'SAIDA_CONSUMO',
    documentType: 'MANUAL',
    documentNumber: 'MANUT-05',
    supplierOrCustomer: 'Manutenção Fábrica',
    quantity: 40,
    unitCost: 45.00,
    totalCost: 1800.00,
    resultingStock: 20,
    resultingAverageCost: 45.00,
  },

  // Movimentos de Junho 2026
  {
    id: 'mov-jun-01',
    productId: 'prod-1',
    productCode: 'MAT-101',
    productName: 'Papel Sulfite A4 75g Pacote 500 Folhas',
    unit: 'PCT',
    date: '2026-06-05T09:30:00',
    type: 'ENTRADA_NFE',
    documentType: 'NFE',
    documentNumber: 'NF 31540',
    supplierOrCustomer: 'DISTRIBUIDORA BRASIL DE MATERIAIS S.A.',
    quantity: 140,
    unitCost: 23.00,
    totalCost: 3220.00,
    resultingStock: 175,
    resultingAverageCost: 22.90,
  },
  {
    id: 'mov-jun-02',
    productId: 'prod-5',
    productCode: 'LUB-890',
    productName: 'Graxa Sintética de Alta Performance Pote 1kg',
    unit: 'KG',
    date: '2026-06-05T09:30:00',
    type: 'ENTRADA_NFE',
    documentType: 'NFE',
    documentNumber: 'NF 31540',
    supplierOrCustomer: 'DISTRIBUIDORA BRASIL DE MATERIAIS S.A.',
    quantity: 50,
    unitCost: 80.00,
    totalCost: 4000.00,
    resultingStock: 50,
    resultingAverageCost: 80.00,
  },
  {
    id: 'mov-jun-03',
    productId: 'prod-1',
    productCode: 'MAT-101',
    productName: 'Papel Sulfite A4 75g Pacote 500 Folhas',
    unit: 'PCT',
    date: '2026-06-21T14:00:00',
    type: 'SAIDA_VENDA',
    documentType: 'MANUAL',
    documentNumber: 'PED-3011',
    supplierOrCustomer: 'Cliente Comercial SP',
    quantity: 105,
    unitCost: 22.90,
    totalCost: 2404.50,
    resultingStock: 70,
    resultingAverageCost: 22.90,
  },
  {
    id: 'mov-jun-04',
    productId: 'prod-5',
    productCode: 'LUB-890',
    productName: 'Graxa Sintética de Alta Performance Pote 1kg',
    unit: 'KG',
    date: '2026-06-25T17:00:00',
    type: 'SAIDA_CONSUMO',
    documentType: 'MANUAL',
    documentNumber: 'MANUT-06',
    supplierOrCustomer: 'Oficina Técnica',
    quantity: 25,
    unitCost: 80.00,
    totalCost: 2000.00,
    resultingStock: 25,
    resultingAverageCost: 80.00,
  },

  // Movimentos de Julho 2026
  {
    id: 'mov-jul-01',
    productId: 'prod-2',
    productCode: 'MAT-205',
    productName: 'Fita Adesiva Transparente 45mm x 100m',
    unit: 'UN',
    date: '2026-07-07T10:00:00',
    type: 'ENTRADA_NFE',
    documentType: 'NFE',
    documentNumber: 'NF 32440',
    supplierOrCustomer: 'DISTRIBUIDORA BRASIL DE MATERIAIS S.A.',
    quantity: 180,
    unitCost: 5.50,
    totalCost: 990.00,
    resultingStock: 240,
    resultingAverageCost: 5.42,
  },
  {
    id: 'mov-jul-02',
    productId: 'prod-3',
    productCode: 'MAT-309',
    productName: 'Caixa de Papelão Ondulado Reforçada 40x30x25cm',
    unit: 'UN',
    date: '2026-07-07T10:00:00',
    type: 'ENTRADA_NFE',
    documentType: 'NFE',
    documentNumber: 'NF 32440',
    supplierOrCustomer: 'DISTRIBUIDORA BRASIL DE MATERIAIS S.A.',
    quantity: 220,
    unitCost: 4.00,
    totalCost: 880.00,
    resultingStock: 300,
    resultingAverageCost: 3.98,
  },
  {
    id: 'mov-jul-03',
    productId: 'prod-2',
    productCode: 'MAT-205',
    productName: 'Fita Adesiva Transparente 45mm x 100m',
    unit: 'UN',
    date: '2026-07-20T11:00:00',
    type: 'SAIDA_CONSUMO',
    documentType: 'MANUAL',
    documentNumber: 'EXP-07-1',
    supplierOrCustomer: 'Expedição',
    quantity: 130,
    unitCost: 5.42,
    totalCost: 704.60,
    resultingStock: 110,
    resultingAverageCost: 5.42,
  },
  {
    id: 'mov-jul-04',
    productId: 'prod-3',
    productCode: 'MAT-309',
    productName: 'Caixa de Papelão Ondulado Reforçada 40x30x25cm',
    unit: 'UN',
    date: '2026-07-28T16:30:00',
    type: 'SAIDA_CONSUMO',
    documentType: 'MANUAL',
    documentNumber: 'EXP-07-2',
    supplierOrCustomer: 'Expedição',
    quantity: 160,
    unitCost: 3.98,
    totalCost: 636.80,
    resultingStock: 140,
    resultingAverageCost: 3.98,
  },

  // Movimentos de Agosto 2026 (Saldo anterior)
  {
    id: 'mov-001',
    productId: 'prod-1',
    productCode: 'MAT-101',
    productName: 'Papel Sulfite A4 75g Pacote 500 Folhas',
    unit: 'PCT',
    date: '2026-08-16T10:00:00',
    type: 'ENTRADA_NFE',
    documentType: 'NFE',
    documentNumber: 'NF 33109',
    invoiceId: 'inv-100',
    supplierOrCustomer: 'DISTRIBUIDORA BRASIL DE MATERIAIS S.A.',
    quantity: 40,
    unitCost: 23.00,
    totalCost: 920.00,
    resultingStock: 40,
    resultingAverageCost: 23.00,
    notes: 'Entrada por compra NF-e 33109',
  },
  {
    id: 'mov-002',
    productId: 'prod-1',
    productCode: 'MAT-101',
    productName: 'Papel Sulfite A4 75g Pacote 500 Folhas',
    unit: 'PCT',
    date: '2026-08-25T15:30:00',
    type: 'SAIDA_CONSUMO',
    documentType: 'MANUAL',
    documentNumber: 'REQ-08-14',
    supplierOrCustomer: 'Setor Administrativo',
    quantity: 15,
    unitCost: 23.00,
    totalCost: 345.00,
    resultingStock: 25,
    resultingAverageCost: 23.00,
    notes: 'Requisição interna de material',
  },
  // Movimentos de Setembro 2026
  {
    id: 'mov-101',
    productId: 'prod-1',
    productCode: 'MAT-101',
    productName: 'Papel Sulfite A4 75g Pacote 500 Folhas',
    unit: 'PCT',
    date: '2026-09-18T10:30:00',
    type: 'ENTRADA_NFE',
    documentType: 'NFE',
    documentNumber: 'NF 45892',
    invoiceId: 'inv-101',
    supplierOrCustomer: 'DISTRIBUIDORA BRASIL DE MATERIAIS S.A.',
    quantity: 50,
    unitCost: 24.50,
    totalCost: 1225.00,
    resultingStock: 75,
    resultingAverageCost: 24.00,
    notes: 'Entrada via NF-e 45892',
  },
  {
    id: 'mov-102',
    productId: 'prod-1',
    productCode: 'MAT-101',
    productName: 'Papel Sulfite A4 75g Pacote 500 Folhas',
    unit: 'PCT',
    date: '2026-09-19T11:00:00',
    type: 'SAIDA_VENDA',
    documentType: 'MANUAL',
    documentNumber: 'PED-4091',
    supplierOrCustomer: 'Cliente Comercial São Paulo',
    quantity: 10,
    unitCost: 24.00,
    totalCost: 240.00,
    resultingStock: 65,
    resultingAverageCost: 23.80,
    notes: 'Saída por venda faturada',
  },
  {
    id: 'mov-103',
    productId: 'prod-2',
    productCode: 'MAT-205',
    productName: 'Fita Adesiva Transparente 45mm x 100m',
    unit: 'UN',
    date: '2026-09-18T10:30:00',
    type: 'ENTRADA_NFE',
    documentType: 'NFE',
    documentNumber: 'NF 45892',
    invoiceId: 'inv-101',
    supplierOrCustomer: 'DISTRIBUIDORA BRASIL DE MATERIAIS S.A.',
    quantity: 120,
    unitCost: 5.80,
    totalCost: 696.00,
    resultingStock: 160,
    resultingAverageCost: 5.45,
    notes: 'Entrada via NF-e 45892',
  },
  {
    id: 'mov-104',
    productId: 'prod-2',
    productCode: 'MAT-205',
    productName: 'Fita Adesiva Transparente 45mm x 100m',
    unit: 'UN',
    date: '2026-09-20T08:15:00',
    type: 'SAIDA_CONSUMO',
    documentType: 'MANUAL',
    documentNumber: 'EXP-109',
    supplierOrCustomer: 'Setor de Expedição',
    quantity: 20,
    unitCost: 5.45,
    totalCost: 109.00,
    resultingStock: 140,
    resultingAverageCost: 5.45,
    notes: 'Utilização em empacotamento',
  },
  {
    id: 'mov-105',
    productId: 'prod-3',
    productCode: 'MAT-309',
    productName: 'Caixa de Papelão Ondulado Reforçada 40x30x25cm',
    unit: 'UN',
    date: '2026-09-18T10:30:00',
    type: 'ENTRADA_NFE',
    documentType: 'NFE',
    documentNumber: 'NF 45892',
    invoiceId: 'inv-101',
    supplierOrCustomer: 'DISTRIBUIDORA BRASIL DE MATERIAIS S.A.',
    quantity: 200,
    unitCost: 4.20,
    totalCost: 840.00,
    resultingStock: 250,
    resultingAverageCost: 4.10,
    notes: 'Entrada via NF-e 45892',
  },
  {
    id: 'mov-106',
    productId: 'prod-3',
    productCode: 'MAT-309',
    productName: 'Caixa de Papelão Ondulado Reforçada 40x30x25cm',
    unit: 'UN',
    date: '2026-09-20T09:00:00',
    type: 'SAIDA_CONSUMO',
    documentType: 'MANUAL',
    documentNumber: 'EXP-110',
    supplierOrCustomer: 'Expedição Central',
    quantity: 15,
    unitCost: 4.10,
    totalCost: 61.50,
    resultingStock: 235,
    resultingAverageCost: 4.10,
    notes: 'Embalagem de pedidos de clientes',
  },
  {
    id: 'mov-107',
    productId: 'prod-4',
    productCode: 'PEC-550',
    productName: 'Rolamento Blindado 6204 DDU',
    unit: 'UN',
    date: '2026-09-19T14:15:00',
    type: 'ENTRADA_NFE',
    documentType: 'NFE',
    documentNumber: 'NF 18443',
    invoiceId: 'inv-102',
    supplierOrCustomer: 'METALURGICA E PECAS INDUSTRIAIS DO VALE LTDA',
    quantity: 35,
    unitCost: 48.00,
    totalCost: 1680.00,
    resultingStock: 35,
    resultingAverageCost: 48.00,
    notes: 'Entrada via NF-e 18443',
  },
  {
    id: 'mov-108',
    productId: 'prod-4',
    productCode: 'PEC-550',
    productName: 'Rolamento Blindado 6204 DDU',
    unit: 'UN',
    date: '2026-09-20T07:45:00',
    type: 'SAIDA_CONSUMO',
    documentType: 'MANUAL',
    documentNumber: 'MANUT-88',
    supplierOrCustomer: 'Oficina Mecânica',
    quantity: 17,
    unitCost: 48.00,
    totalCost: 816.00,
    resultingStock: 18,
    resultingAverageCost: 48.00,
    notes: 'Manutenção preventiva Linha 2 (Estoque ficou abaixo do mínimo)',
  },
  {
    id: 'mov-109',
    productId: 'prod-5',
    productCode: 'LUB-890',
    productName: 'Graxa Sintética de Alta Performance Pote 1kg',
    unit: 'KG',
    date: '2026-09-19T14:15:00',
    type: 'ENTRADA_NFE',
    documentType: 'NFE',
    documentNumber: 'NF 18443',
    invoiceId: 'inv-102',
    supplierOrCustomer: 'METALURGICA E PECAS INDUSTRIAIS DO VALE LTDA',
    quantity: 15,
    unitCost: 85.00,
    totalCost: 1275.00,
    resultingStock: 25,
    resultingAverageCost: 82.00,
    notes: 'Entrada via NF-e 18443',
  },
  {
    id: 'mov-110',
    productId: 'prod-5',
    productCode: 'LUB-890',
    productName: 'Graxa Sintética de Alta Performance Pote 1kg',
    unit: 'KG',
    date: '2026-09-20T08:30:00',
    type: 'SAIDA_CONSUMO',
    documentType: 'MANUAL',
    documentNumber: 'MANUT-89',
    supplierOrCustomer: 'Manutenção de Esteiras',
    quantity: 3,
    unitCost: 82.00,
    totalCost: 246.00,
    resultingStock: 22,
    resultingAverageCost: 82.00,
    notes: 'Lubrificação semanal',
  },
];

export function getStoredProducts(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    const parsed: Product[] = JSON.parse(raw);
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
    return INITIAL_PRODUCTS;
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
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(INITIAL_INVOICES));
      return INITIAL_INVOICES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_INVOICES;
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
      localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(INITIAL_MOVEMENTS));
      return INITIAL_MOVEMENTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_MOVEMENTS;
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
      // Criar novo produto automaticamente caso não exista no catálogo!
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
 * Reseta o banco para os dados de demonstração
 */
export function resetDemoDatabase(): {
  products: Product[];
  invoices: Invoice[];
  movements: StockMovement[];
} {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(INITIAL_INVOICES));
  localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(INITIAL_MOVEMENTS));

  return {
    products: INITIAL_PRODUCTS,
    invoices: INITIAL_INVOICES,
    movements: INITIAL_MOVEMENTS,
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
