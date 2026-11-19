import { useState } from 'react';
import Card, { MUTED, BORDER } from './Card';
import { IconDownload } from './Icons';
import { formatMoney, formatThaiDateShort } from '../lib/format';

export default function BatchHistoryCard({ batches, onMarkReceived, onUndoReceived, onUnclearRows, onDownload }) {
  const [openId, setOpenId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [picked, setPicked] = useState(new Set());
  const sorted = [...batches].sort((a, b) => (b.created_at || '') < (a.created_at || '') ? -1 : 1);

  async function run(id, fn, arg) {
    setBusyId(id);
    try { await fn(arg); } finally { setBusyId(null); }
  }

  return (
    <Card className="p-4 mb-5">
      <h2 className="text-sm font-semibold mb-3" style={{ color: '#0f172a' }}>
        ประวัติการเคลียร์เงิน <span className="font-normal" style={{ color: MUTED }}>({sorted.length} ล็อต)</span>
      </h2>
      {sorted.length === 0 ? (
        <p className="text-xs" style={{ color: MUTED }}>ยังไม่มีประวัติ — เลือกรายการสีส้มแล้วกด "เคลียร์รายการที่เลือก" ระบบจะบันทึกเป็นล็อตให้</p>
      ) : (
        <div>
          {sorted.map((b) => {
            const received = b.status === 'received';
            return (
              <div key={b.id} className="py-2" style={{ borderTop: `1px solid ${BORDER}` }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button onClick={() => setOpenId(openId === b.id ? null : b.id)} className="text-left">
                    <span className="text-sm font-semibold" style={{ color: '#0f172a' }}>฿{formatMoney(b.total)}</span>
                    <span className="text-xs ml-2" style={{ color: MUTED }}>เคลียร์ {formatThaiDateShort(b.date)} · {b.count} รายการ {openId === b.id ? '▲' : '▼'}</span>
                  </button>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={received ? { background: '#d1fae5', color: '#047857' } : { background: '#ffedd5', color: '#c2410c' }}>
                      {received ? `รับเงินแล้ว ${formatThaiDateShort(b.received_at)}` : 'รอรับเงิน'}
                    </span>
                    {!received && (
                      <button disabled={busyId === b.id} onClick={() => run(b.id, onMarkReceived, b)}
                        className="text-xs rounded-[8px] px-2.5 py-1 text-white disabled:opacity-50" style={{ background: '#0d9488' }}>รับเงินแล้ว</button>
                    )}
                    {received && (
                      <button disabled={busyId === b.id} onClick={() => run(b.id, onUndoReceived, b)}
                        className="text-xs border rounded-[8px] px-2.5 py-1 disabled:opacity-50" style={{ borderColor: BORDER }}>ยกเลิกการรับ</button>
                    )}
                    <button onClick={() => onDownload(b)} className="text-xs border rounded-[8px] px-2.5 py-1 flex items-center gap-1" style={{ borderColor: BORDER }}>
                      <IconDownload size={12} /> ใบเคลียร์
                    </button>
                  </div>
                </div>
                {openId === b.id && (
                  <div className="mt-2 text-xs" style={{ color: '#475569' }}>
                    {(b.rows || []).map((r) => (
                      <label key={r.id} className="flex items-start gap-2 py-0.5" style={{ cursor: received ? 'default' : 'pointer' }}>
                        {!received && (
                          <input type="checkbox" className="mt-0.5" checked={picked.has(r.id)}
                            onChange={() => setPicked((prev) => { const n = new Set(prev); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} />
                        )}
                        <span>{formatThaiDateShort(r.transaction_date)} {r.company_name || ''} {r.description || ''} — ฿{formatMoney(r.expense_amount)}</span>
                      </label>
                    ))}
                    {received ? (
                      <p className="mt-1" style={{ color: MUTED }}>ล็อตนี้รับเงินแล้ว — กด "ยกเลิกการรับ" ก่อนจึงจะยกเลิกเคลียร์รายการได้</p>
                    ) : (
                      (b.rows || []).some((r) => picked.has(r.id)) && (
                        <button disabled={busyId === b.id}
                          onClick={() => run(b.id, async () => { const ids = (b.rows || []).filter((r) => picked.has(r.id)).map((r) => r.id); await onUnclearRows(ids); setPicked(new Set()); })}
                          className="mt-2 text-xs rounded-[8px] px-3 py-1 text-white disabled:opacity-50" style={{ background: '#dc2626' }}>
                          ยกเลิกเคลียร์รายการที่เลือก ({(b.rows || []).filter((r) => picked.has(r.id)).length})
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[10px] mt-2" style={{ color: MUTED }}>กด "รับเงินแล้ว" ระบบจะสร้างรายการ "รับ" เท่ายอดล็อตให้อัตโนมัติ</p>
    </Card>
  );
}
