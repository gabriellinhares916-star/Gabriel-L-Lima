import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import {
  User,
  Clock,
  Briefcase,
  Building,
  KeyRound,
  X,
  Save,
  CheckCircle2,
  Calendar
} from 'lucide-react';

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  onSave: (updated: Employee) => void;
}

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSave,
}) => {
  const [name, setName] = useState<string>(employee.name);
  const [registrationNumber, setRegistrationNumber] = useState<string>(employee.registrationNumber);
  const [cpf, setCpf] = useState<string>(employee.cpf);
  const [role, setRole] = useState<string>(employee.role);
  const [department, setDepartment] = useState<string>(employee.department);
  const [workShift, setWorkShift] = useState<string>(employee.workShift);
  const [dailyHoursExpected, setDailyHoursExpected] = useState<number>(employee.dailyHoursExpected);
  const [pin, setPin] = useState<string>(employee.pin);
  const [status, setStatus] = useState<'ATIVO' | 'FERIAS' | 'AFASTADO'>(employee.status);
  const [phone, setPhone] = useState<string>(employee.phone || '');
  const [email, setEmail] = useState<string>(employee.email || '');

  useEffect(() => {
    setName(employee.name);
    setRegistrationNumber(employee.registrationNumber);
    setCpf(employee.cpf);
    setRole(employee.role);
    setDepartment(employee.department);
    setWorkShift(employee.workShift);
    setDailyHoursExpected(employee.dailyHoursExpected);
    setPin(employee.pin);
    setStatus(employee.status);
    setPhone(employee.phone || '');
    setEmail(employee.email || '');
  }, [employee, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const initials = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');

    onSave({
      ...employee,
      name: name.trim(),
      registrationNumber: registrationNumber.trim(),
      cpf: cpf.trim(),
      role: role.trim(),
      department,
      workShift: workShift.trim(),
      dailyHoursExpected: Number(dailyHoursExpected),
      pin: pin.trim(),
      status,
      avatarInitials: initials || employee.avatarInitials,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
    });

    onClose();
  };

  const presetShifts = [
    { label: '08:00 às 17:00 (Seg a Sex)', hours: 8.0 },
    { label: '07:30 às 17:18 (Seg a Sex - 44h)', hours: 8.8 },
    { label: '07:00 às 16:00 (Seg a Sex)', hours: 8.0 },
    { label: '06:00 às 14:20 (Turno A)', hours: 7.33 },
    { label: '14:00 às 22:20 (Turno B)', hours: 7.33 },
    { label: '12x36 Diurno (07:00 às 19:00)', hours: 12.0 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-scale-in">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-1">
              <Clock className="w-4 h-4" />
              <span>Editar Horário & Cadastro do Colaborador</span>
            </div>
            <h3 className="text-lg font-black text-white">{employee.name}</h3>
            <p className="text-xs text-indigo-200 mt-0.5">
              Matrícula: <strong className="text-white">{employee.registrationNumber}</strong>
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Nome e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Situação / Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-semibold text-slate-800"
              >
                <option value="ATIVO">ATIVO</option>
                <option value="FERIAS">FÉRIAS</option>
                <option value="AFASTADO">AFASTADO</option>
              </select>
            </div>
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
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
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
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Departamento *
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
              >
                <option value="Almoxarifado & Estoque">Almoxarifado & Estoque</option>
                <option value="Recebimento Fiscal">Recebimento Fiscal</option>
                <option value="Estoque & Logística">Estoque & Logística</option>
                <option value="Expedição & Armazém">Expedição & Armazém</option>
                <option value="Faturamento & Controle">Faturamento & Controle</option>
              </select>
            </div>
          </div>

          {/* Seção Destaque: Jornada de Trabalho e Horas Contratuais */}
          <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-3">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Configuração da Jornada de Horário de Trabalho</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Horário Contratual (Descrição da Escala) *
                </label>
                <input
                  type="text"
                  required
                  value={workShift}
                  onChange={(e) => setWorkShift(e.target.value)}
                  placeholder="Ex: 08:00 às 17:00 (Segunda a Sexta)"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Horas Previstas/Dia *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="24"
                  required
                  value={dailyHoursExpected}
                  onChange={(e) => setDailyHoursExpected(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold font-mono text-center"
                />
              </div>
            </div>

            {/* Presets de Jornadas Comuns */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                Modelos de Horário Rápidos:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {presetShifts.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setWorkShift(preset.label);
                      setDailyHoursExpected(preset.hours);
                    }}
                    className="px-2 py-1 bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* PIN do Relógio e Contato */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                PIN do Relógio (4-6 dígitos)
              </label>
              <input
                type="text"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-indigo-700"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 98888-7777"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
