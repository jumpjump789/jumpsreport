import { useState, useRef } from 'react';
import { isImageFile, isHeicFile, fileToCompressedDataUrl } from '../lib/format';
import { IconUpload, IconX } from './Icons';
import { MUTED, BORDER } from './Card';

export default function ImageGallery({ label, hint, images, onAdd, onRemove, maxImages, slotLabels, onRejected }) {
  const [isOver, setIsOver] = useState(false);
  const inputRef = useRef(null);
  const remaining = maxImages ? Math.max(0, maxImages - images.length) : Infinity;
  const full = maxImages ? images.length >= maxImages : false;

  async function handleFiles(files) {
    const all = Array.from(files || []);
    const heic = all.filter(isHeicFile);
    let list = all.filter((f) => isImageFile(f) && !isHeicFile(f));
    if (heic.length > 0 && onRejected) {
      onRejected(
        `ไฟล์ ${heic.length === 1 ? heic[0].name : `${heic.length} ไฟล์`} เป็นฟอร์แมต HEIC/HEIF (ค่าเริ่มต้นของกล้อง iPhone) ` +
        `ซึ่งเบราว์เซอร์ส่วนใหญ่แสดงผลไม่ได้ กรุณาแปลงเป็น JPG/PNG ก่อนอัปโหลด — ` +
        `บน iPhone ลองส่งรูปผ่าน LINE/AirDrop/อีเมล (แปลงให้อัตโนมัติ) หรือตั้งค่า Settings > Camera > Formats > "Most Compatible"`
      );
    }
    if (list.length === 0) return;
    if (maxImages) list = list.slice(0, remaining);
    if (list.length === 0) return;
    const dataUrls = await Promise.all(list.map(fileToCompressedDataUrl));
    onAdd(dataUrls);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-medium" style={{ color: '#0f172a' }}>{label}</span>
        {hint && <span className="text-xs" style={{ color: MUTED }}>{hint}</span>}
      </div>
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-2">
          {images.map((img, i) => (
            <div key={i} className="relative rounded border overflow-hidden h-20" style={{ borderColor: BORDER, background: '#f4f6f9' }}>
              <img src={img} alt={`${label} ${i + 1}`} className="w-full h-full object-cover" />
              {slotLabels && slotLabels[i] && (
                <span className="absolute bottom-0 left-0 right-0 bg-slate-900/70 text-white text-[10px] text-center py-0.5">{slotLabels[i]}</span>
              )}
              <button type="button" onClick={() => onRemove(i)}
                className="absolute top-0.5 right-0.5 bg-slate-900/80 text-white rounded-full p-0.5 hover:bg-red-600">
                <IconX size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
      {!full && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
          onDragLeave={() => setIsOver(false)}
          onDrop={(e) => { e.preventDefault(); setIsOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className="relative rounded-md border-2 border-dashed cursor-pointer transition-colors h-20"
          style={{ borderColor: isOver ? '#0d9488' : BORDER, background: isOver ? 'rgba(13,148,136,0.08)' : '#fff' }}
        >
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
          <div className="h-full flex flex-col items-center justify-center text-center px-4 gap-1" style={{ color: MUTED }}>
            <IconUpload size={16} />
            <p className="text-xs">
              {images.length > 0 ? 'เพิ่มรูปอีก' : 'ลากรูปมาวาง หรือคลิกเพื่อเลือกไฟล์'}
              {maxImages ? ` (สูงสุด ${maxImages} รูป)` : ' (เลือกได้หลายรูป)'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
