import Card, { MUTED, BORDER } from './Card';
import { IconDownload, IconPencil, IconTrash } from './Icons';
import { JOB_TYPE_COLUMNS } from './ExpenseForm';
import { formatThaiDateShort, formatMoney } from '../lib/format';

export default function ExpenseTable({ rows, filters, onFilterChange, jobTypes, onExport, onEdit, onDelete, totals }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold" style={{ color: '#0f172a' }}>
          ตารางรายการ <span className="font-normal" style={{ color: MUTED }}>({rows.length} รายการ)</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs" style={{ color: '#64748b' }}>
            <input type="date" value={filters.dateFrom} onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value })}
              className="rounded-[9px] border px-2 py-1 text-xs" style={{ borderColor: BORDER }} />
            <span>–</span>
            <input type="date" value={filters.dateTo} onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value })}
              className="rounded-[9px] border px-2 py-1 text-xs" style={{ borderColor: BORDER }} />
          </div>
          <select value={filters.jobType} onChange={(e) => onFilterChange({ ...filters, jobType: e.target.value })}
            className="rounded-[9px] border px-2 py-1 text-xs bg-white" style={{ borderColor: BORDER }}>
            <option value="">ประเภทงาน: ทั้งหมด</option>
            {jobTypes.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
          <button onClick={onExport} className="text-xs border rounded-[9px] px-3 py-1.5 hover:opacity-80 flex items-center gap-1" style={{ borderColor: BORDER }}>
            <IconDownload size={12} /> ดาวน์โหลด Excel
          </button>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: MUTED }}>ยังไม่มีรายการในช่วงที่เลือก</div>
      ) : (
        <div style={{ overflow: 'auto' }}>
          <table style={{ minWidth: 1180, width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {[
                  { h: 'วันที่', align: 'left' }, { h: 'เลขที่ใบเสร็จ', align: 'left' }, { h: 'ชื่อบริษัท', align: 'left' },
                  { h: 'โครงการ / สถานที่', align: 'left' }, { h: 'คำอธิบายรายการ', align: 'left' },
                  { h: 'งานขายอะไหล่', align: 'center' }, { h: 'งาน PM', align: 'center' }, { h: 'งานปรับปรุง', align: 'center' }, { h: 'งานเคลม', align: 'center' },
                  { h: 'เบิก', align: 'right' }, { h: 'รับ', align: 'right' }, { h: 'เงินคงเหลือ', align: 'right' }, { h: '', align: 'left' },
                ].map((col, i) => (
                  <th key={i} className="text-xs font-medium px-3 py-2 whitespace-nowrap" style={{ color: '#64748b', textAlign: col.align }}>{col.h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid #f1f4f8' }}>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{formatThaiDateShort(r.transaction_date)}</td>
                  <td className="px-3 py-2 text-xs font-mono">{r.receipt_no || '—'}</td>
                  <td className="px-3 py-2 text-xs">{r.company_name || '—'}</td>
                  <td className="px-3 py-2 text-xs">{r.project_site || '—'}</td>
                  <td className="px-3 py-2 text-xs">{r.description || '—'}</td>
                  {JOB_TYPE_COLUMNS.map((jt) => <td key={jt} className="px-3 py-2 text-xs text-center text-teal-700">{r.job_type === jt ? '✓' : ''}</td>)}
                  <td className="px-3 py-2 text-xs text-right text-amber-700">{r.expense_amount ? formatMoney(r.expense_amount) : '—'}</td>
                  <td className="px-3 py-2 text-xs text-right text-teal-700">{r.income_amount ? formatMoney(r.income_amount) : '—'}</td>
                  <td className={`px-3 py-2 text-xs text-right font-semibold ${r.balance < 0 ? 'text-rose-600' : ''}`} style={r.balance >= 0 ? { color: '#0f172a' } : {}}>{formatMoney(r.balance)}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    <button onClick={() => onEdit(r)} className="hover:text-teal-700 mr-2" style={{ color: MUTED }}><IconPencil size={13} /></button>
                    <button onClick={() => onDelete(r.id)} className="hover:text-rose-600" style={{ color: MUTED }}><IconTrash size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #e4e8ee' }}>
                <td colSpan={9} className="px-3 py-2 text-xs font-medium" style={{ color: '#64748b' }}>รวมช่วงที่เลือก</td>
                <td className="px-3 py-2 text-xs text-right font-semibold text-amber-700">{formatMoney(totals.expense)}</td>
                <td className="px-3 py-2 text-xs text-right font-semibold text-teal-700">{formatMoney(totals.income)}</td>
                <td className={`px-3 py-2 text-xs text-right font-bold ${totals.currentBalance < 0 ? 'text-rose-600' : ''}`} style={totals.currentBalance >= 0 ? { color: '#0f172a' } : {}}>{formatMoney(totals.currentBalance)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  );
}
