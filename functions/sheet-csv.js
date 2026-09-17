// Cloudflare Pages Function — served at /sheet-csv
const SHEET_PUBLISHED_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRpG0CX7p7u_KnSvhnFKIH9SXXRnzkCNvHB-2_AZPryg3wbntKvAhXZWsvX5yVSsXzydrS2B9RsSVQJ/pub?gid=0&single=true&output=csv';

export async function onRequestGet() {
  try {
    const resp = await fetch(SHEET_PUBLISHED_CSV_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JumpsReportSync/1.0)' },
    });
    if (!resp.ok) {
      return new Response(`อ่านชีตไม่สำเร็จ (${resp.status})`, { status: 502 });
    }
    const text = await resp.text();
    return new Response(text, {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'access-control-allow-origin': '*',
        'cache-control': 'no-store',
      },
    });
  } catch (err) {
    return new Response(`เกิดข้อผิดพลาด: ${err.message}`, { status: 500 });
  }
}
