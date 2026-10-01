import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import {
  Clock,
  Calendar,
  Save,
  X,
  Sparkles,
  Trash2,
  AlertCircle,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

interface EditDayPunchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  initialDate: string; // YYYY-MM-DD
  initialEntry1?: string;
  initialExit1?: string;
  initialEntry2?: string;
  initialExit2?: string;
  initialNotes?: string;
  onSave: (params: {
    employeeId: string;
    date: string;
    entry1?: string;
    exit1?: string;
    entry2?: string;
    exit2?: string;
    notes?: string;
  }) => void;
  onClearDay: (employeeId: string, date: string) => void;
}

export const EditDayPunchesModal: React.FC<EditDayPunchesModalProps> = ({
  isOpen,
  onClose,
  employee,
  initialDate,
  initialEntry1 = '',
  initialExit1 = '',
  initialEntry2 = '',
  initialExit2 = '',
  initialNotes = '',
  onSave,
  onClearDay,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [entry1, setEntry1] = useState<string>(initialEntry1);
  const [exit1, setExit1] = useState<string>(initialExit1);
  const [entry2, setEntry2] = useState<string>(initialEntry2);
  const [exit2, setExit2] = useState<string>(initialExit2);
  const [notes, setNotes] = useState<string>(initialNotes);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  useEffect(() => {
    setSelectedDate(initialDate);
    setEntry1(initialEntry1 || '');
    setExit1(initialExit1 || '');
    setEntry2(initialEntry2 || '');
    setExit2(initialExit2 || '');
    setNotes(initialNotes || '');
    setConfirmClear(false);
  }, [initialDate, initialEntry1, initialExit1, initialEntry2, initialExit2, initialNotes, isOpen]);

  if (!isOpen) return null;

  // Converte "HH:mm" em minutos para cálculo em tempo real
  const timeToMinutes = (t?: string): number => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const minutesToHHMM = (mins: number): string => {
    const sign = mins < 0 ? '-' : mins > 0 ? '+' : '';
    const abs = Math.abs(mins);
    const h = Math.floor(abs / 60);
    const m = Math.round(abs % 60);
    return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Cálculo ao vivo das horas trabalhadas
  let workedMinutes = 0;
  if (entry1 && exit1) {
    workedMinutes += Math.max(0, timeToMinutes(exit1) - timeToMinutes(entry1));
  }
  if (entry2 && exit2) {
    workedMinutes += Math.max(0, timeToMinutes(exit2) - timeToMinutes(entry2));
  } else if (entry1 && exit2 && !exit1 && !entry2) {
    workedMinutes = Math.max(0, timeToMinutes(exit2) - timeToMinutes(entry1) - 60);
  }

  // Verifica se a data selecionada cai em fim de semana
  const dateObj = new Date(selectedDate + 'T12:00:00');
  const dayOfWeek = dateObj.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const expectedMinutes = isWeekend ? 0 : employee.dailyHoursExpected * 60;
  const balanceMinutes = workedMinutes - expectedMinutes;

  const handlePreFillStandardShift = () => {
    setEntry1('08:00');
    setExit1('12:00');
    setEntry2('13:00');
    setExit2('17:00');
    if (!notes) {
      setNotes('Jornada padrão preenchida manualmente');
    }
  };

  const handleQuickNote = (quickText: string) => {
    setNotes(prev => (prev ? `${prev}; ${quickText}` : quickText));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      employeeId: employee.id,
      date: selectedDate,
      entry1: entry1 || undefined,
      exit1: exit1 || undefined,
      entry2: entry2 || undefined,
      exit2: exit2 || undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  const handleClearPunches = () => {
    onClearDay(employee.id, selectedDate);
    setEntry1('');
    setExit1('');
    setEntry2('');
    setExit2('');
    setNotes('');
    setConfirmClear(false);
    onClose();
  };

  const formattedDateBR = selectedDate
    ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-scale-in">
        {/* Cabeçalho do Modal */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-1">
              <Clock className="w-4 h-4" />
              <span>Edição Manual de Horário de Ponto</span>
            </div>
            <h3 className="text-lg font-black text-white">{employee.name}</h3>
            <p className="text-xs text-indigo-200 mt-0.5">
              Matrícula: <strong className="text-white">{employee.registrationNumber}</strong> • Cargo: {employee.role}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Seletor de Data */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                Data do Registro
              </span>
              <span className="text-[11px] text-slate-500 font-normal capitalize">
                {formattedDateBR}
              </span>
            </label>
            <input
              type="date"
              required
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Atalho de Preenchimento da Jornada Contratual */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs">
            <div>
              <span className="font-bold text-indigo-950 block">
                Jornada Contratual: {employee.workShift}
              </span>
              <span className="text-[11px] text-indigo-700">
                Previsto: {employee.dailyHoursExpected.toFixed(1)}h diárias
              </span>
            </div>
            <button
              type="button"
              onClick={handlePreFillStandardShift}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Preencher Padrão</span>
            </button>
          </div>

          {/* Grade de 4 Batidas do Dia */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Marcações de Horário do Dia (Digite os horários)
            </label>

            <div className="grid grid-cols-2 gap-3">
              {/* 1ª Entrada */}
              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/30">
                <label className="block text-[11px] font-bold uppercase text-emerald-800 mb-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  1ª Entrada
                </label>
                <input
                  type="time"
                  value={entry1}
                  onChange={(e) => setEntry1(e.target.value)}
                  placeholder="08:00"
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-emerald-700 mt-1 block">Início da jornada</span>
              </div>

              {/* Saída Almoço */}
              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/30">
                <label className="block text-[11px] font-bold uppercase text-amber-800 mb-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Saída Intervalo
                </label>
                <input
                  type="time"
                  value={exit1}
                  onChange={(e) => setExit1(e.target.value)}
                  placeholder="12:00"
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg font-mono font-bold text-sm text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-amber-700 mt-1 block">Saída para refeição</span>
              </div>

              {/* Retorno Almoço */}
              <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/30">
                <label className="block text-[11px] font-bold uppercase text-blue-800 mb-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Retorno Intervalo
                </label>
                <input
                  type="time"
                  value={entry2}
                  onChange={(e) => setEntry2(e.target.value)}
                  placeholder="13:00"
                  className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg font-mono font-bold text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-blue-700 mt-1 block">Retorno da refeição</span>
              </div>

              {/* 2ª Saída */}
              <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/30">
                <label className="block text-[11px] font-bold uppercase text-rose-800 mb-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  2ª Saída
                </label>
                <input
                  type="time"
                  value={exit2}
                  onChange={(e) => setExit2(e.target.value)}
                  placeholder="17:00"
                  className="w-full px-3 py-2 bg-white border border-rose-300 rounded-lg font-mono font-bold text-sm text-slate-900 focus:ring-2 focus:ring-rose-500"
                />
                <span className="text-[10px] text-rose-700 mt-1 block">Término da jornada</span>
              </div>
            </div>
          </div>

          {/* Resumo do Cálculo em Tempo Real */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Trabalhadas
              </span>
              <span className="text-sm font-mono font-extrabold text-slate-900">
                {workedMinutes > 0 ? minutesToHHMM(workedMinutes) : '00:00'}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Previstas
              </span>
              <span className="text-sm font-mono font-bold text-slate-600">
                {expectedMinutes > 0 ? `${(expectedMinutes / 60).toFixed(0)}h00` : '0h00'}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Saldo do Dia
              </span>
              <span
                className={`text-sm font-mono font-extrabold ${
                  balanceMinutes > 0
                    ? 'text-emerald-700'
                    : balanceMinutes < 0
                    ? 'text-rose-700'
                    : 'text-slate-600'
                }`}
              >
                {workedMinutes > 0 || expectedMinutes > 0
                  ? minutesToHHMM(balanceMinutes)
                  : '--:--'}
              </span>
            </div>
          </div>

          {/* Justificativa do Ajuste / Motivo */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Justificativa / Motivo do Ajuste *</span>
              <span className="text-[10px] text-slate-400 font-normal">Exigência CLT Portaria 671</span>
            </label>
            <input
              type="text"
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Esquecimento de batida / Ajuste autorizado pelo encarregado"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />

            {/* Chips de Sugestões Rápidas */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                'Esquecimento de registro',
                'Ajuste autorizado pela chefia',
                'Serviço externo em depósito',
                'Problema no leitor de ponto',
                'Compensação de jornada',
                'Atestado médico parcial',
              ].map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleQuickNote(chip)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-medium transition-colors cursor-pointer"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Botões do Rodapé */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <div>
              {confirmClear ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleClearPunches}
                    className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Confirmar Limpeza
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="px-2 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-semibold"
                  >
                    Não
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar Dia</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Horários</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
