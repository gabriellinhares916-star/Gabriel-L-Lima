import React, { useState, useEffect } from 'react';
import {
  testSupabaseConnection,
  pushFullDatabaseToSupabase,
  SUPABASE_SQL_SCHEMA,
  UPDATE_MIGRATION_SQL,
  MONITORED_TABLES,
  getSanitizedSupabaseUrl,
  ConnectionTestResult,
} from '../utils/supabaseClient';
import {
  Product,
  StockMovement,
  Invoice,
  Employee,
  TimePunch,
  SalaryAdvance,
  BillingRecord,
  ExpenseRecord,
  InvoiceBoleto
} from '../types';
import { CompanySettings } from '../utils/companySettings';
import {
  Database,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Cloud,
  Zap,
  Code,
  Receipt,
  ReceiptText,
  Barcode,
  Layers,
  Sparkles,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    products: Product[];
    movements: StockMovement[];
    invoices: Invoice[];
    employees: Employee[];
    punches: TimePunch[];
    advances: SalaryAdvance[];
    companySettings: CompanySettings;
    billings?: BillingRecord[];
    expenses?: ExpenseRecord[];
    boletos?: InvoiceBoleto[];
  };
  onSyncComplete?: (message: string) => void;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  data,
  onSyncComplete,
}) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    errors?: string[];
    errorDetails?: Record<string, string>;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlEditor, setShowSqlEditor] = useState(false);
  const [sqlMode, setSqlMode] = useState<'UPDATE' | 'ALL'>('UPDATE');

  const supabaseUrl = getSanitizedSupabaseUrl();

  // Testar conexão ao abrir
  useEffect(() => {
    if (isOpen) {
      handleTestConnection();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection();
      setTestResult(res);
    } finally {
      setTesting(false);
    }
  };

  const handlePushData = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await pushFullDatabaseToSupabase(data);
      if (res.success) {
        setSyncResult({
          success: true,
          message: 'Todos os dados locais foram sincronizados com as tabelas do Supabase com sucesso!',
        });
        if (onSyncComplete) {
          onSyncComplete('Dados sincronizados com o Supabase com sucesso!');
        }
      } else {
        setSyncResult({
          success: false,
          message: `Algumas tabelas não puderam ser gravadas (${res.errors.join(', ')}). Execute o Script SQL de Atualização no Supabase para criar as tabelas faltantes.`,
          errors: res.errors,
          errorDetails: res.errorDetails,
        });
      }
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err.message || 'Erro inesperado ao sincronizar com o Supabase.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleCopySql = (script: string) => {
    navigator.clipboard.writeText(script);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const activeScript = sqlMode === 'UPDATE' ? UPDATE_MIGRATION_SQL : SUPABASE_SQL_SCHEMA;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Sincronização Supabase (PostgreSQL)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-semibold">
                  10 Tabelas
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono">
                {supabaseUrl.replace('https://', '')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Card de Status da Conexão e Auditoria das 10 Tabelas */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className={`w-3.5 h-3.5 rounded-full mt-1 sm:mt-0 shrink-0 ${
                  testResult?.success ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      Status da Conexão com o Supabase:
                    </span>
                    {testing ? (
                      <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                        <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
                        Auditando 10 tabelas...
                      </span>
                    ) : testResult?.success ? (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Todas as 10 tabelas ativas ({testResult.latencyMs}ms)
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        {testResult?.activeTablesCount !== undefined
                          ? `${testResult.activeTablesCount} de 10 tabelas ativas`
                          : 'Aguardando teste'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {testResult?.message || 'Verificando a existência e permissões de cada tabela no banco PostgreSQL.'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto transition-colors cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                <span>Testar Conexão</span>
              </button>
            </div>

            {/* Checklist das 10 Tabelas */}
            {testResult?.tablesStatus && (
              <div className="pt-2 border-t border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Auditoria em Tempo Real das Tabelas:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[11px]">
                  {MONITORED_TABLES.map((tbl) => {
                    const isOk = testResult.tablesStatus?.[tbl.key] ?? false;
                    const err = testResult.tablesErrors?.[tbl.key];
                    return (
                      <div
                        key={tbl.key}
                        title={err || 'Tabela conectada e operando normalmente'}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border font-medium transition-all ${
                          isOk
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                            : 'bg-amber-50/90 border-amber-200 text-amber-800'
                        }`}
                      >
                        {isOk ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        )}
                        <span className="truncate">{tbl.label.split('. ')[1]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Resumo dos Dados Locais Prontos para Sincronização */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-indigo-600" />
                Registros Locais Prontos para Sincronização
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Unidade: <strong className="text-slate-900">{data.companySettings.name}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Produtos</span>
                <span className="text-base font-bold font-mono text-slate-900">{data.products.length}</span>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Movimentações</span>
                <span className="text-base font-bold font-mono text-slate-900">{data.movements.length}</span>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Notas Fiscais</span>
                <span className="text-base font-bold font-mono text-slate-900">{data.invoices.length}</span>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Colaboradores</span>
                <span className="text-base font-bold font-mono text-slate-900">{data.employees.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs mt-1.5">
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Pontos (REP-P)</span>
                <span className="text-sm font-bold font-mono text-indigo-900">{data.punches.length}</span>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Vales Salariais</span>
                <span className="text-sm font-bold font-mono text-emerald-800">{data.advances.length}</span>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Faturamento (OS)</span>
                <span className="text-sm font-bold font-mono text-blue-800">{data.billings?.length || 0}</span>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Despesas & Boletos</span>
                <span className="text-sm font-bold font-mono text-amber-800">
                  {(data.expenses?.length || 0) + (data.boletos?.length || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Feedback de Sincronização e Erros Detalhados */}
          {syncResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-2 ${
                syncResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {syncResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <strong className="block text-sm font-bold">
                    {syncResult.success ? 'Sincronização Concluída!' : 'Atenção ao Sincronizar Tabelas'}
                  </strong>
                  <p className="leading-relaxed">{syncResult.message}</p>
                </div>
              </div>

              {/* Detalhes específicos de quais tabelas falharam e por quê */}
              {syncResult.errorDetails && Object.keys(syncResult.errorDetails).length > 0 && (
                <div className="p-3 bg-white/80 rounded-lg border border-amber-200/80 space-y-1.5 text-[11px]">
                  <strong className="text-slate-800 block">Diagnóstico de Erros por Tabela:</strong>
                  <ul className="space-y-1 text-slate-700">
                    {Object.entries(syncResult.errorDetails).map(([tbl, detail]) => (
                      <li key={tbl} className="flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <span>
                          <strong>{tbl}:</strong> {detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopySql(UPDATE_MIGRATION_SQL)}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Script de Atualização e Correção</span>
                    </button>
                    <span className="text-[10px] text-slate-500">
                      Cole no SQL Editor do Supabase para corrigir instantaneamente.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Seção do Script SQL para o Supabase SQL Editor */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <div className="px-4 py-3 bg-slate-100/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800">
                  Script SQL para Supabase (SQL Editor)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-white text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSqlMode('UPDATE')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                      sqlMode === 'UPDATE' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Script de Atualização (Recomendado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSqlMode('ALL')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                      sqlMode === 'ALL' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todas as 10 Tabelas (Do Zero)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopySql(activeScript)}
                  className="px-3 py-1 bg-white hover:bg-slate-50 text-indigo-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Script</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowSqlEditor(!showSqlEditor)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
                >
                  {showSqlEditor ? 'Ocultar' : 'Visualizar'}
                </button>
              </div>
            </div>

            {showSqlEditor && (
              <div className="p-3 bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed">
                <pre>{activeScript}</pre>
              </div>
            )}

            <div className="p-3 text-[11px] text-slate-600 leading-normal bg-indigo-50/50 border-t border-slate-200">
              <strong>Como resolver qualquer erro de tabela no Supabase:</strong> Se alguma tabela estiver ausente (como <code>billings</code>, <code>expenses</code> ou <code>boletos</code>), deixe selecionado <strong>"Script de Atualização (Recomendado)"</strong>, clique em <strong>Copiar Script</strong>, vá no painel do Supabase &rarr; menu lateral <strong>SQL Editor</strong> &rarr; cole e clique no botão verde <strong>RUN</strong>. Este script não apaga nenhum dado e cria todas as tabelas e colunas faltantes!
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={handlePushData}
            disabled={syncing}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Cloud className={`w-4 h-4 ${syncing ? 'animate-bounce' : ''}`} />
            <span>{syncing ? 'Sincronizando 10 Tabelas com Supabase...' : 'Sincronizar Tudo com Supabase Agora'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
