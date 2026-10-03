import { Employee, TimePunch, PunchType, DailyTimeSheet, MonthlyTimeSheetSummary, DayWorkStatus } from '../types';

const STORAGE_KEYS = {
  EMPLOYEES: 'nfe_stock_employees_v1',
  TIME_PUNCHES: 'nfe_stock_punches_clean_v1',
  LAST_NSR: 'nfe_stock_last_nsr_v1',
};

// Funcionários realistas do setor de estoque, recebimento de NF-e e expedição
export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    registrationNumber: 'MAT-1001',
    name: 'Carlos Eduardo Mendes',
    cpf: '321.456.789-01',
    role: 'Almoxarife Líder',
    department: 'Almoxarifado & Estoque',
    workShift: '08:00 às 17:00 (Segunda a Sexta)',
    dailyHoursExpected: 8.0,
    pin: '1001',
    admissionDate: '2023-03-15',
    status: 'ATIVO',
    hourlyRate: 22.50,
    avatarInitials: 'CM',
    phone: '(11) 98765-4321',
    email: 'carlos.mendes@empresa.com.br',
  },
  {
    id: 'emp-2',
    registrationNumber: 'MAT-1002',
    name: 'Mariana Souza Lima',
    cpf: '456.789.123-02',
    role: 'Conferente de NF-e & Entrada',
    department: 'Recebimento Fiscal',
    workShift: '08:00 às 17:00 (Segunda a Sexta)',
    dailyHoursExpected: 8.0,
    pin: '1002',
    admissionDate: '2023-08-01',
    status: 'ATIVO',
    hourlyRate: 19.80,
    avatarInitials: 'ML',
    phone: '(11) 97654-3210',
    email: 'mariana.lima@empresa.com.br',
  },
  {
    id: 'emp-3',
    registrationNumber: 'MAT-1003',
    name: 'Rodrigo Silva Santos',
    cpf: '789.123.456-03',
    role: 'Operador de Empilhadeira',
    department: 'Estoque & Logística',
    workShift: '08:00 às 17:00 (Segunda a Sexta)',
    dailyHoursExpected: 8.0,
    pin: '1003',
    admissionDate: '2024-01-10',
    status: 'ATIVO',
    hourlyRate: 21.00,
    avatarInitials: 'RS',
    phone: '(11) 96543-2109',
    email: 'rodrigo.santos@empresa.com.br',
  },
  {
    id: 'emp-4',
    registrationNumber: 'MAT-1004',
    name: 'Beatriz Albuquerque',
    cpf: '654.321.987-04',
    role: 'Auxiliar de Estoque & Separação',
    department: 'Expedição & Armazém',
    workShift: '08:00 às 17:00 (Segunda a Sexta)',
    dailyHoursExpected: 8.0,
    pin: '1004',
    admissionDate: '2024-05-20',
    status: 'ATIVO',
    hourlyRate: 16.50,
    avatarInitials: 'BA',
    phone: '(11) 95432-1098',
    email: 'beatriz.albuquerque@empresa.com.br',
  },
  {
    id: 'emp-5',
    registrationNumber: 'MAT-1005',
    name: 'Lucas Ferreira Ramos',
    cpf: '852.963.741-05',
    role: 'Analista de Inventário & Faturamento',
    department: 'Faturamento & Controle',
    workShift: '08:30 às 17:30 (Segunda a Sexta)',
    dailyHoursExpected: 8.0,
    pin: '1005',
    admissionDate: '2022-11-05',
    status: 'ATIVO',
    hourlyRate: 26.00,
    avatarInitials: 'LR',
    phone: '(11) 94321-0987',
    email: 'lucas.ramos@empresa.com.br',
  },
];

// Gerar batidas de ponto de demonstração para o mês corrente (Setembro 2026)
function generateSamplePunches(): TimePunch[] {
  const punches: TimePunch[] = [];
  let currentNsr = 1000;

  // Dias úteis de Setembro 2026 até dia 20 (Setembro 2026 começa na terça-feira dia 01)
  // Dias: 01, 02, 03, 04 (Sex), 07 (Feriado), 08, 09, 10, 11 (Sex), 14, 15, 16, 17, 18 (Sex)
  const workDays = [
    '2026-09-01',
    '2026-09-02',
    '2026-09-03',
    '2026-09-04',
    // 07 é Independência (Feriado)
    '2026-09-08',
    '2026-09-09',
    '2026-09-10',
    '2026-09-11',
    '2026-09-14',
    '2026-09-15',
    '2026-09-16',
    '2026-09-17',
    '2026-09-18',
    // Outubro / 2026
    '2026-10-01',
    '2026-10-02',
  ];

  INITIAL_EMPLOYEES.forEach((emp, empIdx) => {
    workDays.forEach((date, dayIdx) => {
      // Variações realistas de minutos (ex: 07:58, 08:02)
      const minuteOffset = (empIdx + dayIdx) % 7 - 3;
      const entryTime = `08:${String(Math.max(0, minuteOffset < 0 ? 60 + minuteOffset : minuteOffset)).padStart(2, '0')}:00`;
      const lunchOutTime = '12:02:00';
      const lunchRetTime = '13:03:00';

      // Sexta-feira ou alguns dias com hora extra ou saída pontual
      const extraMinutes = (empIdx === 0 && dayIdx === 3) ? 45 : (empIdx === 1 && dayIdx === 7) ? 30 : 0;
      const exitHour = 17 + Math.floor(extraMinutes / 60);
      const exitMin = String(extraMinutes % 60).padStart(2, '0');
      const exitTime = `${String(exitHour).padStart(2, '0')}:${exitMin}:00`;

      // 1. Entrada
      currentNsr += 1;
      punches.push({
        id: `p-${emp.id}-${date}-1`,
        employeeId: emp.id,
        employeeName: emp.name,
        date,
        time: entryTime,
        timestamp: `${date}T${entryTime}Z`,
        type: 'ENTRADA',
        source: 'RELOGIO_DIGITAL',
        nsr: currentNsr,
      });

      // 2. Saída Intervalo
      currentNsr += 1;
      punches.push({
        id: `p-${emp.id}-${date}-2`,
        employeeId: emp.id,
        employeeName: emp.name,
        date,
        time: lunchOutTime,
        timestamp: `${date}T${lunchOutTime}Z`,
        type: 'SAIDA_INTERVALO',
        source: 'RELOGIO_DIGITAL',
        nsr: currentNsr,
      });

      // 3. Retorno Intervalo
      currentNsr += 1;
      punches.push({
        id: `p-${emp.id}-${date}-3`,
        employeeId: emp.id,
        employeeName: emp.name,
        date,
        time: lunchRetTime,
        timestamp: `${date}T${lunchRetTime}Z`,
        type: 'RETORNO_INTERVALO',
        source: 'RELOGIO_DIGITAL',
        nsr: currentNsr,
      });

      // 4. Saída
      currentNsr += 1;
      punches.push({
        id: `p-${emp.id}-${date}-4`,
        employeeId: emp.id,
        employeeName: emp.name,
        date,
        time: exitTime,
        timestamp: `${date}T${exitTime}Z`,
        type: 'SAIDA',
        source: 'RELOGIO_DIGITAL',
        nsr: currentNsr,
        notes: extraMinutes > 0 ? `Hora Extra: +${extraMinutes}m autorizada` : undefined,
      });
    });
  });

  return punches;
}

export const INITIAL_TIME_PUNCHES: TimePunch[] = [];

/**
 * Carrega lista de funcionários
 */
export function getStoredEmployees(): Employee[] {
  const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
    return INITIAL_EMPLOYEES;
  }
  try {
    return JSON.parse(data);
  } catch (err) {
    console.error('Erro ao ler funcionários:', err);
    return INITIAL_EMPLOYEES;
  }
}

/**
 * Salva funcionários
 */
export function saveStoredEmployees(employees: Employee[]): void {
  localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
}

/**
 * Carrega batidas de ponto
 */
export function getStoredPunches(): TimePunch[] {
  const data = localStorage.getItem(STORAGE_KEYS.TIME_PUNCHES);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.TIME_PUNCHES, JSON.stringify([]));
    return [];
  }
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Erro ao ler batidas:', err);
    return [];
  }
}

export function clearAllPunches(): TimePunch[] {
  localStorage.setItem(STORAGE_KEYS.TIME_PUNCHES, JSON.stringify([]));
  localStorage.removeItem('nfe_stock_punches_v1');
  return [];
}

/**
 * Salva batidas de ponto
 */
export function saveStoredPunches(punches: TimePunch[]): void {
  localStorage.setItem(STORAGE_KEYS.TIME_PUNCHES, JSON.stringify(punches));
}

/**
 * Obtém o próximo NSR sequencial (Portaria 671)
 */
function getNextNsr(): number {
  const last = parseInt(localStorage.getItem(STORAGE_KEYS.LAST_NSR) || '1500', 10);
  const next = last + 1;
  localStorage.setItem(STORAGE_KEYS.LAST_NSR, next.toString());
  return next;
}

/**
 * Registra uma nova batida de ponto
 */
export function registerTimePunch(params: {
  employeeId: string;
  type?: PunchType;
  customDate?: string;
  customTime?: string;
  notes?: string;
}): { success: boolean; punch?: TimePunch; punches: TimePunch[]; error?: string } {
  const employees = getStoredEmployees();
  const emp = employees.find(e => e.id === params.employeeId);
  if (!emp) {
    return { success: false, error: 'Funcionário não encontrado.', punches: getStoredPunches() };
  }

  const now = new Date();
  const dateStr = params.customDate || now.toISOString().substring(0, 10);
  const timeStr = params.customTime || now.toTimeString().substring(0, 8);
  const currentPunches = getStoredPunches();

  // Se o tipo não foi informado, detecta inteligentemente de acordo com a ordem do dia
  let punchType = params.type;
  if (!punchType) {
    const todayPunches = currentPunches
      .filter(p => p.employeeId === emp.id && p.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time));

    const count = todayPunches.length;
    if (count === 0) punchType = 'ENTRADA';
    else if (count === 1) punchType = 'SAIDA_INTERVALO';
    else if (count === 2) punchType = 'RETORNO_INTERVALO';
    else punchType = 'SAIDA';
  }

  const nsr = getNextNsr();
  const newPunch: TimePunch = {
    id: `punch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    employeeId: emp.id,
    employeeName: emp.name,
    date: dateStr,
    time: timeStr,
    timestamp: `${dateStr}T${timeStr}Z`,
    type: punchType,
    source: params.customTime ? 'MANUAL' : 'RELOGIO_DIGITAL',
    nsr,
    notes: params.notes,
    device: 'Ponto Web Almoxarifado / NF-e Gestor',
  };

  const updatedPunches = [newPunch, ...currentPunches];
  saveStoredPunches(updatedPunches);

  return {
    success: true,
    punch: newPunch,
    punches: updatedPunches,
  };
}

/**
 * Atualiza ou define manualmente os horários de um dia específico para um colaborador.
 * Permite digitar manualmente 1ª Entrada, Saída Intervalo, Retorno Intervalo e 2ª Saída,
 * além de observações/justificativa.
 */
export function updateDayPunches(params: {
  employeeId: string;
  date: string; // YYYY-MM-DD
  entry1?: string; // HH:mm
  exit1?: string; // HH:mm
  entry2?: string; // HH:mm
  exit2?: string; // HH:mm
  notes?: string;
}): { success: boolean; punches: TimePunch[]; error?: string } {
  const employees = getStoredEmployees();
  const emp = employees.find(e => e.id === params.employeeId);
  if (!emp) {
    return { success: false, error: 'Colaborador não encontrado.', punches: getStoredPunches() };
  }

  const currentPunches = getStoredPunches();
  // Remove as batidas antigas deste colaborador nesta data
  const remainingPunches = currentPunches.filter(
    p => !(p.employeeId === params.employeeId && p.date === params.date)
  );

  const newDayPunches: TimePunch[] = [];
  const formatTime = (t: string) => (t.length === 5 ? `${t}:00` : t);

  const defaultNote = params.notes?.trim() || 'Ajuste manual de ponto';

  if (params.entry1 && params.entry1.trim()) {
    newDayPunches.push({
      id: `punch-${Date.now()}-e1-${Math.random().toString(36).substring(2, 6)}`,
      employeeId: emp.id,
      employeeName: emp.name,
      date: params.date,
      time: formatTime(params.entry1.trim()),
      timestamp: `${params.date}T${formatTime(params.entry1.trim())}Z`,
      type: 'ENTRADA',
      source: 'MANUAL',
      nsr: getNextNsr(),
      notes: defaultNote,
      device: 'Ajuste Manual do Gestor',
    });
  }

  if (params.exit1 && params.exit1.trim()) {
    newDayPunches.push({
      id: `punch-${Date.now()}-x1-${Math.random().toString(36).substring(2, 6)}`,
      employeeId: emp.id,
      employeeName: emp.name,
      date: params.date,
      time: formatTime(params.exit1.trim()),
      timestamp: `${params.date}T${formatTime(params.exit1.trim())}Z`,
      type: 'SAIDA_INTERVALO',
      source: 'MANUAL',
      nsr: getNextNsr(),
      notes: defaultNote,
      device: 'Ajuste Manual do Gestor',
    });
  }

  if (params.entry2 && params.entry2.trim()) {
    newDayPunches.push({
      id: `punch-${Date.now()}-e2-${Math.random().toString(36).substring(2, 6)}`,
      employeeId: emp.id,
      employeeName: emp.name,
      date: params.date,
      time: formatTime(params.entry2.trim()),
      timestamp: `${params.date}T${formatTime(params.entry2.trim())}Z`,
      type: 'RETORNO_INTERVALO',
      source: 'MANUAL',
      nsr: getNextNsr(),
      notes: defaultNote,
      device: 'Ajuste Manual do Gestor',
    });
  }

  if (params.exit2 && params.exit2.trim()) {
    newDayPunches.push({
      id: `punch-${Date.now()}-x2-${Math.random().toString(36).substring(2, 6)}`,
      employeeId: emp.id,
      employeeName: emp.name,
      date: params.date,
      time: formatTime(params.exit2.trim()),
      timestamp: `${params.date}T${formatTime(params.exit2.trim())}Z`,
      type: 'SAIDA',
      source: 'MANUAL',
      nsr: getNextNsr(),
      notes: defaultNote,
      device: 'Ajuste Manual do Gestor',
    });
  }

  // Ordena as batidas do dia por horário
  newDayPunches.sort((a, b) => a.time.localeCompare(b.time));

  const allUpdated = [...newDayPunches, ...remainingPunches];
  saveStoredPunches(allUpdated);

  return {
    success: true,
    punches: allUpdated,
  };
}

/**
 * Remove todas as batidas de um colaborador em uma data
 */
export function deleteEmployeePunchesForDate(
  employeeId: string,
  date: string
): { success: boolean; punches: TimePunch[] } {
  const current = getStoredPunches();
  const updated = current.filter(p => !(p.employeeId === employeeId && p.date === date));
  saveStoredPunches(updated);
  return { success: true, punches: updated };
}

/**
 * Atualiza os dados de um colaborador (inclusive jornada de trabalho e horas previstas)
 */
export function updateEmployee(updatedEmployee: Employee): {
  success: boolean;
  employees: Employee[];
  error?: string;
} {
  const employees = getStoredEmployees();
  const index = employees.findIndex(e => e.id === updatedEmployee.id);
  if (index === -1) {
    return { success: false, error: 'Colaborador não encontrado.', employees };
  }

  const updated = [...employees];
  updated[index] = { ...updatedEmployee };
  saveStoredEmployees(updated);

  return { success: true, employees: updated };
}

/**
 * Exclui um colaborador do sistema de controle de ponto e remove suas batidas vinculadas
 */
export function deleteStoredEmployee(employeeId: string): {
  success: boolean;
  employees: Employee[];
  punches: TimePunch[];
  deletedEmployee?: Employee;
  error?: string;
} {
  const employees = getStoredEmployees();
  const punches = getStoredPunches();

  const employeeToDelete = employees.find(e => e.id === employeeId);
  if (!employeeToDelete) {
    return {
      success: false,
      employees,
      punches,
      error: 'Colaborador não encontrado para exclusão.'
    };
  }

  const updatedEmployees = employees.filter(e => e.id !== employeeId);
  const updatedPunches = punches.filter(p => p.employeeId !== employeeId);

  saveStoredEmployees(updatedEmployees);
  saveStoredPunches(updatedPunches);

  return {
    success: true,
    employees: updatedEmployees,
    punches: updatedPunches,
    deletedEmployee: employeeToDelete,
  };
}

/**
 * Helper: converte string "HH:mm" em minutos
 */
function timeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Helper: formata minutos em "+HH:mm" ou "-HH:mm"
 */
function minutesToFormatted(mins: number): string {
  const sign = mins < 0 ? '-' : mins > 0 ? '+' : '';
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = Math.round(abs % 60);
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Helper: formata minutos em "HH:mm"
 */
function minutesToHHMM(mins: number): string {
  const abs = Math.max(0, Math.round(mins));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Calcula o Espelho de Ponto Mensal de um funcionário
 */
export function calculateEmployeeMonthlyTimesheet(
  employee: Employee,
  yearMonth: string, // YYYY-MM
  allPunches: TimePunch[]
): MonthlyTimeSheetSummary {
  const [year, month] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  const daysOfWeekNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dailySheets: DailyTimeSheet[] = [];

  let totalWorkedMinutes = 0;
  let totalExpectedMinutes = 0;
  let totalDaysWorked = 0;
  let absencesCount = 0;
  let delaysCount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = `${yearMonth}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeekIdx = dateObj.getDay();
    const dayOfWeekName = daysOfWeekNames[dayOfWeekIdx];
    const shiftLower = (employee.workShift || '').toLowerCase();
    const isSaturdayWorkShift = (
      shiftLower.includes('sábado') ||
      shiftLower.includes('sabado') ||
      shiftLower.includes('seg a sáb') ||
      shiftLower.includes('seg a sab') ||
      shiftLower.includes('segunda a sábado') ||
      shiftLower.includes('segunda a sabado')
    );

    const isSunday = dayOfWeekIdx === 0;
    const isSaturday = dayOfWeekIdx === 6;
    const isWeekday = dayOfWeekIdx >= 1 && dayOfWeekIdx <= 5;

    // Feriados nacionais padrão (ex: 01/Jan, 21/Abr, 01/Mai, 07/Set, 12/Out, 02/Nov, 15/Nov, 20/Nov, 25/Dez)
    const isHoliday =
      (month === 1 && day === 1) ||
      (month === 4 && day === 21) ||
      (month === 5 && day === 1) ||
      (month === 9 && day === 7) ||
      (month === 10 && day === 12) ||
      (month === 11 && (day === 2 || day === 15 || day === 20)) ||
      (month === 12 && day === 25);

    // Batidas do dia
    const dayPunches = allPunches
      .filter(p => p.employeeId === employee.id && p.date === dayDate)
      .sort((a, b) => a.time.localeCompare(b.time));

    let entry1: string | undefined;
    let exit1: string | undefined;
    let entry2: string | undefined;
    let exit2: string | undefined;

    // Mapeia batidas
    if (dayPunches.length >= 1) entry1 = dayPunches[0].time.substring(0, 5);
    if (dayPunches.length >= 2) exit1 = dayPunches[1].time.substring(0, 5);
    if (dayPunches.length >= 3) entry2 = dayPunches[2].time.substring(0, 5);
    if (dayPunches.length >= 4) exit2 = dayPunches[3].time.substring(0, 5);

    // Cálculo do tempo trabalhado no dia
    let workedMinutes = 0;
    if (entry1 && exit1) {
      workedMinutes += Math.max(0, timeToMinutes(exit1) - timeToMinutes(entry1));
    }
    if (entry2 && exit2) {
      workedMinutes += Math.max(0, timeToMinutes(exit2) - timeToMinutes(entry2));
    } else if (entry1 && exit2 && !exit1 && !entry2) {
      workedMinutes = Math.max(0, timeToMinutes(exit2) - timeToMinutes(entry1) - 60); // desconta 1h almoço
    }

    // Horas esperadas conforme a jornada do colaborador
    let expectedHours = 0;
    let isDayOff = false;

    if (isHoliday) {
      expectedHours = 0;
      isDayOff = true;
    } else if (isSunday) {
      expectedHours = 0;
      isDayOff = true;
    } else if (isSaturday) {
      if (isSaturdayWorkShift) {
        // Segunda a sábado: 4 horas líquidas no sábado!
        expectedHours = 4.0;
        isDayOff = false;
      } else {
        expectedHours = 0;
        isDayOff = true;
      }
    } else if (isWeekday) {
      // Segunda a sexta: 8 horas líquidas (ou dailyHoursExpected configurada)
      expectedHours = employee.dailyHoursExpected || 8.0;
      isDayOff = false;
    }

    const expectedMinutes = expectedHours * 60;
    const balanceMinutes = workedMinutes - expectedMinutes;

    let status: DayWorkStatus = 'NORMAL';
    if (isHoliday) {
      status = 'FERIADO';
    } else if (isDayOff) {
      status = workedMinutes > 0 ? 'HORA_EXTRA' : 'FOLGA_DSR';
    } else if (workedMinutes === 0 && dayPunches.length === 0) {
      // Se a data já passou no mês
      const todayStr = new Date().toISOString().substring(0, 10);
      if (dayDate <= todayStr) {
        status = 'FALTA';
        absencesCount += 1;
      } else {
        status = 'NORMAL';
      }
    } else if (balanceMinutes > 15) {
      status = 'HORA_EXTRA';
    } else if (balanceMinutes < -15) {
      status = 'ATRASO';
      delaysCount += 1;
    }

    if (workedMinutes > 0) {
      totalDaysWorked += 1;
    }

    totalWorkedMinutes += workedMinutes;
    totalExpectedMinutes += expectedMinutes;

    dailySheets.push({
      date: dayDate,
      dayOfWeek: dayOfWeekName,
      employeeId: employee.id,
      punches: dayPunches,
      entry1,
      exit1,
      entry2,
      exit2,
      totalWorkedHours: workedMinutes / 60,
      totalWorkedFormatted: minutesToHHMM(workedMinutes),
      expectedHours,
      balanceHours: balanceMinutes / 60,
      balanceFormatted: minutesToFormatted(balanceMinutes),
      status,
    });
  }

  const netBalanceMinutes = totalWorkedMinutes - totalExpectedMinutes;
  const overtimeMinutes = Math.max(0, netBalanceMinutes);
  const deficitMinutes = Math.max(0, -netBalanceMinutes);

  return {
    employee,
    month: yearMonth,
    totalWorkedHours: Number((totalWorkedMinutes / 60).toFixed(2)),
    totalExpectedHours: Number((totalExpectedMinutes / 60).toFixed(2)),
    overtimeHours: Number((overtimeMinutes / 60).toFixed(2)),
    deficitHours: Number((deficitMinutes / 60).toFixed(2)),
    bankBalanceHours: Number((netBalanceMinutes / 60).toFixed(2)),
    bankBalanceFormatted: minutesToFormatted(netBalanceMinutes),
    totalDaysWorked,
    absencesCount,
    delaysCount,
    dailySheets,
  };
}

/**
 * Exporta o Espelho de Ponto Individual para formato CSV compatível com Excel
 */
export function exportIndividualTimesheetCSV(summary: MonthlyTimeSheetSummary): void {
  const headers = [
    'Data',
    'Dia',
    'Entrada 1',
    'Saída Intervalo',
    'Retorno Intervalo',
    'Saída 2',
    'Horas Trabalhadas',
    'Horas Esperadas',
    'Saldo do Dia',
    'Situação',
    'Ocorrências/Notas',
  ];

  const rows = summary.dailySheets.map(d => {
    return [
      d.date.split('-').reverse().join('/'),
      d.dayOfWeek,
      d.entry1 || '--:--',
      d.exit1 || '--:--',
      d.entry2 || '--:--',
      d.exit2 || '--:--',
      d.totalWorkedFormatted,
      `${d.expectedHours.toFixed(2).replace('.', ',')}h`,
      d.balanceFormatted,
      d.status,
      d.notes || (d.punches.length > 0 ? `${d.punches.length} batidas registradas` : ''),
    ];
  });

  // Metadados do cabeçalho
  const metaRows = [
    `ESPELHO DE PONTO ELETRÔNICO MENSAL - PORTARIA 671 / CLT`,
    `Funcionário: ${summary.employee.name};Matrícula: ${summary.employee.registrationNumber};Cargo: ${summary.employee.role}`,
    `Departamento: ${summary.employee.department};Jornada: ${summary.employee.workShift};Competência: ${summary.month}`,
    `Total Trabalhado: ${summary.totalWorkedHours.toFixed(2).replace('.', ',')}h;Total Esperado: ${summary.totalExpectedHours.toFixed(2).replace('.', ',')}h;Saldo Banco de Horas: ${summary.bankBalanceFormatted}`,
    '',
  ];

  const csvContent =
    '\uFEFF' +
    metaRows.join('\r\n') +
    '\r\n' +
    headers.join(';') +
    '\r\n' +
    rows.map(r => r.join(';')).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Espelho_Ponto_${summary.employee.registrationNumber}_${summary.month}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporta resumo consolidado do banco de horas de todos os funcionários
 */
export function exportConsolidatedTimeClockCSV(
  employees: Employee[],
  punches: TimePunch[],
  yearMonth: string
): void {
  const headers = [
    'Matrícula',
    'Nome Funcionário',
    'Cargo',
    'Departamento',
    'Horas Trabalhadas',
    'Horas Contratadas',
    'Saldo Banco de Horas',
    'Saldo Decimal (h)',
    'Dias Trabalhados',
    'Atrasos',
    'Faltas',
    'Status',
  ];

  const rows = employees.map(emp => {
    const summary = calculateEmployeeMonthlyTimesheet(emp, yearMonth, punches);
    return [
      emp.registrationNumber,
      emp.name,
      emp.role,
      emp.department,
      `${summary.totalWorkedHours.toFixed(2).replace('.', ',')}h`,
      `${summary.totalExpectedHours.toFixed(2).replace('.', ',')}h`,
      summary.bankBalanceFormatted,
      summary.bankBalanceHours.toFixed(2).replace('.', ','),
      summary.totalDaysWorked,
      summary.delaysCount,
      summary.absencesCount,
      emp.status,
    ];
  });

  const csvContent =
    '\uFEFF' +
    `RELATÓRIO CONSOLIDADO DE PONTO E BANCO DE HORAS - ${yearMonth}\r\n\r\n` +
    headers.join(';') +
    '\r\n' +
    rows.map(r => r.join(';')).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Relatorio_Consolidado_Ponto_${yearMonth}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Nomes dos meses em português
 */
export const TIMECLOCK_MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Retorna o mês corrente no formato YYYY-MM (ex: "2026-10")
 */
export function getCurrentCompetenceMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Formata "2026-10" como "Outubro / 2026"
 */
export function formatCompetenceMonth(yearMonth: string): string {
  if (!yearMonth) return '';
  const [yStr, mStr] = yearMonth.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  if (!y || !m || m < 1 || m > 12) return yearMonth;
  return `${TIMECLOCK_MONTH_NAMES_PT[m - 1]} / ${y}`;
}

/**
 * Desloca a competência em N meses (ex: "2026-10" + 1 => "2026-11", "2026-12" + 1 => "2027-01")
 */
export function shiftCompetenceMonth(yearMonth: string, offsetMonths: number): string {
  const [yStr, mStr] = (yearMonth || getCurrentCompetenceMonth()).split('-');
  const y = Number(yStr) || new Date().getFullYear();
  const m = Number(mStr) || (new Date().getMonth() + 1);
  const targetDate = new Date(y, (m - 1) + offsetMonths, 1);
  const targetY = targetDate.getFullYear();
  const targetM = String(targetDate.getMonth() + 1).padStart(2, '0');
  return `${targetY}-${targetM}`;
}

export interface CompetenceMonthOption {
  value: string; // "2026-10"
  label: string; // "Outubro / 2026"
  year: number;
  month: number;
  isCurrent: boolean;
  isSubsequent: boolean;
}

/**
 * Retorna lista completa de meses (passados, atual e subsequentes até 2027/2028),
 * além de quaisquer meses com batidas registradas.
 */
export function getTimeClockAvailableMonths(punches?: TimePunch[]): CompetenceMonthOption[] {
  const current = getCurrentCompetenceMonth();
  const [currY, currM] = current.split('-').map(Number);
  const monthsSet = new Set<string>();

  // Abranger de 2025 até 2027 (e 2028 se aplicável)
  const startYear = Math.min(2025, currY - 1);
  const endYear = Math.max(2027, currY + 1);

  for (let yr = startYear; yr <= endYear; yr++) {
    for (let mo = 1; mo <= 12; mo++) {
      monthsSet.add(`${yr}-${String(mo).padStart(2, '0')}`);
    }
  }

  // Adicionar meses presentes nas batidas registradas
  if (punches && punches.length > 0) {
    punches.forEach(p => {
      if (p.date && p.date.length >= 7) {
        monthsSet.add(p.date.substring(0, 7));
      }
    });
  }

  // Ordenar decrescente (ano e meses mais recentes / subsequentes primeiro)
  const sorted = Array.from(monthsSet).sort().reverse();

  return sorted.map(val => {
    const [y, m] = val.split('-').map(Number);
    const isCurrent = val === current;
    const isSubsequent = (y > currY) || (y === currY && m > currM);
    const label = `${TIMECLOCK_MONTH_NAMES_PT[m - 1]} / ${y}`;

    return {
      value: val,
      label,
      year: y,
      month: m,
      isCurrent,
      isSubsequent,
    };
  });
}
