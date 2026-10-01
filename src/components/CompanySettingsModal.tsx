import React, { useState, useRef } from 'react';
import { CompanySettings, saveStoredCompanySettings, resetStoredCompanySettings, DEFAULT_COMPANY_SETTINGS } from '../utils/companySettings';
import {
  Building2,
  X,
  Upload,
  RotateCcw,
  CheckCircle2,
  Image as ImageIcon,
  Building,
  FileText,
  Phone,
  Mail,
  MapPin,
  Sparkles
} from 'lucide-react';

interface CompanySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: CompanySettings;
  onSave: (updated: CompanySettings) => void;
}

export const CompanySettingsModal: React.FC<CompanySettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSave,
}) => {
  const [form, setForm] = useState<CompanySettings>({ ...currentSettings });
  const [previewError, setPreviewError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 3MB for localStorage base64)
    if (file.size > 3 * 1024 * 1024) {
      alert('Por favor, selecione uma imagem de até 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Result = event.target?.result as string;
      if (base64Result) {
        setForm((prev) => ({
          ...prev,
          logoUrl: base64Result,
        }));
        setPreviewError(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetToDefaultLogo = () => {
    setForm((prev) => ({
      ...prev,
      logoUrl: DEFAULT_COMPANY_SETTINGS.logoUrl,
    }));
    setPreviewError(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredCompanySettings(form);
    onSave(form);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Building2 className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Dados da Empresa & Logotipo
              </h2>
              <p className="text-xs text-indigo-200">
                Personalize o logo e informações que aparecem no cabeçalho, recibos e relatórios
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Seção do Logotipo */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                Logotipo da Empresa
              </label>
              <button
                type="button"
                onClick={handleResetToDefaultLogo}
                className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-medium transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restaurar Logo Padrão
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Preview Box */}
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-2xl bg-white border-2 border-indigo-200 shadow-sm flex items-center justify-center overflow-hidden p-2">
                  {!previewError && form.logoUrl ? (
                    <img
                      src={form.logoUrl}
                      alt="Logo da Empresa"
                      referrerPolicy="no-referrer"
                      onError={() => setPreviewError(true)}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 rounded-lg">
                      <ImageIcon className="w-6 h-6 mb-1 text-slate-400" />
                      <span className="text-[10px] font-medium">Sem Logo</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Actions */}
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/png, image/jpeg, image/webp, image/svg+xml"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    Carregar Novo Logotipo
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Formatos recomendados: PNG transparente, JPG ou SVG (proporção quadrada ou retangular, até 3MB).
                </p>
                <p className="text-[11px] text-slate-400">
                  O logotipo será exibido automaticamente no menu superior, nos comprovantes de vale, espelho de ponto e relatórios.
                </p>
              </div>
            </div>
          </div>

          {/* Dados Cadastrais */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-4 h-4 text-indigo-600" />
              Identificação Cadastral
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Razão Social *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: AUTO PEÇAS & DISTRIBUIDORA LTDA"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Nome Fantasia
                </label>
                <input
                  type="text"
                  value={form.tradeName}
                  onChange={(e) => setForm({ ...form, tradeName: e.target.value })}
                  placeholder="Ex: GESTOR PEÇAS & SERVIÇOS"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  CNPJ *
                </label>
                <input
                  type="text"
                  required
                  value={form.cnpj}
                  onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                  placeholder="00.000.000/0001-00"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Inscrição Estadual (IE)
                </label>
                <input
                  type="text"
                  value={form.stateRegistration || ''}
                  onChange={(e) => setForm({ ...form, stateRegistration: e.target.value })}
                  placeholder="Ex: 123.456.789.110"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={form.phone || ''}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(00) 0000-0000"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  E-mail de Contato
                </label>
                <input
                  type="email"
                  value={form.email || ''}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contato@empresa.com.br"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  value={form.address || ''}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Rua, Número, Bairro, Complemento"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Cidade / UF
                </label>
                <input
                  type="text"
                  value={form.cityState || ''}
                  onChange={(e) => setForm({ ...form, cityState: e.target.value })}
                  placeholder="Ex: São Paulo - SP"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>

            <div className="flex items-center gap-2">
              {isSuccess && (
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Salvo com sucesso!
                </span>
              )}
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
