/**
 * 통계 — 한눈에 핵심이 보이는 재정 요약.
 *
 * 좌측: 누적 저축(강조) → 지출·투자 → 순자산 → 자산 추이 → 월별 막대
 * 우측: 요약 통계 4줄 (넓은 화면에서는 스크롤을 따라옴)
 * 1024px 미만에서는 1단으로 접힌다.
 *
 * 모든 수치는 useMetrics / buildAssetSeries에서 파생된다
 * (대시보드·수입/지출 페이지와 같은 소스라 숫자가 어긋나지 않는다).
 */
import { useMemo, type ReactNode } from 'react';
import { Receipt, TrendingUp, PiggyBank, Wallet, Check, Flame } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useMetrics } from '@/hooks/useMetrics';
import { Card, SectionTitle, EmptyState, cn } from '@/components/ui';
import { AssetBreakdownChart, BudgetBarChart } from '@/components/charts';
import { totalExpenseOf, expenseRatio } from '@/utils/finance';
import { formatMoney, formatPercent, formatShort, formatMonth } from '@/utils/format';

type Tone = 'positive' | 'negative' | 'accent' | 'gold';

const TONE = {
  positive: { text: 'text-positive', chip: 'bg-positive/10 text-positive', edge: 'border-positive/20 bg-positive/[0.04]' },
  negative: { text: 'text-negative', chip: 'bg-negative/10 text-negative', edge: 'border-negative/20 bg-negative/[0.04]' },
  accent: { text: 'text-accent', chip: 'bg-accent/10 text-accent', edge: 'border-accent/20 bg-accent/[0.04]' },
  gold: { text: 'text-gold', chip: 'bg-gold/10 text-gold', edge: 'border-gold/20 bg-gold/[0.04]' },
} as const;

/** 지출·투자처럼 나란히 놓이는 중간 크기 카드 */
function MetricCard({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: Tone;
  icon: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs sm:text-sm text-ink-soft font-medium">{label}</span>
        <span className={cn('w-7 h-7 rounded-full grid place-items-center shrink-0', TONE[tone].chip)}>
          {icon}
        </span>
      </div>
      <div>
        <p className={cn('text-xl sm:text-2xl font-bold tabular tracking-tight', TONE[tone].text)}>
          {value}
        </p>
        {hint && <p className="text-[10px] sm:text-xs text-ink-faint mt-0.5 tabular">{hint}</p>}
      </div>
    </Card>
  );
}

/** 우측 요약 한 줄 — 라벨 작게, 숫자 크게, 상태 아이콘으로 강조 */
function SummaryTile({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  tone: Tone;
  icon: ReactNode;
}) {
  return (
    <div className={cn('rounded-xl border p-3', TONE[tone].edge)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-ink-soft font-medium">{label}</span>
        <span className={cn('w-6 h-6 rounded-full grid place-items-center shrink-0', TONE[tone].chip)}>
          {icon}
        </span>
      </div>
      <p className={cn('text-lg sm:text-xl font-bold tabular tracking-tight mt-1', TONE[tone].text)}>
        {value}
      </p>
      <p className="text-[10px] text-ink-faint leading-tight">{hint}</p>
    </div>
  );
}

export function StatsPage() {
  const { data } = useAppData();
  const m = useMetrics();
  const { currency, initialAsset } = data.settings;
  const { records } = data;

  const stats = useMemo(() => {
    if (records.length === 0) return null;

    // 누적 수입/지출은 기록 전체를 합산한다.
    // 기록별 비율의 평균을 내면 안 된다 — 이 앱은 수입과 지출을 서로 다른
    // 날짜에 적으므로 수입이 있는 날의 지출은 0이고, 지출만 있는 날은
    // 수입이 0이라 분모에서 빠져 지출율이 항상 0%로 나왔다.
    const totalIncome = records.reduce((s, r) => s + r.income, 0);
    const totalExpense = records.reduce((s, r) => s + totalExpenseOf(r), 0);
    const expenseRate = expenseRatio(records);
    const investRate = totalIncome > 0 ? (m.totalInvested / totalIncome) * 100 : 0;

    // 누적 저축액 = 수입 − 지출
    const totalSaved = totalIncome - totalExpense;

    // 기록이 걸쳐 있는 개월 수 (첫 달과 마지막 달 모두 포함)
    const months = records.map((r) => r.date.slice(0, 7)).sort();
    const [fy, fm] = months[0].split('-').map(Number);
    const [ly, lm] = months[months.length - 1].split('-').map(Number);
    const monthSpan = Math.max(1, (ly - fy) * 12 + (lm - fm) + 1);
    const monthlySaved = totalSaved / monthSpan;

    // 자산 추이 — 현금 + 투자 = 총자산 (수입/지출 모달의 '실제 통장잔액'과 같은 정의)
    const breakdown = m.series.map((p) => ({
      x: p.date.slice(5),
      현금: initialAsset + p.cashSaving,
      투자: p.investedPrincipal + p.investmentGain,
      부채: p.liabilities,
    }));

    // 월별 수입/지출/투자 (최근 12개월)
    const byMonth = new Map<string, { 수입: number; 지출: number; 투자: number }>();
    for (const r of records) {
      const key = r.date.slice(0, 7);
      const v = byMonth.get(key) ?? { 수입: 0, 지출: 0, 투자: 0 };
      v.수입 += r.income;
      v.지출 += totalExpenseOf(r);
      v.투자 += r.investment;
      byMonth.set(key, v);
    }
    const monthly = [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([key, v]) => ({ x: formatMonth(key).replace('년 ', '.').replace('월', ''), ...v }));

    return {
      totalIncome,
      totalExpense,
      expenseRate,
      investRate,
      totalSaved,
      monthlySaved,
      monthSpan,
      breakdown,
      monthly,
    };
  }, [records, initialAsset, m.series, m.totalInvested]);

  if (!stats) {
    return (
      <Card>
        <EmptyState
          icon={<TrendingUp size={32} />}
          title="집계할 데이터가 없어요"
          desc="'수입/지출' 페이지에서 기록을 입력하면 통계가 나타납니다."
        />
      </Card>
    );
  }

  const savedTone: Tone = stats.totalSaved >= 0 ? 'positive' : 'negative';

  return (
    <div className="grid lg:grid-cols-3 gap-4 items-start">
      {/* ── 좌측 ── */}
      <div className="lg:col-span-2 space-y-4">
        {/* 누적 저축 — 이 페이지의 결론이라 가장 크게 */}
        <Card className={cn('border', TONE[savedTone].edge)}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={cn('w-8 h-8 rounded-full grid place-items-center', TONE[savedTone].chip)}>
              <PiggyBank size={17} />
            </span>
            <span className="text-sm font-medium text-ink-soft">누적 저축</span>
          </div>
          <p className={cn('text-3xl sm:text-4xl font-bold tabular tracking-tight', TONE[savedTone].text)}>
            {formatMoney(stats.totalSaved, currency)}
          </p>
          <p className="text-xs text-ink-faint mt-1.5 tabular">
            월평균{' '}
            <span className="font-semibold text-ink-soft">
              {formatMoney(stats.monthlySaved, currency)}
            </span>
            <span className="mx-1.5 text-line/40">·</span>
            수입 {formatShort(stats.totalIncome, currency)} − 지출{' '}
            {formatShort(stats.totalExpense, currency)}
          </p>
        </Card>

        {/* 지출 · 투자 */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <MetricCard
            label="누적 지출"
            value={formatMoney(stats.totalExpense, currency)}
            hint={`수입 대비 ${formatPercent(stats.expenseRate)}`}
            tone="negative"
            icon={<Receipt size={15} />}
          />
          <MetricCard
            label="누적 투자"
            value={formatMoney(m.totalInvested, currency)}
            hint={`수입 대비 ${formatPercent(stats.investRate)}`}
            tone="accent"
            icon={<TrendingUp size={15} />}
          />
        </div>

        {/* 순자산 — 가로 한 줄 */}
        <Card className={cn('border', TONE.gold.edge)}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn('w-8 h-8 rounded-full grid place-items-center shrink-0', TONE.gold.chip)}>
                <Wallet size={16} />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink-soft">순자산</div>
                <div className="text-[10px] text-ink-faint leading-tight">총자산 − 부채</div>
              </div>
            </div>
            <p
              className={cn(
                'text-2xl sm:text-3xl font-bold tabular tracking-tight shrink-0',
                m.netWorth >= 0 ? 'text-gold' : 'text-negative',
              )}
            >
              {formatMoney(m.netWorth, currency)}
            </p>
          </div>
        </Card>

        <Card>
          <SectionTitle>자산 추이</SectionTitle>
          <AssetBreakdownChart data={stats.breakdown} currency={currency} />
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs">
            {(
              [
                ['bg-positive', '현금'],
                ['bg-accent', '투자'],
                ['bg-negative', '부채'],
              ] as const
            ).map(([color, name]) => (
              <div key={name} className="flex items-center gap-1.5">
                <span className={cn('w-2 h-2 rounded-full', color)} />
                <span className="text-ink-soft">{name}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle
            right={<span className="text-xs text-ink-faint">최근 {stats.monthly.length}개월</span>}
          >
            월별 수입 · 지출
          </SectionTitle>
          <BudgetBarChart data={stats.monthly} currency={currency} />
        </Card>
      </div>

      {/* ── 우측 요약 ── 넓은 화면에서는 스크롤을 따라온다 */}
      <Card className="lg:sticky lg:top-4">
        <SectionTitle>요약 통계</SectionTitle>
        <div className="space-y-2">
          <SummaryTile
            label="누적 저축액"
            value={formatMoney(stats.totalSaved, currency)}
            hint="수입 − 지출"
            tone={savedTone}
            icon={<Check size={13} />}
          />
          <SummaryTile
            label="월평균 저축"
            value={formatMoney(stats.monthlySaved, currency)}
            hint={`누적 저축 ÷ ${stats.monthSpan}개월`}
            tone={savedTone}
            icon={<PiggyBank size={13} />}
          />
          <SummaryTile
            label="투자 수익률"
            value={formatPercent(m.gainRate)}
            hint="투자 수익 ÷ 투자금"
            tone="accent"
            icon={<TrendingUp size={13} />}
          />
          <SummaryTile
            label="FIRE 달성률"
            value={formatPercent(m.progress)}
            hint={`순자산 ÷ 목표 ${formatShort(m.target, currency)}`}
            tone="gold"
            icon={<Flame size={13} />}
          />
        </div>
      </Card>
    </div>
  );
}
