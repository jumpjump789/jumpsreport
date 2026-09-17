import { formatMoney } from '../lib/format';
import { MUTED, BORDER } from './Card';

export default function Sidebar({ active, onNavigate, openingBalance, mobileOpen, onClose }) {
  const NavButton = ({ navKey, label }) => {
    const isActive = active === navKey;
    return (
      <button onClick={() => { onNavigate(navKey); onClose && onClose(); }}
        className="w-full text-left text-sm px-3 py-2 rounded-[10px] font-medium mb-1 transition-colors"
        style={isActive ? { background: '#e6f5f3', color: '#0f766e' } : { color: '#334155' }}>
        {label}
      </button>
    );
  };

  const content = (
    <div className="h-full flex flex-col" style={{ width: 250, background: '#fff', borderRight: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="flex items-center justify-center rounded-[10px] font-bold text-white shrink-0" style={{ width: 38, height: 38, background: '#0d9488' }}>JR</div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight truncate" style={{ color: '#0f172a' }}>Jump's Report</p>
        </div>
      </div>
      <div className="px-3 flex-1 overflow-y-auto">
        <NavButton navKey="dashboard" label="แดชบอร์ด" />
        <p className="text-[11px] font-medium px-3 mt-4 mb-1" style={{ color: '#9aa4b2' }}>โมดูล</p>
        <NavButton navKey="travel" label="รายงานการเดินทาง" />
        <NavButton navKey="expense" label="รายรับ-จ่าย" />
        <NavButton navKey="report" label="รายงาน" />
      </div>
      <div className="px-4 py-4" style={{ borderTop: `1px solid ${BORDER}` }}>
        <p className="text-xs" style={{ color: MUTED }}>ยอดตั้งต้นระบบ</p>
        <p className="text-sm font-semibold mt-0.5" style={{ color: '#0f172a' }}>฿{formatMoney(openingBalance)}</p>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden md:block shrink-0" style={{ width: 250 }}>{content}</div>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
          <div className="relative z-10">{content}</div>
        </div>
      )}
    </>
  );
}
