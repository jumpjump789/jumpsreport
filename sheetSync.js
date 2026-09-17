import * as XLSX from 'xlsx';
import { getMeta, setMeta, setDocData } from './data';

/* Columns in the sheet: A วันที่ · B Invoice · C ร้าน · D โครงการ ·
   E รายละเอียด · F เวลาที่ประมวลผล (ไม่ได้ใช้) · ... · J เบิก
   Every imported row becomes an "เบิก" entry (no รับ / ประเภทงาน from
   this sheet). De-duplication assumes rows are only ever APPENDED at the
   bottom — we remember how many data-rows were imported last time and only
   pull in rows beyond that count. Inserting/deleting/reordering rows in the
   sheet will confuse this and is not supported. */

// ลิงก์ Google Sheet เดิม (ตอนนี้ไม่ได้ fetch ตรงจากตรงนี้แล้ว เพราะติด CORS —
// ดึงผ่าน /sheet-csv ซึ่งเป็น Cloudflare Pages Function ที่ทำหน้าที่ดึงแทนเรา
// ถ้าจะเปลี่ยนไปใช้ชีตอื่น ให้แก้ URL ในไฟล์ functions/sheet-csv.js แทนที่นี่)
const SHEET_PROXY_URL = '/sheet-csv';

function parseSheetDate(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '';
}

function rowsToExpenseDrafts(rows) {
  const dataRows = (rows || []).slice(1).filter((r) => r && r.some((c) => String(c || '').trim() !== ''));
  return dataRows.map((r) => ({
    transaction_date: parseSheetDate(r[0]),
    receipt_no: String(r[1] || '').trim(),
    company_name: String(r[2] || '').trim(),
    project_site: String(r[3] || '').trim(),
    description: String(r[4] || '').trim(),
    expense_amount: String(r[9] || '').trim(),
  }));
}

// ตัวแปลง CSV เอง (แทนการพึ่ง XLSX.read กับสตริง ซึ่งบางครั้งตีความ
// ตัวอักษรไทย/เครื่องหมายคำพูดในช่องข้อมูลผิดพลาด)
function parseCsvText(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\r') {
      // ข้าม รอ \n มาปิดแถว
    } else if (c === '\n') {
      row.push(field); field = ''; rows.push(row); row = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r[0] || '').trim() !== '');
}

export async function fetchSheetRows() {
  const resp = await fetch(SHEET_PROXY_URL);
  if (!resp.ok) throw new Error(`sheet fetch failed ${resp.status}`);
  const text = await resp.text();
  return parseCsvText(text);
}

export function parseUploadedRows(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
}

export async function importNewSheetRows(rows) {
  const meta = await getMeta('sheet-sync-last-count');
  const lastCount = (meta && typeof meta.value === 'number') ? meta.value : 0;
  const drafts = rowsToExpenseDrafts(rows);
  const newDrafts = drafts.slice(lastCount);
  for (let i = 0; i < newDrafts.length; i++) {
    const d = newDrafts[i];
    const id = `sheet-${Date.now()}-${lastCount + i}`;
    await setDocData('expense_entries', id, {
      transaction_date: d.transaction_date,
      receipt_no: d.receipt_no,
      company_name: d.company_name,
      project_site: d.project_site,
      description: d.description,
      job_type: '',
      expense_amount: d.expense_amount,
      income_amount: '',
      notes: 'นำเข้าจาก Google Sheet',
      created_at: new Date().toISOString(),
    });
  }
  await setMeta('sheet-sync-last-count', { value: drafts.length });
  return newDrafts.length;
}
