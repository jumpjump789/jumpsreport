import { useState, useEffect, useRef, useCallback } from 'react';
import Card, { MUTED, BORDER } from '../components/Card';
import ImageGallery from '../components/ImageGallery';
import { IconSave, IconHistory, IconDownload, IconAlertCircle, IconLoader, IconChevronLeft, IconX, IconTrash } from '../components/Icons';
import { getAllDocs, setDocData, deleteDocData, clearCollection, clearMetaPrefix, getNextDocNumber } from '../lib/data';
import { escapeHtml, loadImageNaturalSize, fitWithinBox, downloadBlob } from '../lib/format';

const EMPTY_DATA = {
  travel_date: '', driver_name: '', origin: '', destination: '', distance_km: '',
  duration_text: '', odometer_start: '', odometer_end: '', avg_fuel_kml: '', purpose: '', notes: '',
};

const FIELD_ROWS = [
  [{ key: 'travel_date', label: 'วันที่เดินทาง', type: 'date' }, { key: 'driver_name', label: 'ผู้ขับขี่ / ผู้เดินทาง', type: 'text' }],
  [{ key: 'origin', label: 'ต้นทาง', type: 'text' }, { key: 'destination', label: 'ปลายทาง', type: 'text' }],
  [{ key: 'distance_km', label: 'ระยะทางรวม (กม.)', type: 'number' }, { key: 'duration_text', label: 'เวลาที่ใช้เดินทาง', type: 'text' }],
  [{ key: 'odometer_start', label: 'ไมล์ก่อนเดินทาง', type: 'number' }, { key: 'odometer_end', label: 'ไมล์หลังเดินทาง', type: 'number' }],
  [{ key: 'avg_fuel_kml', label: 'อัตราสิ้นเปลืองเฉลี่ย (km/l)', type: 'number' }, { key: 'purpose', label: 'วัตถุประสงค์การเดินทาง', type: 'text' }],
];

async function buildTravelReportHtml(docNumber, gpsImages, odoImages) {
  const odoBefore = odoImages[0] || null;
  const odoAfter = odoImages[1] || null;
  const odoSizeMap = new Map();
  await Promise.all([odoBefore, odoAfter].filter(Boolean).map(async (src) => {
    const { width, height } = await loadImageNaturalSize(src);
    odoSizeMap.set(src, fitWithinBox(width, height, 312, 180));
  }));
  const gpsSizeMap = new Map();
  await Promise.all(gpsImages.map(async (src) => {
    const { width, height } = await loadImageNaturalSize(src);
    gpsSizeMap.set(src, fitWithinBox(width, height, 499, 288));
  }));
  const imgCell = (img, sizeMap) => {
    const dim = img ? sizeMap.get(img) : null;
    return `
    <td width="50%" style="width:50%;padding:4px;vertical-align:middle;text-align:center;">
      ${img
        ? `<div style="border:1px solid #cbd5e1;background:#f8fafc;padding:6px;"><img src="${img}" width="${dim.width}" height="${dim.height}" style="display:block;margin:0 auto;" /></div>`
        : `<div style="border:1px dashed #cbd5e1;background:#fbfcfd;height:144px;line-height:144px;color:#94a3b8;font-size:8pt;">ไม่มีรูป</div>`}
    </td>`;
  };
  const odoRow = `<tr>${imgCell(odoBefore, odoSizeMap)}${imgCell(odoAfter, odoSizeMap)}</tr>`;
  let gpsRows = '';
  if (gpsImages.length > 0) {
    for (let i = 0; i < gpsImages.length; i += 2) {
      const pair = [imgCell(gpsImages[i], gpsSizeMap)];
      pair.push(gpsImages[i + 1] ? imgCell(gpsImages[i + 1], gpsSizeMap) : '<td width="50%" style="width:50%;"></td>');
      gpsRows += `<tr>${pair.join('')}</tr>`;
    }
  }
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(docNumber || 'รายงานการเดินทาง')}</title>
<style>body{font-family:'Sarabun','Tahoma',sans-serif;color:#334155;} table{border-collapse:collapse;}</style>
</head><body>
  <table width="100%" style="width:100%;margin-bottom:10px;">${odoRow}</table>
  ${gpsRows ? `<table width="100%" style="width:100%;">${gpsRows}</table>` : ''}
</body></html>`;
}

const odoBox = { border: '1px solid #cbd5e1', background: '#f8fafc', height: '38.4mm', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' };
const odoBoxEmpty = { border: '1px dashed #cbd5e1', background: '#fbfcfd', height: '38.4mm', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '8pt' };
const gpsBox = { border: '1px solid #cbd5e1', background: '#f8fafc', height: '61.4mm', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' };

function EvidenceImageSection({ odoBeforeImage, odoAfterImage, gpsImages }) {
  const odoCells = [odoBeforeImage, odoAfterImage];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4.8mm' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4.8mm' }}>
        {odoCells.map((src, i) => (
          <div key={i} style={src ? odoBox : odoBoxEmpty}>
            {src ? <img src={src} alt={i === 0 ? 'เรือนไมล์ก่อนเดินทาง' : 'เรือนไมล์หลังเดินทาง'} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} /> : 'ไม่มีรูป'}
          </div>
        ))}
      </div>
      {gpsImages.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4.8mm' }}>
          {gpsImages.map((src, i) => (
            <div key={i} style={gpsBox}><img src={src} alt={`GPS ${i + 1}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} /></div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ReportPreview({ gpsImages, odoBeforeImage, odoAfterImage, domId }) {
  return (
    <div id={domId} className="mx-auto" style={{
      width: '210mm', minHeight: '297mm', background: '#ffffff',
      boxShadow: '0 1px 3px rgba(15,23,42,0.14)', padding: '16mm 15mm', boxSizing: 'border-box',
      color: '#334155', fontSize: '10.5pt', lineHeight: 1.5,
    }}>
      <EvidenceImageSection odoBeforeImage={odoBeforeImage} odoAfterImage={odoAfterImage} gpsImages={gpsImages} />
    </div>
  );
}

function ScaledPreview({ children }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);
  useEffect(() => {
    const outer = outerRef.current, inner = innerRef.current;
    if (!outer || !inner) return;
    function recompute() {
      const containerWidth = outer.offsetWidth;
      const naturalWidth = inner.scrollWidth;
      setNaturalHeight(inner.scrollHeight);
      if (naturalWidth > 0) setScale(Math.min(1, containerWidth / naturalWidth));
    }
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(outer); ro.observe(inner);
    return () => ro.disconnect();
  }, [children]);
  return (
    <div ref={outerRef} className="w-full">
      <div style={{ height: naturalHeight * scale || 'auto' }}>
        <div ref={innerRef} style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: '210mm' }}>{children}</div>
      </div>
    </div>
  );
}

export default function TravelReportPage() {
  const [gpsImages, setGpsImages] = useState([]);
  const [odoImages, setOdoImages] = useState([]);
  const [data, setData] = useState(EMPTY_DATA);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [docNumber, setDocNumber] = useState('');
  const [currentId, setCurrentId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [wordGenerating, setWordGenerating] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const list = await getAllDocs('travel_reports');
      list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      setHistory(list);
    } catch { setHistory([]); } finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  async function handleSave() {
    setSaveStatus('saving');
    setErrorMsg('');
    try {
      const id = currentId || `${Date.now()}`;
      const newDocNumber = docNumber || await getNextDocNumber(data.travel_date);
      // รูปภาพ (GPS/เรือนไมล์) ใช้แค่สร้างรายงานที่ดาวน์โหลดเท่านั้น ไม่บันทึกเก็บไว้ในฐานข้อมูล
      const record = { id, doc_number: newDocNumber, ...data, created_at: new Date().toISOString() };
      await setDocData('travel_reports', id, record);
      setDocNumber(newDocNumber);
      setCurrentId(id);
      setSaveStatus('saved');
      loadHistory();
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
      setErrorMsg('บันทึกรายงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  }

  function openReport(record) {
    setData({ ...EMPTY_DATA, ...record });
    // รายงานเก่าไม่มีรูปเก็บไว้ (ไม่ได้บันทึกรูปตั้งแต่แรก) — เริ่มโซนรูปใหม่เป็นค่าว่าง
    setGpsImages([]);
    setOdoImages([]);
    setDocNumber(record.doc_number || '');
    setCurrentId(record.id || null);
    setSaveStatus('idle');
    setShowHistory(false);
  }

  async function deleteReport(record, e) {
    e.stopPropagation();
    try {
      await deleteDocData('travel_reports', record.id);
      loadHistory();
    } catch (err) { console.error(err); }
  }

  function handleNew() {
    setGpsImages([]); setOdoImages([]); setData(EMPTY_DATA); setDocNumber(''); setCurrentId(null);
    setSaveStatus('idle'); setErrorMsg('');
  }

  async function handleClearAll() {
    setClearing(true); setErrorMsg('');
    try {
      await clearCollection('travel_reports');
      await clearMetaPrefix('counter-');
      setHistory([]); handleNew(); setConfirmClear(false); setShowHistory(false);
    } catch (err) {
      console.error(err);
      setErrorMsg('ล้างข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally { setClearing(false); }
  }

  function buildFileName() {
    if (docNumber) return docNumber;
    if (data.travel_date) {
      const place = [data.origin, data.destination].filter(Boolean).join('-');
      return `รายงานเดินทาง-${data.travel_date}${place ? '-' + place : ''}`;
    }
    return `รายงานเดินทาง-${new Date().toISOString().slice(0, 10)}`;
  }

  async function handleDownloadReport() {
    setWordGenerating(true); setErrorMsg('');
    try {
      const html = await buildTravelReportHtml(docNumber, gpsImages, odoImages);
      downloadBlob(`${buildFileName()}.html`, new Blob([html], { type: 'text/html' }));
      // ดาวน์โหลดเป็นไฟล์รายงานเรียบร้อยแล้ว — ลบรูปออกจากหน้าจอทันที ไม่เก็บไว้ที่ไหนต่อ
      setGpsImages([]);
      setOdoImages([]);
    } catch (err) {
      console.error(err);
      setErrorMsg('สร้างไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally { setWordGenerating(false); }
  }

  return (
    <div>
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: '#0f172a' }}>รายงานการเดินทาง</h1>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>กรอกข้อมูล → แนบรูป (ถ้ามี) → ดาวน์โหลด/พิมพ์ (รูปจะไม่ถูกบันทึกเก็บไว้)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {docNumber && <span className="text-xs font-mono px-2.5 py-1 rounded-[9px]" style={{ background: '#f1f5f9' }}>{docNumber}</span>}
          <button onClick={handleNew} className="text-sm border px-3 py-1.5 rounded-[10px] font-medium hover:opacity-80" style={{ borderColor: BORDER }}>รายงานใหม่</button>
          <button onClick={() => setShowHistory(true)} className="text-sm border px-3 py-1.5 rounded-[10px] font-medium hover:opacity-80 flex items-center gap-1.5" style={{ borderColor: BORDER }}>
            <IconHistory size={14} /> ประวัติ
          </button>
          <button onClick={handleSave} disabled={saveStatus === 'saving'}
            className="text-sm bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-[10px] font-medium flex items-center gap-1.5">
            {saveStatus === 'saving' ? <IconLoader size={14} /> : <IconSave size={14} />}
            {saveStatus === 'saving' ? 'กำลังบันทึก…' : 'บันทึกรายงาน'}
          </button>
          <button onClick={handleDownloadReport} disabled={wordGenerating}
            className="text-sm text-white px-3.5 py-1.5 rounded-[10px] font-medium flex items-center gap-1.5" style={{ background: '#0f172a' }}>
            {wordGenerating ? <IconLoader size={14} /> : <IconDownload size={14} />}
            {wordGenerating ? 'กำลังสร้างไฟล์…' : 'ดาวน์โหลด'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="no-print mb-4 text-sm bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2 flex items-center gap-2">
          <IconAlertCircle size={14} /> {errorMsg}
        </div>
      )}

      <div className="no-print flex flex-col md:flex-row gap-6 items-start">
        <Card className="w-full md:w-80 md:shrink-0 p-5 space-y-5">
          <ImageGallery label="1. รูปหน้าจอ GPS / เส้นทาง" hint="ระยะทาง+เวลา" images={gpsImages}
            onAdd={(imgs) => setGpsImages([...gpsImages, ...imgs])}
            onRemove={(i) => setGpsImages(gpsImages.filter((_, idx) => idx !== i))}
            onRejected={setErrorMsg} />
          <ImageGallery label="2. รูปเรือนไมล์" hint="รูปแรก=ก่อน / รูปที่สอง=หลัง" images={odoImages}
            maxImages={2} slotLabels={['ก่อน', 'หลัง']}
            onAdd={(imgs) => setOdoImages([...odoImages, ...imgs])}
            onRemove={(i) => setOdoImages(odoImages.filter((_, idx) => idx !== i))}
            onRejected={setErrorMsg} />
          <p className="text-xs" style={{ color: MUTED }}>รูปใช้แค่ตอนสร้างไฟล์ดาวน์โหลดเท่านั้น — ระบบจะลบรูปออกจากหน้านี้ให้อัตโนมัติทันทีหลังกด "ดาวน์โหลด"</p>
          <div className="pt-5" style={{ borderTop: `1px solid ${BORDER}` }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: '#0f172a' }}>ข้อมูลรายงาน</h2>
            <div className="space-y-3">
              {FIELD_ROWS.map((row, i) => (
                <div key={i} className="grid grid-cols-2 gap-3">
                  {row.map((f) => (
                    <label key={f.key} className="block">
                      <span className="text-xs" style={{ color: MUTED }}>{f.label}</span>
                      <input type={f.type} value={data[f.key] ?? ''} onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
                        className="mt-1 w-full rounded border px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                        style={{ borderColor: BORDER }} />
                    </label>
                  ))}
                </div>
              ))}
              <label className="block">
                <span className="text-xs" style={{ color: MUTED }}>หมายเหตุ</span>
                <textarea value={data.notes ?? ''} onChange={(e) => setData({ ...data, notes: e.target.value })} rows={2}
                  className="mt-1 w-full rounded border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" style={{ borderColor: BORDER }} />
              </label>
            </div>
          </div>
        </Card>
        <div className="flex-1 min-w-0 overflow-auto py-2">
          <ScaledPreview>
            <ReportPreview gpsImages={gpsImages} odoBeforeImage={odoImages[0] || null} odoAfterImage={odoImages[1] || null} domId="report-preview-target" />
          </ScaledPreview>
        </div>
      </div>

      <div id="print-root" className="hidden print:block">
        <ReportPreview gpsImages={gpsImages} odoBeforeImage={odoImages[0] || null} odoAfterImage={odoImages[1] || null} />
      </div>

      {showHistory && (
        <div className="no-print fixed inset-0 bg-slate-900/40 z-40 flex justify-end">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <IconChevronLeft size={16} className="cursor-pointer" onClick={() => setShowHistory(false)} />
                ประวัติรายงาน
              </h3>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-700"><IconX size={18} /></button>
            </div>
            <div className="p-3">
              {historyLoading && <p className="text-sm text-slate-400 px-2 py-4">กำลังโหลด…</p>}
              {!historyLoading && history.length === 0 && <p className="text-sm text-slate-400 px-2 py-4">ยังไม่มีรายงานที่บันทึกไว้</p>}
              {history.map((r) => (
                <div key={r.id} onClick={() => openReport(r)}
                  className="group flex items-center justify-between gap-2 px-3 py-2.5 rounded hover:bg-slate-50 cursor-pointer border-b border-slate-50">
                  <div className="min-w-0">
                    <p className="text-sm font-mono text-teal-700">{r.doc_number}</p>
                    <p className="text-xs text-slate-500 truncate">{r.origin || '—'} → {r.destination || '—'}</p>
                    <p className="text-xs text-slate-300">{r.travel_date || r.created_at?.slice(0, 10)}</p>
                  </div>
                  <button onClick={(e) => deleteReport(r, e)}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 shrink-0">
                    <IconTrash size={14} />
                  </button>
                </div>
              ))}
            </div>
            {history.length > 0 && (
              <div className="p-3 border-t border-slate-100 mt-2">
                {!confirmClear ? (
                  <button onClick={() => setConfirmClear(true)}
                    className="w-full text-xs text-red-500 hover:text-red-700 hover:bg-red-50 py-2 rounded flex items-center justify-center gap-1.5">
                    <IconTrash size={12} /> ล้างข้อมูลทั้งหมด (เริ่มใช้งานจริง)
                  </button>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700 space-y-2">
                    <p>ลบรายงานและเลขที่เอกสารทั้งหมดที่บันทึกไว้ถาวร — กู้คืนไม่ได้ ยืนยันหรือไม่?</p>
                    <div className="flex gap-2">
                      <button onClick={handleClearAll} disabled={clearing}
                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-1.5 rounded font-medium flex items-center justify-center gap-1.5">
                        {clearing ? <IconLoader size={12} /> : null}{clearing ? 'กำลังลบ…' : 'ยืนยันลบทั้งหมด'}
                      </button>
                      <button onClick={() => setConfirmClear(false)} disabled={clearing}
                        className="flex-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 py-1.5 rounded font-medium">ยกเลิก</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
