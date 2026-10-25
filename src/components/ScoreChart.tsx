export function ScoreChart({ data }: { data: { epoch: number; score: number }[] }) {
  const W = 640
  const H = 220
  const pad = { l: 36, r: 16, t: 16, b: 28 }
  if (data.length < 2) return <p className="state">The line starts with the second epoch this mind appears in.</p>

  const lo = Math.min(...data.map((d) => d.score))
  const hi = Math.max(...data.map((d) => d.score))
  const span = Math.max(8, hi - lo + 6) // a flat history still gets a readable scale
  const mid = (hi + lo) / 2
  const min = Math.floor(mid - span / 2)
  const max = Math.ceil(mid + span / 2)
  const x = (i: number) => pad.l + (i / (data.length - 1)) * (W - pad.l - pad.r)
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b)
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.score).toFixed(1)}`).join(' ')
  const area = `${line} L${x(data.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`
  const ticks = [min, Math.round((min + max) / 2), max]

  return (
    <svg
      className="score-chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`SIIR Score from epoch ${data[0].epoch} to ${data[data.length - 1].epoch}`}
    >
      <defs>
        <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--siir-sky-500)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--siir-sky-500)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray="2 5" />
          <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="chart-label">
            {t}
          </text>
        </g>
      ))}
      <path d={area} fill="url(#chart-fill)" />
      <path className="chart-line" d={line} fill="none" stroke="var(--siir-sky-500)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={d.epoch}>
          <circle cx={x(i)} cy={y(d.score)} r={i === data.length - 1 ? 5 : 3.5} fill="var(--surface)" stroke="var(--siir-sky-500)" strokeWidth="2">
            <title>{`Epoch ${d.epoch}: ${d.score.toFixed(1)}`}</title>
          </circle>
          <text x={x(i)} y={H - 8} textAnchor="middle" className="chart-label">
            {d.epoch}
          </text>
        </g>
      ))}
    </svg>
  )
}
