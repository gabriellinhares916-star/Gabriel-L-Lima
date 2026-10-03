import React, { useState } from 'react';
import { AuthUser, LoginCredentials } from '../types/auth';
import { loginUser } from '../utils/authStorage';
import { CompanySettings } from '../utils/companySettings';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Sparkles,
  UserCheck,
  Edit2,
  ExternalLink
} from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
  companySettings: CompanySettings;
  onUpdateLogo?: (newLogoUrl: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  companySettings,
  onUpdateLogo,
}) => {
  const [emailOrUser, setEmailOrUser] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logoLoadError, setLogoLoadError] = useState<boolean>(false);

  // Modal para personalizar o link da logo diretamente
  const [isEditingLogo, setIsEditingLogo] = useState<boolean>(false);
  const [tempLogoUrl, setTempLogoUrl] = useState<string>(companySettings.logoUrl || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validação de campos obrigatórios
    if (!emailOrUser.trim()) {
      setErrorMessage('Por favor, informe seu e-mail ou nome de usuário.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Por favor, digite sua senha de acesso.');
      return;
    }

    setIsLoading(true);

    // Simular pequeno delay de rede para feedback visual
    setTimeout(() => {
      const result = loginUser({
        emailOrUser: emailOrUser.trim(),
        password: password.trim(),
      });

      setIsLoading(false);

      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(result.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
      }
    }, 450);
  };

  // Preenchimento rápido para demonstração e testes
  const handleQuickFill = (role: 'admin' | 'user') => {
    setErrorMessage(null);
    if (role === 'admin') {
      setEmailOrUser('admin@empresa.com');
      setPassword('admin123');
    } else {
      setEmailOrUser('usuario@empresa.com');
      setPassword('user123');
    }
  };

  const handleSaveLogoUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateLogo) {
      onUpdateLogo(tempLogoUrl.trim());
    }
    setLogoLoadError(false);
    setIsEditingLogo(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      
      {/* Elementos visuais de iluminação no fundo */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Card Centralizado de Login */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/80 p-8 sm:p-10 relative z-10 transition-all">
        
        {/* ========================================================================= */}
        {/* ESPAÇO RESERVADO PARA A LOGO DA EMPRESA (COM ELEMENTO <img>)              */}
        {/* Você pode substituir o src abaixo pelo caminho/link da sua logo oficial   */}
        {/* ========================================================================= */}
        <div className="flex flex-col items-center justify-center text-center mb-7">
          <div className="relative group p-2 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs mb-3 flex items-center justify-center min-w-[140px] min-h-[64px]">
            {!logoLoadError && companySettings.logoUrl ? (
              <img
                src={companySettings.logoUrl}
                alt="Logo da Empresa"
                onError={() => setLogoLoadError(true)}
                className="h-14 w-auto max-w-[220px] object-contain transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 text-indigo-700 font-black text-xl tracking-tight">
                <Building2 className="w-7 h-7 text-indigo-600" />
                <span>{companySettings.tradeName || 'SUA EMPRESA'}</span>
              </div>
            )}

            {/* Botão de atalho para configurar o link da logo */}
            {onUpdateLogo && (
              <button
                type="button"
                onClick={() => {
                  setTempLogoUrl(companySettings.logoUrl || '');
                  setIsEditingLogo(true);
                }}
                title="Configurar link/caminho da logo da empresa"
                className="absolute -top-2 -right-2 p-1.5 rounded-full bg-white text-slate-500 hover:text-indigo-600 border border-slate-200 shadow-xs transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-1">
            Portal de Acesso
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Entre com suas credenciais corporativas para acessar o painel
          </p>
        </div>

        {/* Mensagem de Erro com Alerta Visual */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="block font-bold">Falha no Login:</strong>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Formulário de Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Campo: E-mail ou Usuário */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              E-mail ou Usuário *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                autoFocus
                value={emailOrUser}
                onChange={(e) => {
                  setEmailOrUser(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="ex: admin@empresa.com"
                className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Campo: Senha com Ocultar/Exibir */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Senha *
              </label>
              <span className="text-[11px] text-indigo-600 font-semibold cursor-pointer hover:underline">
                Esqueceu a senha?
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Digite sua senha"
                className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Botão de Ação: Entrar */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Entrar no Sistema</span>
              </>
            )}
          </button>
        </form>

        {/* Separador e Atalhos Rápidos para Demonstração */}
        <div className="mt-6 pt-5 border-t border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center mb-3">
            Acessos Rápidos de Demonstração
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('admin')}
              className="px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-left"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>Administrador</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('user')}
              className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-left"
            >
              <UserCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>Usuário Padrão</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-2.5">
            Admin: <code>admin@empresa.com</code> • Senha: <code>admin123</code>
          </p>
        </div>

        {/* Rodapé de Segurança */}
        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Conexão Segura & Controle de Acesso Portaria 671 / CLT</span>
        </div>
      </div>

      {/* Modal para Trocar o Link/Caminho da Logo */}
      {isEditingLogo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Configurar Logo da Empresa
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingLogo(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Cole o link (URL) ou caminho da imagem da sua logo. O elemento <code>&lt;img&gt;</code> será atualizado imediatamente no topo da tela de login e no cabeçalho do sistema.
            </p>

            <form onSubmit={handleSaveLogoUrl} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  URL da Logo (HTTPS ou caminho relativo)
                </label>
                <input
                  type="text"
                  value={tempLogoUrl}
                  onChange={(e) => setTempLogoUrl(e.target.value)}
                  placeholder="https://suaempresa.com/logo.png"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              {/* Preview */}
              {tempLogoUrl && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                  <img
                    src={tempLogoUrl}
                    alt="Prévia da Logo"
                    onError={() => {}}
                    className="max-h-16 max-w-full object-contain"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingLogo(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer shadow-xs"
                >
                  Salvar Logo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
