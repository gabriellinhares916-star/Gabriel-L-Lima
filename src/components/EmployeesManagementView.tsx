import React, { useState } from 'react';
import { Employee, TimePunch } from '../types';
import {
  calculateEmployeeMonthlyTimesheet,
  exportConsolidatedTimeClockCSV
} from '../utils/timeClockStorage';
import { EditEmployeeModal } from './EditEmployeeModal';
import {
  Users,
  UserPlus,
  Search,
  FileSpreadsheet,
  Clock,
  Briefcase,
  Building,
  KeyRound,
  Eye,
  CheckCircle,
  X,
  Edit3
} from 'lucide-react';

interface EmployeesManagementViewProps {
  employees: Employee[];
  punches: TimePunch[];
  onAddNewEmployee: (employee: Omit<Employee, 'id'>) => void;
  onUpdateEmployee?: (employee: Employee) => void;
  onSelectEmployeeForMirror: (employeeId: string) => void;
  onSelectEmployeeForPunch: (employeeId: string) => void;
}

export const EmployeesManagementView: React.FC<EmployeesManagementViewProps> = ({
  employees,
  punches,
  onAddNewEmployee,
  onUpdateEmployee,
  onSelectEmployeeForMirror,
  onSelectEmployeeForPunch,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form states
  const [name, setName] = useState<string>('');
  const [registrationNumber, setRegistrationNumber] = useState<string>(`MAT-${1000 + employees.length + 1}`);
  const [cpf, setCpf] = useState<string>('');
  const [role, setRole] = useState<string>('Auxiliar de Almoxarifado');
  const [department, setDepartment] = useState<string>('Almoxarifado & Estoque');
  const [workShift, setWorkShift] = useState<string>('08:00 às 17:00 (Segunda a Sexta)');
  const [dailyHoursExpected, setDailyHoursExpected] = useState<number>(8.0);
  const [pin, setPin] = useState<string>(String(Math.floor(1000 + Math.random() * 9000)));
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  const currentMonthStr = '2026-09';

  const departments = Array.from(new Set(employees.map(e => e.department)));

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.cpf.includes(searchTerm);

    const matchesDept = selectedDept === 'ALL' || emp.department === selectedDept;

    return matchesSearch && matchesDept;
  });

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const initials = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');

    onAddNewEmployee({
      registrationNumber,
      name,
      cpf: cpf || '000.000.000-00',
      role,
      department,
      workShift,
      dailyHoursExpected: Number(dailyHoursExpected),
      pin: pin || '1234',
      admissionDate: new Date().toISOString().substring(0, 10),
      status: 'ATIVO',
      avatarInitials: initials,
      phone,
      email,
    });

    setShowAddModal(false);
    // Reset form
    setName('');
    setCpf('');
    setPhone('');
    setEmail('');
  };

  const handleExportConsolidated = () => {
    exportConsolidatedTimeClockCSV(employees, punches, currentMonthStr);
  };

  return (
    <div className="space-y-6">
      {/* Header com Filtros & Ações */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Gestão de Colaboradores & Equipe
            </h2>
            <p className="text-xs text-slate-500">
              Operadores de estoque, almoxarifes, conferentes de notas fiscais e motoristas com jornada cadastrada.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportConsolidated}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exportar Banco de Horas Geral</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cadastrar Colaborador</span>
            </button>
          </div>
        </div>

        {/* Barra de Busca e Filtro de Departamento */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, matrícula, cargo ou CPF..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Todos os Departamentos ({employees.length})</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid de Cards dos Funcionários */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map(emp => {
          const summary = calculateEmployeeMonthlyTimesheet(emp, currentMonthStr, punches);
          const isPositive = summary.bankBalanceHours >= 0;

          return (
            <div
              key={emp.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Header do Card com Avatar e Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                      {emp.avatarInitials || emp.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 leading-tight">
                        {emp.name}
                      </h3>
                      <p className="text-xs text-indigo-700 font-semibold mt-0.5">
                        {emp.role}
                      </p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase">
                    {emp.status}
                  </span>
                </div>

                {/* Detalhes de Registro & Jornada */}
                <div className="mt-4 space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Matrícula:</span>
                    <strong className="text-slate-800">{emp.registrationNumber}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Departamento:</span>
                    <span className="font-medium text-slate-800">{emp.department}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Jornada Contratual:</span>
                    <span className="font-medium text-slate-800">{emp.workShift}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-slate-400 flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-slate-400" />
                      PIN Ponto Rápido:
                    </span>
                    <span className="font-mono font-bold text-indigo-700">{emp.pin}</span>
                  </div>
                </div>

                {/* Indicadores de Banco de Horas no Mês */}
                <div className="grid grid-cols-2 gap-2 mt-3 text-center">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                      Trabalhadas
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {summary.totalWorkedHours.toFixed(1)}h
                    </span>
                  </div>

                  <div className={`p-2 rounded-lg border ${
                    isPositive ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800' : 'bg-rose-50/50 border-rose-200 text-rose-800'
                  }`}>
                    <span className="text-[10px] block font-semibold uppercase opacity-75">
                      Banco de Horas
                    </span>
                    <span className="text-xs font-bold font-mono">
                      {summary.bankBalanceFormatted}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ações Rápidas */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                <button
                  onClick={() => onSelectEmployeeForPunch(emp.id)}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Clock className="w-3 h-3" />
                  <span>Ponto</span>
                </button>

                <button
                  onClick={() => onSelectEmployeeForMirror(emp.id)}
                  className="flex-1 py-1.5 px-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Eye className="w-3 h-3" />
                  <span>Espelho</span>
                </button>

                <button
                  onClick={() => setEditingEmployee(emp)}
                  title="Editar dados e jornada de horários"
                  className="py-1.5 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3 h-3 text-indigo-600" />
                  <span>Editar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Cadastro de Colaborador */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                Novo Colaborador de Estoque / NF-e
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: João Victor Silva"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Matrícula Interna *
                  </label>
                  <input
                    type="text"
                    required
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cargo / Função *
                  </label>
                  <input
                    type="text"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Ex: Almoxarife"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Departamento *
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Almoxarifado & Estoque">Almoxarifado & Estoque</option>
                    <option value="Recebimento Fiscal">Recebimento Fiscal</option>
                    <option value="Estoque & Logística">Estoque & Logística</option>
                    <option value="Expedição & Armazém">Expedição & Armazém</option>
                    <option value="Faturamento & Controle">Faturamento & Controle</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jornada de Trabalho
                  </label>
                  <input
                    type="text"
                    value={workShift}
                    onChange={(e) => setWorkShift(e.target.value)}
                    placeholder="08:00 às 17:00 (Seg a Sex)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    PIN do Relógio (4 dígitos)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="1234"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Salvar Colaborador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Horário e Cadastro do Colaborador */}
      {editingEmployee && (
        <EditEmployeeModal
          isOpen={!!editingEmployee}
          onClose={() => setEditingEmployee(null)}
          employee={editingEmployee}
          onSave={(updated) => {
            if (onUpdateEmployee) {
              onUpdateEmployee(updated);
            }
          }}
        />
      )}
    </div>
  );
};
