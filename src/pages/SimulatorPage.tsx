/**
 * 투자 시뮬레이터 - 자산 구간별 목표 수익률 시스템 (Core Engine)
 */
import { useMemo, useState } from 'react';
import { Coins, TrendingUp, Wallet, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { Card, SectionTitle, Field, Input, Button, cn } from '@/components/ui';
import { StatCard } from '@/components/ui/Stat';
import { AssetAreaChart, CompoundLineChart } from '@/components/charts';
import { simulate, getReturnRateForAsset } from '@/utils/finance';
import { parseAmount } from '@/utils/validate';
import { formatMoney, formatShort, uid } from '@/utils/format';
import type { SimulatorInput, ReturnRateTier } from '@/types';

export function SimulatorPage() {
  const { data, updateSimulator } = useAppData();
  const sim = data.simulator;
  const { currency } = data.settings;

  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Partial<ReturnRateTier>>({});

  const points = useMemo(() => simulate(sim), [sim]);
  const last = points[points.length - 1];

  const yearly = points.filter((p) => p.monthIndex % 12 === 11);
  const areaData = yearly.map((p) => ({ x: `${p.year}`, total: p.total, principal: p.principal }));
  const compoundData = yearly.map((p) => ({
    x: `${p.year}`,
    principal: p.principal,
    profit: p.profit,
  }));

  const numField = (key: keyof SimulatorInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    updateSimulator({ [key]: Number(e.target.value) });
  const amountField = (key: keyof SimulatorInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    updateSimulator({ [key]: parseAmount(e.target.value) });

  const toggleVariableReturnRate = () => {
    updateSimulator({ useVariableReturnRate: !sim.useVariableReturnRate });
  };

  const tiers = sim.returnRateTiers || [];

  const addTier = () => {
    const newTier: ReturnRateTier = {
      id: uid(),
      minAsset: 500000000,
      monthlyReturnRate: 5,
    };
    updateSimulator({ returnRateTiers: [...tiers, newTier] });
  };

  const removeTier = (id: string) => {
    updateSimulator({ returnRateTiers: tiers.filter((t) => t.id !== id) });
  };

  const updateTier = (id: string, updates: Partial<ReturnRateTier>) => {
    updateSimulator({
      returnRateTiers: tiers.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    });
  };

  const moveTier = (id: string, direction: 'up' | 'down') => {
    const idx = tiers.findIndex((t) => t.id === id);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === tiers.length - 1)) {
      return;
    }
    const newTiers = [...tiers];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newTiers[idx], newTiers[swapIdx]] = [newTiers[swapIdx], newTiers[idx]];
    updateSimulator({ returnRateTiers: newTiers });
  };

  const currentReturnRate = sim.useVariableReturnRate
    ? getReturnRateForAsset(last?.total || 0, tiers)
    : sim.monthlyReturnRate;

  const nextTier = sim.useVariableReturnRate
    ? tiers.find((t) => t.minAsset > (last?.total || 0))
    : null;

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <SectionTitle>시뮬레이션 조건</SectionTitle>
          <div className="space-y-3.5">
            <Field label="초기 투자금">
              <Input
                type="number"
                inputMode="numeric"
                value={sim.initialAmount}
                onChange={amountField('initialAmount')}
              />
            </Field>
            <Field label="월 투자금">
              <Input
                type="number"
                inputMode="numeric"
                value={sim.monthlyInvestment}
                onChange={amountField('monthlyInvestment')}
              />
            </Field>

            <div className="pt-2 border-t border-line/20">
              <div className="text-xs font-semibold text-ink-faint mb-2 uppercase tracking-wide">
                수익률 모드
              </div>
              <div className="flex gap-2">
                <button
                  onClick={toggleVariableReturnRate}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    !sim.useVariableReturnRate
                      ? 'bg-accent text-white'
                      : 'bg-surface-secondary text-ink-soft hover:bg-surface-secondary/80',
                  )}
                >
                  고정 수익률
                </button>
                <button
                  onClick={toggleVariableReturnRate}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    sim.useVariableReturnRate
                      ? 'bg-accent text-white'
                      : 'bg-surface-secondary text-ink-soft hover:bg-surface-secondary/80',
                  )}
                >
                  자산 구간별
                </button>
              </div>
            </div>

            {!sim.useVariableReturnRate && (
              <Field label={`월 수익률 (${sim.monthlyReturnRate}%)`}>
                <input
                  type="range"
                  min={1}
                  max={15}
                  step={0.5}
                  value={sim.monthlyReturnRate}
                  onChange={numField('monthlyReturnRate')}
                  className="w-full accent-accent"
                />
              </Field>
            )}

            <Field label={`연봉 인상률 (${sim.salaryGrowthRate}%)`} hint="매년 투자금 증가에 반영">
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={sim.salaryGrowthRate}
                onChange={numField('salaryGrowthRate')}
                className="w-full accent-positive"
              />
            </Field>
            <Field
              label={`투자금 증가율 (${sim.investmentGrowthRate}%)`}
              hint="연봉 인상과 별개로 추가 투자 확대"
            >
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={sim.investmentGrowthRate}
                onChange={numField('investmentGrowthRate')}
                className="w-full accent-positive"
              />
            </Field>
            <Field label={`투자 기간 (${sim.years}년)`}>
              <input
                type="range"
                min={1}
                max={40}
                step={1}
                value={sim.years}
                onChange={numField('years')}
                className="w-full accent-gold"
              />
            </Field>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-3">
            <StatCard
              label="최종 자산"
              value={formatShort(last?.total ?? 0, currency)}
              icon={<Wallet size={16} />}
              accent="blue"
            />
            <StatCard
              label="투자 원금"
              value={formatShort(last?.principal ?? 0, currency)}
              icon={<Coins size={16} />}
              accent="green"
            />
            <StatCard
              label="총 수익"
              value={formatShort(last?.profit ?? 0, currency)}
              icon={<TrendingUp size={16} />}
              accent="gold"
            />
          </div>
          <Card>
            <SectionTitle>자산 증가 (원금 vs 총자산)</SectionTitle>
            <AssetAreaChart data={areaData} currency={currency} />
          </Card>
        </div>
      </div>

      <Card>
        <SectionTitle>복리 성장 — 원금과 수익의 분리</SectionTitle>
        <CompoundLineChart data={compoundData} currency={currency} />
        <p className="text-sm text-ink-soft mt-3">
          {sim.years}년 후 원금{' '}
          <span className="font-semibold text-positive">
            {formatMoney(last?.principal ?? 0, currency)}
          </span>
          , 수익{' '}
          <span className="font-semibold text-gold">
            {formatMoney(last?.profit ?? 0, currency)}
          </span>
          . 수익이 원금을 넘어서는 지점부터 복리가 본격적으로 일합니다.
        </p>
      </Card>

      {sim.useVariableReturnRate && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>자산 구간별 목표 수익률</SectionTitle>
            <Button size="sm" onClick={addTier}>
              <Plus size={14} /> 구간 추가
            </Button>
          </div>

          <div className="mb-4 p-3 rounded-lg bg-surface-secondary/50 border border-line/20">
            <div className="text-sm text-ink-faint">
              <div>
                <span className="font-medium">현재 자산:</span> {formatMoney(last?.total || 0, currency)}
              </div>
              <div className="mt-1">
                <span className="font-medium text-accent">적용 중인 수익률:</span> 월{' '}
                <span className="font-bold text-accent">{currentReturnRate}%</span>
              </div>
              {nextTier && (
                <div className="mt-1 text-ink-soft">
                  다음 변경: {formatMoney(nextTier.minAsset, currency)} 달성 시 월{' '}
                  <span className="font-semibold">{nextTier.monthlyReturnRate}%</span>
                </div>
              )}
            </div>
          </div>

          {tiers.length === 0 ? (
            <div className="text-center py-6 text-ink-faint">
              구간을 추가하세요.
            </div>
          ) : (
            <div className="space-y-2">
              {tiers.map((tier, idx) => (
                <div
                  key={tier.id}
                  className="p-3 rounded-lg bg-surface-secondary/30 border border-line/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium mb-2">
                        {formatMoney(tier.minAsset, currency)}
                        {tier.maxAsset ? ` ~ ${formatMoney(tier.maxAsset, currency)}` : ' 이상'}
                      </div>
                      <div className="text-lg font-bold text-accent">월 {tier.monthlyReturnRate}%</div>
                      {tier.label && <div className="text-xs text-ink-faint mt-1">{tier.label}</div>}
                    </div>

                    {editingTierId === tier.id ? (
                      <div className="flex-1 space-y-2 pl-3 border-l border-line/20">
                        <Field label="하한선 (최소 자산)">
                          <Input
                            type="number"
                            inputMode="numeric"
                            value={editingValues.minAsset ?? tier.minAsset}
                            onChange={(e) =>
                              setEditingValues({
                                ...editingValues,
                                minAsset: parseAmount(e.target.value),
                              })
                            }
                          />
                        </Field>
                        <Field label="월 수익률 (%)">
                          <Input
                            type="number"
                            step={0.5}
                            value={editingValues.monthlyReturnRate ?? tier.monthlyReturnRate}
                            onChange={(e) =>
                              setEditingValues({
                                ...editingValues,
                                monthlyReturnRate: Number(e.target.value),
                              })
                            }
                          />
                        </Field>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              updateTier(tier.id, editingValues);
                              setEditingTierId(null);
                              setEditingValues({});
                            }}
                          >
                            저장
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingTierId(null);
                              setEditingValues({});
                            }}
                          >
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveTier(tier.id, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                          title="위로 이동"
                        >
                          <ChevronUp size={16} className="text-ink-faint" />
                        </button>
                        <button
                          onClick={() => moveTier(tier.id, 'down')}
                          disabled={idx === tiers.length - 1}
                          className="p-1.5 rounded hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                          title="아래로 이동"
                        >
                          <ChevronDown size={16} className="text-ink-faint" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingTierId(tier.id);
                            setEditingValues(tier);
                          }}
                          className="px-3 py-1 text-sm rounded hover:bg-surface-secondary text-ink-soft"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => removeTier(tier.id)}
                          className="p-1.5 rounded hover:bg-negative/10 text-negative"
                          title="삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-ink-faint mt-4">
            💡 구간을 추가하면 시뮬레이션 도중 자산이 해당 구간에 도달할 때 자동으로 수익률이 변경됩니다.
            구간은 작은 자산부터 큰 자산 순서로 정렬하세요.
          </p>
        </Card>
      )}
    </div>
  );
}
