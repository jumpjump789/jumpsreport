import { formatMoney } from '../lib/format';
import { MUTED, BORDER } from './Card';

const SIDEBAR_WIDTH = 188;

export default function Sidebar({ active, onNavigate, openingBalance, mobileOpen, onClose }) {
  const NavButton = ({ navKey, label }) => {
    const isActive = active === navKey;
    return (
      <button onClick={() => { onNavigate(navKey); onClose && onClose(); }}
        className="w-full text-left text-xs px-2.5 py-2 rounded-[9px] font-medium mb-1 transition-colors"
        style={isActive ? { background: '#e6f5f3', color: '#0f766e' } : { color: '#334155' }}>
        {label}
      </button>
    );
  };

  const content = (
    <div className="h-full flex flex-col" style={{ width: SIDEBAR_WIDTH, background: '#fff', borderRight: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 px-3 py-4">
        <div className="flex items-center justify-center rounded-[9px] font-bold text-white shrink-0 text-sm" style={{ width: 30, height: 30, background: '#0d9488' }}>JR</div>
        <div className="min-w-0">
          <p className="text-xs font-semibold leading-tight truncate" style={{ color: '#0f172a' }}>Jump's Report</p>
        </div>
      </div>
      <div className="px-2 flex-1 overflow-y-auto">
        <NavButton navKey="dashboard" label="แดชบอร์ด" />
        <p className="text-[10px] font-medium px-2.5 mt-3 mb-1" style={{ color: '#9aa4b2' }}>โมดูล</p>
        <NavButton navKey="travel" label="รายงานการเดินทาง" />
        <NavButton navKey="expense" label="รายรับ-จ่าย" />
        <NavButton navKey="report" label="รายงาน" />
      </div>
      <div className="px-3 py-3" style={{ borderTop: `1px solid ${BORDER}` }}>
        <p className="text-[10px]" style={{ color: MUTED }}>ยอดตั้งต้นระบบ</p>
        <p className="text-xs font-semibold mt-0.5 truncate" style={{ color: '#0f172a' }}>฿{formatMoney(openingBalance)}</p>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden md:block shrink-0" style={{ width: SIDEBAR_WIDTH }}>{content}</div>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
          <div className="relative z-10">{content}</div>
        </div>
      )}
    </>
  );
}
