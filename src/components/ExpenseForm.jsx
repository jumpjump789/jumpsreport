import { useState, useEffect } from 'react';
import Card, { MUTED, BORDER } from './Card';
import { IconSave, IconAlertCircle, IconLoader } from './Icons';

export const EXPENSE_EMPTY = {
  transaction_date: '', receipt_no: '', company_name: '', project_site: '',
  description: '', job_type: '', expense_amount: '', income_amount: '', notes: '',
};
export const JOB_TYPES = ['งานขายอะไหล่', 'งาน PM', 'งานปรับปรุง', 'งานเคลม', 'อื่นๆ'];
export const JOB_TYPE_COLUMNS = ['งานขายอะไหล่', 'งาน PM', 'งานปรับปรุง', 'งานเคลม'];

export default function ExpenseForm({ editing, onSaved, onCancelEdit }) {
  const [data, setData] = useState(EXPENSE_EMPTY);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (editing) { setData({ ...EXPENSE_EMPTY, ...editing }); setErrorMsg(''); }
  }, [editing]);

  function resetForm() { setData(EXPENSE_EMPTY); setErrorMsg(''); if (editing) onCancelEdit(); }

  async function handleSubmit() {
    if (!data.transaction_date && !data.company_name && !data.expense_amount && !data.income_amount) {
      setErrorMsg('กรุณากรอกข้อมูลอย่างน้อยวันที่และจำนวนเงิน'); return;
    }
    setSaving(true); setErrorMsg('');
    try {
      const record = {
        id: editing?.id || `${Date.now()}`,
        transaction_date: data.transaction_date, receipt_no: data.receipt_no, company_name: data.company_name,
        project_site: data.project_site, description: data.description, job_type: data.job_type,
        expense_amount: data.expense_amount, income_amount: data.income_amount, notes: data.notes,
        created_at: editing?.created_at || new Date().toISOString(),
      };
      await onSaved(record);
      resetForm();
    } catch (err) {
      console.error(err);
      setErrorMsg('บันทึกรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally { setSaving(false); }
  }

  return (
    <Card className="p-5 space-y-5">
      <h2 className="text-sm font-semibold" style={{ color: '#0f172a' }}>{editing ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}</h2>
      {errorMsg && <div className="text-sm bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2 flex items-center gap-2"><IconAlertCircle size={14} /> {errorMsg}</div>}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs" style={{ color: MUTED }}>วันที่</span>
            <input type="date" value={data.transaction_date} onChange={(e) => setData({ ...data, transaction_date: e.target.value })}
              className="mt-1 w-full rounded-[9px] border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" style={{ borderColor: BORDER }} />
          </label>
          <label className="block">
            <span className="text-xs" style={{ color: MUTED }}>เลขที่ใบเสร็จ</span>
            <input type="text" value={data.receipt_no} onChange={(e) => setData({ ...data, receipt_no: e.target.value })}
              className="mt-1 w-full rounded-[9px] border px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500" style={{ borderColor: BORDER }} />
          </label>
        </div>
        <label className="block">
          <span className="text-xs" style={{ color: MUTED }}>ชื่อบริษัท / ร้านค้า</span>
          <input type="text" value={data.company_name} onChange={(e) => setData({ ...data, company_name: e.target.value })}
            className="mt-1 w-full rounded-[9px] border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" style={{ borderColor: BORDER }} />
        </label>
        <label className="block">
          <span className="text-xs" style={{ color: MUTED }}>โครงการ / สถานที่</span>
          <input type="text" value={data.project_site} onChange={(e) => setData({ ...data, project_site: e.target.value })}
            className="mt-1 w-full rounded-[9px] border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" style={{ borderColor: BORDER }} />
        </label>
        <label className="block">
          <span className="text-xs" style={{ color: MUTED }}>คำอธิบายรายการ</span>
          <input type="text" value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })}
            className="mt-1 w-full rounded-[9px] border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" style={{ borderColor: BORDER }} />
        </label>
        <label className="block">
          <span className="text-xs" style={{ color: MUTED }}>ประเภทงาน</span>
          <select value={data.job_type} onChange={(e) => setData({ ...data, job_type: e.target.value })}
            className="mt-1 w-full rounded-[9px] border px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500" style={{ borderColor: BORDER }}>
            <option value="">เลือกประเภทงาน</option>
            {JOB_TYPES.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-amber-700">เบิก (จ่ายออก)</span>
            <input type="number" value={data.expense_amount} onChange={(e) => setData({ ...data, expense_amount: e.target.value })}
              className="mt-1 w-full rounded-[9px] border px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500" style={{ borderColor: BORDER }} />
          </label>
          <label className="block">
            <span className="text-xs text-teal-700">รับ (เงินเข้า)</span>
            <input type="number" value={data.income_amount} onChange={(e) => setData({ ...data, income_amount: e.target.value })}
              className="mt-1 w-full rounded-[9px] border px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500" style={{ borderColor: BORDER }} />
          </label>
        </div>
        <label className="block">
          <span className="text-xs" style={{ color: MUTED }}>หมายเหตุ</span>
          <textarea value={data.notes} onChange={(e) => setData({ ...data, notes: e.target.value })} rows={2}
            className="mt-1 w-full rounded-[9px] border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" style={{ borderColor: BORDER }} />
        </label>
      </div>
      <div className="space-y-2">
        <button onClick={handleSubmit} disabled={saving}
          className="w-full text-sm bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white py-2.5 rounded-[10px] font-medium flex items-center justify-center gap-1.5">
          {saving ? <IconLoader size={14} /> : <IconSave size={14} />}
          {saving ? 'กำลังบันทึก…' : editing ? 'บันทึกการแก้ไข' : 'บันทึกรายการ'}
        </button>
        <button onClick={resetForm} className="w-full text-sm border py-2 rounded-[10px] font-medium hover:opacity-80" style={{ borderColor: BORDER, color: '#64748b' }}>
          {editing ? 'ยกเลิกการแก้ไข' : 'ล้างฟอร์ม'}
        </button>
        <p className="text-xs text-center" style={{ color: MUTED }}>เงินคงเหลือคำนวณอัตโนมัติจากลำดับวันที่ ไม่ต้องกรอก</p>
      </div>
    </Card>
  );
}
