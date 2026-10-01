import React, { useState, useMemo } from 'react';
import { Employee, TimePunch, MonthlyTimeSheetSummary, DailyTimeSheet } from '../types';
import { CompanySettings, getStoredCompanySettings } from '../utils/companySettings';
import {
  calculateEmployeeMonthlyTimesheet,
  exportIndividualTimesheetCSV
} from '../utils/timeClockStorage';
import { EditDayPunchesModal } from './EditDayPunchesModal';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Clock,
  User,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Building2,
  Edit3,
  PlusCircle,
  HelpCircle
} from 'lucide-react';

interface TimesheetMirrorViewProps {
  employees: Employee[];
  punches: TimePunch[];
  selectedEmployeeId?: string;
  onSelectEmployee: (id: string) => void;
  onNavigateToTerminal: () => void;
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

export const TimesheetMirrorView: React.FC<TimesheetMirrorViewProps> = ({
  employees,
  punches,
  selectedEmployeeId,
  onSelectEmployee,
  onNavigateToTerminal,
  onUpdateDayPunches,
  onClearDayPunches,
}) => {
  const companySettings = useMemo(() => getStoredCompanySettings(), []);
  const [logoError, setLogoError] = useState(false);
  const [currentMonthStr, setCurrentMonthStr] = useState<string>('2026-09');
  const [editingDay, setEditingDay] = useState<DailyTimeSheet | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [customEditDate, setCustomEditDate] = useState<string>('');

  const activeEmployeeId = selectedEmployeeId || employees[0]?.id || '';
  const currentEmployee = employees.find(e => e.id === activeEmployeeId) || employees[0];

  // Cálculo do espelho mensal memorizado
  const summary: MonthlyTimeSheetSummary | null = useMemo(() => {
    if (!currentEmployee) return null;
    return calculateEmployeeMonthlyTimesheet(currentEmployee, currentMonthStr, punches);
  }, [currentEmployee, currentMonthStr, punches]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (summary) {
      exportIndividualTimesheetCSV(summary);
    }
  };

  // Abrir modal de edição para um dia específico
  const handleOpenEditDay = (sheet: DailyTimeSheet) => {
    setEditingDay(sheet);
    setCustomEditDate(sheet.date);
    setIsEditModalOpen(true);
  };

  // Abrir modal de novo lançamento manual (para data de hoje ou selecionada)
  const handleOpenNewManual = () => {
    const today = new Date().toISOString().substring(0, 10);
    const initialDate = today.startsWith(currentMonthStr) ? today : `${currentMonthStr}-01`;
    setCustomEditDate(initialDate);
    const existing = summary?.dailySheets.find(s => s.date === initialDate);
    setEditingDay(existing || null);
    setIsEditModalOpen(true);
  };

  if (!currentEmployee || !summary) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
          <Calendar className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-base font-bold text-slate-900">
            Nenhum colaborador disponível para espelho de ponto
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Cadastre colaboradores na aba "Colaboradores & Equipe" ou utilize o botão no topo para apurar o espelho mensal e banco de horas.
          </p>
        </div>
      </div>
    );
  }

  const isBankPositive = summary.bankBalanceHours >= 0;

  return (
    <div className="space-y-6">
      {/* Controles de Seleção e Ações de Exportação (Oculto na impressão) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs print:hidden space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Seletor de Colaborador */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                Colaborador
              </label>
              <select
                value={activeEmployeeId}
                onChange={(e) => onSelectEmployee(e.target.value)}
                className="font-bold text-slate-900 bg-transparent text-sm border-b border-slate-300 pb-0.5 focus:outline-hidden focus:border-indigo-600"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.registrationNumber} — {emp.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Seletor de Mês / Competência */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Competência:
            </label>
            <select
              value={currentMonthStr}
              onChange={(e) => setCurrentMonthStr(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
            >
              <option value="2026-09">Setembro / 2026 (Ativo)</option>
              <option value="2026-08">Agosto / 2026</option>
              <option value="2026-07">Julho / 2026</option>
            </select>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
            {/* Botão Novo Lançamento Manual */}
            <button
              onClick={handleOpenNewManual}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Digitar Horário Manual</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Espelho</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cabeçalho Formal para Impressão / Visualização do Espelho (Portaria 671 MTE) */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
          <div className="flex items-center gap-3.5">
            {companySettings?.logoUrl && !logoError ? (
              <div className="w-14 h-14 rounded-xl border border-slate-200 p-1 flex items-center justify-center bg-white shrink-0">
                <img
                  src={companySettings.logoUrl}
                  alt={companySettings.tradeName}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : null}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold tracking-wider uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Portaria 671 / MTE
                </span>
                <span className="text-xs text-slate-500 font-medium">REP-P Eletrônico</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                Espelho de Ponto Individual
              </h1>
              <p className="text-xs text-slate-500">
                Registro diário de jornada de trabalho, intervalos intrajornada e apuração de banco de horas.
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-600 space-y-0.5 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none w-full sm:w-auto">
            <div><strong>Empresa:</strong> {companySettings.name}</div>
            <div><strong>CNPJ:</strong> {companySettings.cnpj}</div>
            {companySettings.cityState && <div><strong>Local:</strong> {companySettings.cityState}</div>}
            <div><strong>Competência:</strong> {currentMonthStr}</div>
          </div>
        </div>

        {/* Dados Cadastrais do Colaborador */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Nome do Colaborador</span>
            <strong className="text-slate-900 text-sm">{currentEmployee.name}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Matrícula / CPF</span>
            <strong className="text-slate-900">{currentEmployee.registrationNumber} • {currentEmployee.cpf}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Cargo & Departamento</span>
            <span className="text-slate-800 font-medium">{currentEmployee.role} ({currentEmployee.department})</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Jornada Contratada</span>
            <span className="text-slate-800 font-medium">{currentEmployee.workShift}</span>
          </div>
        </div>

        {/* Cards de Resumo Mensal & Banco de Horas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <span className="text-[11px] font-bold uppercase text-slate-500 block">
              Horas Trabalhadas
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {summary.totalWorkedHours.toFixed(2).replace('.', ',')}h
            </div>
            <span className="text-[11px] text-slate-400">{summary.totalDaysWorked} dias computados</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <span className="text-[11px] font-bold uppercase text-slate-500 block">
              Horas Contratadas
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {summary.totalExpectedHours.toFixed(2).replace('.', ',')}h
            </div>
            <span className="text-[11px] text-slate-400">Jornada padrão mensal</span>
          </div>

          <div className={`p-4 rounded-xl border ${isBankPositive ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/40'}`}>
            <span className="text-[11px] font-bold uppercase text-slate-600 block flex items-center justify-between">
              <span>Saldo Banco de Horas</span>
              {isBankPositive ? (
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
              )}
            </span>
            <div className={`text-2xl font-black mt-1 ${isBankPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
              {summary.bankBalanceFormatted}
            </div>
            <span className="text-[11px] text-slate-500">
              {isBankPositive ? 'Crédito de horas extras' : 'Débito / horas a compensar'}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <span className="text-[11px] font-bold uppercase text-slate-500 block">
              Ocorrências & Atrasos
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {summary.delaysCount + summary.absencesCount}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>{summary.delaysCount} atrasos</span>
              <span>•</span>
              <span>{summary.absencesCount} faltas</span>
            </div>
          </div>
        </div>

        {/* Tabela do Espelho Diário (Todos os dias do mês) */}
        <div className="space-y-3">
          {/* Dica de Edição Manual */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl text-xs text-indigo-950 print:hidden">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>Lançamento & Ajuste Manual:</strong> Digite ou altere horários de entrada, intervalo e saída clicando em <strong>Editar</strong> em qualquer dia.
              </span>
            </div>
            <button
              type="button"
              onClick={handleOpenNewManual}
              className="self-start sm:self-auto px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer shrink-0"
            >
              + Digitar Novo Horário
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-2 text-center">Dia</th>
                  <th className="py-2.5 px-3 text-center bg-emerald-50/40">1ª Entrada</th>
                  <th className="py-2.5 px-3 text-center bg-amber-50/40">Saída Intervalo</th>
                  <th className="py-2.5 px-3 text-center bg-blue-50/40">Retorno Intervalo</th>
                  <th className="py-2.5 px-3 text-center bg-rose-50/40">2ª Saída</th>
                  <th className="py-2.5 px-3 text-right">Trabalhadas</th>
                  <th className="py-2.5 px-3 text-right">Previstas</th>
                  <th className="py-2.5 px-3 text-right">Saldo</th>
                  <th className="py-2.5 px-3 text-center">Situação</th>
                  <th className="py-2.5 px-2 text-center print:hidden">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {summary.dailySheets.map(sheet => {
                  const isWeekend = sheet.dayOfWeek === 'Sáb' || sheet.dayOfWeek === 'Dom';
                  const isPositive = sheet.balanceHours > 0;
                  const isNegative = sheet.balanceHours < -0.1;

                  return (
                    <tr
                      key={sheet.date}
                      className={`hover:bg-indigo-50/30 transition-colors ${
                        isWeekend ? 'bg-slate-50/40 text-slate-500' : 'text-slate-800'
                      }`}
                    >
                      {/* Data */}
                      <td className="py-2 px-3 font-semibold whitespace-nowrap">
                        {sheet.date.split('-').reverse().join('/')}
                      </td>

                      {/* Dia da Semana */}
                      <td className="py-2 px-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isWeekend ? 'bg-slate-200 text-slate-700' : 'bg-indigo-50 text-indigo-700'
                        }`}>
                          {sheet.dayOfWeek}
                        </span>
                      </td>

                      {/* 1ª Entrada */}
                      <td className="py-2 px-3 text-center font-mono font-bold text-emerald-800">
                        {sheet.entry1 || '--:--'}
                      </td>

                      {/* Saída Almoço */}
                      <td className="py-2 px-3 text-center font-mono text-amber-800">
                        {sheet.exit1 || '--:--'}
                      </td>

                      {/* Retorno Almoço */}
                      <td className="py-2 px-3 text-center font-mono text-blue-800">
                        {sheet.entry2 || '--:--'}
                      </td>

                      {/* 2ª Saída */}
                      <td className="py-2 px-3 text-center font-mono font-bold text-rose-800">
                        {sheet.exit2 || '--:--'}
                      </td>

                      {/* Horas Trabalhadas */}
                      <td className="py-2 px-3 text-right font-bold">
                        {sheet.totalWorkedFormatted !== '00:00' ? sheet.totalWorkedFormatted : '--:--'}
                      </td>

                      {/* Horas Previstas */}
                      <td className="py-2 px-3 text-right text-slate-500">
                        {sheet.expectedHours > 0 ? `${sheet.expectedHours.toFixed(0)}h` : '-'}
                      </td>

                      {/* Saldo do Dia */}
                      <td className={`py-2 px-3 text-right font-mono font-bold ${
                        isPositive ? 'text-emerald-700' : isNegative ? 'text-rose-700' : 'text-slate-400'
                      }`}>
                        {sheet.expectedHours > 0 || sheet.totalWorkedHours > 0 ? sheet.balanceFormatted : '--:--'}
                      </td>

                      {/* Situação */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {sheet.status === 'HORA_EXTRA' ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Hora Extra
                          </span>
                        ) : sheet.status === 'ATRASO' ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Atraso
                          </span>
                        ) : sheet.status === 'FALTA' ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                            Falta
                          </span>
                        ) : sheet.status === 'FERIADO' ? (
                          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                            Feriado
                          </span>
                        ) : sheet.status === 'FOLGA_DSR' ? (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                            DSR / Folga
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium">
                            Normal
                          </span>
                        )}
                      </td>

                      {/* Botão de Edição Manual da Linha */}
                      <td className="py-1.5 px-2 text-center whitespace-nowrap print:hidden">
                        <button
                          type="button"
                          onClick={() => handleOpenEditDay(sheet)}
                          title={`Digitar ou editar horários de ${sheet.date}`}
                          className="px-2 py-1 bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-800 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Edição Manual de Horários */}
        {isEditModalOpen && (
          <EditDayPunchesModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            employee={currentEmployee}
            initialDate={customEditDate || (editingDay ? editingDay.date : `${currentMonthStr}-01`)}
            initialEntry1={editingDay?.entry1}
            initialExit1={editingDay?.exit1}
            initialEntry2={editingDay?.entry2}
            initialExit2={editingDay?.exit2}
            initialNotes={editingDay?.punches?.[0]?.notes || ''}
            onSave={(params) => {
              if (onUpdateDayPunches) {
                onUpdateDayPunches(params);
              }
            }}
            onClearDay={(empId, date) => {
              if (onClearDayPunches) {
                onClearDayPunches(empId, date);
              }
            }}
          />
        )}

        {/* Rodapé Legal com Campos de Assinatura (Perfeito para impressão de folha de ponto CLT) */}
        <div className="pt-8 border-t border-slate-200 mt-8 space-y-6">
          <p className="text-[11px] text-slate-500 text-justify leading-relaxed">
            Reconheço a exatidão das marcações de ponto contidas neste espelho emitido eletronicamente, correspondentes ao período indicado, nos termos da Portaria 671 do Ministério do Trabalho e Emprego (MTE) e legislação trabalhista vigente.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 pt-4">
            <div className="text-center">
              <div className="border-b border-slate-400 w-3/4 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">{currentEmployee.name}</p>
              <p className="text-[11px] text-slate-500">Assinatura do Colaborador (Matrícula: {currentEmployee.registrationNumber})</p>
            </div>

            <div className="text-center">
              <div className="border-b border-slate-400 w-3/4 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">Responsável RH / Almoxarifado</p>
              <p className="text-[11px] text-slate-500">Assinatura do Empregador / Gestor</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
