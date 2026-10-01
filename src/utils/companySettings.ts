// Configurações da Empresa e Logotipo
export interface CompanySettings {
  name: string; // Razão Social
  tradeName: string; // Nome Fantasia
  cnpj: string;
  stateRegistration?: string; // Inscrição Estadual
  phone?: string;
  email?: string;
  address?: string;
  cityState?: string;
  logoUrl: string; // Caminho da imagem ou Data URL base64
}

import defaultLogoAsset from '../assets/images/company_logo_brand_1790814424207.jpg';

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  name: 'GESTÃO LORD LUB',
  tradeName: 'LORD LUB',
  cnpj: '12.345.678/0001-90',
  stateRegistration: '123.456.789.110',
  phone: '(11) 3456-7890',
  email: 'contato@lordlub.com.br',
  address: 'Av. Industrial das Américas, 1500 - Bloco C',
  cityState: 'São Paulo - SP',
  logoUrl: defaultLogoAsset
};

const STORAGE_KEY = 'gestor_nfe_company_settings';

export function getStoredCompanySettings(): CompanySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_COMPANY_SETTINGS));
      return DEFAULT_COMPANY_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    const updated = {
      ...DEFAULT_COMPANY_SETTINGS,
      ...parsed,
      // If still previous default name, update to GESTÃO LORD LUB
      name: (parsed.name && parsed.name.includes('DISTRIBUIDORA')) ? 'GESTÃO LORD LUB' : (parsed.name || DEFAULT_COMPANY_SETTINGS.name),
      tradeName: (parsed.tradeName && parsed.tradeName.includes('GESTOR')) ? 'LORD LUB' : (parsed.tradeName || DEFAULT_COMPANY_SETTINGS.tradeName),
      // If logo is empty or broken, fallback to default
      logoUrl: parsed.logoUrl || DEFAULT_COMPANY_SETTINGS.logoUrl
    };
    return updated;
  } catch (err) {
    console.error('Erro ao ler company settings do storage:', err);
    return DEFAULT_COMPANY_SETTINGS;
  }
}

export function saveStoredCompanySettings(settings: CompanySettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Erro ao salvar company settings no storage:', err);
  }
}

export function resetStoredCompanySettings(): CompanySettings {
  saveStoredCompanySettings(DEFAULT_COMPANY_SETTINGS);
  return DEFAULT_COMPANY_SETTINGS;
}
