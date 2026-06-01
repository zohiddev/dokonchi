interface BarChartDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartDatum[];
  height?: number;
  formatValue?: (v: number) => string;
}

export function BarChart({ data, height = 180, formatValue }: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="bar-chart" style={{ height }}>
      {data.map((d, i) => {
        const ratio = d.value / max;
        const h = `${Math.max(2, ratio * 100)}%`;
        return (
          <div key={`${d.label}-${i}`} className="bar-col">
            <div className="bar-value num">{d.value > 0 ? (formatValue?.(d.value) ?? d.value) : ''}</div>
            <div className="bar-track">
              <div
                className={`bar-fill ${d.value === 0 ? 'empty' : ''}`}
                style={{ height: h, animationDelay: `${i * 60}ms` }}
              />
            </div>
            <div className="bar-label">{d.label}</div>
          </div>
        );
      })}

      <style>{`
        .bar-chart {
          display: grid;
          grid-template-columns: repeat(${data.length}, 1fr);
          gap: 10px;
          align-items: end;
          padding: 12px 6px;
        }
        .bar-col {
          display: flex; flex-direction: column;
          align-items: center;
          gap: 6px;
          height: 100%;
        }
        .bar-value {
          font-size: 10.5px;
          color: var(--ink-soft);
          min-height: 14px;
        }
        .bar-track {
          flex: 1;
          width: 100%;
          display: flex;
          align-items: flex-end;
        }
        .bar-fill {
          width: 100%;
          background: linear-gradient(to top, var(--green-2), var(--green-soft));
          border-radius: 6px 6px 0 0;
          animation: grow .4s ease forwards;
          transform-origin: bottom;
        }
        .bar-fill.empty { background: var(--line); }
        .bar-label {
          font-size: 11.5px;
          color: var(--ink-soft);
          font-weight: 500;
        }
        @keyframes grow {
          from { transform: scaleY(0); opacity: 0; }
          to   { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
