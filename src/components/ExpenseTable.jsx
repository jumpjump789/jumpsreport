import { useState, useMemo } from 'react';
import Card, { MUTED, BORDER } from './Card';
import { IconDownload, IconPencil, IconTrash, IconCheckCircle, IconX, IconPlus } from './Icons';
import { formatThaiDateShort, formatMoney } from '../lib/format';

const EMPTY_DRAFT = {
  transaction_date: '', receipt_no: '', company_name: '', project_site: '',
  description: '', job_type: '', expense_amount: '', income_amount: '', notes: '',
};

const inputBase = "w-full rounded-[6px] border px-1.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500";

export default function ExpenseTable({ rows, filters, onFilterChange, jobTypes, onExport, onSaveRow, onDelete, totals, onClearSelected, onUnclear }) {
  const [editingId, setEditingId] = useState(null); // row id, or 'NEW'
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [clearing, setClearing] = useState(false);

  function startEdit(row) {
    setEditingId(row.id);
    setDraft({ ...EMPTY_DRAFT, ...row });
  }

  function startNew() {
    setEditingId('NEW');
    setDraft({ ...EMPTY_DRAFT, transaction_date: new Date().toISOString().slice(0, 10) });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  async function commitEdit() {
    setSaving(true);
    try {
      const record = {
        id: editingId === 'NEW' ? `manual-${Date.now()}` : editingId,
        transaction_date: draft.transaction_date, receipt_no: draft.receipt_no, company_name: draft.company_name,
        project_site: draft.project_site, description: draft.description, job_type: draft.job_type,
        expense_amount: draft.expense_amount, income_amount: draft.income_amount, notes: draft.notes || '',
        cleared: draft.cleared || false,
        created_at: draft.created_at || new Date().toISOString(),
      };
      await onSaveRow(record);
      cancelEdit();
    } finally {
      setSaving(false);
    }
  }

  function setField(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const selectedRows = useMemo(() => rows.filter((r) => selectedIds.has(r.id)), [rows, selectedIds]);
  const selectedTotal = useMemo(() => selectedRows.reduce((s, r) => s + (parseFloat(r.expense_amount) || 0), 0), [selectedRows]);

  async function handleClear() {
    if (selectedRows.length === 0) return;
    setClearing(true);
    try {
      await onClearSelected(selectedRows);
      setSelectedIds(new Set());
    } finally {
      setClearing(false);
    }
  }

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
          <button onClick={startNew} disabled={editingId !== null}
            className="text-xs bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white rounded-[9px] px-3 py-1.5 flex items-center gap-1">
            <IconPlus size={12} /> เพิ่มแถว
          </button>
          <button onClick={onExport} className="text-xs border rounded-[9px] px-3 py-1.5 hover:opacity-80 flex items-center gap-1" style={{ borderColor: BORDER }}>
            <IconDownload size={12} /> ดาวน์โหลด Excel
          </button>
        </div>
      </div>

      {selectedRows.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[10px] px-3 py-2" style={{ background: '#f0fdfa', border: '1px solid #99f6e4' }}>
          <p className="text-xs" style={{ color: '#0f766e' }}>
            เลือกแล้ว {selectedRows.length} รายการ — รวมเบิก ฿{formatMoney(selectedTotal)}
          </p>
          <button onClick={handleClear} disabled={clearing}
            className="text-xs bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-[9px] px-3 py-1.5 font-medium">
            {clearing ? 'กำลังสร้างใบเคลียร์…' : 'เคลียร์รายการที่เลือก'}
          </button>
        </div>
      )}

      <p className="text-xs mb-2" style={{ color: MUTED }}>คลิกไอคอนดินสอที่แถวเพื่อแก้ไขตรงในตารางได้เลย (เหมือน Excel) — ติ๊กช่องซ้ายสุดเพื่อเลือกรายการไปเคลียร์</p>

      {rows.length === 0 && editingId !== 'NEW' ? (
        <div className="text-center py-12 text-sm" style={{ color: MUTED }}>ยังไม่มีรายการในช่วงที่เลือก</div>
      ) : (
        <div style={{ overflow: 'auto' }}>
          <table style={{ minWidth: 1230, width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th className="px-2 py-2"></th>
                {[
                  { h: 'วันที่', align: 'left' }, { h: 'เลขที่ใบเสร็จ', align: 'left' }, { h: 'ชื่อบริษัท', align: 'left' },
                  { h: 'โครงการ / สถานที่', align: 'left' }, { h: 'คำอธิบายรายการ', align: 'left' },
                  { h: 'เบิก', align: 'right' }, { h: 'รับ', align: 'right' }, { h: 'เงินคงเหลือ', align: 'right' }, { h: '', align: 'left' },
                ].map((col, i) => (
                  <th key={i} className="text-xs font-medium px-3 py-2 whitespace-nowrap" style={{ color: '#64748b', textAlign: col.align }}>{col.h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {editingId === 'NEW' && (
                <EditableRow draft={draft} setField={setField} onCommit={commitEdit} onCancel={cancelEdit} saving={saving} />
              )}
              {rows.map((r) => (
                editingId === r.id ? (
                  <EditableRow key={r.id} draft={draft} setField={setField} onCommit={commitEdit} onCancel={cancelEdit} saving={saving} />
                ) : (
                  <tr key={r.id} style={{ borderTop: '1px solid #f1f4f8', background: r.cleared ? '#f0fdfa' : '#fff7ed' }}>
                    <td className="px-2 py-2 text-center">
                      <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} disabled={editingId !== null} />
                    </td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      {formatThaiDateShort(r.transaction_date)}
                      {r.cleared && (
                        <button onClick={() => onUnclear(r.id)} title="เคลียร์แล้ว — คลิกเพื่อยกเลิก"
                          className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: '#ccfbf1', color: '#0f766e' }}>
                          <IconCheckCircle size={9} /> เคลียร์แล้ว
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono">{r.receipt_no || '—'}</td>
                    <td className="px-3 py-2 text-xs">{r.company_name || '—'}</td>
                    <td className="px-3 py-2 text-xs">{r.project_site || '—'}</td>
                    <td className="px-3 py-2 text-xs">{r.description || '—'}</td>
                    <td className="px-3 py-2 text-xs text-right text-amber-700">{r.expense_amount ? formatMoney(r.expense_amount) : '—'}</td>
                    <td className="px-3 py-2 text-xs text-right text-teal-700">{r.income_amount ? formatMoney(r.income_amount) : '—'}</td>
                    <td className={`px-3 py-2 text-xs text-right font-semibold ${r.balance < 0 ? 'text-rose-600' : ''}`} style={r.balance >= 0 ? { color: '#0f172a' } : {}}>{formatMoney(r.balance)}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      <button onClick={() => startEdit(r)} disabled={editingId !== null} className="hover:text-teal-700 mr-2 disabled:opacity-30" style={{ color: MUTED }}><IconPencil size={13} /></button>
                      <button onClick={() => onDelete(r.id)} disabled={editingId !== null} className="hover:text-rose-600 disabled:opacity-30" style={{ color: MUTED }}><IconTrash size={13} /></button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #e4e8ee' }}>
                <td colSpan={6} className="px-3 py-2 text-xs font-medium" style={{ color: '#64748b' }}>รวมช่วงที่เลือก</td>
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

function EditableRow({ draft, setField, onCommit, onCancel, saving }) {
  return (
    <tr style={{ borderTop: '1px solid #f1f4f8', background: '#f0fdfa' }}>
      <td className="px-2 py-2"></td>
      <td className="px-1.5 py-1.5">
        <input type="date" value={draft.transaction_date} onChange={(e) => setField('transaction_date', e.target.value)}
          className={inputBase} style={{ borderColor: BORDER }} />
      </td>
      <td className="px-1.5 py-1.5">
        <input type="text" value={draft.receipt_no} onChange={(e) => setField('receipt_no', e.target.value)}
          className={`${inputBase} font-mono`} style={{ borderColor: BORDER }} />
      </td>
      <td className="px-1.5 py-1.5">
        <input type="text" value={draft.company_name} onChange={(e) => setField('company_name', e.target.value)}
          className={inputBase} style={{ borderColor: BORDER, minWidth: 110 }} />
      </td>
      <td className="px-1.5 py-1.5">
        <input type="text" value={draft.project_site} onChange={(e) => setField('project_site', e.target.value)}
          className={inputBase} style={{ borderColor: BORDER, minWidth: 100 }} />
      </td>
      <td className="px-1.5 py-1.5">
        <input type="text" value={draft.description} onChange={(e) => setField('description', e.target.value)}
          className={inputBase} style={{ borderColor: BORDER, minWidth: 120 }} />
      </td>
      <td className="px-1.5 py-1.5">
        <input type="number" value={draft.expense_amount} onChange={(e) => setField('expense_amount', e.target.value)}
          className={`${inputBase} font-mono text-right`} style={{ borderColor: BORDER, minWidth: 80 }} />
      </td>
      <td className="px-1.5 py-1.5">
        <input type="number" value={draft.income_amount} onChange={(e) => setField('income_amount', e.target.value)}
          className={`${inputBase} font-mono text-right`} style={{ borderColor: BORDER, minWidth: 80 }} />
      </td>
      <td className="px-1.5 py-1.5 text-xs text-right" style={{ color: MUTED }}>คำนวณอัตโนมัติ</td>
      <td className="px-1.5 py-1.5 whitespace-nowrap">
        <button onClick={onCommit} disabled={saving} className="text-teal-700 hover:text-teal-900 mr-2 disabled:opacity-40"><IconCheckCircle size={15} /></button>
        <button onClick={onCancel} disabled={saving} className="text-slate-400 hover:text-rose-600 disabled:opacity-40"><IconX size={15} /></button>
      </td>
    </tr>
  );
}
