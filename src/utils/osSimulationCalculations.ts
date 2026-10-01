import { OSItem, ServiceOrder, OSSimulationResult } from '../types';

/**
 * Ordem de Serviço padrão extraída do documento original nº 1634 (Lord Lub Service)
 */
export const DEFAULT_LORD_LUB_OS: ServiceOrder = {
  id: 'os-1634',
  orderNumber: '1634',
  company: {
    name: 'LORD LUB SERVICE',
    phone: '(86) 99819-3557',
    email: 'lordlub2705@gmail.com',
    address: 'Rua Murilo Braga, 451, Vermelha',
    cityUf: 'Teresina - PI',
    logoText: 'Lord Lub Service',
  },
  client: {
    code: '402',
    name: 'SAMUEL RODOLFO UMBELINO MOURA',
    address: ', - - PARNARAMA - MA - 65640000',
    phone: '(99) 98404-4663',
    cpf: '046.659.803-30',
  },
  vehicle: {
    model: 'TOYOTA I/TOYOTA HILUX CD4X4 SRV 11/11 PRATA DIESEL',
    plate: 'NWZ5822',
    entryDate: '15/09/2026 14:00',
    deliveryEstimate: '19/09/2026 13:00',
    km: '',
    chassis: '8AJFZ29G5B6133282',
  },
  products: [
    {
      id: 'prod-1',
      code: '0',
      description: 'JUNTA DA TAMPA DE VALVULA',
      quantity: 1,
      unitPrice: 338.00,
      totalPrice: 338.00,
    },
    {
      id: 'prod-2',
      code: '0',
      description: 'KIT DE ARRUELA COM ANEIS DOS BICOS',
      quantity: 1,
      unitPrice: 200.00,
      totalPrice: 200.00,
    },
    {
      id: 'prod-3',
      code: '0',
      description: 'SELO TUBO',
      quantity: 4,
      unitPrice: 38.00,
      totalPrice: 152.00,
    },
    {
      id: 'prod-4',
      code: '0',
      description: 'ACENTO LATAO',
      quantity: 4,
      unitPrice: 25.00,
      totalPrice: 100.00,
    },
    {
      id: 'prod-5',
      code: '0',
      description: 'FILTRO DE COMBUSTIVEL',
      quantity: 1,
      unitPrice: 50.00,
      totalPrice: 50.00,
    },
    {
      id: 'prod-6',
      code: '0',
      description: 'COLA DO MOTOR',
      quantity: 1,
      unitPrice: 40.00,
      totalPrice: 40.00,
    },
    {
      id: 'prod-7',
      code: '0',
      description: 'JOGO DE BUCHA DO JUMELO',
      quantity: 1,
      unitPrice: 220.00,
      totalPrice: 220.00,
    },
    {
      id: 'prod-8',
      code: '0',
      description: 'CALCIO DO FECHO DE MOLA',
      quantity: 1,
      unitPrice: 35.00,
      totalPrice: 35.00,
    },
    {
      id: 'prod-9',
      code: '0',
      description: 'ALINHAMENTO E BALANCEAMENTO',
      quantity: 1,
      unitPrice: 200.00,
      totalPrice: 200.00,
    },
    {
      id: 'prod-10',
      code: '0',
      description: 'OLEO DIESEL',
      quantity: 1,
      unitPrice: 100.00,
      totalPrice: 100.00,
    },
    {
      id: 'prod-11',
      code: '16',
      description: 'ADITIVO',
      quantity: 6,
      unit: 'UN',
      unitPrice: 25.00,
      totalPrice: 150.00,
    },
  ],
  services: [
    {
      id: 'serv-1',
      code: '',
      description: 'LIMPEZA DO TANQUE',
      quantity: 1,
      unitPrice: 250.00,
      totalPrice: 250.00,
    },
    {
      id: 'serv-2',
      code: '',
      description: 'SERVICO',
      quantity: 1,
      unitPrice: 450.00,
      totalPrice: 450.00,
    },
  ],
  totalProducts: 1585.00,
  totalServices: 700.00,
  totalAmount: 2285.00,
  warrantyNotes: 'Todos os nossos servicos e produtos possuem 3 meses de garantia.',
  thanksNotes: 'Obrigado pela preferência!',
  signatures: {
    responsible: 'JOSE WANDERSON NASCIMENTO SILVA',
    client: 'SAMUEL RODOLFO UMBELINO MOURA',
  },
  paymentCondition: 'Cartão de Crédito / Débito',
};

/**
 * Calcula a diluição estritamente proporcional de um valor alvo (ex: simulado para cartão)
 * entre produtos e serviços, mantendo a exata proporção original e fechamento exato dos centavos.
 */
export function calculateProportionalOSDilution(
  os: ServiceOrder,
  targetTotal: number
): OSSimulationResult {
  const originalProductsTotal = os.products.reduce((acc, p) => acc + p.totalPrice, 0);
  const originalServicesTotal = os.services.reduce((acc, s) => acc + s.totalPrice, 0);
  const originalTotal = originalProductsTotal + originalServicesTotal;

  if (originalTotal <= 0 || targetTotal <= 0) {
    return {
      originalTotal,
      targetTotal,
      ratio: 1,
      diffTotal: 0,
      diffPercent: 0,
      originalProductsTotal,
      originalServicesTotal,
      simulatedProductsTotal: originalProductsTotal,
      simulatedServicesTotal: originalServicesTotal,
      productsWeightPercent: 0,
      servicesWeightPercent: 0,
      simulatedProducts: os.products,
      simulatedServices: os.services,
    };
  }

  const ratio = targetTotal / originalTotal;
  const diffTotal = targetTotal - originalTotal;
  const diffPercent = (diffTotal / originalTotal) * 100;
  const productsWeightPercent = (originalProductsTotal / originalTotal) * 100;
  const servicesWeightPercent = (originalServicesTotal / originalTotal) * 100;

  // Processa Produtos proporcionalmente
  const simulatedProducts: OSItem[] = os.products.map(item => {
    // Valor ideal proporcional
    const targetItemTotal = item.totalPrice * ratio;
    
    // Se quantidade > 1, calculamos preço unitário arredondado
    let unitPrice = item.quantity > 1 
      ? Math.round((targetItemTotal / item.quantity) * 100) / 100
      : Math.round(targetItemTotal * 100) / 100;

    let totalPrice = Math.round(unitPrice * item.quantity * 100) / 100;
    
    return {
      ...item,
      simulatedUnitPrice: unitPrice,
      simulatedTotalPrice: totalPrice,
      diffAmount: totalPrice - item.totalPrice,
      diffPercent: item.totalPrice > 0 ? ((totalPrice - item.totalPrice) / item.totalPrice) * 100 : 0,
    };
  });

  // Processa Serviços proporcionalmente
  const simulatedServices: OSItem[] = os.services.map(item => {
    const targetItemTotal = item.totalPrice * ratio;
    let unitPrice = item.quantity > 1
      ? Math.round((targetItemTotal / item.quantity) * 100) / 100
      : Math.round(targetItemTotal * 100) / 100;

    let totalPrice = Math.round(unitPrice * item.quantity * 100) / 100;

    return {
      ...item,
      simulatedUnitPrice: unitPrice,
      simulatedTotalPrice: totalPrice,
      diffAmount: totalPrice - item.totalPrice,
      diffPercent: item.totalPrice > 0 ? ((totalPrice - item.totalPrice) / item.totalPrice) * 100 : 0,
    };
  });

  // Ajuste de centavos para fechamento 100.00% exato com targetTotal
  const sumSimulatedProducts = simulatedProducts.reduce((acc, p) => acc + (p.simulatedTotalPrice || 0), 0);
  const sumSimulatedServices = simulatedServices.reduce((acc, s) => acc + (s.simulatedTotalPrice || 0), 0);
  const currentSum = Math.round((sumSimulatedProducts + sumSimulatedServices) * 100) / 100;
  const residualCents = Math.round((targetTotal - currentSum) * 100) / 100;

  if (Math.abs(residualCents) > 0.001) {
    // Distribuir o centavo no item de maior valor com quantidade = 1 para manter coerência unitária
    const allItems = [...simulatedProducts, ...simulatedServices];
    const candidate = allItems
      .filter(i => i.quantity === 1)
      .sort((a, b) => (b.simulatedTotalPrice || 0) - (a.simulatedTotalPrice || 0))[0] || allItems[0];

    if (candidate) {
      const newTotal = Math.round(((candidate.simulatedTotalPrice || 0) + residualCents) * 100) / 100;
      candidate.simulatedTotalPrice = newTotal;
      candidate.simulatedUnitPrice = Math.round((newTotal / candidate.quantity) * 100) / 100;
      candidate.diffAmount = newTotal - candidate.totalPrice;
      candidate.diffPercent = candidate.totalPrice > 0 
        ? ((newTotal - candidate.totalPrice) / candidate.totalPrice) * 100 
        : 0;
    }
  }

  const finalTotalProducts = Math.round(
    simulatedProducts.reduce((acc, p) => acc + (p.simulatedTotalPrice || 0), 0) * 100
  ) / 100;

  const finalTotalServices = Math.round(
    simulatedServices.reduce((acc, s) => acc + (s.simulatedTotalPrice || 0), 0) * 100
  ) / 100;

  return {
    originalTotal,
    targetTotal,
    ratio,
    diffTotal,
    diffPercent,
    originalProductsTotal,
    originalServicesTotal,
    simulatedProductsTotal: finalTotalProducts,
    simulatedServicesTotal: finalTotalServices,
    productsWeightPercent,
    servicesWeightPercent,
    simulatedProducts,
    simulatedServices,
  };
}

/**
 * Gera o novo objeto ServiceOrder com os valores recalculados para geração do novo documento
 */
export function generateNewServiceOrder(
  originalOS: ServiceOrder,
  simulationResult: OSSimulationResult,
  customNotes?: string
): ServiceOrder {
  return {
    ...originalOS,
    products: simulationResult.simulatedProducts.map(p => ({
      ...p,
      unitPrice: p.simulatedUnitPrice ?? p.unitPrice,
      totalPrice: p.simulatedTotalPrice ?? p.totalPrice,
    })),
    services: simulationResult.simulatedServices.map(s => ({
      ...s,
      unitPrice: s.simulatedUnitPrice ?? s.unitPrice,
      totalPrice: s.simulatedTotalPrice ?? s.totalPrice,
    })),
    totalProducts: simulationResult.simulatedProductsTotal,
    totalServices: simulationResult.simulatedServicesTotal,
    totalAmount: simulationResult.targetTotal,
    paymentCondition: customNotes || originalOS.paymentCondition,
    simulatedTargetTotal: simulationResult.targetTotal,
  };
}

/**
 * Taxas padrão de maquininha de cartão para simulação rápida
 */
export const CARD_PRESET_RATES = [
  { label: 'Débito', rate: 1.99, installments: 1, description: 'Taxa média de débito' },
  { label: 'Crédito 1x', rate: 3.49, installments: 1, description: 'Crédito à vista' },
  { label: 'Crédito 2x a 3x', rate: 5.40, installments: 3, description: 'Parcelado 3x' },
  { label: 'Crédito 6x', rate: 7.90, installments: 6, description: 'Parcelado 6x' },
  { label: 'Crédito 10x', rate: 11.20, installments: 10, description: 'Parcelado 10x' },
  { label: 'Crédito 12x', rate: 13.50, installments: 12, description: 'Parcelado 12x' },
];

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
