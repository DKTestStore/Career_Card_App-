import { scoreLabel } from '../lib/ats/score';

export function Gauge({ score, size = 150, label }: { score: number; size?: number; label?: string }) {
  const r = 52, c = Math.PI * r; // semicircle
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color = score >= 80 ? '#0F9D9A' : score >= 65 ? '#5B3DF5' : score >= 50 ? '#D98A00' : '#E5484D';
  return (
    <div className="gauge" style={{ width: size }} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} aria-label={`ATS score ${score} out of 100`}>
      <svg viewBox="0 0 124 72" width={size} height={size * 72 / 124} aria-hidden="true">
        <path d="M10 64 A52 52 0 0 1 114 64" fill="none" stroke="#ECE8F6" strokeWidth="11" strokeLinecap="round" />
        <path d="M10 64 A52 52 0 0 1 114 64" fill="none" stroke={color} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`} style={{ transition: 'stroke-dasharray .5s ease' }} />
      </svg>
      <div className="gauge-val"><b data-testid="ats-score">{score}</b><span>/100</span></div>
      <div className="gauge-label" style={{ color }}>{label ?? scoreLabel(score)}</div>
    </div>
  );
}
