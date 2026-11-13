import { useMemo } from 'react';
import Card, { MUTED, BORDER } from './Card';
import { computeReconcile } from '../lib/reconcile';
import { formatMoney, formatThaiDateShort } from '../lib/format';

const STATUS = {
  balanced: { bg: '#ecfdf5', border: '#a7f3d0', color: '#047857', title: 'ดุลพอดี ✓' },
  over: { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', title: 'ยอดเกินกว่าเงินตั้งต้น' },
  short: { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c', title: 'ยอดขาด / หลุดไป' },
};

function Item({ label, value, hint, strong }) {
  return (
    <div className="min-w-[130px]">
      <p className="text-[11px]" style={{ color: MUTED }}>{label}</p>
      <p className={`text-sm ${strong ? 'font-bold' : 'font-semibold'}`} style={{ color: '#0f172a' }}>฿{formatMoney(value)}</p>
      {hint && <p className="text-[10px]" style={{ color: MUTED }}>{hint}</p>}
    </div>
  );
}

export default function ReconcileCard({ entries, opening }) {
  const r = useMemo(() => computeReconcile(entries, opening), [entries, opening]);
  const st = STATUS[r.status];
  const sign = r.diff > 0 ? '+' : r.diff < 0 ? '−' : '';

  return (
    <Card className="p-4 mb-5">
      <h2 className="text-sm font-semibold mb-3" style={{ color: '#0f172a' }}>ตรวจยอดดุล (ถ้าเคลียร์ครบทุกรายการ)</h2>
      <div className="flex flex-wrap gap-x-6 gap-y-3 mb-3">
        <Item label="ยอดตั้งต้น" value={r.opening} />
        <Item label="ยอดคงเหลือปัจจุบัน" value={r.currentBalance} hint={`รับรวม ${formatMoney(r.income)} − เบิกรวม ${formatMoney(r.expense)}`} />
        <Item label="เบิกที่ยังไม่เคลียร์" value={r.unclearedExpense} hint={`${r.unclearedCount} รายการ (แถบสีส้ม)`} />
        <Item label="ยอดคาดการณ์หลังเคลียร์" value={r.projected} strong />
      </div>
      <div className="rounded-[10px] px-3 py-2.5" style={{ background: st.bg, border: `1px solid ${st.border}` }}>
        <p className="text-sm font-semibold" style={{ color: st.color }}>
          {st.title}{r.status !== 'balanced' && <> — ส่วนต่าง {sign}฿{formatMoney(Math.abs(r.diff))}</>}
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
          {r.status === 'balanced' && 'เมื่อเคลียร์ครบ ยอดเงินสดจะเท่ากับเงินตั้งต้นพอดี'}
          {r.status === 'over' && `เมื่อเคลียร์ครบ ยอดจะมากกว่าเงินตั้งต้น ฿${formatMoney(r.diff)} (รับเงินมามากกว่ายอดที่เคลียร์แล้ว — ตรวจว่ามีรายการเบิกตกหล่น หรือบันทึกรับซ้ำหรือไม่)`}
          {r.status === 'short' && `เมื่อเคลียร์ครบ ยอดจะน้อยกว่าเงินตั้งต้น ฿${formatMoney(Math.abs(r.diff))} (เคลียร์ไปแล้วแต่ยังไม่ได้รับเงินคืนครบ หรือมีรายจ่ายที่ไม่ได้ส่งเบิก)`}
        </p>
        {r.suspects.length > 0 && (
          <div className="mt-2 text-xs" style={{ color: '#475569' }}>
            <p className="font-medium">รายการที่ยอดเท่าส่วนต่างพอดี (อาจเป็นสาเหตุ):</p>
            {r.suspects.map((e) => (
              <p key={e.id}>• {formatThaiDateShort(e.transaction_date)} {e.company_name || e.description || '—'} — ฿{formatMoney(r.status === 'short' ? e.expense_amount : e.income_amount)}{e.cleared ? ' (เคลียร์แล้ว)' : ''}</p>
            ))}
          </div>
        )}
      </div>
      <p className="text-[10px] mt-2" style={{ color: MUTED, borderTop: `1px solid ${BORDER}`, paddingTop: 6 }}>
        วิธีคิด: ยอดคาดการณ์ = ยอดคงเหลือปัจจุบัน + เบิกที่ยังไม่เคลียร์ · ส่วนต่าง = ยอดคาดการณ์ − ยอดตั้งต้น (= รับทั้งหมด − เบิกที่เคลียร์แล้ว {formatMoney(r.clearedExpense)}) · คิดจากทุกรายการ ไม่ขึ้นกับตัวกรองวันที่
      </p>
    </Card>
  );
}
