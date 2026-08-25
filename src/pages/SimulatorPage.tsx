/**
 * 시뮬레이터 — 자산 금액대별로 벌이·투자·지출이 달라지는 시나리오를 돌린다.
 *
 * 좌측: 구간 편집 (추가/삭제, 구간마다 월급·투자액·지출·수익률)
 * 우측: 결과 카드 4개 + 연도별 자산 그래프 (구간 밴드 + 도달 시기 표시)
 *
 * 계산은 finance.ts의 simulateTiers() 한 곳에 있고 여기서는 표시만 한다.
 */
import { useMemo } from 'react';
import { Plus, Trash2, Flame, Wallet, TrendingUp, Coins } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useMetrics } from '@/hooks/useMetrics';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Card, SectionTitle, Button, Field, Input, EmptyState, cn } from '@/components/ui';
import { StatCard } from '@/components/ui/Stat';
import { TierSimChart, TIER_COLORS } from '@/components/charts';
import { simulateTiers } from '@/utils/finance';
import { parseAmount } from '@/utils/validate';
import { formatMoney, formatShort, formatPercent, uid } from '@/utils/format';
import type { SimulatorTier } from '@/types';

/** 구간 범위를 사람이 읽는 문장으로 */
function tierRange(t: SimulatorTier, currency: 'KRW' | 'USD'): string {
  const from = formatShort(t.minAsset, currency);
  return t.maxAsset === undefined
    ? `${from} 이상`
    : `${from} ~ ${formatShort(t.maxAsset, currency)} 미만`;
}

export function SimulatorPage() {
  const { data, updateSimulatorTiers } = useAppData();
  const m = useMetrics();
  const confirm = useConfirm();
  const { currency } = data.settings;
  const tiers = data.simulatorTiers;

  // 현재 순자산에서 출발한다 (기록이 없으면 초기 자산)
  const startAsset = m.netWorth;

  const sim = useMemo(() => simulateTiers(tiers, startAsset), [tiers, startAsset]);

  /** 연도별 마지막 달만 뽑아 그래프 데이터로 */
  const chartData = useMemo(() => {
    const byYear = new Map<number, number>();
    for (const p of sim.points) byYear.set(p.year, p.asset);
    return [...byYear.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, asset]) => ({ x: String(year), 자산: Math.round(asset) }));
  }, [sim.points]);

  const bands = tiers.map((t, i) => ({
    from: t.minAsset,
    to: t.maxAsset,
    label: `구간 ${i + 1}`,
  }));

  const arrivals = sim.tierArrivals
    // 첫 구간은 시작 지점이라 선을 그으면 오히려 지저분하다
    .filter((a) => a.monthIndex > 0)
    .map((a) => ({
      year: a.year,
      label: `구간 ${a.tierIndex + 1}`,
      colorIndex: a.tierIndex,
    }));

  const patch = (id: string, next: Partial<SimulatorTier>) =>
    updateSimulatorTiers(tiers.map((t) => (t.id === id ? { ...t, ...next } : t)));

  const addTier = () => {
    // 마지막 구간(FIRE) 바로 앞에 끼워 넣고, 시작 금액은 직전 구간 끝에 맞춘다
    const last = tiers[tiers.length - 1];
    const prev = tiers[tiers.length - 2];
    const from = prev?.maxAsset ?? last?.minAsset ?? 0;
    const created: SimulatorTier = {
      id: uid(),
      minAsset: from,
      maxAsset: last?.minAsset ?? from + 100_000_000,
      salary: prev?.salary ?? 3_000_000,
      investment: prev?.investment ?? 1_000_000,
      expense: prev?.expense ?? 500_000,
      monthlyReturnRate: prev?.monthlyReturnRate ?? 5,
    };
    updateSimulatorTiers([...tiers.slice(0, -1), created, ...tiers.slice(-1)]);
  };

  const removeTier = async (t: SimulatorTier, index: number) => {
    if (
      await confirm({
        title: '구간을 삭제할까요?',
        message: `구간 ${index + 1} (${tierRange(t, currency)})이 삭제됩니다.`,
        confirmLabel: '삭제',
        danger: true,
      })
    )
      updateSimulatorTiers(tiers.filter((x) => x.id !== t.id));
  };

  const fireYear = sim.fireDate?.year;
  const yearsToFire = fireYear ? fireYear - new Date().getFullYear() : null;

  return (
    <div className="grid lg:grid-cols-5 gap-4 items-start">
      {/* ── 좌측: 구간 설정 ── */}
      <div className="lg:col-span-2 space-y-3">
        <Card>
          <SectionTitle
            right={
              <Button size="sm" variant="ghost" onClick={addTier}>
                <Plus size={15} /> 구간 추가
              </Button>
            }
          >
            자산 구간 설정
          </SectionTitle>
          <p className="text-xs text-ink-faint leading-relaxed">
            자산이 커질수록 달라지는 벌이와 투자를 구간별로 적어두면, 매달 지금 자산이 속한 구간의
            값을 적용해 시뮬레이션합니다. 마지막 구간은 월급 없이 지출만 있는 FIRE 이후 상태입니다.
          </p>
        </Card>

        {tiers.length === 0 ? (
          <Card>
            <EmptyState
              icon={<TrendingUp size={28} />}
              title="구간이 없어요"
              desc="'구간 추가'로 자산 금액대별 시나리오를 만들어보세요."
            />
          </Card>
        ) : (
          tiers.map((t, i) => {
            const isFire = t.maxAsset === undefined;
            const color = TIER_COLORS[i % TIER_COLORS.length];
            return (
              <Card key={t.id} className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: color }}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink flex items-center gap-1.5">
                        구간 {i + 1}
                        {isFire && <Flame size={13} className="text-gold" />}
                      </div>
                      <div className="text-[10px] text-ink-faint tabular">
                        {tierRange(t, currency)}
                      </div>
                    </div>
                  </div>
                  {tiers.length > 1 && (
                    <button
                      onClick={() => void removeTier(t, i)}
                      aria-label={`구간 ${i + 1} 삭제`}
                      className="min-w-[32px] min-h-[32px] grid place-items-center rounded-lg text-ink-faint hover:text-negative hover:bg-negative/10 transition-colors shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <Field label="시작 자산">
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={t.minAsset}
                      onChange={(e) => patch(t.id, { minAsset: parseAmount(e.target.value) })}
                    />
                  </Field>
                  <Field label="끝 자산" hint={isFire ? '이상' : undefined}>
                    {isFire ? (
                      <div className="flex items-center justify-center h-11 rounded-xl bg-canvas dark:bg-elevated border border-line/[0.08] text-xs font-semibold text-gold">
                        제한 없음
                      </div>
                    ) : (
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={t.maxAsset ?? 0}
                        onChange={(e) => patch(t.id, { maxAsset: parseAmount(e.target.value) })}
                      />
                    )}
                  </Field>

                  {/* FIRE 구간은 월급·투자가 없으므로 지출만 받는다 */}
                  {!isFire && (
                    <>
                      <Field label="월급">
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={t.salary}
                          onChange={(e) => patch(t.id, { salary: parseAmount(e.target.value) })}
                        />
                      </Field>
                      <Field label="월 투자액">
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={t.investment}
                          onChange={(e) => patch(t.id, { investment: parseAmount(e.target.value) })}
                        />
                      </Field>
                    </>
                  )}
                  <Field label="월 지출">
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={t.expense}
                      onChange={(e) => patch(t.id, { expense: parseAmount(e.target.value) })}
                    />
                  </Field>
                  {!isFire && (
                    <Field label="수익률 (%)" hint="월">
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        value={t.monthlyReturnRate}
                        onChange={(e) =>
                          patch(t.id, { monthlyReturnRate: Number(e.target.value) || 0 })
                        }
                      />
                    </Field>
                  )}
                </div>

                {!isFire && (
                  <div className="text-[10px] text-ink-faint tabular pt-2 border-t border-line/[0.06]">
                    월 순증{' '}
                    <span
                      className={cn(
                        'font-semibold',
                        t.salary - t.expense + t.investment * (t.monthlyReturnRate / 100) > 0
                          ? 'text-positive'
                          : 'text-negative',
                      )}
                    >
                      {formatMoney(
                        t.salary - t.expense + t.investment * (t.monthlyReturnRate / 100),
                        currency,
                      )}
                    </span>
                    {' = 월급 − 지출 + 투자액 × 수익률'}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* ── 우측: 결과 ── */}
      <div className="lg:col-span-3 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="FIRE 달성 연도"
            value={fireYear ? `${fireYear}년` : '미달성'}
            delta={yearsToFire !== null ? `약 ${yearsToFire}년 뒤` : '60년 내 도달 못 함'}
            deltaType={fireYear ? 'up' : 'neutral'}
            icon={<Flame size={16} />}
            accent={fireYear ? 'gold' : 'red'}
          />
          <StatCard
            label="최종 자산"
            value={formatShort(sim.finalAsset, currency)}
            icon={<Wallet size={16} />}
            accent="blue"
          />
          <StatCard
            label="총 투자액"
            value={formatShort(sim.totalInvested, currency)}
            icon={<TrendingUp size={16} />}
            accent="blue"
          />
          <StatCard
            label="총 수익"
            value={`${sim.totalGain > 0 ? '+' : ''}${formatShort(sim.totalGain, currency)}`}
            delta={
              sim.totalInvested > 0
                ? `원금 대비 ${formatPercent((sim.totalGain / sim.totalInvested) * 100)}`
                : undefined
            }
            deltaType="up"
            icon={<Coins size={16} />}
            accent="green"
          />
        </div>

        <Card>
          <SectionTitle
            right={
              <span className="text-xs text-ink-faint tabular">
                {formatShort(startAsset, currency)}에서 시작
              </span>
            }
          >
            연도별 자산 변화
          </SectionTitle>
          {chartData.length > 1 ? (
            <>
              <TierSimChart
                data={chartData}
                bands={bands}
                arrivals={arrivals}
                currency={currency}
              />
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs">
                {tiers.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: TIER_COLORS[i % TIER_COLORS.length] }}
                    />
                    <span className="text-ink-soft">
                      구간 {i + 1}
                      <span className="text-ink-faint"> · {tierRange(t, currency)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              icon={<TrendingUp size={28} />}
              title="자산이 늘지 않아요"
              desc="구간의 월급이 지출보다 커야 자산이 쌓입니다. 값을 조정해보세요."
            />
          )}
        </Card>

        {sim.tierArrivals.length > 0 && (
          <Card>
            <SectionTitle>구간 도달 예상</SectionTitle>
            <div className="space-y-1.5">
              {sim.tierArrivals.map((a) => {
                const t = tiers[a.tierIndex];
                if (!t) return null;
                const isFire = t.maxAsset === undefined;
                return (
                  <div
                    key={a.tierIndex}
                    className="flex items-center justify-between gap-3 py-2 border-b border-line/[0.06] last:border-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: TIER_COLORS[a.tierIndex % TIER_COLORS.length] }}
                      />
                      <span className="text-sm text-ink-soft">
                        구간 {a.tierIndex + 1}
                        {isFire && ' · FIRE 🔥'}
                      </span>
                      <span className="text-[10px] text-ink-faint tabular truncate">
                        {tierRange(t, currency)}
                      </span>
                    </div>
                    <span className="text-sm font-semibold tabular text-ink shrink-0">
                      {a.monthIndex === 0 ? '지금' : `${a.year}년`}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
