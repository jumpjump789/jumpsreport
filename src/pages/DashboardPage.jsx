import { useState, useEffect, useMemo } from 'react';
import Card, { MUTED } from '../components/Card';
import SimpleBarChart from '../components/SimpleBarChart';
import { IconCar, IconReceipt } from '../components/Icons';
import { getAllDocs, getMeta } from '../lib/data';
import { formatMoney, formatThaiDateShort, monthKey, computeRunningBalances, THAI_MONTHS_ABBR } from '../lib/format';

export default function DashboardPage({ onNavigate }) {
  const [travelList, setTravelList] = useState([]);
  const [expenseEntries, setExpenseEntries] = useState([]);
  const [opening, setOpening] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [tlist, exp, ob] = await Promise.all([
          getAllDocs('travel_reports'),
          getAllDocs('expense_entries'),
          getMeta('expense-opening-balance'),
        ]);
        if (cancelled) return;
        setTravelList(tlist);
        setExpenseEntries(exp);
        setOpening(ob && typeof ob.value === 'number' ? ob.value : 0);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const withBalance = useMemo(() => computeRunningBalances(expenseEntries, opening), [expenseEntries, opening]);
  const currentBalance = withBalance.length ? withBalance[withBalance.length - 1].balance : opening;
  const now = new Date();
  const curMonthKey = monthKey(now.toISOString());
  const incomeThisMonth = expenseEntries.filter((e) => monthKey(e.transaction_date) === curMonthKey).reduce((s, e) => s + (parseFloat(e.income_amount) || 0), 0);
  const expenseMonthEntries = expenseEntries.filter((e) => monthKey(e.transaction_date) === curMonthKey && parseFloat(e.expense_amount) > 0);
  const expenseThisMonth = expenseMonthEntries.reduce((s, e) => s + (parseFloat(e.expense_amount) || 0), 0);

  const chartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: THAI_MONTHS_ABBR[d.getMonth()] });
    }
    return months.map((m) => {
      const rows = expenseEntries.filter((e) => monthKey(e.transaction_date) === m.key);
      return { name: m.label, 'รับ': rows.reduce((s, e) => s + (parseFloat(e.income_amount) || 0), 0), 'เบิก': rows.reduce((s, e) => s + (parseFloat(e.expense_amount) || 0), 0) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseEntries]);

  const recent = useMemo(() => {
    const travelItems = travelList.map((r) => ({
      type: 'travel', id: r.id, title: r.doc_number || 'รายงานการเดินทาง',
      subtitle: `${formatThaiDateShort(r.travel_date)} · ${r.origin || '—'} → ${r.destination || '—'}`, amount: null, created_at: r.created_at,
    }));
    const expenseItems = expenseEntries.map((e) => ({
      type: 'expense', id: e.id, title: e.company_name || e.description || 'รายการรายรับ-จ่าย',
      subtitle: `${formatThaiDateShort(e.transaction_date)} · ${e.job_type || '—'}`,
      amount: (parseFloat(e.income_amount) || 0) - (parseFloat(e.expense_amount) || 0), created_at: e.created_at,
    }));
    return [...travelItems, ...expenseItems].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 6);
  }, [travelList, expenseEntries]);

  const hour = now.getHours();
  const greeting = hour < 12 ? 'สวัสดี ตอนเช้า' : hour < 17 ? 'สวัสดี ตอนบ่าย' : 'สวัสดี ตอนเย็น';

  if (loading) return <p className="text-sm py-8 text-center" style={{ color: MUTED }}>กำลังโหลด…</p>;

  return (
    <div className="space-y-5">
      <Card className="p-5" style={{ background: '#eef3f9', border: '1px solid #e0e8f1' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold" style={{ fontSize: 24, color: '#0f172a' }}>{greeting}</p>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>
              {expenseEntries.length} รายการรายรับ-จ่าย · {travelList.length} รายงานการเดินทาง · อัปเดตล่าสุด {formatThaiDateShort(now.toISOString())}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onNavigate('travel')} className="text-sm border px-3.5 py-2 rounded-[10px] font-medium hover:opacity-80" style={{ borderColor: '#c7d2e0' }}>
              + รายงานการเดินทางใหม่
            </button>
            <button onClick={() => onNavigate('expense')} className="text-sm bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 rounded-[10px] font-medium">
              + เพิ่มรายการรายรับ-จ่าย
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs" style={{ color: MUTED }}>ยอดเงินคงเหลือปัจจุบัน</p>
          <p className={`font-bold mt-1 ${currentBalance < 0 ? 'text-rose-600' : 'text-teal-700'}`} style={{ fontSize: 30 }}>฿{formatMoney(currentBalance)}</p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>จากยอดตั้งต้น ฿{formatMoney(opening)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs" style={{ color: MUTED }}>รับเข้าเดือนนี้</p>
          <p className="font-bold mt-1 text-teal-700" style={{ fontSize: 30 }}>฿{formatMoney(incomeThisMonth)}</p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>รวมเงินเข้าทุกรายการ</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs" style={{ color: MUTED }}>เบิกจ่ายเดือนนี้</p>
          <p className="font-bold mt-1 text-amber-700" style={{ fontSize: 30 }}>฿{formatMoney(expenseThisMonth)}</p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>{expenseMonthEntries.length} ใบเสร็จ</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs" style={{ color: MUTED }}>เอกสารทั้งหมดในระบบ</p>
          <p className="font-bold mt-1" style={{ fontSize: 30, color: '#0f172a' }}>{travelList.length + expenseEntries.length}</p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>รายงานเดินทาง {travelList.length} · รายรับ-จ่าย {expenseEntries.length}</p>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-3" style={{ color: '#0f172a' }}>ยอดรับ / เบิก รายเดือน</h2>
        <SimpleBarChart data={chartData} seriesKeys={['รับ', 'เบิก']} colors={['#0d9488', '#f59e0b']} />
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-3" style={{ color: '#0f172a' }}>รายการล่าสุด</h2>
        {recent.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: MUTED }}>ยังไม่มีข้อมูล</p>
        ) : (
          <div>
            {recent.map((it) => (
              <div key={`${it.type}-${it.id}`} onClick={() => onNavigate(it.type)}
                className="flex items-center gap-3 px-2 py-2.5 rounded-[10px] cursor-pointer hover:opacity-80" style={{ borderBottom: '1px solid #f1f4f8' }}>
                <div className="flex items-center justify-center rounded-[10px] shrink-0" style={{ width: 36, height: 36, background: '#f1f5f9' }}>
                  {it.type === 'travel' ? <IconCar size={16} style={{ color: '#64748b' }} /> : <IconReceipt size={16} style={{ color: '#64748b' }} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: '#0f172a' }}>{it.title}</p>
                  <p className="text-xs truncate" style={{ color: MUTED }}>{it.subtitle}</p>
                </div>
                {it.amount !== null && (
                  <span className={`text-sm font-semibold shrink-0 ${it.amount >= 0 ? 'text-teal-700' : 'text-amber-700'}`}>
                    {it.amount >= 0 ? '+' : '−'}฿{formatMoney(Math.abs(it.amount))}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
