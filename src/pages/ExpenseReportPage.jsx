import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import Card, { MUTED, BORDER } from '../components/Card';
import ExpenseTable from '../components/ExpenseTable';
import { JOB_TYPES } from '../components/ExpenseForm';
import { IconAlertCircle, IconLoader } from '../components/Icons';
import { getAllDocs, getMeta, deleteDocData } from '../lib/data';
import { computeRunningBalances, formatThaiDateShort, formatMoney, downloadBlob } from '../lib/format';
import { fetchSheetRows, parseUploadedRows, importNewSheetRows } from '../lib/sheetSync';

export default function ExpenseReportPage({ searchQuery, onEditRequest }) {
  const [entries, setEntries] = useState([]);
  const [opening, setOpening] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', jobType: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [syncStatus, setSyncStatus] = useState('idle');
  const [syncMsg, setSyncMsg] = useState('');
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [list, ob] = await Promise.all([getAllDocs('expense_entries'), getMeta('expense-opening-balance')]);
    setEntries(list);
    setOpening(ob && typeof ob.value === 'number' ? ob.value : 0);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleSyncFromSheet() {
    setSyncStatus('loading'); setSyncMsg('');
    try {
      const rows = await fetchSheetRows();
      const count = await importNewSheetRows(rows);
      setSyncStatus('done');
      setSyncMsg(count > 0 ? `นำเข้าเพิ่ม ${count} รายการจากชีต` : 'ไม่มีรายการใหม่ในชีต');
      load();
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
      setSyncMsg(`ดึงข้อมูลจากชีตไม่สำเร็จ: ${err.message || err} — ลองปุ่ม "นำเข้าไฟล์" แทน`);
    }
  }

  async function handleImportFile(file) {
    setSyncStatus('loading'); setSyncMsg('');
    try {
      const buf = await file.arrayBuffer();
      const rows = parseUploadedRows(buf);
      const count = await importNewSheetRows(rows);
      setSyncStatus('done');
      setSyncMsg(count > 0 ? `นำเข้าเพิ่ม ${count} รายการจากไฟล์` : 'ไม่มีรายการใหม่ในไฟล์นี้');
      load();
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
      setSyncMsg('อ่านไฟล์ไม่สำเร็จ กรุณาตรวจสอบไฟล์ CSV/Excel ที่อัปโหลด');
    }
  }

  const withBalance = useMemo(() => computeRunningBalances(entries, opening), [entries, opening]);
  const currentBalance = withBalance.length ? withBalance[withBalance.length - 1].balance : opening;

  const filteredRows = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    return withBalance.filter((r) => {
      if (filters.dateFrom && (r.transaction_date || '') < filters.dateFrom) return false;
      if (filters.dateTo && (r.transaction_date || '') > filters.dateTo) return false;
      if (filters.jobType && r.job_type !== filters.jobType) return false;
      if (q) {
        const hay = `${r.company_name || ''} ${r.project_site || ''} ${r.description || ''} ${r.receipt_no || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).slice().reverse();
  }, [withBalance, filters, searchQuery]);

  const totals = useMemo(() => {
    const expense = filteredRows.reduce((s, r) => s + (parseFloat(r.expense_amount) || 0), 0);
    const income = filteredRows.reduce((s, r) => s + (parseFloat(r.income_amount) || 0), 0);
    return { expense, income, currentBalance };
  }, [filteredRows, currentBalance]);

  async function handleDelete(id) {
    try {
      await deleteDocData('expense_entries', id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error(err);
      setErrorMsg('ลบรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  }

  function handleExport() {
    try {
      const data = filteredRows.slice().reverse().map((r) => ({
        'วันที่': formatThaiDateShort(r.transaction_date),
        'เลขที่ใบเสร็จ': r.receipt_no || '',
        'ชื่อบริษัท': r.company_name || '',
        'โครงการ / สถานที่': r.project_site || '',
        'คำอธิบายรายการ': r.description || '',
        'งานขายอะไหล่': r.job_type === 'งานขายอะไหล่' ? '✓' : '',
        'งาน PM': r.job_type === 'งาน PM' ? '✓' : '',
        'งานปรับปรุง': r.job_type === 'งานปรับปรุง' ? '✓' : '',
        'งานเคลม': r.job_type === 'งานเคลม' ? '✓' : '',
        'เบิก': parseFloat(r.expense_amount) || 0,
        'รับ': parseFloat(r.income_amount) || 0,
        'เงินคงเหลือ': r.balance,
        'หมายเหตุ': r.notes || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'รายรับ-จ่าย');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      downloadBlob(`รายรับ-จ่าย-${new Date().toISOString().slice(0, 10)}.xlsx`, new Blob([wbout], { type: 'application/octet-stream' }));
    } catch (err) {
      console.error(err);
      setErrorMsg('สร้างไฟล์ Excel ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-lg font-semibold" style={{ color: '#0f172a' }}>รายงาน</h1>
        <p className="text-xs mt-0.5" style={{ color: MUTED }}>ตารางสรุปรายรับ-จ่ายทั้งหมด กรองตามช่วงวันที่/ประเภทงาน และดาวน์โหลดเป็น Excel ได้</p>
      </div>

      <Card className="p-4 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: '#0f172a' }}>ซิงค์จาก Google Sheet</h2>
            <p className="text-xs mt-0.5" style={{ color: MUTED }}>ดึงแถวใหม่ที่เพิ่มต่อท้ายชีตเข้ามาเป็นรายการ "เบิก" อัตโนมัติ</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSyncFromSheet} disabled={syncStatus === 'loading'}
              className="text-sm bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-3.5 py-2 rounded-[10px] font-medium flex items-center gap-1.5">
              {syncStatus === 'loading' ? <IconLoader size={14} /> : null} ซิงค์ตอนนี้
            </button>
            <button onClick={() => fileInputRef.current?.click()}
              className="text-xs border px-3 py-2 rounded-[10px] font-medium hover:opacity-80" style={{ borderColor: BORDER }}>
              นำเข้าไฟล์ CSV/Excel
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={(e) => { const f = e.target.files[0]; if (f) handleImportFile(f); e.target.value = ''; }} />
          </div>
        </div>
        {syncMsg && <p className={`text-xs mt-2 ${syncStatus === 'error' ? 'text-red-600' : 'text-teal-700'}`}>{syncMsg}</p>}
      </Card>

      {errorMsg && <div className="mb-4 text-sm bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2 flex items-center gap-2"><IconAlertCircle size={14} /> {errorMsg}</div>}
      {loading ? (
        <p className="text-sm py-8 text-center" style={{ color: MUTED }}>กำลังโหลด…</p>
      ) : (
        <ExpenseTable rows={filteredRows} filters={filters} onFilterChange={setFilters} jobTypes={JOB_TYPES}
          onExport={handleExport} onEdit={onEditRequest} onDelete={handleDelete} totals={totals} />
      )}
    </div>
  );
}
