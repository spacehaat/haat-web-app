export default function KpiRing({ pct }) {
  const r = 18, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
  return (
    <svg className="kpi-ring" width="46" height="46" viewBox="0 0 46 46">
      <circle cx="23" cy="23" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="5" />
      <circle cx="23" cy="23" r={r} fill="none" stroke="var(--fresh)" strokeWidth="5"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
        transform="rotate(-90 23 23)" />
    </svg>
  );
}
