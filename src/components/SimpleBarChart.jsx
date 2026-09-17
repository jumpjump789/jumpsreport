import { MUTED, BORDER } from './Card';

export default function SimpleBarChart({ data, seriesKeys, colors, height = 190 }) {
  const max = Math.max(1, ...data.flatMap((d) => seriesKeys.map((k) => Number(d[k]) || 0)));
  const barGroupW = 100;
  const barW = barGroupW / (seriesKeys.length + 1.2);
  return (
    <div>
      <svg viewBox={`0 0 ${data.length * barGroupW} ${height}`} width="100%" height={height} preserveAspectRatio="none">
        <line x1="0" y1={height - 20} x2={data.length * barGroupW} y2={height - 20} stroke={BORDER} strokeWidth="1" />
        {data.map((d, i) => seriesKeys.map((k, si) => {
          const val = Number(d[k]) || 0;
          const barH = (val / max) * (height - 34);
          const x = i * barGroupW + (si + 0.6) * barW;
          return <rect key={k + i} x={x} y={height - 20 - barH} width={barW * 0.82} height={Math.max(barH, val > 0 ? 2 : 0)} fill={colors[si]} rx="2" />;
        }))}
      </svg>
      <div className="flex text-[10px] mt-1" style={{ color: MUTED }}>
        {data.map((d, i) => <div key={i} style={{ width: `${100 / data.length}%`, textAlign: 'center' }}>{d.name}</div>)}
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: '#64748b' }}>
        {seriesKeys.map((k, si) => (
          <span key={k} className="flex items-center gap-1.5">
            <span style={{ width: 10, height: 10, background: colors[si], display: 'inline-block', borderRadius: 2 }}></span>{k}
          </span>
        ))}
      </div>
    </div>
  );
}
