import { AuthUser, AuthSession, LoginCredentials, UserRole } from '../types/auth';

const STORAGE_KEYS = {
  USERS: 'lordlub_auth_users_v2',
  SESSION: 'lordlub_auth_session_v2',
};

// Usuários iniciais de demonstração (Seed Users)
export const DEFAULT_USERS: AuthUser[] = [
  {
    id: 'user-admin-1',
    name: 'Administrador do Sistema',
    email: 'admin@empresa.com',
    role: 'ADMIN',
    status: 'ATIVO',
    password: 'admin123',
    department: 'Diretoria / TI',
    createdAt: '2026-01-15T08:00:00.000Z',
    lastLogin: '2026-10-02T09:00:00.000Z',
  },
  {
    id: 'user-standard-1',
    name: 'Carlos Silva (Operador)',
    email: 'usuario@empresa.com',
    role: 'STANDARD',
    status: 'ATIVO',
    password: 'user123',
    department: 'Almoxarifado & Estoque',
    createdAt: '2026-03-10T10:30:00.000Z',
    lastLogin: '2026-10-01T14:22:00.000Z',
  },
  {
    id: 'user-standard-2',
    name: 'Mariana Souza (Gerente)',
    email: 'gerente@empresa.com',
    role: 'ADMIN',
    status: 'ATIVO',
    password: 'gerente123',
    department: 'Faturamento & Vendas',
    createdAt: '2026-04-05T09:15:00.000Z',
    lastLogin: '2026-09-30T17:45:00.000Z',
  },
];

/**
 * Retorna todos os usuários cadastrados
 */
export function getStoredUsers(): AuthUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  } catch (err) {
    console.error('Erro ao ler usuários do storage:', err);
    return DEFAULT_USERS;
  }
}

/**
 * Salva a lista de usuários no localStorage
 */
export function saveStoredUsers(users: AuthUser[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  } catch (err) {
    console.error('Erro ao salvar usuários no storage:', err);
  }
}

/**
 * Obtém a sessão de autenticação atual
 */
export function getStoredAuthSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (!session || !session.user || !session.user.id) return null;

    // Verificar se o usuário ainda existe e continua ATIVO
    const allUsers = getStoredUsers();
    const existing = allUsers.find(u => u.id === session.user.id);
    if (!existing || existing.status === 'INATIVO') {
      clearAuthSession();
      return null;
    }

    return existing;
  } catch (err) {
    console.error('Erro ao ler sessão de autenticação:', err);
    return null;
  }
}

/**
 * Salva a sessão ativa no localStorage
 */
export function saveAuthSession(user: AuthUser, token?: string): void {
  try {
    const sessionToken = token || `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const session: AuthSession = {
      user,
      token: sessionToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
    };
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  } catch (err) {
    console.error('Erro ao salvar sessão:', err);
  }
}

/**
 * Encerra a sessão ativa (Logout)
 */
export function clearAuthSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  } catch (err) {
    console.error('Erro ao remover sessão:', err);
  }
}

/**
 * Realiza autenticação do usuário (Login)
 */
export function loginUser(credentials: LoginCredentials): {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
} {
  const emailOrUser = credentials.emailOrUser.trim().toLowerCase();
  const password = credentials.password.trim();

  if (!emailOrUser) {
    return { success: false, error: 'Por favor, informe seu e-mail ou nome de usuário.' };
  }
  if (!password) {
    return { success: false, error: 'Por favor, digite sua senha de acesso.' };
  }

  const users = getStoredUsers();

  // Permite login por e-mail completo ou pelo prefixo antes do @
  const user = users.find(u => {
    const userEmail = u.email.toLowerCase();
    const usernamePrefix = userEmail.split('@')[0];
    return userEmail === emailOrUser || usernamePrefix === emailOrUser;
  });

  if (!user) {
    return {
      success: false,
      error: 'E-mail ou usuário não encontrado. Verifique as credenciais digitadas.',
    };
  }

  // Validação de senha
  if (user.password !== password) {
    return {
      success: false,
      error: 'Senha incorreta. Verifique se o teclado está em maiúsculas.',
    };
  }

  // Validação de status ativo
  if (user.status === 'INATIVO') {
    return {
      success: false,
      error: 'Acesso bloqueado: Este usuário está inativo no sistema. Contate um administrador.',
    };
  }

  // Atualizar lastLogin
  const now = new Date().toISOString();
  user.lastLogin = now;
  saveStoredUsers(users);

  // Gerar sessão
  const token = `jwt_mock_${user.id}_${Date.now()}`;
  saveAuthSession(user, token);

  return {
    success: true,
    user,
    token,
  };
}

/**
 * Cadastra um novo usuário no sistema
 */
export function addUser(params: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status?: 'ATIVO' | 'INATIVO';
  department?: string;
}): { success: boolean; user?: AuthUser; error?: string } {
  const name = params.name.trim();
  const email = params.email.trim().toLowerCase();
  const password = params.password.trim();
  const role = params.role || 'STANDARD';
  const status = params.status || 'ATIVO';

  if (!name || name.length < 3) {
    return { success: false, error: 'O nome completo deve ter no mínimo 3 caracteres.' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return { success: false, error: 'Informe um endereço de e-mail válido (ex: usuario@empresa.com).' };
  }

  if (!password || password.length < 4) {
    return { success: false, error: 'A senha inicial deve conter pelo menos 4 caracteres.' };
  }

  const users = getStoredUsers();

  // Verificar se o e-mail já está em uso
  const existing = users.find(u => u.email.toLowerCase() === email);
  if (existing) {
    return { success: false, error: `O e-mail "${email}" já está cadastrado para outro usuário.` };
  }

  const newUser: AuthUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name,
    email,
    password,
    role,
    status,
    department: params.department?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  const updatedUsers = [newUser, ...users];
  saveStoredUsers(updatedUsers);

  return { success: true, user: newUser };
}

/**
 * Atualiza os dados de um usuário
 */
export function updateUser(
  id: string,
  data: Partial<Pick<AuthUser, 'name' | 'email' | 'password' | 'role' | 'status' | 'department'>>,
  currentUserId?: string
): { success: boolean; user?: AuthUser; error?: string } {
  const users = getStoredUsers();
  const index = users.findIndex(u => u.id === id);

  if (index === -1) {
    return { success: false, error: 'Usuário não encontrado.' };
  }

  const existing = users[index];

  // Se alterou e-mail, verificar duplicidade
  if (data.email && data.email.trim().toLowerCase() !== existing.email.toLowerCase()) {
    const newEmail = data.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return { success: false, error: 'Informe um e-mail válido.' };
    }
    const duplicate = users.find(u => u.id !== id && u.email.toLowerCase() === newEmail);
    if (duplicate) {
      return { success: false, error: `O e-mail "${newEmail}" já pertence a outro usuário.` };
    }
  }

  // Proteção: não permitir que o único ADMIN deixe de ser ADMIN ou fique inativo
  const isTargetAdmin = existing.role === 'ADMIN';
  const willRemainAdmin = data.role ? data.role === 'ADMIN' : isTargetAdmin;
  const willRemainActive = data.status ? data.status === 'ATIVO' : existing.status === 'ATIVO';

  if (isTargetAdmin && (!willRemainAdmin || !willRemainActive)) {
    const otherActiveAdmins = users.filter(u => u.id !== id && u.role === 'ADMIN' && u.status === 'ATIVO');
    if (otherActiveAdmins.length === 0) {
      return {
        success: false,
        error: 'Operação negada: O sistema deve ter pelo menos um Administrador ativo.',
      };
    }
  }

  const updatedUser: AuthUser = {
    ...existing,
    name: data.name !== undefined ? data.name.trim() : existing.name,
    email: data.email !== undefined ? data.email.trim().toLowerCase() : existing.email,
    role: data.role !== undefined ? data.role : existing.role,
    status: data.status !== undefined ? data.status : existing.status,
    department: data.department !== undefined ? data.department.trim() : existing.department,
    password: data.password && data.password.trim() ? data.password.trim() : existing.password,
    updatedAt: new Date().toISOString(),
  };

  users[index] = updatedUser;
  saveStoredUsers(users);

  // Se o usuário atualizado for o usuário logado, atualizar a sessão ativa
  const currentSession = getStoredAuthSession();
  if (currentSession && currentSession.id === id) {
    saveAuthSession(updatedUser);
  }

  return { success: true, user: updatedUser };
}

/**
 * Alterna o status do usuário entre ATIVO e INATIVO
 */
export function toggleUserStatus(
  id: string,
  currentUserId?: string
): { success: boolean; user?: AuthUser; error?: string } {
  const users = getStoredUsers();
  const user = users.find(u => u.id === id);

  if (!user) {
    return { success: false, error: 'Usuário não encontrado.' };
  }

  if (currentUserId && user.id === currentUserId) {
    return {
      success: false,
      error: 'Você não pode inativar o seu próprio usuário enquanto estiver conectado.',
    };
  }

  const newStatus = user.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';

  // Se for inativar um admin, checar se restam outros admins ativos
  if (user.role === 'ADMIN' && newStatus === 'INATIVO') {
    const activeAdmins = users.filter(u => u.id !== id && u.role === 'ADMIN' && u.status === 'ATIVO');
    if (activeAdmins.length === 0) {
      return {
        success: false,
        error: 'Não é possível inativar este usuário, pois ele é o único administrador ativo do sistema.',
      };
    }
  }

  user.status = newStatus;
  user.updatedAt = new Date().toISOString();
  saveStoredUsers(users);

  return { success: true, user };
}

/**
 * Exclui um usuário do sistema
 */
export function deleteUser(
  id: string,
  currentUserId?: string
): { success: boolean; error?: string } {
  const users = getStoredUsers();
  const user = users.find(u => u.id === id);

  if (!user) {
    return { success: false, error: 'Usuário não encontrado.' };
  }

  if (currentUserId && user.id === currentUserId) {
    return {
      success: false,
      error: 'Você não pode excluir sua própria conta enquanto estiver conectado.',
    };
  }

  if (user.role === 'ADMIN') {
    const activeAdmins = users.filter(u => u.id !== id && u.role === 'ADMIN' && u.status === 'ATIVO');
    if (activeAdmins.length === 0) {
      return {
        success: false,
        error: 'Não é possível excluir o único administrador ativo do sistema.',
      };
    }
  }

  const filtered = users.filter(u => u.id !== id);
  saveStoredUsers(filtered);

  return { success: true };
}

/**
 * Restaura usuários de demonstração
 */
export function resetUsersDemo(): void {
  saveStoredUsers(DEFAULT_USERS);
}
