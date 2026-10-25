const AXES = [
  ['reach', 'REACH'],
  ['engagement', 'ENGAGE'],
  ['narrative', 'NARRATIVE'],
  ['onchain', 'ON-CHAIN'],
  ['consistency', 'CONSIST.'],
] as const

type Key = (typeof AXES)[number][0]

/** Five-axis radar of the SIIR components, each 0-100. */
export function RadarChart({ values, label }: { values: Record<Key, number>; label: string }) {
  const S = 320
  const c = S / 2
  const R = 104
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / AXES.length
  const pt = (i: number, r: number) => [c + Math.cos(angle(i)) * r, c + Math.sin(angle(i)) * r] as const
  const ring = (f: number) => AXES.map((_, i) => pt(i, R * f).map((n) => n.toFixed(1)).join(',')).join(' ')
  const shape = AXES.map(([k], i) => pt(i, (R * Math.min(100, Math.max(0, values[k]))) / 100).map((n) => n.toFixed(1)).join(',')).join(' ')

  return (
    <svg className="radar" viewBox={`0 0 ${S} ${S}`} role="img" aria-label={label}>
      <defs>
        <radialGradient id="radar-fill" cx="50%" cy="50%" r="60%">
          <stop offset="0" stopColor="var(--siir-sky-500)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--siir-azure-700)" stopOpacity="0.18" />
        </radialGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ring(f)} fill="none" stroke="var(--line)" strokeDasharray={f === 1 ? undefined : '2 5'} />
      ))}
      {AXES.map(([k], i) => {
        const [x, y] = pt(i, R)
        return <line key={k} x1={c} y1={c} x2={x} y2={y} stroke="var(--line)" />
      })}
      <polygon className="radar-shape" points={shape} fill="url(#radar-fill)" stroke="var(--siir-sky-500)" strokeWidth="2.2" strokeLinejoin="round" />
      {AXES.map(([k, name], i) => {
        const [px, py] = pt(i, (R * Math.min(100, Math.max(0, values[k]))) / 100)
        const [lx, ly] = pt(i, R + 22)
        return (
          <g key={k}>
            <circle className="radar-dot" cx={px} cy={py} r="4" fill="var(--surface)" stroke="var(--siir-sky-500)" strokeWidth="2" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" className="radar-label">
              {name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
