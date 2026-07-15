import { useMemo } from 'react';
import { PiggyBank, TrendingUp, Percent, Flame } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { Card, SectionTitle, EmptyState } from '@/components/ui';
import { StatCard } from '@/components/ui/Stat';
import { CompositionPie, PIE_COLORS } from '@/components/charts';
import { savingRate, buildAssetSeries } from '@/utils/finance';
import { formatMoney, formatPercent, formatShort } from '@/utils/format';

export function StatsPage() {
  const { data } = useAppData();
  const { currency } = data.settings;
  const { records } = data;
  const { initialAsset, initialLiability } = data.settings;

  const stats = useMemo(() => {
    if (records.length === 0) return null;

    const avgSaving =
      records.reduce((s, r) => s + savingRate(r.income, r.investment, r.saving), 0) /
      records.length;
    const avgInvest =
      records.reduce((s, r) => s + (r.income ? (r.investment / r.income) * 100 : 0), 0) /
      records.length;

    const fixed = records.reduce((s, r) => s + r.fixedExpense, 0);
    const variable = records.reduce((s, r) => s + r.variableExpense, 0);
    const invest = records.reduce((s, r) => s + r.investment, 0);
    const save = records.reduce((s, r) => s + r.saving, 0);

    // 자산 성장률도 수입/지출 기록에서 파생 (대시보드 그래프와 동일한 소스)
    const series = buildAssetSeries(records, initialAsset, initialLiability);
    const first = series[0];
    const last = series[series.length - 1];
    let growth = 0;
    if (first && last && series.length >= 2) {
      // 첫 기록 "직전"의 순자산을 기준선으로 삼아야 첫날 저축분이 성장에 포함된다
      const base = first.netWorth - first.change;
      growth = base !== 0 ? ((last.netWorth - base) / Math.abs(base)) * 100 : 0;
    }

    // 누적 투자 원금 / 수익 (대시보드와 같은 소스)
    const totalInvested = last?.investedPrincipal ?? 0;
    const totalGain = last?.investmentGain ?? 0;
    // 투자 수익률 = 누적 수익 / 누적 원금
    const gainRate = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

    return { avgSaving, avgInvest, fixed, variable, invest, save, growth, totalInvested, totalGain, gainRate };
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
    { name: '고정지출', value: stats.fixed },
    { name: '변동지출', value: stats.variable },
    { name: '투자', value: stats.invest },
    { name: '저축', value: stats.save },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="평균 저축률"
          value={formatPercent(stats.avgSaving)}
          icon={<PiggyBank size={16} />}
          accent="green"
        />
        <StatCard
          label="평균 투자율"
          value={formatPercent(stats.avgInvest)}
          icon={<Percent size={16} />}
          accent="blue"
        />
        <StatCard
          label="자산 성장률"
          value={formatPercent(stats.growth)}
          deltaType={stats.growth >= 0 ? 'up' : 'down'}
          icon={<Flame size={16} />}
          accent="gold"
        />
        <StatCard
          label="누적 투자 원금"
          value={formatShort(stats.totalInvested, currency)}
          delta={
            stats.totalGain !== 0
              ? `수익 ${stats.totalGain >= 0 ? '+' : ''}${formatShort(stats.totalGain, currency)} (${formatPercent(stats.gainRate)})`
              : undefined
          }
          deltaType={stats.totalGain >= 0 ? 'up' : 'down'}
          icon={<TrendingUp size={16} />}
          accent="blue"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {composition.length > 0 ? (
          <Card>
            <SectionTitle>현금 흐름 구성</SectionTitle>
            <CompositionPie data={composition} currency={currency} />
            <div className="grid grid-cols-2 gap-2 mt-4">
              {composition.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="text-ink-soft">{d.name}</span>
                  <span className="ml-auto tabular font-medium">
                    {formatMoney(d.value, currency)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card>
            <SectionTitle>현금 흐름 구성</SectionTitle>
            <p className="text-sm text-ink-faint py-8 text-center">
              수입/지출 데이터가 없습니다.
            </p>
          </Card>
        )}

        <Card>
          <SectionTitle>인사이트</SectionTitle>
          <ul className="space-y-3 text-sm text-ink-soft">
            <li className="flex gap-2">
              <span className="text-positive font-semibold">·</span>
              평균 저축률이{' '}
              <span className="font-semibold text-ink">{formatPercent(stats.avgSaving)}</span>
              입니다.
              {stats.avgSaving >= 50
                ? ' FIRE 궤도에 훌륭하게 올라있어요.'
                : stats.avgSaving >= 30
                  ? ' 건강한 수준이에요. 조금 더 끌어올려봐요.'
                  : ' 지출을 점검해 저축률을 높이면 달성 시점이 크게 당겨집니다.'}
            </li>
            <li className="flex gap-2">
              <span className="text-accent font-semibold">·</span>
              고정지출{' '}
              <span className="font-semibold text-ink">{formatMoney(stats.fixed, currency)}</span>,
              변동지출{' '}
              <span className="font-semibold text-ink">
                {formatMoney(stats.variable, currency)}
              </span>
              .
              {stats.variable > stats.fixed
                ? ' 변동지출 비중이 높아 절약 여지가 큽니다.'
                : ' 고정지출 관리가 핵심입니다.'}
            </li>
            <li className="flex gap-2">
              <span className="text-gold font-semibold">·</span>
              기록된 기간 동안 순자산이{' '}
              <span className="font-semibold text-ink">{formatPercent(stats.growth)}</span>{' '}
              변화했습니다.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
