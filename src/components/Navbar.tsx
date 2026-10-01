import React from 'react';
import {
  LayoutDashboard,
  FileInput,
  Boxes,
  FileText,
  FileBarChart,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Tag,
  Clock,
  CreditCard
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'dashboard' | 'entry' | 'stock' | 'prices' | 'timeclock' | 'invoices' | 'reports' | 'os_simulation';
  onSelectTab: (tab: 'dashboard' | 'entry' | 'stock' | 'prices' | 'timeclock' | 'invoices' | 'reports' | 'os_simulation') => void;
  onResetDemo: () => void;
  lowStockAlertsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onResetDemo,
  lowStockAlertsCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo & Title */}
          <div
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer select-none shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  Gestor NF-e
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Estoque
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium -mt-0.5">
                Entradas & Relatórios Mensais
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Painel Geral
            </button>

            <button
              onClick={() => onSelectTab('entry')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'entry'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileInput className="w-4 h-4" />
              Entrada de NF-e
            </button>

            <button
              onClick={() => onSelectTab('stock')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all relative ${
                currentTab === 'stock'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Boxes className="w-4 h-4" />
              Estoque
              {lowStockAlertsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => onSelectTab('prices')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'prices'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Tag className="w-4 h-4" />
              Consulta de Preços
            </button>

            <button
              onClick={() => onSelectTab('timeclock')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'timeclock'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-4 h-4" />
              Controle de Ponto
            </button>

            <button
              onClick={() => onSelectTab('invoices')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'invoices'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              Notas Fiscais
            </button>

            <button
              onClick={() => onSelectTab('reports')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'reports'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileBarChart className="w-4 h-4" />
              Relatórios Mensais
            </button>

            <button
              onClick={() => onSelectTab('os_simulation')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'os_simulation'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Simulação de OS Cartão
            </button>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onResetDemo}
              title="Restaurar dados de exemplo do sistema"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-[11px]">Recarregar Dados Demo</span>
            </button>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <div className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              SEFAZ v4.00
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex items-center justify-between overflow-x-auto py-2 border-t border-slate-100 gap-1 text-xs">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium ${
              currentTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-600'
            }`}
          >
            Painel
          </button>
          <button
            onClick={() => onSelectTab('entry')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium ${
              currentTab === 'entry' ? 'bg-indigo-600 text-white' : 'text-slate-600'
            }`}
          >
            Entrada NF-e
          </button>
          <button
            onClick={() => onSelectTab('stock')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium ${
              currentTab === 'stock' ? 'bg-indigo-600 text-white' : 'text-slate-600'
            }`}
          >
            Estoque
          </button>
          <button
            onClick={() => onSelectTab('prices')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium ${
              currentTab === 'prices' ? 'bg-indigo-600 text-white' : 'text-slate-600'
            }`}
          >
            Preços
          </button>
          <button
            onClick={() => onSelectTab('timeclock')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium ${
              currentTab === 'timeclock' ? 'bg-indigo-600 text-white' : 'text-slate-600'
            }`}
          >
            Ponto
          </button>
          <button
            onClick={() => onSelectTab('invoices')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium ${
              currentTab === 'invoices' ? 'bg-indigo-600 text-white' : 'text-slate-600'
            }`}
          >
            Notas
          </button>
          <button
            onClick={() => onSelectTab('reports')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium ${
              currentTab === 'reports' ? 'bg-indigo-600 text-white' : 'text-slate-600'
            }`}
          >
            Relatórios
          </button>
          <button
            onClick={() => onSelectTab('os_simulation')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium ${
              currentTab === 'os_simulation' ? 'bg-indigo-600 text-white' : 'text-slate-600'
            }`}
          >
            Simulação OS Cartão
          </button>
        </div>
      </div>
    </header>
  );
};
