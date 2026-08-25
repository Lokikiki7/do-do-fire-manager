/**
 * 통계 — 지표 카드 4개 + 2단 그래프 레이아웃.
 *
 * 좌측(넓음): 자산 구성 추이 · 월별 수입/지출
 * 우측(좁음): 요약 통계 텍스트 · 자산 구성 도넛
 * 1024px 미만에서는 1단으로 접힌다.
 *
 * 모든 수치는 buildAssetSeries에서 파생된다 (대시보드·수입/지출과 같은 소스).
 */
import { useMemo } from 'react';
import { Receipt, TrendingUp, Percent, Flame } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { Card, SectionTitle, EmptyState, cn } from '@/components/ui';
import { StatCard } from '@/components/ui/Stat';
import { AssetBreakdownChart, BudgetBarChart, CompositionPie, PIE_COLORS } from '@/components/charts';
import { buildAssetSeries, totalExpenseOf } from '@/utils/finance';
import { formatMoney, formatPercent, formatShort, formatMonth } from '@/utils/format';

export function StatsPage() {
  const { data } = useAppData();
  const { currency, initialAsset, initialLiability } = data.settings;
  const { records } = data;

  const stats = useMemo(() => {
    if (records.length === 0) return null;

    // 평균 지출율 / 투자율 — 수입이 있는 날만 분모로 삼는다
    const earning = records.filter((r) => r.income > 0);
    const avgExpense = earning.length
      ? earning.reduce((s, r) => s + (totalExpenseOf(r) / r.income) * 100, 0) / earning.length
      : 0;
    const avgInvest = earning.length
      ? earning.reduce((s, r) => s + (r.investment / r.income) * 100, 0) / earning.length
      : 0;

    const series = buildAssetSeries(records, initialAsset, initialLiability);
    const first = series[0];
    const last = series[series.length - 1];

    let growth = 0;
    if (first && last && series.length >= 2) {
      // 첫 기록 "직전"의 순자산을 기준선으로 삼아야 첫날 저축분이 성장에 포함된다
      const base = first.netWorth - first.change;
      growth = base !== 0 ? ((last.netWorth - base) / Math.abs(base)) * 100 : 0;
    }

    const totalInvested = last?.investedPrincipal ?? 0;
    const totalGain = last?.investmentGain ?? 0;
    const gainRate = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

    // 통장잔액 = 초기자산 + 누적 현금저축 (수입/지출 모달의 '실제 통장잔액'과 같은 정의)
    const cash = initialAsset + (last?.cashSaving ?? 0);
    const investmentValue = totalInvested + totalGain;
    const liabilities = last?.liabilities ?? Math.max(0, initialLiability);

    // 자산 구성 추이 — 현금 + 투자 = 총자산
    const breakdown = series.map((p) => ({
      x: p.date.slice(5),
      현금: initialAsset + p.cashSaving,
      투자: p.investedPrincipal + p.investmentGain,
      부채: p.liabilities,
    }));

    // 월별 수입/지출/투자 집계
    const byMonth = new Map<string, { 수입: number; 지출: number; 투자: number }>();
    for (const r of records) {
      const key = r.date.slice(0, 7);
      const m = byMonth.get(key) ?? { 수입: 0, 지출: 0, 투자: 0 };
      m.수입 += r.income;
      m.지출 += totalExpenseOf(r);
      m.투자 += r.investment;
      byMonth.set(key, m);
    }
    const monthly = [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([key, m]) => ({ x: formatMonth(key).replace('년 ', '.').replace('월', ''), ...m }));

    return {
      avgExpense,
      avgInvest,
      growth,
      totalInvested,
      totalGain,
      gainRate,
      totalAssets: last?.totalAssets ?? initialAsset,
      netWorth: last?.netWorth ?? initialAsset - Math.max(0, initialLiability),
      cash,
      investmentValue,
      liabilities,
      breakdown,
      monthly,
    };
  }, [records, initialAsset, initialLiability]);

  if (!stats) {
    return (
      <Card>
        <EmptyState
          icon={<TrendingUp size={32} />}
          title="집계할 데이터가 없어요"
          desc="'수입/지출' 페이지에서 월별 기록을 입력하면 통계가 나타납니다."
        />
      </Card>
    );
  }

  const composition = [
    { name: '현금', value: Math.max(0, stats.cash) },
    { name: '투자', value: Math.max(0, stats.investmentValue) },
    { name: '부채', value: Math.max(0, stats.liabilities) },
  ].filter((d) => d.value > 0);

  /** 요약 통계 한 줄 — 라벨은 작게, 숫자는 크게 */
  const SummaryRow = ({
    label,
    value,
    tone = 'ink',
    hint,
  }: {
    label: string;
    value: string;
    tone?: 'ink' | 'accent' | 'negative' | 'positive';
    hint?: string;
  }) => (
    <div className="flex items-baseline justify-between gap-3 py-2 border-b border-line/[0.06] last:border-0">
      <div className="min-w-0">
        <div className="text-xs text-ink-soft">{label}</div>
        {hint && <div className="text-[10px] text-ink-faint leading-tight">{hint}</div>}
      </div>
      <div
        className={cn(
          'text-base sm:text-lg font-bold tabular tracking-tight shrink-0',
          tone === 'accent'
            ? 'text-accent'
            : tone === 'negative'
              ? 'text-negative'
              : tone === 'positive'
                ? 'text-positive'
                : 'text-ink',
        )}
      >
        {value}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* 지표 카드 — 좁은 화면에서도 4개를 한 줄로 유지 */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <StatCard
          compact
          label="평균 지출율"
          value={formatPercent(stats.avgExpense)}
          icon={<Receipt size={16} />}
          accent={stats.avgExpense >= 70 ? 'red' : 'green'}
        />
        <StatCard
          compact
          label="평균 투자율"
          value={formatPercent(stats.avgInvest)}
          icon={<Percent size={16} />}
          accent="blue"
        />
        <StatCard
          compact
          label="자산 성장률"
          value={formatPercent(stats.growth)}
          deltaType={stats.growth >= 0 ? 'up' : 'down'}
          icon={<Flame size={16} />}
          accent="gold"
        />
        <StatCard
          compact
          label="누적 투자 수익금"
          value={`${stats.totalGain > 0 ? '+' : ''}${formatShort(stats.totalGain, currency)}`}
          delta={stats.totalInvested > 0 ? `원금 대비 ${formatPercent(stats.gainRate)}` : undefined}
          deltaType={stats.totalGain >= 0 ? 'up' : 'down'}
          icon={<TrendingUp size={16} />}
          accent={stats.totalGain >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* 2단 레이아웃 — 1024px 미만에서 1단으로 접힌다 */}
      <div className="grid lg:grid-cols-3 gap-4 items-start">
        {/* 좌측: 그래프 */}
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

        {/* 우측: 요약 + 구성 */}
        <div className="space-y-4">
          <Card>
            <SectionTitle>요약</SectionTitle>
            <div>
              <SummaryRow
                label="총 자산"
                value={formatMoney(stats.totalAssets, currency)}
                hint={`현금 ${formatShort(stats.cash, currency)} + 투자 ${formatShort(stats.investmentValue, currency)}`}
              />
              <SummaryRow
                label="총 투자금"
                value={formatMoney(stats.totalInvested, currency)}
                tone="accent"
                hint={
                  stats.totalGain !== 0
                    ? `수익 ${stats.totalGain > 0 ? '+' : ''}${formatShort(stats.totalGain, currency)}`
                    : undefined
                }
              />
              <SummaryRow
                label="총 부채"
                value={formatMoney(stats.liabilities, currency)}
                tone={stats.liabilities > 0 ? 'negative' : 'ink'}
              />
              <SummaryRow
                label="순자산"
                value={formatMoney(stats.netWorth, currency)}
                tone={stats.netWorth >= 0 ? 'positive' : 'negative'}
                hint="총 자산 − 총 부채"
              />
            </div>
          </Card>

          <Card>
            <SectionTitle>자산 구성</SectionTitle>
            {composition.length > 0 ? (
              <>
                <CompositionPie data={composition} currency={currency} />
                <div className="space-y-1.5 mt-3">
                  {composition.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="text-ink-soft">{d.name}</span>
                      <span className="ml-auto tabular font-semibold text-ink">
                        {formatMoney(d.value, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-faint py-8 text-center">표시할 자산이 없습니다.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
