export const THAI_MONTHS_ABBR = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function toBuddhistYear2(y) {
  return String((y + 543) % 100).padStart(2, '0');
}

export function formatThaiDateShort(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${THAI_MONTHS_ABBR[d.getMonth()]} ${toBuddhistYear2(d.getFullYear())}`;
}

export function formatMoney(n) {
  const num = Number(n) || 0;
  return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function monthKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Running balance: sort chronologically (transaction date, tie-break by the
// order entries were recorded), then walk forward accumulating รับ − เบิก.
export function computeRunningBalances(entries, opening) {
  const sorted = [...entries].sort((a, b) => {
    const ad = a.transaction_date || '', bd = b.transaction_date || '';
    if (ad !== bd) return ad < bd ? -1 : 1;
    return (a.created_at || '') < (b.created_at || '') ? -1 : 1;
  });
  let running = opening;
  return sorted.map((e) => {
    const exp = parseFloat(e.expense_amount) || 0;
    const inc = parseFloat(e.income_amount) || 0;
    running = running + inc - exp;
    return { ...e, balance: running };
  });
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function compressDataUrl(dataUrl, maxDim = 1600, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
        else { width = Math.round(width * (maxDim / height)); height = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('image decode failed'));
    img.src = dataUrl;
  });
}

export async function fileToCompressedDataUrl(file) {
  const raw = await fileToDataUrl(file);
  try {
    const compressed = await compressDataUrl(raw);
    return compressed.length < raw.length ? compressed : raw;
  } catch { return raw; }
}

// Tighter compression used specifically for photos that will be embedded
// directly inside a Firestore document (1 MiB per-document limit) instead of
// a separate file store. Smaller/softer than the general-purpose one above.
export async function fileToFirestoreSafeDataUrl(file) {
  const raw = await fileToDataUrl(file);
  try {
    const compressed = await compressDataUrl(raw, 900, 0.55);
    return compressed.length < raw.length ? compressed : raw;
  } catch { return raw; }
}

// Rough size in bytes of a base64 data: URL string.
export function dataUrlByteSize(dataUrl) {
  const commaIdx = dataUrl.indexOf(',');
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  return Math.ceil((base64.length * 3) / 4);
}

export function isImageFile(file) {
  if (file.type && file.type.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i.test(file.name || '');
}
export function isHeicFile(file) {
  const type = (file.type || '').toLowerCase();
  if (type.includes('heic') || type.includes('heif')) return true;
  return /\.(heic|heif)$/i.test(file.name || '');
}

export function escapeHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function loadImageNaturalSize(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 200, height: img.naturalHeight || 130 });
    img.onerror = () => resolve({ width: 200, height: 130 });
    img.src = dataUrl;
  });
}

export function fitWithinBox(natW, natH, maxW, maxH) {
  const scale = Math.min(maxW / natW, maxH / natH);
  return { width: Math.max(1, Math.round(natW * scale)), height: Math.max(1, Math.round(natH * scale)) };
}

// Plain browser file download (no special runtime capability needed here —
// this is a normal, independently-hosted website).
export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
