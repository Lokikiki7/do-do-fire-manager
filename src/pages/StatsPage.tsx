/**
 * 통계 — 한눈에 보는 재정 요약.
 *
 * 카드 4개(누적 수입·지출·투자·순자산) + 그래프 2개 + 우측 요약 4줄.
 * 1024px 미만에서는 1단으로 접힌다.
 *
 * 모든 수치는 useMetrics / buildAssetSeries에서 파생된다
 * (대시보드·수입/지출 페이지와 같은 소스라 숫자가 어긋나지 않는다).
 */
import { useMemo } from 'react';
import { Wallet, Receipt, TrendingUp, PiggyBank } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useMetrics } from '@/hooks/useMetrics';
import { Card, SectionTitle, EmptyState, cn } from '@/components/ui';
import { StatCard } from '@/components/ui/Stat';
import { AssetBreakdownChart, BudgetBarChart } from '@/components/charts';
import { totalExpenseOf, expenseRatio } from '@/utils/finance';
import { formatMoney, formatPercent, formatShort, formatMonth } from '@/utils/format';

export function StatsPage() {
  const { data } = useAppData();
  const m = useMetrics();
  const { currency, initialAsset } = data.settings;
  const { records } = data;

  const stats = useMemo(() => {
    if (records.length === 0) return null;

    // 누적 수입/지출은 기록 전체를 합산한다.
    // 기록별 비율의 평균을 내면 안 된다 — 이 앱은 수입과 지출을 서로 다른
    // 날짜에 적으므로, 수입이 있는 날의 지출은 0이고 지출만 있는 날은
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

  /** 요약 한 줄 — 라벨은 작게, 금액은 크게, 산식은 아래에 흐리게 */
  const SummaryRow = ({
    label,
    value,
    hint,
    tone = 'ink',
  }: {
    label: string;
    value: string;
    hint: string;
    tone?: 'ink' | 'accent' | 'positive' | 'gold';
  }) => (
    <div className="flex items-baseline justify-between gap-3 py-2.5 border-b border-line/[0.06] last:border-0">
      <div className="min-w-0">
        <div className="text-xs text-ink-soft">{label}</div>
        <div className="text-[10px] text-ink-faint leading-tight">{hint}</div>
      </div>
      <div
        className={cn(
          'text-base sm:text-lg font-bold tabular tracking-tight shrink-0',
          tone === 'accent'
            ? 'text-accent'
            : tone === 'positive'
              ? 'text-positive'
              : tone === 'gold'
                ? 'text-gold'
                : 'text-ink',
        )}
      >
        {value}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* 누적 수입 · 지출 · 투자 · 순자산 */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <StatCard
          compact
          label="누적 수입"
          value={formatShort(stats.totalIncome, currency)}
          icon={<Wallet size={16} />}
          accent="green"
        />
        <StatCard
          compact
          label="누적 지출"
          value={formatShort(stats.totalExpense, currency)}
          delta={`수입 대비 ${formatPercent(stats.expenseRate)}`}
          deltaType={stats.expenseRate >= 70 ? 'down' : 'neutral'}
          icon={<Receipt size={16} />}
          accent={stats.expenseRate >= 70 ? 'red' : 'gold'}
        />
        <StatCard
          compact
          label="누적 투자"
          value={formatShort(m.totalInvested, currency)}
          delta={`수입 대비 ${formatPercent(stats.investRate)}`}
          deltaType="up"
          icon={<TrendingUp size={16} />}
          accent="blue"
        />
        <StatCard
          compact
          label="순자산"
          value={formatShort(m.netWorth, currency)}
          icon={<PiggyBank size={16} />}
          accent={m.netWorth >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* 그래프(좌) + 요약(우) — lg 미만에서 1단 */}
      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
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

        <Card>
          <SectionTitle>요약</SectionTitle>
          <div>
            <SummaryRow
              label="누적 저축액"
              value={formatMoney(stats.totalSaved, currency)}
              hint="수입 − 지출"
              tone={stats.totalSaved >= 0 ? 'positive' : 'ink'}
            />
            <SummaryRow
              label="월평균 저축"
              value={formatMoney(stats.monthlySaved, currency)}
              hint={`누적 저축 ÷ ${stats.monthSpan}개월`}
            />
            <SummaryRow
              label="투자 수익률"
              value={formatPercent(m.gainRate)}
              hint="투자 수익 ÷ 투자금"
              tone="accent"
            />
            <SummaryRow
              label="FIRE 달성률"
              value={formatPercent(m.progress)}
              hint={`순자산 ÷ 목표 ${formatShort(m.target, currency)}`}
              tone="gold"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
