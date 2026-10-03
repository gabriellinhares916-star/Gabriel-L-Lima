import React, { useState, useMemo } from 'react';
import { AuthUser, UserRole } from '../types/auth';
import {
  getStoredUsers,
  addUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  resetUsersDemo,
} from '../utils/authStorage';
import {
  UserCog,
  UserPlus,
  Search,
  ShieldCheck,
  User,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Building,
  KeyRound,
  Calendar,
  Clock,
  Shield,
  Filter,
  Check,
  X,
  Power
} from 'lucide-react';

interface UserManagementViewProps {
  currentUser: AuthUser;
  onUpdateCurrentUser?: (user: AuthUser) => void;
  onNotify?: (msg: string) => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  currentUser,
  onUpdateCurrentUser,
  onNotify,
}) => {
  const [users, setUsers] = useState<AuthUser[]>(getStoredUsers);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modais
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [viewingUser, setViewingUser] = useState<AuthUser | null>(null);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AuthUser | null>(null);

  // Form states para Cadastro
  const [addName, setAddName] = useState<string>('');
  const [addEmail, setAddEmail] = useState<string>('');
  const [addPassword, setAddPassword] = useState<string>('');
  const [addShowPassword, setAddShowPassword] = useState<boolean>(false);
  const [addRole, setAddRole] = useState<UserRole>('STANDARD');
  const [addDepartment, setAddDepartment] = useState<string>('Almoxarifado & Estoque');
  const [addError, setAddError] = useState<string | null>(null);

  // Form states para Edição
  const [editName, setEditName] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editPassword, setEditPassword] = useState<string>('');
  const [editShowPassword, setEditShowPassword] = useState<boolean>(false);
  const [editRole, setEditRole] = useState<UserRole>('STANDARD');
  const [editStatus, setEditStatus] = useState<'ATIVO' | 'INATIVO'>('ATIVO');
  const [editDepartment, setEditDepartment] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);

  // Recarregar usuários do storage
  const reloadUsers = () => {
    const list = getStoredUsers();
    setUsers(list);
  };

  // Filtragem dos usuários
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchStatus = statusFilter === 'ALL' || u.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Métricas rápidas
  const totalCount = users.length;
  const adminCount = users.filter(u => u.role === 'ADMIN').length;
  const standardCount = users.filter(u => u.role === 'STANDARD').length;
  const activeCount = users.filter(u => u.status === 'ATIVO').length;

  // Abrir modal de cadastro limpo
  const handleOpenAdd = () => {
    setAddName('');
    setAddEmail('');
    setAddPassword('');
    setAddRole('STANDARD');
    setAddDepartment('Almoxarifado & Estoque');
    setAddShowPassword(false);
    setAddError(null);
    setIsAddModalOpen(true);
  };

  // Submeter cadastro
  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const res = addUser({
      name: addName,
      email: addEmail,
      password: addPassword,
      role: addRole,
      department: addDepartment,
      status: 'ATIVO',
    });

    if (res.success && res.user) {
      reloadUsers();
      setIsAddModalOpen(false);
      if (onNotify) onNotify(`Usuário "${res.user.name}" cadastrado com sucesso!`);
    } else {
      setAddError(res.error || 'Erro ao cadastrar usuário.');
    }
  };

  // Abrir modal de edição
  const handleOpenEdit = (user: AuthUser) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword('');
    setEditRole(user.role);
    setEditStatus(user.status);
    setEditDepartment(user.department || '');
    setEditShowPassword(false);
    setEditError(null);
  };

  // Submeter edição
  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);

    const res = updateUser(
      editingUser.id,
      {
        name: editName,
        email: editEmail,
        password: editPassword ? editPassword : undefined,
        role: editRole,
        status: editStatus,
        department: editDepartment,
      },
      currentUser.id
    );

    if (res.success && res.user) {
      reloadUsers();
      if (currentUser.id === res.user.id && onUpdateCurrentUser) {
        onUpdateCurrentUser(res.user);
      }
      setEditingUser(null);
      if (onNotify) onNotify(`Dados do usuário "${res.user.name}" atualizados com sucesso!`);
    } else {
      setEditError(res.error || 'Erro ao atualizar dados do usuário.');
    }
  };

  // Alternar status Ativo / Inativo
  const handleToggleStatus = (user: AuthUser) => {
    const res = toggleUserStatus(user.id, currentUser.id);
    if (res.success && res.user) {
      reloadUsers();
      if (currentUser.id === res.user.id && onUpdateCurrentUser) {
        onUpdateCurrentUser(res.user);
      }
      if (onNotify) {
        const actionText = res.user.status === 'ATIVO' ? 'ativado' : 'inativado';
        onNotify(`O acesso de "${res.user.name}" foi ${actionText}.`);
      }
    } else {
      alert(res.error || 'Não foi possível alterar o status do usuário.');
    }
  };

  // Confirmar exclusão
  const handleConfirmDelete = () => {
    if (!deletingUser) return;
    const res = deleteUser(deletingUser.id, currentUser.id);
    if (res.success) {
      reloadUsers();
      setDeletingUser(null);
      if (onNotify) onNotify(`Usuário excluído com sucesso.`);
    } else {
      alert(res.error || 'Erro ao excluir usuário.');
      setDeletingUser(null);
    }
  };

  // Formatar data em PT-BR
  const formatDateBR = (isoString?: string) => {
    if (!isoString) return 'Nunca';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Hero Header do Módulo */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Controle de Acesso & Segurança (RBAC)
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Gestão de Usuários
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Controle de contas, permissões de acesso (Administrador ou Usuário Padrão), bloqueio de credenciais e histórico de login do sistema.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cadastrar Novo Usuário</span>
            </button>
          </div>
        </div>

        {/* Efeito visual de fundo */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards Rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total de Contas
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {totalCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Cadastros no sistema
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
              Administradores
            </span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-700 mt-2">
            {adminCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Acesso irrestrito
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Usuários Padrão
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <UserCog className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-700 mt-2">
            {standardCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Operadores & Consultas
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Usuários Ativos
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            {activeCount} de {totalCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Com permissão de login
          </span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Busca por texto */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome completo, e-mail ou setor..."
              className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-600 placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro de Perfil */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Todos os Perfis ({users.length})</option>
                <option value="ADMIN">Apenas Administradores</option>
                <option value="STANDARD">Apenas Usuários Padrão</option>
              </select>
            </div>

            {/* Filtro de Status */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1">
              <Power className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Todos os Status</option>
                <option value="ATIVO">Apenas Ativos</option>
                <option value="INATIVO">Apenas Inativos</option>
              </select>
            </div>

            {(searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('ALL');
                  setStatusFilter('ALL');
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold px-2 py-1 cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">Usuário</th>
                <th className="py-3.5 px-4">Perfil / Nível</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Setor / Departamento</th>
                <th className="py-3.5 px-4 hidden lg:table-cell">Último Acesso</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <UserCog className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Nenhum usuário encontrado</p>
                    <p className="text-xs text-slate-400 mt-0.5">Tente ajustar seus termos de busca ou filtros.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrent = user.id === currentUser.id;
                  const isAdmin = user.role === 'ADMIN';
                  const isActive = user.status === 'ATIVO';

                  // Iniciais para o avatar
                  const initials = user.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(p => p[0].toUpperCase())
                    .join('');

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !isActive ? 'opacity-70 bg-slate-50/40' : ''
                      }`}
                    >
                      {/* Usuário (Avatar, Nome e E-mail) */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                            isAdmin
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {initials || 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 truncate">
                                {user.name}
                              </span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black shrink-0">
                                  Você
                                </span>
                              )}
                            </div>
                            <span className="text-slate-500 font-mono text-[11px] block truncate">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Perfil de Acesso */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          isAdmin
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          <Shield className="w-3 h-3" />
                          <span>{isAdmin ? 'Administrador' : 'Usuário Padrão'}</span>
                        </span>
                      </td>

                      {/* Status de Acesso */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span>{user.status}</span>
                        </span>
                      </td>

                      {/* Departamento */}
                      <td className="py-3.5 px-4 hidden md:table-cell text-slate-600">
                        {user.department || 'Geral'}
                      </td>

                      {/* Último Acesso */}
                      <td className="py-3.5 px-4 hidden lg:table-cell text-slate-500 text-[11px]">
                        {formatDateBR(user.lastLogin)}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Visualizar */}
                          <button
                            type="button"
                            onClick={() => setViewingUser(user)}
                            title="Visualizar detalhes do usuário"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Editar */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            title="Editar dados e permissões"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Inativar / Ativar */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            disabled={isCurrent}
                            title={
                              isCurrent
                                ? 'Você não pode inativar sua própria conta'
                                : isActive
                                ? 'Inativar acesso deste usuário'
                                : 'Ativar acesso deste usuário'
                            }
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              isActive
                                ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
                                : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                            }`}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          {/* Excluir */}
                          <button
                            type="button"
                            onClick={() => setDeletingUser(user)}
                            disabled={isCurrent}
                            title={
                              isCurrent
                                ? 'Você não pode excluir sua própria conta'
                                : 'Excluir usuário do sistema'
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: FORMULÁRIO DE CADASTRO DE NOVO USUÁRIO                           */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-scaleIn">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Cadastrar Novo Usuário
                  </h3>
                  <p className="text-xs text-slate-500">
                    Preencha os dados e defina o perfil de acesso
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {addError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitAdd} className="space-y-4">
              
              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="ex: João da Silva"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* E-mail */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-mail de Acesso *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="ex: joao@empresa.com"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Senha Inicial */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Senha Inicial *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={addShowPassword ? 'text' : 'password'}
                    required
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    placeholder="Mínimo de 4 caracteres"
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setAddShowPassword(!addShowPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {addShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Perfil / Nível de Acesso */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Perfil / Nível de Acesso *
                  </label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  >
                    <option value="STANDARD">Usuário Padrão</option>
                    <option value="ADMIN">Administrador (Total)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Setor / Departamento
                  </label>
                  <input
                    type="text"
                    value={addDepartment}
                    onChange={(e) => setAddDepartment(e.target.value)}
                    placeholder="ex: Almoxarifado"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                <strong>Nota sobre perfis:</strong> Administradores podem gerenciar usuários, cadastros gerais e configurações. Usuários Padrão têm acesso às operações do dia a dia.
              </div>

              {/* Ações */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Cadastrar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDITAR DADOS E PERMISSÕES DO USUÁRIO                             */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-scaleIn">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Editar Usuário
                  </h3>
                  <p className="text-xs text-slate-500">
                    Atualize dados cadastrais, cargo, status e senha
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitEdit} className="space-y-4">
              
              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                />
              </div>

              {/* E-mail */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-mail de Acesso *
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                />
              </div>

              {/* Nova Senha (Opcional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nova Senha (deixe em branco para não alterar)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    type={editShowPassword ? 'text' : 'password'}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Digite apenas se quiser redefinir a senha"
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setEditShowPassword(!editShowPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {editShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Perfil e Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Perfil / Nível de Acesso *
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  >
                    <option value="STANDARD">Usuário Padrão</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status da Conta *
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'ATIVO' | 'INATIVO')}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  >
                    <option value="ATIVO">🟢 Ativo (Permitido)</option>
                    <option value="INATIVO">🔴 Inativo (Bloqueado)</option>
                  </select>
                </div>
              </div>

              {/* Departamento */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Setor / Departamento
                </label>
                <input
                  type="text"
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                />
              </div>

              {/* Ações */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: VISUALIZAR DETALHES COMPLETOS DO USUÁRIO                         */}
      {/* ========================================================================= */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-scaleIn">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                Ficha do Usuário
              </h3>
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Cabeçalho do Card */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-xs">
                {viewingUser.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-slate-900 text-base leading-tight truncate">
                  {viewingUser.name}
                </h4>
                <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                  {viewingUser.email}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    viewingUser.role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {viewingUser.role === 'ADMIN' ? 'Administrador' : 'Usuário Padrão'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    viewingUser.status === 'ATIVO'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {viewingUser.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Lista de Atributos */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="text-slate-500">ID do Usuário:</span>
                <span className="font-mono text-slate-800 text-[11px]">{viewingUser.id}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="text-slate-500">Setor / Departamento:</span>
                <span className="font-semibold text-slate-800">{viewingUser.department || 'Não informado'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="text-slate-500">Data de Cadastro:</span>
                <span className="font-semibold text-slate-800">{formatDateBR(viewingUser.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="text-slate-500">Último Login Registrado:</span>
                <span className="font-semibold text-slate-800">{formatDateBR(viewingUser.lastLogin)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  const target = viewingUser;
                  setViewingUser(null);
                  handleOpenEdit(target);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                Editar Este Usuário
              </button>
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CONFIRMAÇÃO DE EXCLUSÃO DE USUÁRIO                               */}
      {/* ========================================================================= */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-scaleIn">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 text-base">
                Excluir Acesso do Usuário?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Você tem certeza que deseja remover o usuário <strong>{deletingUser.name}</strong> ({deletingUser.email})? Esta ação é irreversível e impedirá futuros acessos ao sistema.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Sim, Excluir Acesso
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
