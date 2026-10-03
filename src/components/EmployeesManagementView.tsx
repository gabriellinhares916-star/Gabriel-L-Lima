import React, { useState, useEffect } from 'react';
import { Employee, TimePunch } from '../types';
import {
  calculateEmployeeMonthlyTimesheet,
  exportConsolidatedTimeClockCSV,
  getCurrentCompetenceMonth,
  formatCompetenceMonth,
  getTimeClockAvailableMonths
} from '../utils/timeClockStorage';
import { EditEmployeeModal } from './EditEmployeeModal';
import { DepartmentManagerModal } from './DepartmentManagerModal';
import { getStoredDepartments } from '../utils/departmentStorage';
import {
  Users,
  UserPlus,
  Search,
  FileSpreadsheet,
  Clock,
  Briefcase,
  Building,
  Building2,
  KeyRound,
  Eye,
  CheckCircle,
  X,
  Edit3,
  Trash2,
  AlertTriangle,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  UserX,
  Plus
} from 'lucide-react';

interface EmployeesManagementViewProps {
  employees: Employee[];
  punches: TimePunch[];
  onAddNewEmployee: (employee: Omit<Employee, 'id'>) => void;
  onUpdateEmployee?: (employee: Employee) => void;
  onDeleteEmployee?: (employeeId: string) => void;
  onSelectEmployeeForMirror: (employeeId: string) => void;
  onSelectEmployeeForPunch: (employeeId: string) => void;
  isOpenAddModalExternally?: boolean;
  onCloseExternalAddModal?: () => void;
  selectedCompetenceMonth?: string;
  onChangeCompetenceMonth?: (month: string) => void;
}

export const EmployeesManagementView: React.FC<EmployeesManagementViewProps> = ({
  employees,
  punches,
  onAddNewEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onSelectEmployeeForMirror,
  onSelectEmployeeForPunch,
  isOpenAddModalExternally = false,
  onCloseExternalAddModal,
  selectedCompetenceMonth,
  onChangeCompetenceMonth,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  const realCurrentMonth = React.useMemo(() => getCurrentCompetenceMonth(), []);
  const [competenceMonth, setCompetenceMonth] = useState<string>(() => selectedCompetenceMonth || realCurrentMonth);

  React.useEffect(() => {
    if (selectedCompetenceMonth && selectedCompetenceMonth !== competenceMonth) {
      setCompetenceMonth(selectedCompetenceMonth);
    }
  }, [selectedCompetenceMonth]);

  const handleCompetenceChange = (m: string) => {
    setCompetenceMonth(m);
    if (onChangeCompetenceMonth) {
      onChangeCompetenceMonth(m);
    }
  };

  const availableMonths = React.useMemo(() => {
    return getTimeClockAvailableMonths(punches);
  }, [punches]);

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Departamentos dinâmicos (Cadastrar e Excluir)
  const [availableDepartments, setAvailableDepartments] = useState<string[]>(getStoredDepartments);
  const [isDeptManagerOpen, setIsDeptManagerOpen] = useState<boolean>(false);

  // Form states
  const [name, setName] = useState<string>('');
  const [registrationNumber, setRegistrationNumber] = useState<string>('');
  const [cpf, setCpf] = useState<string>('');
  const [role, setRole] = useState<string>('Auxiliar de Almoxarifado');
  const [department, setDepartment] = useState<string>(() => {
    const list = getStoredDepartments();
    return list[0] || 'Oficina Mecânica';
  });
  const [workShift, setWorkShift] = useState<string>('Segunda a Sábado (Seg a Sex: 8h líquidas | Sáb: 4h líquidas - 44h)');
  const [dailyHoursExpected, setDailyHoursExpected] = useState<number>(8.0);
  const [pin, setPin] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [hourlyRate, setHourlyRate] = useState<number>(20.0);
  const [admissionDate, setAdmissionDate] = useState<string>(new Date().toISOString().substring(0, 10));

  // Sincronizar abertura do modal disparada externamente
  useEffect(() => {
    if (isOpenAddModalExternally) {
      handleOpenAddModal();
      if (onCloseExternalAddModal) {
        onCloseExternalAddModal();
      }
    }
  }, [isOpenAddModalExternally]);

  const allDepartments = Array.from(new Set([...availableDepartments, ...employees.map(e => e.department).filter(Boolean)]));

  const handleOpenAddModal = () => {
    const nextMatricula = `MAT-${1000 + employees.length + 1}`;
    const randomPin = String(Math.floor(1000 + Math.random() * 9000));
    const depts = getStoredDepartments();
    setAvailableDepartments(depts);
    setRegistrationNumber(nextMatricula);
    setPin(randomPin);
    setName('');
    setCpf('');
    setRole('Mecânico');
    setDepartment(depts[0] || 'Oficina Mecânica');
    setWorkShift('Segunda a Sábado (Seg a Sex: 8h líquidas | Sáb: 4h líquidas - 44h)');
    setDailyHoursExpected(8.0);
    setPhone('');
    setEmail('');
    setHourlyRate(20.0);
    setAdmissionDate(new Date().toISOString().substring(0, 10));
    setShowAddModal(true);
  };

  const generateRandomPin = () => {
    const randomPin = String(Math.floor(1000 + Math.random() * 9000));
    setPin(randomPin);
  };

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
      .trim()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');

    onAddNewEmployee({
      registrationNumber: registrationNumber.trim() || `MAT-${1000 + employees.length + 1}`,
      name: name.trim(),
      cpf: cpf.trim() || '000.000.000-00',
      role: role.trim() || 'Colaborador',
      department: department || 'Almoxarifado & Estoque',
      workShift: workShift.trim() || '08:00 às 17:00 (Segunda a Sexta)',
      dailyHoursExpected: Number(dailyHoursExpected) || 8.0,
      pin: pin.trim() || '1234',
      admissionDate: admissionDate || new Date().toISOString().substring(0, 10),
      status: 'ATIVO',
      avatarInitials: initials || 'CO',
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      hourlyRate: Number(hourlyRate) || 20.0,
    });

    setShowAddModal(false);
  };

  const handleConfirmDelete = () => {
    if (!employeeToDelete || !onDeleteEmployee) return;
    onDeleteEmployee(employeeToDelete.id);
    setEmployeeToDelete(null);
  };

  const handleExportConsolidated = () => {
    exportConsolidatedTimeClockCSV(employees, punches, competenceMonth);
  };

  const presetShifts = [
    {
      label: 'Seg a Sáb (Seg-Sex: 8h | Sáb: 4h líquidas - 44h)',
      shiftText: 'Segunda a Sábado (Seg a Sex: 8h líquidas | Sáb: 4h líquidas - 44h)',
      hours: 8.0,
      highlight: true,
    },
    { label: '08:00 às 17:00 (Seg a Sex)', shiftText: '08:00 às 17:00 (Seg a Sex)', hours: 8.0 },
    { label: '07:30 às 17:18 (Seg a Sex - 44h)', shiftText: '07:30 às 17:18 (Seg a Sex - 44h)', hours: 8.8 },
    { label: '07:00 às 16:00 (Seg a Sex)', shiftText: '07:00 às 16:00 (Seg a Sex)', hours: 8.0 },
    { label: '12x36 Diurno (07:00 às 19:00)', shiftText: '12x36 Diurno (07:00 às 19:00)', hours: 12.0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header com Filtros & Ações */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Gestão de Colaboradores & Equipe
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                {employees.length} cadastrados
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cadastro e exclusão de funcionários, jornadas contratuais, PINs de registro de ponto e acompanhamento do banco de horas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {employees.length > 0 && (
              <button
                onClick={handleExportConsolidated}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Exportar Banco Geral</span>
              </button>
            )}

            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cadastrar Colaborador</span>
            </button>
          </div>
        </div>

        {/* Barra de Busca e Filtros de Departamento e Competência (Mês) */}
        {employees.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, matrícula, cargo ou CPF..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Todos os Departamentos ({employees.length})</option>
                {allDepartments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={competenceMonth}
                onChange={(e) => handleCompetenceChange(e.target.value)}
                className="w-full px-3 py-2 bg-indigo-50/60 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
              >
                {availableMonths.map(m => (
                  <option key={m.value} value={m.value}>
                    Competência: {m.label} {m.isCurrent ? '⭐ (Mês Atual)' : m.isSubsequent ? '➡️ (Subsequente)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Caso sem nenhum colaborador cadastrado no sistema */}
      {employees.length === 0 && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
            <UserX className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              Nenhum colaborador cadastrado
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Você pode cadastrar novos colaboradores com matrícula, cargo, departamento, jornada de trabalho e PIN individual para registro de ponto eletrônico.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Cadastrar Primeiro Colaborador</span>
          </button>
        </div>
      )}

      {/* Caso existam colaboradores, mas a busca não retorne nada */}
      {employees.length > 0 && filteredEmployees.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            Nenhum colaborador encontrado
          </h3>
          <p className="text-xs text-slate-500">
            Nenhum registro confere com os termos da busca "{searchTerm}".
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedDept('ALL');
            }}
            className="px-4 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
          >
            Limpar filtros de busca
          </button>
        </div>
      )}

      {/* Grid de Cards dos Funcionários */}
      {filteredEmployees.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map(emp => {
            const summary = calculateEmployeeMonthlyTimesheet(emp, competenceMonth, punches);
            const isPositive = summary.bankBalanceHours >= 0;
            const employeePunchCount = punches.filter(p => p.employeeId === emp.id).length;

            return (
              <div
                key={emp.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4 relative group"
              >
                <div>
                  {/* Header do Card com Avatar e Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                        {emp.avatarInitials || emp.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-slate-900 leading-tight truncate" title={emp.name}>
                          {emp.name}
                        </h3>
                        <p className="text-xs text-indigo-700 font-semibold mt-0.5 truncate" title={emp.role}>
                          {emp.role}
                        </p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase shrink-0">
                      {emp.status}
                    </span>
                  </div>

                  {/* Detalhes de Registro & Jornada */}
                  <div className="mt-4 space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Matrícula:</span>
                      <strong className="text-slate-800 font-mono">{emp.registrationNumber}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Departamento:</span>
                      <span className="font-medium text-slate-800">{emp.department}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Jornada:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[180px]" title={emp.workShift}>
                        {emp.workShift}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-slate-400 flex items-center gap-1">
                        <KeyRound className="w-3 h-3 text-slate-400" />
                        PIN Ponto:
                      </span>
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {emp.pin}
                      </span>
                    </div>
                  </div>

                  {/* Indicadores de Banco de Horas no Mês */}
                  <div className="grid grid-cols-2 gap-2 mt-3 text-center">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                        Trabalhadas ({competenceMonth.substring(5)}/{competenceMonth.substring(2, 4)})
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

                {/* Ações Rápidas: Ponto, Espelho, Editar, Excluir */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                  <button
                    onClick={() => onSelectEmployeeForPunch(emp.id)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Bater ponto com este colaborador"
                  >
                    <Clock className="w-3 h-3" />
                    <span>Ponto</span>
                  </button>

                  <button
                    onClick={() => onSelectEmployeeForMirror(emp.id)}
                    className="flex-1 py-1.5 px-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Ver espelho de ponto e relatório mensal"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Espelho</span>
                  </button>

                  <button
                    onClick={() => setEditingEmployee(emp)}
                    title="Editar dados cadastrais e jornada"
                    className="py-1.5 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3 text-indigo-600" />
                    <span className="hidden sm:inline">Editar</span>
                  </button>

                  {onDeleteEmployee && (
                    <button
                      onClick={() => setEmployeeToDelete(emp)}
                      title={`Excluir colaborador ${emp.name}`}
                      className="py-1.5 px-2.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-400 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3 text-rose-500" />
                      <span className="hidden sm:inline text-rose-600 font-bold">Excluir</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Colaborador */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Excluir Colaborador
                </h3>
                <p className="text-xs text-slate-500">
                  Confirmação de remoção de funcionário
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Nome:</span>
                <strong className="text-slate-900">{employeeToDelete.name}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Matrícula:</span>
                <span className="font-mono font-bold text-slate-700">{employeeToDelete.registrationNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Cargo:</span>
                <span className="font-medium text-slate-800">{employeeToDelete.role}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Departamento:</span>
                <span className="font-medium text-slate-800">{employeeToDelete.department}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">Batidas registradas:</span>
                <span className="font-bold text-indigo-700">
                  {punches.filter(p => p.employeeId === employeeToDelete.id).length} registros vinculados
                </span>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 leading-relaxed">
              <strong>Atenção:</strong> Ao confirmar a exclusão, todos os dados cadastrais deste colaborador e todo o histórico de batidas de ponto e banco de horas vinculados a ele serão permanentemente apagados do sistema.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEmployeeToDelete(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Excluir Colaborador</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Colaborador */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-scale-in">
            {/* Cabeçalho do Modal */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-400" />
                  Cadastrar Novo Colaborador
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Preencha as informações do funcionário e configure a jornada de ponto eletrônico.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="p-6 space-y-4 text-xs">
              {/* Nome Completo */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nome Completo do Colaborador *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: João Victor Silva Santos"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Matrícula e CPF */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Matrícula Interna *
                  </label>
                  <input
                    type="text"
                    required
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Cargo e Departamento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Cargo / Função *
                  </label>
                  <input
                    type="text"
                    required
                    list="roleSuggestions"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Ex: Almoxarife Líder"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                  <datalist id="roleSuggestions">
                    <option value="Almoxarife Líder" />
                    <option value="Conferente de NF-e & Entrada" />
                    <option value="Operador de Empilhadeira" />
                    <option value="Auxiliar de Estoque & Separação" />
                    <option value="Analista de Inventário & Faturamento" />
                    <option value="Motorista de Entregas" />
                    <option value="Assistente de Logística" />
                  </datalist>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">
                      Departamento *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsDeptManagerOpen(true)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Cadastrar novo departamento ou excluir existente"
                    >
                      <Building2 className="w-3 h-3 text-indigo-600" />
                      <span>+ Cadastrar / Excluir</span>
                    </button>
                  </div>
                  <select
                    value={department}
                    onChange={(e) => {
                      if (e.target.value === '__MANAGE__') {
                        setIsDeptManagerOpen(true);
                      } else {
                        setDepartment(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    {availableDepartments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                    <option value="__MANAGE__" className="text-indigo-600 font-bold bg-indigo-50">
                      ⚙️ Gerenciar Departamentos (Cadastrar / Excluir)...
                    </option>
                  </select>
                </div>
              </div>

              {/* Jornada e Carga Horária */}
              <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700">
                    Jornada Contratual & Carga Horária
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Horas previstas por dia útil
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={workShift}
                      onChange={(e) => setWorkShift(e.target.value)}
                      placeholder="Ex: Segunda a Sábado (Seg a Sex: 8h líquidas | Sáb: 4h líquidas - 44h)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="24"
                      value={dailyHoursExpected}
                      onChange={(e) => setDailyHoursExpected(parseFloat(e.target.value) || 8.0)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-mono font-bold"
                      title="Horas diárias previstas (ex: 8.0)"
                    />
                  </div>
                </div>

                {/* Atalhos de jornadas padrão */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {presetShifts.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setWorkShift(preset.shiftText || preset.label);
                        setDailyHoursExpected(preset.hours);
                      }}
                      className={`px-2.5 py-1 rounded-lg border text-[10px] font-semibold transition-colors cursor-pointer ${
                        preset.highlight
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold'
                          : 'bg-white hover:bg-indigo-50 hover:text-indigo-600 border-slate-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Aviso informativo de jornada Seg a Sáb */}
                {(workShift.toLowerCase().includes('sáb') || workShift.toLowerCase().includes('sab')) && (
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>Jornada Seg a Sáb ativa: <strong>8 horas líquidas</strong> (Segunda a Sexta) e <strong>4 horas líquidas</strong> no sábado (Total: 44h semanais).</span>
                  </div>
                )}
              </div>

              {/* PIN do Relógio e Data de Admissão */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">
                      PIN Relógio (4 a 6 dígitos) *
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPin}
                      className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      Gerar PIN
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="1234"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-indigo-700 bg-indigo-50/30"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Data de Admissão
                  </label>
                  <input
                    type="date"
                    value={admissionDate}
                    onChange={(e) => setAdmissionDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
              </div>

              {/* Telefone e E-mail */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Telefone / Celular
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-8888"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    E-mail Corporativo
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@empresa.com.br"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Botões do Rodapé */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Cadastrar Colaborador</span>
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
          onDelete={(id) => {
            if (onDeleteEmployee) {
              onDeleteEmployee(id);
            }
          }}
        />
      )}

      {/* Modal de Gerenciamento de Departamentos (Cadastrar e Excluir) */}
      <DepartmentManagerModal
        isOpen={isDeptManagerOpen}
        onClose={() => setIsDeptManagerOpen(false)}
        employees={employees}
        currentDepartment={department}
        onSelectDepartment={(deptName) => setDepartment(deptName)}
        onDepartmentsChange={(newDepts) => setAvailableDepartments(newDepts)}
      />
    </div>
  );
};
