/**
 * Recharts 래퍼 모음.
 * 툴팁/축 스타일을 앱 테마에 맞춰 한곳에서 통제 → 페이지 코드가 깔끔해진다.
 * currency에 따라 축 포맷이 자동으로 바뀐다.
 */
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import type { ReactNode } from 'react';
import type { Currency } from '@/types';
import { formatShort, formatMoney } from '@/utils/format';

// 앱 색상 토큰을 JS에서 사용 (Recharts는 실제 색상값 필요)
const C = {
  accent: 'rgb(0,122,255)',
  positive: 'rgb(52,199,89)',
  gold: 'rgb(255,159,10)',
  negative: 'rgb(255,59,48)',
  grid: 'rgb(142,142,147)',
};

/** 공통 커스텀 툴팁 */
interface TipProps {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string | number;
  currency: Currency;
}
function ChartTooltip({ active, payload, label, currency }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-elevated/95 backdrop-blur rounded-xl px-3 py-2 shadow-lg border border-line/10 text-xs">
      {label !== undefined && <p className="text-ink-faint mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 tabular">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-ink-soft">{p.name}</span>
          <span className="font-semibold text-ink ml-auto">{formatMoney(p.value, currency)}</span>
        </p>
      ))}
    </div>
  );
}

const axisProps = {
  tick: { fontSize: 11, fill: C.grid },
  axisLine: false,
  tickLine: false,
} as const;

/**
 * 차트 접근성 프레임.
 * 시각적 차트는 스크린리더가 읽을 수 없으므로 role="img" + aria-label로
 * 차트의 요지를 텍스트로 제공한다.
 */
function ChartFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="img" aria-label={label}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// 자산 성장 영역 차트
// ─────────────────────────────────────────────
interface SeriesPoint {
  x: string;
  total: number;
  principal?: number;
}
export function AssetAreaChart({ data, currency }: { data: SeriesPoint[]; currency: Currency }) {
  const last = data[data.length - 1];
  const ariaLabel = last
    ? `자산 성장 추이 그래프. 최근 값 ${formatMoney(last.total, currency)}.`
    : '자산 성장 추이 그래프. 데이터 없음.';
  return (
    <ChartFrame label={ariaLabel}>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.accent} stopOpacity={0.35} />
              <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gPrincipal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.positive} stopOpacity={0.25} />
              <stop offset="100%" stopColor={C.positive} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={C.grid}
            strokeOpacity={0.12}
            vertical={false}
          />
          <XAxis dataKey="x" {...axisProps} minTickGap={28} />
          <YAxis {...axisProps} width={44} tickFormatter={(v) => formatShort(v, currency)} />
          <Tooltip content={<ChartTooltip currency={currency} />} />
          {data[0]?.principal !== undefined && (
            <Area
              type="monotone"
              dataKey="principal"
              name="원금"
              stroke={C.positive}
              strokeWidth={2}
              fill="url(#gPrincipal)"
            />
          )}
          <Area
            type="monotone"
            dataKey="total"
            name="총 자산"
            stroke={C.accent}
            strokeWidth={2.5}
            fill="url(#gTotal)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

// ─────────────────────────────────────────────
// 복리 성장 라인 (원금 vs 수익 비교)
// ─────────────────────────────────────────────
export function CompoundLineChart({
  data,
  currency,
}: {
  data: { x: string; principal: number; profit: number }[];
  currency: Currency;
}) {
  const last = data[data.length - 1];
  const ariaLabel = last
    ? `복리 성장 그래프. 원금 ${formatMoney(last.principal, currency)}, 수익 ${formatMoney(last.profit, currency)}.`
    : '복리 성장 그래프. 데이터 없음.';
  return (
    <ChartFrame label={ariaLabel}>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={C.grid}
            strokeOpacity={0.12}
            vertical={false}
          />
          <XAxis dataKey="x" {...axisProps} minTickGap={28} />
          <YAxis {...axisProps} width={44} tickFormatter={(v) => formatShort(v, currency)} />
          <Tooltip content={<ChartTooltip currency={currency} />} />
          <Line
            type="monotone"
            dataKey="principal"
            name="원금"
            stroke={C.positive}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="profit"
            name="수익"
            stroke={C.gold}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

// ─────────────────────────────────────────────
// 월별 수입/지출 막대
// ─────────────────────────────────────────────
export function BudgetBarChart({
  data,
  currency,
}: {
  data: { x: string; 수입: number; 지출: number; 투자: number }[];
  currency: Currency;
}) {
  return (
    <ChartFrame label={`월별 수입·지출·투자 막대 그래프. 최근 ${data.length}개월 데이터.`}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={C.grid}
            strokeOpacity={0.12}
            vertical={false}
          />
          <XAxis dataKey="x" {...axisProps} minTickGap={12} />
          <YAxis {...axisProps} width={44} tickFormatter={(v) => formatShort(v, currency)} />
          <Tooltip
            content={<ChartTooltip currency={currency} />}
            cursor={{ fill: 'rgb(142,142,147)', fillOpacity: 0.06 }}
          />
          <Bar dataKey="수입" fill={C.positive} radius={[4, 4, 0, 0]} maxBarSize={18} />
          <Bar dataKey="지출" fill={C.negative} radius={[4, 4, 0, 0]} maxBarSize={18} />
          <Bar dataKey="투자" fill={C.accent} radius={[4, 4, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

// ─────────────────────────────────────────────
// 투자금 비중 도넛
// ─────────────────────────────────────────────
const PIE_COLORS = [C.accent, C.positive, C.gold, C.negative, 'rgb(175,82,222)'];
export function CompositionPie({
  data,
  currency,
}: {
  data: { name: string; value: number }[];
  currency: Currency;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const ariaLabel = `현금 흐름 구성 도넛 그래프. 총 ${formatMoney(total, currency)}, 항목 ${data.length}개.`;
  return (
    <ChartFrame label={ariaLabel}>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={90}
            paddingAngle={3}
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="bg-elevated/95 backdrop-blur rounded-xl px-3 py-2 shadow-lg border border-line/10 text-xs">
                  <p className="font-semibold text-ink">{payload[0].name}</p>
                  <p className="text-ink-soft tabular">
                    {formatMoney(payload[0].value as number, currency)}
                  </p>
                  <p className="text-ink-faint tabular">
                    {total ? (((payload[0].value as number) / total) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              ) : null
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export { PIE_COLORS };
