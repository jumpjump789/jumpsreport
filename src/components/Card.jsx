export const MUTED = '#8a95a5';
export const BORDER = '#e4e8ee';

export default function Card({ className = '', style, children }) {
  return (
    <div className={`bg-white ${className}`} style={{ border: `1px solid ${BORDER}`, borderRadius: 14, ...style }}>
      {children}
    </div>
  );
}
