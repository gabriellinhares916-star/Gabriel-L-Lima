// Gerenciamento de Departamentos do Sistema (Ponto Eletrônico & Gestão)
const STORAGE_KEY = 'lordlub_departments_v1';

export const DEFAULT_DEPARTMENTS: string[] = [
  'Oficina Mecânica',
  'Alinhamento & Balanceamento',
  'Troca de Óleo & Lubrificação',
  'Almoxarifado & Estoque',
  'Recebimento Fiscal',
  'Estoque & Logística',
  'Expedição & Armazém',
  'Faturamento & Controle',
  'Administrativo'
];

/**
 * Obtém a lista atualizada de departamentos
 */
export function getStoredDepartments(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DEPARTMENTS));
      return DEFAULT_DEPARTMENTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(d => String(d).trim()).filter(Boolean);
    }
    return DEFAULT_DEPARTMENTS;
  } catch (err) {
    console.error('Erro ao ler departamentos do localStorage:', err);
    return DEFAULT_DEPARTMENTS;
  }
}

/**
 * Salva a lista de departamentos
 */
export function saveStoredDepartments(departments: string[]): void {
  try {
    const clean = Array.from(new Set(departments.map(d => d.trim()).filter(Boolean)));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch (err) {
    console.error('Erro ao salvar departamentos:', err);
  }
}

/**
 * Cadastra um novo departamento
 */
export function addStoredDepartment(departmentName: string): { success: boolean; departments: string[]; error?: string } {
  const name = departmentName.trim();
  if (!name) {
    return { success: false, departments: getStoredDepartments(), error: 'O nome do departamento não pode ser vazio.' };
  }

  const current = getStoredDepartments();
  const exists = current.some(d => d.toLowerCase() === name.toLowerCase());
  if (exists) {
    return { success: false, departments: current, error: `O departamento "${name}" já está cadastrado.` };
  }

  const updated = [...current, name];
  saveStoredDepartments(updated);
  return { success: true, departments: updated };
}

/**
 * Exclui um departamento existente
 */
export function deleteStoredDepartment(departmentName: string): { success: boolean; departments: string[]; error?: string } {
  const name = departmentName.trim();
  const current = getStoredDepartments();
  
  if (current.length <= 1) {
    return { success: false, departments: current, error: 'O sistema deve manter pelo menos um departamento cadastrado.' };
  }

  const updated = current.filter(d => d.toLowerCase() !== name.toLowerCase());
  if (updated.length === current.length) {
    return { success: false, departments: current, error: 'Departamento não encontrado para exclusão.' };
  }

  saveStoredDepartments(updated);
  return { success: true, departments: updated };
}

/**
 * Restaura lista padrão de departamentos
 */
export function resetDepartmentsToDefault(): string[] {
  saveStoredDepartments(DEFAULT_DEPARTMENTS);
  return DEFAULT_DEPARTMENTS;
}
