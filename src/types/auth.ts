// Tipos para Autenticação e Controle de Acesso de Usuários (RBAC)

export type UserRole = 'ADMIN' | 'STANDARD';

export interface AuthUser {
  id: string;
  name: string; // Nome Completo
  email: string; // E-mail institucional ou de acesso
  role: UserRole; // 'ADMIN' (Administrador) | 'STANDARD' (Usuário Padrão)
  status: 'ATIVO' | 'INATIVO'; // Permite inativar ou ativar o acesso
  password?: string; // Senha (hash ou senha inicial para demonstração)
  avatarUrl?: string; // Foto de perfil ou placeholder
  department?: string; // Departamento ou setor
  createdAt: string; // Data de criação (ISO)
  updatedAt?: string; // Data da última atualização (ISO)
  lastLogin?: string; // Data e hora do último acesso
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: string;
}

export interface LoginCredentials {
  emailOrUser: string;
  password: string;
}
