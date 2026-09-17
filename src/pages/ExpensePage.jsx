import { useState, useEffect, useCallback, useMemo } from 'react';
import Card, { MUTED, BORDER } from '../components/Card';
import ExpenseForm from '../components/ExpenseForm';
import { IconAlertCircle } from '../components/Icons';
import { getAllDocs, getMeta, setMeta, setDocData } from '../lib/data';
import { computeRunningBalances, formatMoney } from '../lib/format';

export default function ExpensePage({ editingRecord, onDoneEditing, onOpeningBalanceChanged }) {
  const [entries, setEntries] = useState([]);
  const [opening, setOpening] = useState(0);
  const [openingInput, setOpeningInput] = useState('0');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [list, ob] = await Promise.all([getAllDocs('expense_entries'), getMeta('expense-opening-balance')]);
    const openingVal = ob && typeof ob.value === 'number' ? ob.value : 0;
    setEntries(list);
    setOpening(openingVal);
    setOpeningInput(String(openingVal));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const withBalance = useMemo(() => computeRunningBalances(entries, opening), [entries, opening]);
  const currentBalance = withBalance.length ? withBalance[withBalance.length - 1].balance : opening;

  async function handleSave(record) {
    try {
      await setDocData('expense_entries', record.id, record);
      setEntries((prev) => [...prev.filter((e) => e.id !== record.id), record]);
      onDoneEditing && onDoneEditing();
    } catch (err) {
      console.error(err);
      setErrorMsg('บันทึกรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      throw err;
    }
  }

  async function handleOpeningSave() {
    const v = parseFloat(openingInput) || 0;
    try {
      await setMeta('expense-opening-balance', { value: v });
      setOpening(v);
      onOpeningBalanceChanged && onOpeningBalanceChanged(v);
    } catch (err) {
      console.error(err);
      setErrorMsg('บันทึกยอดตั้งต้นไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-lg font-semibold" style={{ color: '#0f172a' }}>รายรับ-จ่าย</h1>
        <p className="text-xs mt-0.5" style={{ color: MUTED }}>บัญชีเงินสำรองจ่าย — กรอกรายการเบิก/รับใหม่</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <Card className="p-5">
          <p className="text-xs" style={{ color: MUTED }}>ยอดเงินคงเหลือปัจจุบัน</p>
          <p className={`mt-1 font-bold ${currentBalance < 0 ? 'text-rose-600' : 'text-teal-700'}`} style={{ fontSize: 34 }}>
            ฿{formatMoney(currentBalance)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs" style={{ color: MUTED }}>ยอดตั้งต้น (opening balance)</p>
          <div className="mt-1 flex items-center gap-2">
            <input type="number" value={openingInput} onChange={(e) => setOpeningInput(e.target.value)}
              className="w-full rounded-[9px] border px-2.5 py-1.5 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-teal-500" style={{ borderColor: BORDER }} />
            <button onClick={handleOpeningSave} className="text-xs bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-[9px] font-medium whitespace-nowrap">บันทึก</button>
          </div>
        </Card>
      </div>

      {errorMsg && (
        <div className="mb-4 text-sm bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2 flex items-center gap-2">
          <IconAlertCircle size={14} /> {errorMsg}
        </div>
      )}

      {loading ? (
        <p className="text-sm py-8 text-center" style={{ color: MUTED }}>กำลังโหลด…</p>
      ) : (
        <div className="max-w-xl">
          <ExpenseForm editing={editingRecord} onSaved={handleSave} onCancelEdit={() => onDoneEditing && onDoneEditing()} />
        </div>
      )}
    </div>
  );
}
