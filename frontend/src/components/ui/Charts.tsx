import { type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { money } from '../../lib/format';

// ===== Umumiy ranglar (tokens.css bilan mos) =====
const COLOR = {
  green: '#3a5a40',
  greenSoft: '#4f7a52',
  amber: '#c47a26',
  brick: '#a4493d',
  ink: '#2b2620',
  inkSoft: '#7a7164',
  inkFaint: '#a89e8e',
  line: '#e4dccb',
  paper: '#fbf8f1',
};

const AXIS_STYLE = {
  fontSize: 11,
  fontFamily: 'IBM Plex Mono, monospace',
  fill: COLOR.inkFaint,
};

// ===== Maxsus tooltip (recharts ichki tipi murakkab — any bilan oddiy) =====
interface TipItem { name?: string; value?: number | string; color?: string }
interface TipProps {
  active?: boolean;
  payload?: TipItem[];
  label?: string | number;
  formatter?: (v: number) => string;
}

function CustomTooltip({ active, payload, label, formatter }: TipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const fmt = formatter ?? ((v: number) => money(v, false));
  return (
    <div className="rt-tip">
      {label !== undefined && label !== '' && <div className="rt-tip-lbl">{String(label)}</div>}
      {payload.map((p, i) => (
        <div key={i} className="rt-tip-row">
          <span className="rt-tip-dot" style={{ background: p.color }} />
          <span className="rt-tip-name">{p.name}</span>
          <span className="rt-tip-val num">{fmt(Number(p.value) || 0)}</span>
        </div>
      ))}
      <style>{`
        .rt-tip {
          background: ${COLOR.ink};
          color: ${COLOR.paper};
          padding: 8px 11px;
          border-radius: 8px;
          box-shadow: 0 6px 18px rgba(43,38,32,.2);
          font-size: 12px;
          min-width: 120px;
        }
        .rt-tip-lbl {
          font-weight: 600;
          margin-bottom: 4px;
          color: #f3ede0;
        }
        .rt-tip-row {
          display: flex; align-items: center; gap: 7px;
          padding: 2px 0;
        }
        .rt-tip-dot {
          width: 8px; height: 8px; border-radius: 50%;
          flex-shrink: 0;
        }
        .rt-tip-name {
          flex: 1; color: #c8bfac;
          font-size: 11.5px;
        }
        .rt-tip-val {
          font-weight: 600; color: #fbf8f1;
        }
      `}</style>
    </div>
  );
}

// ===== Cashflow area chart (kirim/chiqim/sof) =====
export interface CashflowPoint {
  date: string;
  income: number;
  outflow: number;
  net: number;
}

export function CashflowAreaChart({
  data,
  height = 220,
}: {
  data: CashflowPoint[];
  height?: number;
}) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="grad-in" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLOR.greenSoft} stopOpacity={0.6} />
              <stop offset="95%" stopColor={COLOR.greenSoft} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="grad-out" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLOR.brick} stopOpacity={0.5} />
              <stop offset="95%" stopColor={COLOR.brick} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={COLOR.line} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => v.slice(5)}
            tick={AXIS_STYLE}
            axisLine={{ stroke: COLOR.line }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v: number) => {
              if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
              if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
              return String(v);
            }}
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          <Tooltip content={(<CustomTooltip />) as never} />
          <Area
            type="monotone"
            dataKey="income"
            name="Kirim"
            stroke={COLOR.greenSoft}
            strokeWidth={2}
            fill="url(#grad-in)"
          />
          <Area
            type="monotone"
            dataKey="outflow"
            name="Chiqim"
            stroke={COLOR.brick}
            strokeWidth={2}
            fill="url(#grad-out)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ===== Oddiy bar chart (kunlik/oylik sotuv) =====
export interface BarPoint {
  label: string;
  value: number;
}

export function SimpleBarChart({
  data,
  height = 200,
  color = COLOR.greenSoft,
  formatter,
}: {
  data: BarPoint[];
  height?: number;
  color?: string;
  formatter?: (v: number) => string;
}) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 18, right: 5, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="grad-bar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.95} />
              <stop offset="100%" stopColor={color} stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={COLOR.line} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ ...AXIS_STYLE, fontSize: 12 }}
            axisLine={{ stroke: COLOR.line }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => {
              if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
              if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
              return String(v);
            }}
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          <Tooltip
            content={(<CustomTooltip formatter={formatter} />) as never}
            cursor={{ fill: 'rgba(58,90,64,.06)' }}
          />
          <Bar
            dataKey="value"
            name="Sotuv"
            fill="url(#grad-bar)"
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ===== Horizontal bar (toifa bo'yicha foyda) =====
export interface HBarPoint {
  label: string;
  value: number;
  extra?: ReactNode; // qo'shimcha info
}

export function HorizontalBarChart({
  data,
  height,
}: {
  data: HBarPoint[];
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const h = height ?? Math.max(160, data.length * 46);

  return (
    <div style={{ width: '100%', height: h }}>
      <ResponsiveContainer>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
        >
          <defs>
            <linearGradient id="grad-hbar" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={COLOR.greenSoft} />
              <stop offset="100%" stopColor={COLOR.green} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={COLOR.line} strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, max]}
            tickFormatter={(v: number) => {
              if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
              if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
              return String(v);
            }}
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ ...AXIS_STYLE, fontSize: 12, fontFamily: 'IBM Plex Sans, sans-serif', fill: COLOR.ink }}
            axisLine={false}
            tickLine={false}
            width={110}
          />
          <Tooltip
            content={(<CustomTooltip />) as never}
            cursor={{ fill: 'rgba(58,90,64,.06)' }}
          />
          <Bar
            dataKey="value"
            name="Foyda"
            radius={[0, 8, 8, 0]}
            maxBarSize={28}
          >
            {data.map((_, i) => (
              <Cell key={i} fill="url(#grad-hbar)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
