import styles from './Charts.module.css';

/** Recharts tooltip styled as a flood lower-third. */
export default function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{labelFormatter ? labelFormatter(label, payload) : label}</p>
      <ul>
        {payload.map((p) => (
          <li key={p.dataKey}>
            <span className={styles.swatch} style={{ background: p.color || p.stroke || p.fill }} aria-hidden="true" />
            <span>{p.name}</span>
            <b>{valueFormatter ? valueFormatter(p.value, p) : p.value}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Shared axis/tick props so every chart looks like the same broadcast package.
export const axisProps = (c) => ({
  stroke: c.grid,
  tick: { fill: c.muted, fontSize: 11, fontFamily: c.font },
  tickLine: false,
  axisLine: { stroke: c.grid },
});
