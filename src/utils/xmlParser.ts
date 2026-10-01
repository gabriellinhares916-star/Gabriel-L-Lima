import { Invoice, InvoiceItem } from '../types';

export interface ParsedNFeResult {
  success: boolean;
  error?: string;
  invoice?: Omit<Invoice, 'id' | 'createdAt' | 'status'>;
}

export function parseNFeXML(xmlString: string): ParsedNFeResult {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

    // Checar erro no XML
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      return {
        success: false,
        error: 'Arquivo XML inválido ou mal formatado. Verifique se o arquivo é um XML de NF-e válido.',
      };
    }

    // Buscar chave de acesso
    let accessKey = '';
    const infNFe = xmlDoc.querySelector('infNFe');
    if (infNFe && infNFe.getAttribute('Id')) {
      accessKey = infNFe.getAttribute('Id')!.replace(/\D/g, '');
    } else {
      const chNFe = xmlDoc.querySelector('chNFe');
      if (chNFe && chNFe.textContent) {
        accessKey = chNFe.textContent.trim();
      } else {
        // Gerar uma chave sintética se não encontrada
        accessKey = '35' + Date.now() + '00010055001' + Math.floor(100000000 + Math.random() * 900000000);
      }
    }

    // Dados de Identificação (ide)
    const ide = xmlDoc.querySelector('ide');
    const nNF = ide?.querySelector('nNF')?.textContent?.trim() || '000001';
    const serie = ide?.querySelector('serie')?.textContent?.trim() || '1';
    const dhEmi = ide?.querySelector('dhEmi')?.textContent?.trim() ||
                 ide?.querySelector('dEmi')?.textContent?.trim() ||
                 new Date().toISOString();
    
    // Normalizar data (remover timezone para YYYY-MM-DD se necessário ou manter ISO)
    const issueDate = dhEmi.substring(0, 10);
    const today = new Date().toISOString().substring(0, 10);

    // Emitente / Fornecedor (emit)
    const emit = xmlDoc.querySelector('emit');
    const emitCnpj = emit?.querySelector('CNPJ')?.textContent?.trim() ||
                     emit?.querySelector('CPF')?.textContent?.trim() ||
                     '00.000.000/0001-00';
    const emitNome = emit?.querySelector('xNome')?.textContent?.trim() || 'Fornecedor Desconhecido';
    const emitFant = emit?.querySelector('xFant')?.textContent?.trim() || emitNome;
    const emitIE = emit?.querySelector('IE')?.textContent?.trim() || '';
    const enderEmit = emit?.querySelector('enderEmit');
    const emitMun = enderEmit?.querySelector('xMun')?.textContent?.trim() || '';
    const emitUF = enderEmit?.querySelector('UF')?.textContent?.trim() || 'SP';

    // Destinatário (dest)
    const dest = xmlDoc.querySelector('dest');
    const destNome = dest?.querySelector('xNome')?.textContent?.trim() || 'Sua Empresa Ltda';
    const destCnpj = dest?.querySelector('CNPJ')?.textContent?.trim() || '12.345.678/0001-90';
    const destUF = dest?.querySelector('enderDest > UF')?.textContent?.trim() || 'SP';

    // Itens da Nota (det)
    const detNodes = xmlDoc.querySelectorAll('det');
    const items: InvoiceItem[] = [];

    let calculatedProductsTotal = 0;
    let totalTaxes = 0;

    detNodes.forEach((det, index) => {
      const prod = det.querySelector('prod');
      if (!prod) return;

      const cProd = prod.querySelector('cProd')?.textContent?.trim() || `PROD-${index + 1}`;
      const xProd = prod.querySelector('xProd')?.textContent?.trim() || `Item ${index + 1}`;
      const ncm = prod.querySelector('NCM')?.textContent?.trim() || '00000000';
      const cfop = prod.querySelector('CFOP')?.textContent?.trim() || '5102';
      const uCom = prod.querySelector('uCom')?.textContent?.trim().toUpperCase() || 'UN';
      const qCom = parseFloat(prod.querySelector('qCom')?.textContent?.trim() || '1') || 1;
      const vUnCom = parseFloat(prod.querySelector('vUnCom')?.textContent?.trim() || '0') || 0;
      const vProd = parseFloat(prod.querySelector('vProd')?.textContent?.trim() || '0') || (qCom * vUnCom);

      // Impostos
      const imposto = det.querySelector('imposto');
      const vICMS = parseFloat(imposto?.querySelector('vICMS')?.textContent?.trim() || '0') || 0;
      const vIPI = parseFloat(imposto?.querySelector('vIPI')?.textContent?.trim() || '0') || 0;
      const vPIS = parseFloat(imposto?.querySelector('vPIS')?.textContent?.trim() || '0') || 0;
      const vCOFINS = parseFloat(imposto?.querySelector('vCOFINS')?.textContent?.trim() || '0') || 0;

      calculatedProductsTotal += vProd;
      totalTaxes += (vICMS + vIPI + vPIS + vCOFINS);

      items.push({
        id: `item-${Date.now()}-${index}`,
        code: cProd,
        description: xProd,
        ncm: ncm,
        cfop: cfop,
        unit: uCom,
        quantity: qCom,
        unitPrice: vUnCom,
        totalPrice: vProd,
        icms: vICMS,
        ipi: vIPI,
        pis: vPIS,
        cofins: vCOFINS,
      });
    });

    if (items.length === 0) {
      return {
        success: false,
        error: 'Nenhum item de produto (<det>) foi encontrado no XML.',
      };
    }

    // Totais
    const total = xmlDoc.querySelector('total > ICMSTot');
    const vProdTotal = parseFloat(total?.querySelector('vProd')?.textContent?.trim() || '') || calculatedProductsTotal;
    const vFrete = parseFloat(total?.querySelector('vFrete')?.textContent?.trim() || '0') || 0;
    const vDesc = parseFloat(total?.querySelector('vDesc')?.textContent?.trim() || '0') || 0;
    const vNF = parseFloat(total?.querySelector('vNF')?.textContent?.trim() || '') || (vProdTotal + vFrete - vDesc);

    return {
      success: true,
      invoice: {
        number: nNF,
        series: serie,
        accessKey: accessKey.padStart(44, '0').slice(-44),
        issueDate: issueDate,
        entryDate: today,
        supplier: {
          name: emitNome,
          tradeName: emitFant,
          cnpj: emitCnpj,
          stateRegistration: emitIE,
          city: emitMun,
          uf: emitUF,
        },
        recipient: {
          name: destNome,
          cnpj: destCnpj,
          uf: destUF,
        },
        items: items,
        totals: {
          productsValue: vProdTotal,
          freightValue: vFrete,
          taxesValue: totalTaxes,
          discountValue: vDesc,
          totalInvoiceValue: vNF,
        },
        notes: `Importado via XML em ${new Date().toLocaleDateString('pt-BR')}`,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Falha ao analisar arquivo XML: ${err.message || 'Erro desconhecido'}`,
    };
  }
}

// Exemplos realistas de XML NF-e brasileira para demonstração instantânea
export const SAMPLE_NFE_XML_1 = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe35260912345678000199550010000458921123456789" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>12345678</cNF>
        <natOp>Venda de Mercadorias para Revenda</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>45892</nNF>
        <dhEmi>2026-09-18T10:30:00-03:00</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
      </ide>
      <emit>
        <CNPJ>12.345.678/0001-99</CNPJ>
        <xNome>DISTRIBUIDORA BRASIL DE MATERIAIS S.A.</xNome>
        <xFant>Brasil Distribuidora</xFant>
        <enderEmit>
          <xLgr>Avenida das Indústrias</xLgr>
          <nro>1500</nro>
          <xBairro>Distrito Industrial</xBairro>
          <cMun>3550308</cMun>
          <xMun>São Paulo</xMun>
          <UF>SP</UF>
          <CEP>04567000</CEP>
        </enderEmit>
        <IE>114885740112</IE>
        <CRT>3</CRT>
      </emit>
      <dest>
        <CNPJ>98.765.432/0001-10</CNPJ>
        <xNome>COMERCIO E LOGISTICA CENTRAL LTDA</xNome>
        <enderDest>
          <xMun>Campinas</xMun>
          <UF>SP</UF>
        </enderDest>
        <IE>244990112884</IE>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>MAT-101</cProd>
          <cEAN>7891000123456</cEAN>
          <xProd>Papel Sulfite A4 75g Pacote 500 Folhas</xProd>
          <NCM>48025610</NCM>
          <CFOP>5102</CFOP>
          <uCom>PCT</uCom>
          <qCom>50.0000</qCom>
          <vUnCom>24.5000</vUnCom>
          <vProd>1225.00</vProd>
          <uTrib>PCT</uTrib>
          <qTrib>50.0000</qTrib>
          <vUnTrib>24.5000</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS>
            <ICMS00>
              <orig>0</orig>
              <CST>00</CST>
              <vBC>1225.00</vBC>
              <pICMS>18.00</pICMS>
              <vICMS>220.50</vICMS>
            </ICMS00>
          </ICMS>
          <PIS>
            <PISAliq>
              <CST>01</CST>
              <vBC>1225.00</vBC>
              <pPIS>1.65</pPIS>
              <vPIS>20.21</vPIS>
            </PISAliq>
          </PIS>
          <COFINS>
            <COFINSAliq>
              <CST>01</CST>
              <vBC>1225.00</vBC>
              <pCOFINS>7.60</pCOFINS>
              <vCOFINS>93.10</vCOFINS>
            </COFINSAliq>
          </COFINS>
        </imposto>
      </det>
      <det nItem="2">
        <prod>
          <cProd>MAT-205</cProd>
          <cEAN>7891000789012</cEAN>
          <xProd>Fita Adesiva Transparente 45mm x 100m</xProd>
          <NCM>39191000</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>120.0000</qCom>
          <vUnCom>5.8000</vUnCom>
          <vProd>696.00</vProd>
          <uTrib>UN</uTrib>
          <qTrib>120.0000</qTrib>
          <vUnTrib>5.8000</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS>
            <ICMS00>
              <orig>0</orig>
              <CST>00</CST>
              <vBC>696.00</vBC>
              <pICMS>18.00</pICMS>
              <vICMS>125.28</vICMS>
            </ICMS00>
          </ICMS>
        </imposto>
      </det>
      <det nItem="3">
        <prod>
          <cProd>MAT-309</cProd>
          <cEAN>7891000345678</cEAN>
          <xProd>Caixa de Papelão Ondulado Reforçada 40x30x25cm</xProd>
          <NCM>48191000</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>200.0000</qCom>
          <vUnCom>4.2000</vUnCom>
          <vProd>840.00</vProd>
          <uTrib>UN</uTrib>
          <qTrib>200.0000</qTrib>
          <vUnTrib>4.2000</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS>
            <ICMS00>
              <orig>0</orig>
              <CST>00</CST>
              <vBC>840.00</vBC>
              <pICMS>18.00</pICMS>
              <vICMS>151.20</vICMS>
            </ICMS00>
          </ICMS>
        </imposto>
      </det>
      <total>
        <ICMSTot>
          <vBC>2761.00</vBC>
          <vICMS>496.98</vICMS>
          <vProd>2761.00</vProd>
          <vFrete>80.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>50.00</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vPIS>20.21</vPIS>
          <vCOFINS>93.10</vCOFINS>
          <vNF>2791.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;

export const SAMPLE_NFE_XML_2 = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe31260945678901000188550020000184431987654321" versao="4.00">
      <ide>
        <cUF>31</cUF>
        <cNF>98765432</cNF>
        <natOp>Venda com Substituicao Tributaria</natOp>
        <mod>55</mod>
        <serie>2</serie>
        <nNF>18443</nNF>
        <dhEmi>2026-09-19T14:15:00-03:00</dhEmi>
        <tpNF>1</tpNF>
      </ide>
      <emit>
        <CNPJ>45.678.901/0001-88</CNPJ>
        <xNome>METALURGICA E PECAS INDUSTRIAIS DO VALE LTDA</xNome>
        <xFant>Vale Peças</xFant>
        <enderEmit>
          <xLgr>Rodovia Presidente Dutra</xLgr>
          <nro>Km 142</nro>
          <xMun>São José dos Campos</xMun>
          <UF>SP</UF>
        </enderEmit>
        <IE>645123987000</IE>
      </emit>
      <det nItem="1">
        <prod>
          <cProd>PEC-550</cProd>
          <xProd>Rolamento Blindado 6204 DDU</xProd>
          <NCM>84821010</NCM>
          <CFOP>5405</CFOP>
          <uCom>UN</uCom>
          <qCom>35.0000</qCom>
          <vUnCom>48.0000</vUnCom>
          <vProd>1680.00</vProd>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <cProd>LUB-890</cProd>
          <xProd>Graxa Sintetica de Alta Performance Pote 1kg</xProd>
          <NCM>27101999</NCM>
          <CFOP>5405</CFOP>
          <uCom>KG</uCom>
          <qCom>15.0000</qCom>
          <vUnCom>85.0000</vUnCom>
          <vProd>1275.00</vProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vProd>2955.00</vProd>
          <vFrete>0.00</vFrete>
          <vDesc>0.00</vDesc>
          <vNF>2955.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;
