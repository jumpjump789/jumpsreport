import { IconMenu, IconSearch, IconBell } from './Icons';
import { MUTED, BORDER } from './Card';

export default function Topbar({ onToggleSidebar, searchQuery, onSearchChange }) {
  return (
    <div className="sticky top-0 z-20 flex items-center gap-3 px-5 py-3" style={{ background: '#fff', borderBottom: `1px solid ${BORDER}` }}>
      <button onClick={onToggleSidebar} className="md:hidden flex items-center justify-center rounded-[10px] shrink-0" style={{ width: 40, height: 40, border: `1px solid ${BORDER}` }}>
        <IconMenu size={18} />
      </button>
      <div className="flex-1" style={{ maxWidth: 380 }}>
        <div className="flex items-center gap-2 rounded-[10px] px-3 py-2" style={{ background: '#f8fafc' }}>
          <IconSearch size={15} style={{ color: MUTED }} />
          <input value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder="ค้นหารายการรายรับ-จ่าย..."
            className="bg-transparent text-sm w-full focus:outline-none" style={{ color: '#0f172a' }} />
        </div>
      </div>
      <div className="flex-1" />
      <button className="relative hidden sm:flex items-center justify-center rounded-[10px]" style={{ width: 40, height: 40, border: `1px solid ${BORDER}` }}>
        <IconBell size={16} style={{ color: '#64748b' }} />
      </button>
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5" style={{ border: `1px solid ${BORDER}`, borderRadius: 12 }}>
        <div className="rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 shrink-0" style={{ width: 30, height: 30 }}>ผ</div>
        <div className="leading-tight">
          <p className="text-xs font-medium" style={{ color: '#0f172a' }}>ผู้ใช้งาน</p>
          <p className="text-[11px]" style={{ color: MUTED }}>user@stdtuss.local</p>
        </div>
      </div>
    </div>
  );
}
