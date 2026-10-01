import React, { useState, useEffect } from 'react';
import { Product, Invoice, StockMovement, MovementType, Employee, TimePunch, PunchType } from './types';
import {
  getStoredProducts,
  saveStoredProducts,
  getStoredInvoices,
  getStoredMovements,
  processInvoiceEntry,
  registerStockMovement,
  resetDemoDatabase,
  updateProductPrice
} from './utils/storage';
import {
  getStoredEmployees,
  saveStoredEmployees,
  getStoredPunches,
  registerTimePunch,
  updateDayPunches,
  deleteEmployeePunchesForDate,
  updateEmployee
} from './utils/timeClockStorage';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { InvoiceEntry } from './components/InvoiceEntry';
import { InventoryManager } from './components/InventoryManager';
import { InvoicesList } from './components/InvoicesList';
import { MonthlyReportView } from './components/MonthlyReportView';
import { PriceConsultationView } from './components/PriceConsultationView';
import { TimeClockDashboard } from './components/TimeClockDashboard';
import { OSSimulationView } from './components/OSSimulationView';
import { DanfeModal } from './components/DanfeModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'entry' | 'stock' | 'prices' | 'timeclock' | 'invoices' | 'reports' | 'os_simulation'>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [punches, setPunches] = useState<TimePunch[]>([]);
  const [activeDanfeInvoice, setActiveDanfeInvoice] = useState<Invoice | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Carregar dados na inicialização
  useEffect(() => {
    setProducts(getStoredProducts());
    setInvoices(getStoredInvoices());
    setMovements(getStoredMovements());
    setEmployees(getStoredEmployees());
    setPunches(getStoredPunches());
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Registrar batida de ponto
  const handleRegisterPunch = (params: {
    employeeId: string;
    type?: PunchType;
    customTime?: string;
    customDate?: string;
    notes?: string;
  }) => {
    const res = registerTimePunch(params);
    if (res.success && res.punch) {
      setPunches(res.punches);
      showToast(`Ponto de ${res.punch.employeeName} registrado com sucesso! NSR: #${res.punch.nsr}`);
    }
    return res;
  };

  // Atualizar horários de um dia específico (digitação manual ou ajuste)
  const handleUpdateDayPunches = (params: {
    employeeId: string;
    date: string;
    entry1?: string;
    exit1?: string;
    entry2?: string;
    exit2?: string;
    notes?: string;
  }) => {
    const res = updateDayPunches(params);
    if (res.success) {
      setPunches(res.punches);
      showToast('Horários do colaborador atualizados com sucesso!');
    }
  };

  // Limpar horários de um dia
  const handleClearDayPunches = (employeeId: string, date: string) => {
    const res = deleteEmployeePunchesForDate(employeeId, date);
    if (res.success) {
      setPunches(res.punches);
      showToast('Horários do dia removidos com sucesso.');
    }
  };

  // Cadastrar novo colaborador
  const handleAddNewEmployee = (employeeData: Omit<Employee, 'id'>) => {
    const newEmp: Employee = {
      ...employeeData,
      id: `emp-${Date.now()}`,
    };
    const updated = [...employees, newEmp];
    setEmployees(updated);
    saveStoredEmployees(updated);
    showToast(`Colaborador ${newEmp.name} cadastrado com sucesso!`);
  };

  // Atualizar dados e jornada de um colaborador
  const handleUpdateEmployee = (updatedEmp: Employee) => {
    const res = updateEmployee(updatedEmp);
    if (res.success) {
      setEmployees(res.employees);
      showToast(`Cadastro e horários de ${updatedEmp.name} atualizados com sucesso!`);
    }
  };

  // Atualizar preço de venda de um produto
  const handleUpdateProductPrice = (productId: string, newSellingPrice: number) => {
    const updated = updateProductPrice(productId, newSellingPrice);
    setProducts(updated);
    showToast('Preço de venda atualizado com sucesso no estoque!');
  };

  // Processar entrada de NF-e e atualizar estoque
  const handleConfirmInvoiceEntry = (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'status'>) => {
    const result = processInvoiceEntry(invoiceData);
    setProducts(result.products);
    setInvoices(result.invoices);
    setMovements(result.movements);
    showToast(`Entrada da NF-e nº ${invoiceData.number} efetivada com sucesso no estoque!`);
  };

  // Registrar movimentação manual (saída/consumo/ajuste)
  const handleSaveMovement = (params: {
    productId: string;
    type: MovementType;
    quantity: number;
    date: string;
    documentNumber?: string;
    supplierOrCustomer?: string;
    notes?: string;
  }) => {
    const result = registerStockMovement(params);
    if (!result.success) {
      alert(result.error || 'Erro ao registrar movimentação.');
      return;
    }
    setProducts(result.products);
    setMovements(result.movements);
    showToast('Movimentação de estoque registrada com sucesso!');
  };

  // Cadastrar novo produto manual
  const handleAddNewProduct = (newProductData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...newProductData,
      id: `prod-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [newProduct, ...products];
    setProducts(updated);
    saveStoredProducts(updated);

    // Se começou com saldo inicial, registra movimentação
    if (newProduct.currentStock > 0) {
      registerStockMovement({
        productId: newProduct.id,
        type: 'ENTRADA_AJUSTE',
        quantity: newProduct.currentStock,
        date: now,
        documentNumber: 'SALDO_INICIAL',
        notes: 'Cadastro inicial de produto com saldo em estoque',
      });
      setMovements(getStoredMovements());
    }

    showToast(`Produto ${newProduct.name} cadastrado com sucesso!`);
  };

  // Resetar para dados de demonstração
  const handleResetDemo = () => {
    if (window.confirm('Deseja recarregar os dados de exemplo do sistema? Isto restaurará os produtos, notas, movimentações e pontos padrão.')) {
      const demo = resetDemoDatabase();
      localStorage.removeItem('nfe_stock_employees_v1');
      localStorage.removeItem('nfe_stock_punches_v1');
      setProducts(demo.products);
      setInvoices(demo.invoices);
      setMovements(demo.movements);
      setEmployees(getStoredEmployees());
      setPunches(getStoredPunches());
      showToast('Dados de demonstração restaurados com sucesso!');
    }
  };

  const lowStockCount = products.filter(p => p.currentStock <= p.minStock).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-800 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Header */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onResetDemo={handleResetDemo}
        lowStockAlertsCount={lowStockCount}
      />

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'dashboard' && (
          <Dashboard
            products={products}
            movements={movements}
            invoices={invoices}
            onNavigate={setCurrentTab}
            onOpenDanfe={(inv) => setActiveDanfeInvoice(inv)}
          />
        )}

        {currentTab === 'entry' && (
          <InvoiceEntry
            products={products}
            onConfirmEntry={handleConfirmInvoiceEntry}
            onNavigateToStock={() => setCurrentTab('stock')}
          />
        )}

        {currentTab === 'stock' && (
          <InventoryManager
            products={products}
            movements={movements}
            onSaveMovement={handleSaveMovement}
            onAddNewProduct={handleAddNewProduct}
          />
        )}

        {currentTab === 'prices' && (
          <PriceConsultationView
            products={products}
            movements={movements}
            invoices={invoices}
            onUpdateProductPrice={handleUpdateProductPrice}
            onNavigateToEntry={() => setCurrentTab('entry')}
            onNavigateToKardex={() => setCurrentTab('stock')}
          />
        )}

        {currentTab === 'timeclock' && (
          <TimeClockDashboard
            employees={employees}
            punches={punches}
            onRegisterPunch={handleRegisterPunch}
            onAddNewEmployee={handleAddNewEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onUpdateDayPunches={handleUpdateDayPunches}
            onClearDayPunches={handleClearDayPunches}
          />
        )}

        {currentTab === 'invoices' && (
          <InvoicesList
            invoices={invoices}
            onNavigateToNewEntry={() => setCurrentTab('entry')}
          />
        )}

        {currentTab === 'reports' && (
          <MonthlyReportView
            products={products}
            movements={movements}
            invoices={invoices}
          />
        )}

        {currentTab === 'os_simulation' && (
          <OSSimulationView />
        )}
      </main>

      {/* DANFE Global Modal */}
      {activeDanfeInvoice && (
        <DanfeModal
          invoice={activeDanfeInvoice}
          onClose={() => setActiveDanfeInvoice(null)}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Gestor NF-e & Controle de Estoque • SEFAZ NF-e Layout 4.00</span>
          <span>Cálculo Automático de Custo Médio Ponderado Móvel (CMPM)</span>
        </div>
      </footer>
    </div>
  );
}
