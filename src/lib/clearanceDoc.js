import * as XLSX from 'xlsx';

const THAI_MONTHS_ABBR = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function formatDayMonth(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()} ${THAI_MONTHS_ABBR[d.getMonth()]}`;
}

function toBuddhistYear2(y) {
  return String((y + 543) % 100).padStart(2, '0');
}

function formatDayMonthYear(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()} ${THAI_MONTHS_ABBR[d.getMonth()]} ${toBuddhistYear2(d.getFullYear())}`;
}

export const JOB_TYPE_COLUMNS = ['งานขายอะไหล่', 'งาน PM', 'งานปรับปรุง', 'งานเคลม'];

// สร้างไฟล์ Excel "ใบเคลียร์เงินสำรองสโตร์" ตามแบบฟอร์มจริงของบริษัท (DTG-66) —
// วงเงินทดรองไว้ และ เงินที่ใช้ ใส่เป็นยอดรวมของรายการที่เลือกเคลียร์เท่ากันเสมอ
// (ตามที่ผู้ใช้ระบุ) ทำให้เงินสดคงเหลือ = 0 และขอเบิกชดเชยเท่ากับยอดที่เคลียร์
export function buildClearanceWorkbook(rows) {
  const sorted = [...rows].sort((a, b) => (a.transaction_date || '').localeCompare(b.transaction_date || ''));
  const dates = sorted.map((r) => r.transaction_date).filter(Boolean);
  const dateRangeLabel = dates.length
    ? (dates[0] === dates[dates.length - 1]
        ? `${formatDayMonth(dates[0])} /69`
        : `${formatDayMonth(dates[0])} - ${formatDayMonth(dates[dates.length - 1])} /69`)
    : '/69';

  const totalExpense = sorted.reduce((s, r) => s + (parseFloat(r.expense_amount) || 0), 0);
  const now = new Date();
  const nowLabel = `${now.getDate()} ${THAI_MONTHS_ABBR[now.getMonth()]} /69`;

  const aoa = [];
  aoa.push(['บริษัท ดีทรัสส์ เอเลเวเทอร์ จำกัด']);
  aoa.push(['ค่าใช้จ่ายซื้ออุปกรณ์และอะไหล่ (ฝ่าย STORE)']);
  aoa.push([`** ค่าใช้จ่ายระหว่างวันที่ ${dateRangeLabel} **`]);
  aoa.push(['วันที่', 'เลขที่ใบเสร็จ', 'ชื่อบริษัท', 'โครงการ / สถานที่', 'คำอธิบายรายการ', 'งานขายอะไหล่', 'งาน PM', 'งานปรับปรุง', 'งานเคลม', 'เบิก', 'รับ']);

  const dataStartRow = aoa.length; // 0-indexed row of first data row
  sorted.forEach((r) => {
    aoa.push([
      formatDayMonthYear(r.transaction_date),
      r.receipt_no || '',
      r.company_name || '',
      r.project_site || '',
      r.description || '',
      r.job_type === 'งานขายอะไหล่' ? '✓' : '',
      r.job_type === 'งาน PM' ? '✓' : '',
      r.job_type === 'งานปรับปรุง' ? '✓' : '',
      r.job_type === 'งานเคลม' ? '✓' : '',
      parseFloat(r.expense_amount) || 0,
      parseFloat(r.income_amount) || 0,
    ]);
  });
  const dataEndRow = aoa.length - 1; // 0-indexed row of last data row (inclusive)

  aoa.push([]);
  aoa.push(['', 'วงเงินทดรองไว้', '', '', '', '', '', '', '', totalExpense]);
  aoa.push(['', `เงินที่ใช้วันที่ ${dateRangeLabel}`, '', '', '', '', '', '', '', totalExpense]);
  aoa.push([]);
  aoa.push([`เงินสดคงเหลือ ณ วันที่ ${nowLabel}`, '', '', '', '', '', '', '', '', 0]);
  aoa.push([]);
  aoa.push(['', 'ขอเบิกเงินชดเชยเงินทดรอง', '', 'จำนวน', totalExpense, 'บาท']);
  aoa.push([]);
  aoa.push(['', 'ผู้ขอเบิก_____________________________________']);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } },
  ];
  ws['!cols'] = [
    { wch: 9 }, { wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 22 },
    { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 9 }, { wch: 12 }, { wch: 10 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ใบเคลียร์เงินสำรอง');
  return wb;
}
