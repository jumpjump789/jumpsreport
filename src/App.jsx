import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import DashboardPage from './pages/DashboardPage';
import TravelReportPage from './pages/TravelReportPage';
import ExpensePage from './pages/ExpensePage';
import ExpenseReportPage from './pages/ExpenseReportPage';
import { getMeta } from './lib/data';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openingBalance, setOpeningBalance] = useState(0);
  const [editingExpense, setEditingExpense] = useState(null);

  useEffect(() => {
    getMeta('expense-opening-balance')
      .then((ob) => setOpeningBalance(ob && typeof ob.value === 'number' ? ob.value : 0))
      .catch(() => {});
  }, []);

  function handleEditRequest(record) {
    setEditingExpense(record);
    setActivePage('expense');
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#f4f6f9' }}>
      <Sidebar active={activePage} onNavigate={setActivePage} openingBalance={openingBalance}
        mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onToggleSidebar={() => setMobileSidebarOpen(true)} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <div className="flex-1 overflow-auto" style={{ padding: 22 }}>
          {activePage === 'dashboard' && <DashboardPage onNavigate={setActivePage} />}
          {activePage === 'travel' && <TravelReportPage />}
          {activePage === 'expense' && (
            <ExpensePage editingRecord={editingExpense} onDoneEditing={() => setEditingExpense(null)} onOpeningBalanceChanged={setOpeningBalance} />
          )}
          {activePage === 'report' && <ExpenseReportPage searchQuery={searchQuery} onEditRequest={handleEditRequest} />}
        </div>
      </div>
    </div>
  );
}
