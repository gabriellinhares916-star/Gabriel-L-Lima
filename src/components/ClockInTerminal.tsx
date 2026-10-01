import React, { useState, useEffect } from 'react';
import { Employee, TimePunch, PunchType } from '../types';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  ShieldCheck,
  FileCheck,
  Calendar,
  LogIn,
  LogOut,
  Coffee,
  RotateCcw,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface ClockInTerminalProps {
  employees: Employee[];
  punches: TimePunch[];
  onRegisterPunch: (params: {
    employeeId: string;
    type?: PunchType;
    customTime?: string;
    customDate?: string;
    notes?: string;
  }) => { success: boolean; punch?: TimePunch; error?: string };
  onNavigateToMirror: (employeeId: string) => void;
}

export const ClockInTerminal: React.FC<ClockInTerminalProps> = ({
  employees,
  punches,
  onRegisterPunch,
  onNavigateToMirror,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employees[0]?.id || '');
  const [pinInput, setPinInput] = useState<string>('');
  const [lastReceipt, setLastReceipt] = useState<TimePunch | null>(null);
  const [toastFeedback, setToastFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showManualEntry, setShowManualEntry] = useState<boolean>(false);
  const [manualDate, setManualDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [manualTime, setManualTime] = useState<string>('08:00');
  const [manualType, setManualType] = useState<PunchType>('ENTRADA');
  const [manualNotes, setManualNotes] = useState<string>('');

  // Relógio em tempo real com segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  // Batidas de hoje do funcionário selecionado
  const todayStr = currentTime.toISOString().substring(0, 10);
  const todayPunches = punches
    .filter(p => p.employeeId === selectedEmployeeId && p.date === todayStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  // Determina a próxima batida recomendada
  const getNextRecommendedPunch = (): { type: PunchType; label: string; icon: any } => {
    const count = todayPunches.length;
    if (count === 0) return { type: 'ENTRADA', label: '1ª Entrada (Início da Jornada)', icon: LogIn };
    if (count === 1) return { type: 'SAIDA_INTERVALO', label: 'Saída para Intervalo / Almoço', icon: Coffee };
    if (count === 2) return { type: 'RETORNO_INTERVALO', label: 'Retorno do Intervalo / Almoço', icon: RotateCcw };
    return { type: 'SAIDA', label: 'Saída Final (Término da Jornada)', icon: LogOut };
  };

  const nextAction = getNextRecommendedPunch();

  const handleExecutePunch = (type?: PunchType) => {
    if (!selectedEmployee) {
      setToastFeedback({ type: 'error', message: 'Selecione um colaborador primeiro.' });
      return;
    }

    // Se o colaborador tem PIN e foi digitado, validar opcionalmente
    if (pinInput && pinInput !== selectedEmployee.pin) {
      setToastFeedback({ type: 'error', message: 'PIN incorreto para este colaborador!' });
      return;
    }

    const res = onRegisterPunch({
      employeeId: selectedEmployee.id,
      type: type || nextAction.type,
    });

    if (res.success && res.punch) {
      setLastReceipt(res.punch);
      setPinInput('');
      setToastFeedback({
        type: 'success',
        message: `Ponto registrado com sucesso para ${selectedEmployee.name}!`,
      });
      setTimeout(() => setToastFeedback(null), 5000);
    } else {
      setToastFeedback({
        type: 'error',
        message: res.error || 'Erro ao registrar batida de ponto.',
      });
    }
  };

  const handleManualPunchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const res = onRegisterPunch({
      employeeId: selectedEmployee.id,
      type: manualType,
      customDate: manualDate || undefined,
      customTime: `${manualTime}:00`,
      notes: manualNotes || 'Ajuste manual com justificativa',
    });

    if (res.success && res.punch) {
      setLastReceipt(res.punch);
      setShowManualEntry(false);
      setManualNotes('');
      setToastFeedback({
        type: 'success',
        message: `Horário ${manualTime} registrado com sucesso para ${selectedEmployee.name}!`,
      });
    }
  };

  const formattedDate = currentTime.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const formattedHours = String(currentTime.getHours()).padStart(2, '0');
  const formattedMinutes = String(currentTime.getMinutes()).padStart(2, '0');
  const formattedSeconds = String(currentTime.getSeconds()).padStart(2, '0');

  return (
    <div className="space-y-6">
      {/* Top Banner de Informações Legais */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-indigo-900 text-white p-4 rounded-xl shadow-md border border-indigo-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-700/80 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-indigo-200" />
          </div>
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              Terminal Eletrônico de Ponto
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                REP-P Portaria 671 MTE
              </span>
            </h2>
            <p className="text-xs text-indigo-200">
              Registro digital com controle de NSR sequencial, comprovante instantâneo e sincronização com almoxarifado.
            </p>
          </div>
        </div>

        <div className="text-right hidden md:block">
          <span className="text-[11px] text-indigo-300 block">Fuso Horário Oficial</span>
          <span className="text-xs font-semibold text-white">Brasília (GMT-3)</span>
        </div>
      </div>

      {toastFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            toastFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {toastFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            )}
            {toastFeedback.message}
          </div>
          <button
            onClick={() => setToastFeedback(null)}
            className="text-xs underline font-semibold opacity-75 hover:opacity-100"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Grid Principal do Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Relógio Digital & Botão de Batida Rápida (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card do Relógio Gigante */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-8 rounded-2xl shadow-xl text-center relative overflow-hidden">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-300 text-xs font-medium mb-3 backdrop-blur-xs">
                <Calendar className="w-3.5 h-3.5" />
                <span className="capitalize">{formattedDate}</span>
              </div>

              {/* Display de Horas / Minutos / Segundos */}
              <div className="flex items-baseline justify-center gap-1 font-mono tracking-wider font-black my-2">
                <span className="text-5xl sm:text-7xl">{formattedHours}</span>
                <span className="text-4xl sm:text-6xl text-indigo-400 animate-pulse">:</span>
                <span className="text-5xl sm:text-7xl">{formattedMinutes}</span>
                <span className="text-2xl sm:text-3xl text-indigo-300 font-normal ml-2">
                  .{formattedSeconds}
                </span>
              </div>

              <p className="text-xs text-slate-400 mt-2">
                Horário sincronizado com precisão de segundo
              </p>

              {/* Botão de Registro Rápido */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <button
                  onClick={() => handleExecutePunch()}
                  disabled={!selectedEmployee}
                  className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-bold text-base rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-3 mx-auto cursor-pointer"
                >
                  <CheckCircle2 className="w-6 h-6" />
                  <span>Bater Ponto Agora: {nextAction.label.split('(')[0]}</span>
                </button>
              </div>
            </div>

            {/* Efeito visual de fundo */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Botões Específicos por Tipo de Batida */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Registros Específicos de Batida
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={() => handleExecutePunch('ENTRADA')}
                className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-800 flex flex-col items-center gap-1.5 transition-all cursor-pointer text-center"
              >
                <LogIn className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-bold">1ª Entrada</span>
                <span className="text-[10px] text-emerald-600/80">Início</span>
              </button>

              <button
                onClick={() => handleExecutePunch('SAIDA_INTERVALO')}
                className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 text-amber-800 flex flex-col items-center gap-1.5 transition-all cursor-pointer text-center"
              >
                <Coffee className="w-5 h-5 text-amber-600" />
                <span className="text-xs font-bold">Intervalo</span>
                <span className="text-[10px] text-amber-600/80">Almoço</span>
              </button>

              <button
                onClick={() => handleExecutePunch('RETORNO_INTERVALO')}
                className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-blue-800 flex flex-col items-center gap-1.5 transition-all cursor-pointer text-center"
              >
                <RotateCcw className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-bold">Retorno</span>
                <span className="text-[10px] text-blue-600/80">Pós-almoço</span>
              </button>

              <button
                onClick={() => handleExecutePunch('SAIDA')}
                className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/60 text-rose-800 flex flex-col items-center gap-1.5 transition-all cursor-pointer text-center"
              >
                <LogOut className="w-5 h-5 text-rose-600" />
                <span className="text-xs font-bold">2ª Saída</span>
                <span className="text-[10px] text-rose-600/80">Fim do dia</span>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setShowManualEntry(!showManualEntry)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
              >
                {showManualEntry ? 'Fechar Formulário Manual' : 'Precisa registrar batida manual retroativa ou esquecida?'}
              </button>
            </div>

            {/* Formulário de Batida Manual / Ocorrência */}
            {showManualEntry && (
              <form onSubmit={handleManualPunchSubmit} className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800">
                  Ajuste Manual de Ponto com Justificativa
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Data da Batida
                    </label>
                    <input
                      type="date"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Horário Digitado (HH:mm)
                    </label>
                    <input
                      type="time"
                      value={manualTime}
                      onChange={(e) => setManualTime(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Tipo de Batida
                    </label>
                    <select
                      value={manualType}
                      onChange={(e) => setManualType(e.target.value as PunchType)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-semibold"
                    >
                      <option value="ENTRADA">1ª Entrada</option>
                      <option value="SAIDA_INTERVALO">Saída Intervalo</option>
                      <option value="RETORNO_INTERVALO">Retorno Intervalo</option>
                      <option value="SAIDA">2ª Saída</option>
                      <option value="EXTRA">Hora Extra Avulsa</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Justificativa da Ocorrência
                  </label>
                  <input
                    type="text"
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    placeholder="Ex: Esquecimento de crachá / Ajuste autorizado pelo supervisor"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowManualEntry(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                  >
                    Salvar Ajuste
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Coluna Direita: Seleção do Colaborador, Status de Hoje & Comprovante (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card de Identificação do Colaborador */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
              <span>Colaborador Identificado</span>
              <span className="text-indigo-600 font-semibold">{employees.length} cadastrados</span>
            </h3>

            {/* Dropdown seletor rápido */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Selecione o Colaborador:
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.registrationNumber} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              {selectedEmployee && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                    {selectedEmployee.avatarInitials || selectedEmployee.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {selectedEmployee.name}
                    </h4>
                    <p className="text-xs text-indigo-700 font-semibold">
                      {selectedEmployee.role}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                      <span>Matrícula: <strong className="text-slate-700">{selectedEmployee.registrationNumber}</strong></span>
                      <span>•</span>
                      <span>Depto: <strong className="text-slate-700">{selectedEmployee.department}</strong></span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Jornada: {selectedEmployee.workShift}
                    </p>
                  </div>
                </div>
              )}

              {/* PIN rápido */}
              {selectedEmployee && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Código PIN Rápido (Opcional - padrão: {selectedEmployee.pin}):
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder={`PIN de ${selectedEmployee.name.split(' ')[0]}`}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-center tracking-widest font-mono font-bold"
                  />
                </div>
              )}
            </div>

            {/* Resumo das Batidas de Hoje */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">
                  Batidas Registradas Hoje ({todayPunches.length})
                </span>
                {selectedEmployee && (
                  <button
                    onClick={() => onNavigateToMirror(selectedEmployee.id)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-0.5"
                  >
                    Ver Espelho do Mês
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {todayPunches.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Nenhuma batida registrada hoje para este colaborador.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {todayPunches.map((p, idx) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {p.type === 'ENTRADA' ? '1ª Entrada' :
                           p.type === 'SAIDA_INTERVALO' ? 'Saída Intervalo' :
                           p.type === 'RETORNO_INTERVALO' ? 'Retorno Intervalo' :
                           p.type === 'SAIDA' ? '2ª Saída' : 'Batida Extra'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {p.time}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          NSR: #{p.nsr}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Comprovante de Ponto Digital Instantâneo */}
          {lastReceipt && (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xs space-y-2 relative animate-fade-in shadow-xs">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <FileCheck className="w-4 h-4 text-emerald-700" />
                  Comprovante de Registro de Ponto do Trabalhador
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                  NSR: {lastReceipt.nsr}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-500 block">Colaborador:</span>
                  <strong className="text-slate-900">{lastReceipt.employeeName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Data e Horário:</span>
                  <strong className="text-slate-900">{lastReceipt.date.split('-').reverse().join('/')} às {lastReceipt.time}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Tipo da Batida:</span>
                  <strong className="text-slate-900">{lastReceipt.type}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Dispositivo / Origem:</span>
                  <span className="text-slate-600">{lastReceipt.device || 'REP-P Almoxarifado'}</span>
                </div>
              </div>

              <div className="pt-2 text-[10px] text-emerald-800 border-t border-emerald-200/60 flex items-center justify-between">
                <span>Certificado pelo sistema de controle de ponto interno</span>
                <span className="font-mono text-slate-400">HASH: {lastReceipt.id.substring(0, 14)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
