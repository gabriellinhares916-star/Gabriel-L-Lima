import React, { useState } from 'react';
import { Employee, TimePunch, PunchType } from '../types';
import { ClockInTerminal } from './ClockInTerminal';
import { TimesheetMirrorView } from './TimesheetMirrorView';
import { EmployeesManagementView } from './EmployeesManagementView';
import {
  Clock,
  FileSpreadsheet,
  Users,
  Calendar,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Building,
  UserCheck,
  History
} from 'lucide-react';
import { exportConsolidatedTimeClockCSV } from '../utils/timeClockStorage';

interface TimeClockDashboardProps {
  employees: Employee[];
  punches: TimePunch[];
  onRegisterPunch: (params: {
    employeeId: string;
    type?: PunchType;
    customTime?: string;
    customDate?: string;
    notes?: string;
  }) => { success: boolean; punch?: TimePunch; error?: string };
  onAddNewEmployee: (employee: Omit<Employee, 'id'>) => void;
  onUpdateEmployee?: (employee: Employee) => void;
  onUpdateDayPunches?: (params: {
    employeeId: string;
    date: string;
    entry1?: string;
    exit1?: string;
    entry2?: string;
    exit2?: string;
    notes?: string;
  }) => void;
  onClearDayPunches?: (employeeId: string, date: string) => void;
}

export const TimeClockDashboard: React.FC<TimeClockDashboardProps> = ({
  employees,
  punches,
  onRegisterPunch,
  onAddNewEmployee,
  onUpdateEmployee,
  onUpdateDayPunches,
  onClearDayPunches,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'terminal' | 'mirror' | 'employees'>('terminal');
  const [selectedEmployeeForMirror, setSelectedEmployeeForMirror] = useState<string>(employees[0]?.id || '');

  const todayStr = new Date().toISOString().substring(0, 10);
  const punchesToday = punches.filter(p => p.date === todayStr);
  const uniqueEmployeesToday = new Set(punchesToday.map(p => p.employeeId)).size;

  const currentMonthStr = '2026-09';

  const handleNavigateToMirrorWithEmployee = (employeeId: string) => {
    setSelectedEmployeeForMirror(employeeId);
    setActiveSubTab('mirror');
  };

  const handleNavigateToPunchWithEmployee = (employeeId: string) => {
    setSelectedEmployeeForMirror(employeeId);
    setActiveSubTab('terminal');
  };

  return (
    <div className="space-y-6">
      {/* Hero Header do Módulo de Ponto Eletrônico */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Controle de Ponto Portaria 671 / CLT • Banco de Horas
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Controle de Ponto de Funcionários
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Terminal eletrônico de registro de ponto digital, apuração de espelho mensal, controle do banco de horas e gestão de operadores de estoque e conferência.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => exportConsolidatedTimeClockCSV(employees, punches, currentMonthStr)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all border border-white/10 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar Banco Geral (CSV)</span>
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
              Colaboradores Ativos
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {employees.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Almoxarifado & Logística
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Presentes Hoje
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            {uniqueEmployeesToday} de {employees.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {punchesToday.length} batidas no dia
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Competência Ativa
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">
            Setembro / 2026
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Apuração mensal em curso
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
              Legislação Ponto
            </span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-purple-700 mt-2">
            REP-P 671/MTE
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            NSR sequencial certificado
          </span>
        </div>
      </div>

      {/* Barra de Sub-Navegação do Módulo */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSubTab('terminal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'terminal'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Bater Ponto (Terminal Digital)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('mirror')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'mirror'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Espelho de Ponto & Banco de Horas</span>
        </button>

        <button
          onClick={() => setActiveSubTab('employees')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'employees'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Colaboradores & Equipe ({employees.length})</span>
        </button>
      </div>

      {/* Conteúdo Dinâmico das Sub-Abas */}
      <div>
        {activeSubTab === 'terminal' && (
          <ClockInTerminal
            employees={employees}
            punches={punches}
            onRegisterPunch={onRegisterPunch}
            onNavigateToMirror={handleNavigateToMirrorWithEmployee}
          />
        )}

        {activeSubTab === 'mirror' && (
          <TimesheetMirrorView
            employees={employees}
            punches={punches}
            selectedEmployeeId={selectedEmployeeForMirror}
            onSelectEmployee={setSelectedEmployeeForMirror}
            onNavigateToTerminal={() => setActiveSubTab('terminal')}
            onUpdateDayPunches={onUpdateDayPunches}
            onClearDayPunches={onClearDayPunches}
          />
        )}

        {activeSubTab === 'employees' && (
          <EmployeesManagementView
            employees={employees}
            punches={punches}
            onAddNewEmployee={onAddNewEmployee}
            onUpdateEmployee={onUpdateEmployee}
            onSelectEmployeeForMirror={handleNavigateToMirrorWithEmployee}
            onSelectEmployeeForPunch={handleNavigateToPunchWithEmployee}
          />
        )}
      </div>
    </div>
  );
};
