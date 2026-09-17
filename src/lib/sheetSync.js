import * as XLSX from 'xlsx';
import { getMeta, setMeta, setDocData } from './data';

/* Columns in the sheet: A วันที่ · B Invoice · C ร้าน · D โครงการ ·
   E รายละเอียด · F เวลาที่ประมวลผล (ไม่ได้ใช้) · ... · J เบิก
   Every imported row becomes an "เบิก" entry (no รับ / ประเภทงาน from
   this sheet). De-duplication assumes rows are only ever APPENDED at the
   bottom — we remember how many data-rows were imported last time and only
   pull in rows beyond that count. Inserting/deleting/reordering rows in the
   sheet will confuse this and is not supported. */

export const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1tAcAnXZ-gmkAJcJ63O8tAJjQJyRszkJCaFyfm622gLE/gviz/tq?tqx=out:csv&gid=0';
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

export async function fetchSheetRows() {
  const resp = await fetch(SHEET_CSV_URL);
  if (!resp.ok) throw new Error(`sheet fetch failed ${resp.status}`);
  const text = await resp.text();
  const wb = XLSX.read(text, { type: 'string' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
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
