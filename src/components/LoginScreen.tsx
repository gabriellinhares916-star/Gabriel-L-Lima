import React, { useState } from 'react';
import { AuthUser, UserRole } from '../types/auth';
import { supabaseSignIn, supabaseSignUp } from '../utils/supabaseClient';
import { CompanySettings } from '../utils/companySettings';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  AlertCircle,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Sparkles,
  Edit2,
  Database,
  ArrowRight
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
  // Modo ativo: 'login' (Entrar) ou 'signup' (Cadastrar)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Campos de Login
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);

  // Campos de Cadastro
  const [signupName, setSignupName] = useState<string>('');
  const [signupEmail, setSignupEmail] = useState<string>('');
  const [signupPassword, setSignupPassword] = useState<string>('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState<string>('');
  const [showSignupPassword, setShowSignupPassword] = useState<boolean>(false);
  const [signupRole, setSignupRole] = useState<UserRole>('ADMIN');
  const [signupDepartment, setSignupDepartment] = useState<string>('Diretoria / Gestão');

  // Estados de feedback
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [logoLoadError, setLogoLoadError] = useState<boolean>(false);

  // Modal para personalizar o link da logo
  const [isEditingLogo, setIsEditingLogo] = useState<boolean>(false);
  const [tempLogoUrl, setTempLogoUrl] = useState<string>(companySettings.logoUrl || '');

  // Submissão do Login Real Supabase Auth
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const email = loginEmail.trim();
    const password = loginPassword.trim();

    if (!email) {
      setErrorMessage('Por favor, informe seu e-mail cadastrado no Supabase.');
      return;
    }

    if (!password) {
      setErrorMessage('Por favor, digite sua senha de acesso.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await supabaseSignIn(email, password);
      setIsLoading(false);

      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMessage(res.error || 'Falha ao autenticar no Supabase Auth.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Erro inesperado na conexão com Supabase Auth.');
    }
  };

  // Submissão do Cadastro Real no Supabase Auth
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const name = signupName.trim();
    const email = signupEmail.trim();
    const password = signupPassword.trim();
    const confirmPassword = signupConfirmPassword.trim();

    if (!name || name.length < 3) {
      setErrorMessage('Informe o nome completo (mínimo 3 caracteres).');
      return;
    }

    if (!email || !email.includes('@')) {
      setErrorMessage('Informe um e-mail válido para o cadastro no Supabase.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('A senha deve ter no mínimo 6 caracteres (padrão de segurança Supabase).');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await supabaseSignUp({
        name,
        email,
        password,
        role: signupRole,
        department: signupDepartment,
      });

      setIsLoading(false);

      if (res.success) {
        if (res.user && !res.needsEmailConfirmation) {
          // Já iniciou sessão automaticamente
          onLoginSuccess(res.user);
        } else {
          // Criado na tabela auth.users, aguardando confirmação ou pronto para login
          setSuccessNotice(
            res.message ||
              'Usuário criado com sucesso na tabela auth.users do Supabase! Você já pode realizar o login.'
          );
          setLoginEmail(email);
          setLoginPassword(password);
          setAuthMode('login');
        }
      } else {
        setErrorMessage(res.error || 'Falha ao criar usuário no Supabase Auth.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Erro inesperado ao cadastrar usuário no Supabase.');
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
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Card Centralizado de Autenticação */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/80 p-7 sm:p-9 relative z-10 transition-all">
        
        {/* Logotipo e Cabeçalho da Empresa */}
        <div className="flex flex-col items-center justify-center text-center mb-6">
          <div className="relative group p-2 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs mb-3 flex items-center justify-center min-w-[140px] min-h-[60px]">
            {!logoLoadError && companySettings.logoUrl ? (
              <img
                src={companySettings.logoUrl}
                alt="Logo da Empresa"
                onError={() => setLogoLoadError(true)}
                className="h-12 w-auto max-w-[200px] object-contain transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 text-indigo-700 font-black text-lg tracking-tight">
                <Building2 className="w-6 h-6 text-indigo-600" />
                <span>{companySettings.tradeName || 'LORD LUB'}</span>
              </div>
            )}

            {onUpdateLogo && (
              <button
                type="button"
                onClick={() => {
                  setTempLogoUrl(companySettings.logoUrl || '');
                  setIsEditingLogo(true);
                }}
                title="Configurar imagem da logo da empresa"
                className="absolute -top-2 -right-2 p-1.5 rounded-full bg-white text-slate-500 hover:text-indigo-600 border border-slate-200 shadow-xs transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              {authMode === 'login' ? 'Portal de Acesso' : 'Criar Conta no Supabase'}
            </h1>
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              <Database className="w-2.5 h-2.5 text-emerald-600" />
              <span>Supabase Auth</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {authMode === 'login'
              ? 'Entre com e-mail e senha registrados no Supabase'
              : 'Cadastre um novo usuário oficial na tabela auth.users'}
          </p>
        </div>

        {/* Alternador de Abas: Login / Cadastro */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-5 border border-slate-200/80">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMessage(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'login'
                ? 'bg-white text-indigo-900 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Entrar</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setErrorMessage(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'signup'
                ? 'bg-white text-indigo-900 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Cadastrar</span>
          </button>
        </div>

        {/* Mensagem de Sucesso (Ex: Cadastro Concluído) */}
        {successNotice && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-emerald-900 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="block font-bold">Sucesso:</strong>
              {successNotice}
            </div>
          </div>
        )}

        {/* Mensagem de Erro com Alerta Visual */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-900 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="block font-bold">Falha no Supabase Auth:</strong>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Formulário 1: LOGIN (Entrar com Supabase Auth) */}
        {authMode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                E-mail de Acesso *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  autoFocus
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="ex: seu-email@empresa.com"
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Senha *
                </label>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Sua senha do Supabase"
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  title={showLoginPassword ? 'Ocultar senha' : 'Exibir senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Autenticando no Supabase...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Entrar com Supabase Auth</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Formulário 2: CADASTRO (Novo Usuário no Supabase Auth) */}
        {authMode === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                value={signupName}
                onChange={(e) => {
                  setSignupName(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="ex: Gabriel Linhares"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-600 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Perfil de Acesso
                </label>
                <select
                  value={signupRole}
                  onChange={(e) => setSignupRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs font-semibold focus:bg-white"
                >
                  <option value="ADMIN">Administrador (Total)</option>
                  <option value="STANDARD">Operador / Padrão</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Departamento
                </label>
                <input
                  type="text"
                  value={signupDepartment}
                  onChange={(e) => setSignupDepartment(e.target.value)}
                  placeholder="Setor/Área"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs font-medium focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                E-mail Oficial *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={signupEmail}
                  onChange={(e) => {
                    setSignupEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="usuario@empresa.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-600 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Senha (min. 6) *
                </label>
                <div className="relative">
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    required
                    value={signupPassword}
                    onChange={(e) => {
                      setSignupPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Mínimo 6 dígitos"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs font-medium focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirmar Senha *
                </label>
                <input
                  type={showSignupPassword ? 'text' : 'password'}
                  required
                  value={signupConfirmPassword}
                  onChange={(e) => {
                    setSignupConfirmPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Repita a senha"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs font-medium focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Criando no Supabase Auth...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Cadastrar no Supabase (auth.users)</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Rodapé informativo */}
        <div className="mt-6 pt-4 border-t border-slate-200/90 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sessão persistente criptografada com JWT Supabase</span>
          </div>
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
              Cole o link (URL) da imagem da logo para exibição no cabeçalho e na tela de login.
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
