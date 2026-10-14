import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, X, ChevronDown, ChevronUp, Database, Copy, Check } from 'lucide-react';

export interface SupabaseErrorInfo {
  title: string;
  message: string;
  table?: string;
  details?: string;
  timestamp?: string;
}

interface SupabaseErrorBannerProps {
  error: SupabaseErrorInfo | null;
  onDismiss: () => void;
  onRetry?: () => void;
}

export const SupabaseErrorBanner: React.FC<SupabaseErrorBannerProps> = ({
  error,
  onDismiss,
  onRetry,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!error) return null;

  const handleCopy = () => {
    const text = `[Supabase Error] ${error.title}\nTabela: ${error.table || 'N/A'}\nMensagem: ${error.message}\nDetalhes: ${error.details || 'N/A'}\nData: ${error.timestamp || new Date().toISOString()}`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside
      aria-label="Notificação de Erro do Supabase"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4 animate-slide-down pointer-events-auto"
    >
      <div className="bg-rose-900/95 backdrop-blur-md text-white border-2 border-rose-500 shadow-2xl rounded-2xl p-4 sm:p-5 relative overflow-hidden ring-4 ring-rose-900/30">
        
        {/* Glow de fundo */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3.5">
          {/* Ícone de Alerta */}
          <div className="p-2.5 rounded-xl bg-rose-800/80 border border-rose-600/60 text-rose-200 shrink-0 mt-0.5 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-rose-300 animate-pulse" />
          </div>

          {/* Conteúdo do Erro */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-500/30 text-rose-200 border border-rose-400/40 font-mono">
                Erro de Consulta Supabase
              </span>
              {error.table && (
                <span className="flex items-center gap-1 text-[11px] font-mono text-rose-200 bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-800">
                  <Database className="w-3 h-3 text-rose-400" />
                  <span>tabela: <strong>{error.table}</strong></span>
                </span>
              )}
            </div>

            <h3 className="font-bold text-sm sm:text-base text-white mt-1 leading-snug">
              {error.title}
            </h3>

            <div className="mt-1.5 p-2.5 rounded-lg bg-black/30 border border-rose-700/50 text-rose-100 text-xs font-mono break-words leading-relaxed select-all">
              {error.message}
            </div>

            {/* Detalhes Técnicos Expansíveis */}
            {error.details && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-1 text-[11px] text-rose-300 hover:text-white underline cursor-pointer"
                >
                  <span>{showDetails ? 'Ocultar detalhes técnicos' : 'Ver detalhes técnicos'}</span>
                  {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {showDetails && (
                  <pre className="mt-1.5 p-2 rounded-lg bg-black/50 border border-rose-800/60 text-[11px] font-mono text-rose-200 overflow-x-auto whitespace-pre-wrap">
                    {error.details}
                  </pre>
                )}
              </div>
            )}

            {/* Ações */}
            <div className="flex items-center gap-2.5 mt-3 pt-2 border-t border-rose-800/60">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-rose-900 hover:bg-rose-100 active:scale-95 text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-rose-700" />
                  <span>Tentar Novamente</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-800/80 hover:bg-rose-700 text-rose-200 hover:text-white text-xs font-semibold border border-rose-700 transition-colors cursor-pointer"
                title="Copiar dados do erro para a área de transferência"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Erro'}</span>
              </button>

              <button
                type="button"
                onClick={onDismiss}
                className="ml-auto text-xs text-rose-300 hover:text-white font-medium px-2 py-1 cursor-pointer"
              >
                Dispensar
              </button>
            </div>
          </div>

          {/* Botão Fechar no Canto */}
          <button
            type="button"
            onClick={onDismiss}
            title="Fechar Notificação"
            className="p-1 rounded-lg text-rose-300 hover:text-white hover:bg-rose-800/60 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
