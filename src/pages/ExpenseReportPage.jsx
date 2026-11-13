import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import Card, { MUTED, BORDER } from '../components/Card';
import ExpenseTable from '../components/ExpenseTable';
import ReconcileCard from '../components/ReconcileCard';
import BatchHistoryCard from '../components/BatchHistoryCard';
import { JOB_TYPES } from '../components/ExpenseForm';
import { IconAlertCircle, IconLoader } from '../components/Icons';
import { getAllDocs, getMeta, deleteDocData, setDocData } from '../lib/data';
import { computeRunningBalances, formatThaiDateShort, formatMoney, downloadBlob } from '../lib/format';
import { fetchSheetRows, parseUploadedRows, importNewSheetRows } from '../lib/sheetSync';
import { buildClearanceWorkbook } from '../lib/clearanceDoc';

export default function ExpenseReportPage({ searchQuery }) {
  const [entries, setEntries] = useState([]);
  const [batches, setBatches] = useState([]);
  const [opening, setOpening] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', jobType: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [syncStatus, setSyncStatus] = useState('idle');
  const [syncMsg, setSyncMsg] = useState('');
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [list, ob, bl] = await Promise.all([getAllDocs('expense_entries'), getMeta('expense-opening-balance'), getAllDocs('clearance_batches')]);
    setEntries(list);
    setBatches(bl);
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

  async function handleSaveRow(record) {
    try {
      await setDocData('expense_entries', record.id, record);
      setEntries((prev) => [...prev.filter((e) => e.id !== record.id), record]);
      setErrorMsg('');
    } catch (err) {
      console.error(err);
      setErrorMsg('บันทึกรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      throw err;
    }
  }

  // ตัดฟิลด์ที่คำนวณชั่วคราว (balance) ออกก่อนบันทึกลงฐานข้อมูล
  function stripRow(r) { const { balance, ...rest } = r; return rest; }

  async function createBatch(selectedRows) {
    const now = new Date();
    const id = `batch-${now.getTime()}`;
    const total = selectedRows.reduce((s, r) => s + (parseFloat(r.expense_amount) || 0), 0);
    const batch = {
      id, date: now.toISOString().slice(0, 10), created_at: now.toISOString(),
      total, count: selectedRows.length, row_ids: selectedRows.map((r) => r.id),
      rows: selectedRows.map((r) => ({
        id: r.id, transaction_date: r.transaction_date || '', receipt_no: r.receipt_no || '', company_name: r.company_name || '',
        project_site: r.project_site || '', description: r.description || '', job_type: r.job_type || '',
        expense_amount: r.expense_amount || '', income_amount: '',
      })),
      status: 'pending',
    };
    await setDocData('clearance_batches', id, batch);
    await Promise.all(selectedRows.map((r) => setDocData('expense_entries', r.id, { ...stripRow(r), cleared: true, batch_id: id })));
    setBatches((prev) => [...prev, batch]);
    setEntries((prev) => prev.map((e) => (selectedRows.some((r) => r.id === e.id) ? { ...e, cleared: true, batch_id: id } : e)));
    return batch;
  }

  async function handleClearSelected(selectedRows) {
    try {
      // ทำเครื่องหมายเคลียร์แล้ว + บันทึกเป็นล็อต (สถานะรอรับเงิน) — ยังไม่กระทบยอดคงเหลือจนกว่าจะกด "รับเงินแล้ว"
      await createBatch(selectedRows);
      const wb = buildClearanceWorkbook(selectedRows);
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      downloadBlob(`ใบเคลียร์เงินสำรองสโตร์-${new Date().toISOString().slice(0, 10)}.xlsx`, new Blob([wbout], { type: 'application/octet-stream' }));
      setErrorMsg('');
    } catch (err) {
      console.error(err);
      setErrorMsg('เคลียร์รายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  }

  async function handleGroupLegacy(selectedRows) {
    try {
      await createBatch(selectedRows);
      setErrorMsg('');
    } catch (err) {
      console.error(err);
      setErrorMsg('จัดล็อตไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  }

  async function handleUnclear(id) {
    try {
      const record = entries.find((e) => e.id === id);
      if (!record) return;
      const batch = record.batch_id ? batches.find((b) => b.id === record.batch_id) : null;
      if (batch && batch.status === 'received') {
        setErrorMsg('รายการนี้อยู่ในล็อตที่รับเงินแล้ว — กด "ยกเลิกการรับ" ที่ประวัติการเคลียร์ก่อน แล้วค่อยยกเลิกเคลียร์');
        return;
      }
      if (batch) {
        const rowsLeft = batch.rows.filter((r) => r.id !== id);
        if (rowsLeft.length === 0) {
          await deleteDocData('clearance_batches', batch.id);
          setBatches((prev) => prev.filter((b) => b.id !== batch.id));
        } else {
          const nb = { ...batch, rows: rowsLeft, row_ids: rowsLeft.map((r) => r.id), count: rowsLeft.length,
            total: rowsLeft.reduce((s, r) => s + (parseFloat(r.expense_amount) || 0), 0) };
          await setDocData('clearance_batches', batch.id, nb);
          setBatches((prev) => prev.map((b) => (b.id === batch.id ? nb : b)));
        }
      }
      const updated = { ...stripRow(record), cleared: false, batch_id: '' };
      await setDocData('expense_entries', id, updated);
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
      setErrorMsg('');
    } catch (err) {
      console.error(err);
      setErrorMsg('ยกเลิกการเคลียร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  }

  async function handleMarkReceived(batch) {
    try {
      const now = new Date();
      const entry = {
        id: `recv-${batch.id}`, transaction_date: now.toISOString().slice(0, 10), receipt_no: '', company_name: '', project_site: '',
        description: `รับเงินคืนจากการเคลียร์ล็อต ${batch.date}`, job_type: '', expense_amount: '', income_amount: String(batch.total),
        notes: 'สร้างอัตโนมัติจากประวัติการเคลียร์เงิน', batch_id: batch.id, created_at: now.toISOString(),
      };
      const nb = { ...batch, status: 'received', received_at: entry.transaction_date, received_entry_id: entry.id };
      await setDocData('expense_entries', entry.id, entry);
      await setDocData('clearance_batches', batch.id, nb);
      setEntries((prev) => [...prev.filter((e) => e.id !== entry.id), entry]);
      setBatches((prev) => prev.map((b) => (b.id === batch.id ? nb : b)));
      setErrorMsg('');
    } catch (err) {
      console.error(err);
      setErrorMsg('บันทึกการรับเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  }

  async function handleUndoReceived(batch) {
    try {
      const nb = { ...batch, status: 'pending', received_at: '', received_entry_id: '' };
      if (batch.received_entry_id) await deleteDocData('expense_entries', batch.received_entry_id);
      await setDocData('clearance_batches', batch.id, nb);
      setEntries((prev) => prev.filter((e) => e.id !== batch.received_entry_id));
      setBatches((prev) => prev.map((b) => (b.id === batch.id ? nb : b)));
      setErrorMsg('');
    } catch (err) {
      console.error(err);
      setErrorMsg('ยกเลิกการรับเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  }

  function handleDownloadBatch(batch) {
    const wb = buildClearanceWorkbook(batch.rows || []);
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadBlob(`ใบเคลียร์เงินสำรองสโตร์-${batch.date}.xlsx`, new Blob([wbout], { type: 'application/octet-stream' }));
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

      {!loading && <ReconcileCard entries={entries} opening={opening} batches={batches} />}
      {!loading && <BatchHistoryCard batches={batches} onMarkReceived={handleMarkReceived} onUndoReceived={handleUndoReceived} onDownload={handleDownloadBatch} />}

      {errorMsg && <div className="mb-4 text-sm bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2 flex items-center gap-2"><IconAlertCircle size={14} /> {errorMsg}</div>}
      {loading ? (
        <p className="text-sm py-8 text-center" style={{ color: MUTED }}>กำลังโหลด…</p>
      ) : (
        <ExpenseTable rows={filteredRows} filters={filters} onFilterChange={setFilters} jobTypes={JOB_TYPES}
          onExport={handleExport} onSaveRow={handleSaveRow} onDelete={handleDelete} totals={totals}
          onClearSelected={handleClearSelected} onUnclear={handleUnclear} onGroupLegacy={handleGroupLegacy} />
      )}
    </div>
  );
}
