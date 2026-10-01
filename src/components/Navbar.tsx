import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileInput,
  Boxes,
  FileText,
  FileBarChart,
  RotateCcw,
  ShieldCheck,
  Tag,
  Clock,
  Banknote,
  Building2,
  ChevronDown,
  Sparkles,
  Database,
  Receipt
} from 'lucide-react';
import { CompanySettings } from '../utils/companySettings';

interface NavbarProps {
  currentTab: 'dashboard' | 'billing' | 'entry' | 'stock' | 'prices' | 'timeclock' | 'advances' | 'invoices' | 'reports';
  onSelectTab: (tab: 'dashboard' | 'billing' | 'entry' | 'stock' | 'prices' | 'timeclock' | 'advances' | 'invoices' | 'reports') => void;
  onResetDemo: () => void;
  lowStockAlertsCount: number;
  companySettings: CompanySettings;
  onOpenCompanySettings: () => void;
  onOpenSupabaseSync?: () => void;
}

interface NavItem {
  id: 'dashboard' | 'billing' | 'entry' | 'stock' | 'prices' | 'timeclock' | 'advances' | 'invoices' | 'reports';
  label: string;
  icon: React.ElementType;
  badge?: number;
  accent?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onResetDemo,
  lowStockAlertsCount,
  companySettings,
  onOpenCompanySettings,
  onOpenSupabaseSync,
}) => {
  const [logoLoadError, setLogoLoadError] = useState(false);

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'billing', label: 'Faturamento', icon: Receipt, accent: true },
    { id: 'entry', label: 'Entrada NF-e', icon: FileInput },
    {
      id: 'stock',
      label: 'Estoque',
      icon: Boxes,
      badge: lowStockAlertsCount > 0 ? lowStockAlertsCount : undefined
    },
    { id: 'prices', label: 'Preços', icon: Tag },
    { id: 'timeclock', label: 'Ponto', icon: Clock },
    { id: 'advances', label: 'Vales', icon: Banknote },
    { id: 'invoices', label: 'Notas', icon: FileText },
    { id: 'reports', label: 'Relatórios', icon: FileBarChart },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Zone 1: Company Logo & Brand Lockup */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onSelectTab('dashboard')}
              title="Ir para o Painel Geral"
              className="flex items-center gap-2.5 text-left group transition-transform active:scale-98"
            >
              {/* Logo Box with styled container & fallback */}
              <div className="relative w-10 h-10 rounded-xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center overflow-hidden p-1 group-hover:border-indigo-400 group-hover:shadow-sm transition-all">
                {!logoLoadError && companySettings.logoUrl ? (
                  <img
                    src={companySettings.logoUrl}
                    alt={companySettings.tradeName || companySettings.name}
                    referrerPolicy="no-referrer"
                    onError={() => setLogoLoadError(true)}
                    className="w-full h-full object-contain transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
                    {companySettings.tradeName?.charAt(0) || 'G'}
                  </div>
                )}
              </div>

              {/* Company & System Title */}
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {companySettings.tradeName || 'Gestor NF-e'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
                  <span className="truncate max-w-[170px] xl:max-w-[220px]">
                    {companySettings.name}
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {companySettings.cnpj}
                  </span>
                </div>
              </div>
            </button>

            {/* Quick Button to edit Company / Logo */}
            <button
              onClick={onOpenCompanySettings}
              title="Personalizar Logotipo e Informações da Empresa"
              className="hidden lg:flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/80 rounded-md border border-slate-200 hover:border-indigo-200 transition-all cursor-pointer"
            >
              <Building2 className="w-3 h-3 text-indigo-600" />
              <span>Logo & Empresa</span>
            </button>
          </div>

          {/* Zone 2: Navigation Links (Clean Segmented Tabs) */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-indigo-900 shadow-xs border border-slate-200/60 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isActive
                        ? 'text-indigo-600'
                        : item.accent
                        ? 'text-emerald-600'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Actions (Supabase, Demo Reset & SEFAZ Status) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Supabase Sync Button */}
            {onOpenSupabaseSync && (
              <button
                onClick={onOpenSupabaseSync}
                title="Sincronização em Nuvem com Supabase (PostgreSQL)"
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 transition-all cursor-pointer shadow-2xs"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline text-[11px] font-bold">Supabase</span>
              </button>
            )}

            {/* Mobile / Tablet Logo Settings Icon */}
            <button
              onClick={onOpenCompanySettings}
              title="Personalizar Logotipo da Empresa"
              className="lg:hidden p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Building2 className="w-4 h-4 text-indigo-600" />
            </button>

            <button
              onClick={onResetDemo}
              title="Restaurar dados de exemplo do sistema"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xl:inline text-[11px]">Dados Demo</span>
            </button>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 font-semibold font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>SEFAZ 4.00</span>
            </div>
          </div>
        </div>

        {/* Mobile & Tablet Navigation Tabs (Horizontal Scroll with snap) */}
        <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto py-2 border-t border-slate-100 scrollbar-none text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`px-1 rounded-full text-[9px] font-mono ${
                      isActive ? 'bg-white text-indigo-700' : 'bg-amber-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
};
