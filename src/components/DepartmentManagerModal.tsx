import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  Users,
  RotateCcw
} from 'lucide-react';
import {
  getStoredDepartments,
  addStoredDepartment,
  deleteStoredDepartment,
  resetDepartmentsToDefault
} from '../utils/departmentStorage';
import { Employee } from '../types';

interface DepartmentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees?: Employee[];
  currentDepartment?: string;
  onSelectDepartment?: (departmentName: string) => void;
  onDepartmentsChange?: (departments: string[]) => void;
}

export const DepartmentManagerModal: React.FC<DepartmentManagerModalProps> = ({
  isOpen,
  onClose,
  employees = [],
  currentDepartment,
  onSelectDepartment,
  onDepartmentsChange,
}) => {
  const [departments, setDepartments] = useState<string[]>(getStoredDepartments);
  const [newDeptName, setNewDeptName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deptToDelete, setDeptToDelete] = useState<string | null>(null);

  if (!isOpen) return null;

  const countEmployeesInDept = (deptName: string) => {
    return employees.filter(e => e.department && e.department.toLowerCase() === deptName.toLowerCase()).length;
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newDeptName.trim()) {
      setErrorMsg('Informe o nome do departamento.');
      return;
    }

    const res = addStoredDepartment(newDeptName.trim());
    if (!res.success) {
      setErrorMsg(res.error || 'Erro ao cadastrar departamento.');
      return;
    }

    setDepartments(res.departments);
    setSuccessMsg(`Departamento "${newDeptName.trim()}" cadastrado com sucesso!`);
    if (onDepartmentsChange) onDepartmentsChange(res.departments);
    if (onSelectDepartment) onSelectDepartment(newDeptName.trim());
    setNewDeptName('');
  };

  const handleDeleteConfirm = () => {
    if (!deptToDelete) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = deleteStoredDepartment(deptToDelete);
    if (!res.success) {
      setErrorMsg(res.error || 'Erro ao excluir departamento.');
      setDeptToDelete(null);
      return;
    }

    setDepartments(res.departments);
    setSuccessMsg(`Departamento "${deptToDelete}" excluído.`);
    if (onDepartmentsChange) onDepartmentsChange(res.departments);
    if (currentDepartment === deptToDelete && onSelectDepartment && res.departments.length > 0) {
      onSelectDepartment(res.departments[0]);
    }
    setDeptToDelete(null);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Deseja restaurar a lista padrão de departamentos?')) {
      const defs = resetDepartmentsToDefault();
      setDepartments(defs);
      if (onDepartmentsChange) onDepartmentsChange(defs);
      setSuccessMsg('Departamentos restaurados para o padrão.');
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300 border border-white/10 shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                Gerenciar Departamentos
              </h3>
              <p className="text-xs text-indigo-200 mt-0.5">
                Cadastre novos setores ou exclua departamentos da empresa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-xs">
          
          {/* Alertas */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Confirmação de Exclusão */}
          {deptToDelete && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">
                    Excluir departamento "{deptToDelete}"?
                  </p>
                  {countEmployeesInDept(deptToDelete) > 0 ? (
                    <p className="text-[11px] text-amber-800">
                      Atenção: há <strong>{countEmployeesInDept(deptToDelete)} colaborador(es)</strong> cadastrado(s) neste departamento. Eles manterão seus cadastros, mas o departamento será removido da lista de seleção.
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-800">
                      Este setor será removido da lista de opções de departamento.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeptToDelete(null)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                >
                  Sim, Excluir Departamento
                </button>
              </div>
            </div>
          )}

          {/* Formulário de Cadastro Rápido */}
          <form onSubmit={handleAdd} className="space-y-2">
            <label className="block font-bold text-slate-800">
              Cadastrar Novo Departamento
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="Ex: Mecânica & Motor, Pintura, Atendimento..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar</span>
              </button>
            </div>
          </form>

          {/* Lista de Departamentos Existentes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">
                Departamentos Cadastrados ({departments.length})
              </span>
              <button
                type="button"
                onClick={handleResetDefaults}
                title="Restaurar lista padrão"
                className="text-[11px] text-slate-400 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar padrão</span>
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/50">
              {departments.map((dept) => {
                const count = countEmployeesInDept(dept);
                const isCurrent = currentDepartment === dept;

                return (
                  <div
                    key={dept}
                    className="p-3 flex items-center justify-between hover:bg-white transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">
                            {dept}
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Atual
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Users className="w-3 h-3" />
                          <span>{count} {count === 1 ? 'colaborador' : 'colaboradores'}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {onSelectDepartment && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectDepartment(dept);
                            onClose();
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        >
                          Selecionar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeptToDelete(dept)}
                        title={`Excluir departamento "${dept}"`}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
