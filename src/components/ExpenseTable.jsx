import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Card, { MUTED, BORDER } from './Card';
import { IconDownload, IconPencil, IconTrash, IconCheckCircle, IconX, IconPlus } from './Icons';
import { formatThaiDateShort, formatMoney } from '../lib/format';

const EMPTY_DRAFT = {
  transaction_date: '', receipt_no: '', company_name: '', project_site: '',
  description: '', job_type: '', expense_amount: '', income_amount: '', notes: '',
};

const inputBase = "w-full rounded-[6px] border px-1.5 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-teal-500";

// คอลัมน์ทั้งหมด (ใช้กำหนดความกว้างให้กระชับขึ้น คอลัมน์ที่ยาวจะตัดด้วย ... แทนการดันตารางให้กว้าง)
const COLS = [
  { key: 'date', label: 'วันที่', w: 78, align: 'left' },
  { key: 'receipt', label: 'เลขที่ใบเสร็จ', w: 84, align: 'left' },
  { key: 'company', label: 'ชื่อบริษัท', w: 110, align: 'left' },
  { key: 'site', label: 'โครงการ / สถานที่', w: 110, align: 'left' },
  { key: 'desc', label: 'คำอธิบายรายการ', w: 150, align: 'left' },
  { key: 'expense', label: 'เบิก', w: 78, align: 'right' },
  { key: 'income', label: 'รับ', w: 72, align: 'right' },
  { key: 'balance', label: 'เงินคงเหลือ', w: 88, align: 'right' },
];
const CHECKBOX_W = 32;
const ACTIONS_W = 56;
const TABLE_MIN_WIDTH = CHECKBOX_W + COLS.reduce((s, c) => s + c.w, 0) + ACTIONS_W;

const ellipsisCell = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

export default function ExpenseTable({ rows, filters, onFilterChange, jobTypes, onExport, onSaveRow, onDelete, totals, onClearSelected, onUnclear }) {
  const [editingId, setEditingId] = useState(null); // id ของแถวที่กำลังแก้ หรือ 'NEW'
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [clearing, setClearing] = useState(false);

  // --- ซิงค์สกอลบาร์แนวนอนตัวบน (ของจริง) กับตารางด้านล่าง ---
  const topScrollRef = useRef(null);
  const bottomScrollRef = useRef(null);
  const spacerRef = useRef(null);
  const syncingRef = useRef(false);

  const syncSpacerWidth = useCallback(() => {
    if (bottomScrollRef.current && spacerRef.current) {
      spacerRef.current.style.width = `${bottomScrollRef.current.scrollWidth}px`;
    }
  }, []);

  useEffect(() => {
    syncSpacerWidth();
    window.addEventListener('resize', syncSpacerWidth);
    return () => window.removeEventListener('resize', syncSpacerWidth);
  }, [rows.length, editingId, syncSpacerWidth]);

  function handleTopScroll() {
    if (syncingRef.current) { syncingRef.current = false; return; }
    if (bottomScrollRef.current && topScrollRef.current) {
      syncingRef.current = true;
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  }
  function handleBottomScroll() {
    if (syncingRef.current) { syncingRef.current = false; return; }
    if (bottomScrollRef.current && topScrollRef.current) {
      syncingRef.current = true;
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
  }

  function startEdit(r) {
    setEditingId(r.id);
    setDraft({ ...EMPTY_DRAFT, ...r });
  }
  function startNew() {
    setEditingId('NEW');
    setDraft(EMPTY_DRAFT);
  }
  function cancelEdit() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }
  function setField(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  async function commitEdit() {
    setSaving(true);
    try {
      const record = {
        ...draft,
        id: editingId === 'NEW' ? undefined : editingId,
        cleared: draft.cleared || false,
      };
      await onSaveRow(record);
      cancelEdit();
    } finally {
      setSaving(false);
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const selectedRows = useMemo(() => rows.filter((r) => selectedIds.has(r.id)), [rows, selectedIds]);
  const selectedTotal = useMemo(
    () => selectedRows.reduce((s, r) => s + (parseFloat(r.expense_amount) || 0), 0),
    [selectedRows]
  );

  async function handleClear() {
    setClearing(true);
    try {
      await onClearSelected(selectedRows);
      setSelectedIds(new Set());
    } finally {
      setClearing(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold" style={{ color: '#0f172a' }}>
          ตารางรายการ <span className="font-normal" style={{ color: MUTED }}>({rows.length} รายการ)</span>
        </h2>
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 text-xs" style={{ color: '#64748b' }}>
            <input type="date" value={filters.dateFrom} onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value })}
              className="rounded-[8px] border px-1.5 py-1 text-xs" style={{ borderColor: BORDER }} />
            <span>–</span>
            <input type="date" value={filters.dateTo} onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value })}
              className="rounded-[8px] border px-1.5 py-1 text-xs" style={{ borderColor: BORDER }} />
          </div>
          <select value={filters.jobType} onChange={(e) => onFilterChange({ ...filters, jobType: e.target.value })}
            className="rounded-[8px] border px-1.5 py-1 text-xs bg-white" style={{ borderColor: BORDER }}>
            <option value="">ประเภทงาน: ทั้งหมด</option>
            {jobTypes.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
          <button onClick={startNew} className="text-xs rounded-[8px] px-2.5 py-1.5 hover:opacity-90 flex items-center gap-1 text-white" style={{ background: '#0d9488' }}>
            <IconPlus size={12} /> เพิ่มแถว
          </button>
          <button onClick={onExport} className="text-xs border rounded-[8px] px-2.5 py-1.5 hover:opacity-80 flex items-center gap-1" style={{ borderColor: BORDER }}>
            <IconDownload size={12} /> ดาวน์โหลด Excel
          </button>
        </div>
      </div>

      {selectedRows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-3 py-2 rounded-[10px]" style={{ background: '#e6f5f3' }}>
          <p className="text-xs font-medium" style={{ color: '#0f766e' }}>
            เลือกแล้ว {selectedRows.length} รายการ — รวมเบิก ฿{formatMoney(selectedTotal)}
          </p>
          <button onClick={handleClear} disabled={clearing}
            className="text-xs rounded-[8px] px-3 py-1.5 font-medium text-white disabled:opacity-50" style={{ background: '#0f766e' }}>
            {clearing ? 'กำลังสร้างไฟล์…' : 'เคลียร์รายการที่เลือก'}
          </button>
        </div>
      )}

      {rows.length === 0 && editingId !== 'NEW' ? (
        <div className="text-center py-12 text-sm" style={{ color: MUTED }}>ยังไม่มีรายการในช่วงที่เลือก</div>
      ) : (
        <div>
          {/* แถบเลื่อนแนวนอน ย้ายมาไว้ด้านบนตาราง */}
          <div ref={topScrollRef} onScroll={handleTopScroll} style={{ overflowX: 'auto', overflowY: 'hidden', height: 14 }}>
            <div ref={spacerRef} style={{ height: 1 }} />
          </div>
          <div ref={bottomScrollRef} onScroll={handleBottomScroll} style={{ overflow: 'auto' }}>
            <table style={{ minWidth: TABLE_MIN_WIDTH, width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: CHECKBOX_W }} />
                {COLS.map((c) => <col key={c.key} style={{ width: c.w }} />)}
                <col style={{ width: ACTIONS_W }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th></th>
                  {COLS.map((c) => (
                    <th key={c.key} className="text-[11px] font-medium px-2 py-1.5" style={{ color: '#64748b', textAlign: c.align, ...ellipsisCell }}>{c.label}</th>
                  ))}
                  <th style={{ position: 'sticky', right: 0, background: '#f8fafc' }}></th>
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
                      <td className="px-1.5 py-1.5 text-center">
                        <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} />
                      </td>
                      <td className="px-2 py-1.5 text-[11px] whitespace-nowrap">
                        {formatThaiDateShort(r.transaction_date)}
                        {r.cleared && (
                          <button onClick={() => onUnclear(r.id)} title="คลิกเพื่อยกเลิกเคลียร์"
                            className="block mt-0.5 text-[9px] px-1 rounded-full" style={{ background: '#0d9488', color: '#fff', lineHeight: '14px' }}>
                            ✓ เคลียร์แล้ว
                          </button>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-[11px] font-mono" style={ellipsisCell}>{r.receipt_no || '—'}</td>
                      <td className="px-2 py-1.5 text-[11px]" style={ellipsisCell} title={r.company_name}>{r.company_name || '—'}</td>
                      <td className="px-2 py-1.5 text-[11px]" style={ellipsisCell} title={r.project_site}>{r.project_site || '—'}</td>
                      <td className="px-2 py-1.5 text-[11px]" style={ellipsisCell} title={r.description}>{r.description || '—'}</td>
                      <td className="px-2 py-1.5 text-[11px] text-right text-amber-700">{r.expense_amount ? formatMoney(r.expense_amount) : '—'}</td>
                      <td className="px-2 py-1.5 text-[11px] text-right text-teal-700">{r.income_amount ? formatMoney(r.income_amount) : '—'}</td>
                      <td className={`px-2 py-1.5 text-[11px] text-right font-semibold ${r.balance < 0 ? 'text-rose-600' : ''}`} style={r.balance >= 0 ? { color: '#0f172a' } : {}}>{formatMoney(r.balance)}</td>
                      <td className="px-1.5 py-1.5 text-[11px] whitespace-nowrap text-center" style={{ position: 'sticky', right: 0, background: r.cleared ? '#f0fdfa' : '#fff7ed' }}>
                        <button onClick={() => startEdit(r)} className="hover:text-teal-700 mr-1.5" style={{ color: MUTED }}><IconPencil size={13} /></button>
                        <button onClick={() => onDelete(r.id)} className="hover:text-rose-600" style={{ color: MUTED }}><IconTrash size={13} /></button>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #e4e8ee' }}>
                  <td colSpan={6} className="px-2 py-1.5 text-[11px] font-medium" style={{ color: '#64748b' }}>รวมช่วงที่เลือก</td>
                  <td className="px-2 py-1.5 text-[11px] text-right font-semibold text-amber-700">{formatMoney(totals.expense)}</td>
                  <td className="px-2 py-1.5 text-[11px] text-right font-semibold text-teal-700">{formatMoney(totals.income)}</td>
                  <td className={`px-2 py-1.5 text-[11px] text-right font-bold ${totals.currentBalance < 0 ? 'text-rose-600' : ''}`} style={totals.currentBalance >= 0 ? { color: '#0f172a' } : {}}>{formatMoney(totals.currentBalance)}</td>
                  <td style={{ position: 'sticky', right: 0, background: '#fff' }}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

function EditableRow({ draft, setField, onCommit, onCancel, saving }) {
  return (
    <tr style={{ borderTop: '1px solid #f1f4f8', background: '#f0fdfa' }}>
      <td></td>
      <td className="px-1.5 py-1.5">
        <input type="date" value={draft.transaction_date || ''} onChange={(e) => setField('transaction_date', e.target.value)} className={inputBase} />
      </td>
      <td className="px-1.5 py-1.5">
        <input type="text" value={draft.receipt_no || ''} onChange={(e) => setField('receipt_no', e.target.value)} className={`${inputBase} font-mono`} />
      </td>
      <td className="px-1.5 py-1.5">
        <input type="text" value={draft.company_name || ''} onChange={(e) => setField('company_name', e.target.value)} className={inputBase} />
      </td>
      <td className="px-1.5 py-1.5">
        <input type="text" value={draft.project_site || ''} onChange={(e) => setField('project_site', e.target.value)} className={inputBase} />
      </td>
      <td className="px-1.5 py-1.5">
        <input type="text" value={draft.description || ''} onChange={(e) => setField('description', e.target.value)} className={inputBase} />
      </td>
      <td className="px-1.5 py-1.5">
        <input type="number" value={draft.expense_amount || ''} onChange={(e) => setField('expense_amount', e.target.value)} className={`${inputBase} text-right`} />
      </td>
      <td className="px-1.5 py-1.5">
        <input type="number" value={draft.income_amount || ''} onChange={(e) => setField('income_amount', e.target.value)} className={`${inputBase} text-right`} />
      </td>
      <td className="px-1.5 py-1.5 text-[10px] text-right" style={{ color: MUTED }}>คำนวณอัตโนมัติ</td>
      <td className="px-1.5 py-1.5 text-center whitespace-nowrap" style={{ position: 'sticky', right: 0, background: '#f0fdfa' }}>
        <button onClick={onCommit} disabled={saving} className="hover:opacity-80 mr-1.5" style={{ color: '#0d9488' }}><IconCheckCircle size={14} /></button>
        <button onClick={onCancel} disabled={saving} className="hover:opacity-80" style={{ color: '#94a3b8' }}><IconX size={14} /></button>
      </td>
    </tr>
  );
}
