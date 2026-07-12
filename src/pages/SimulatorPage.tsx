/**
 * 투자 시뮬레이터.
 * 초기금 + 월투자 + 수익률 + 연봉인상/투자증가율을 반영한 월 단위 복리 시뮬레이션.
 * 입력값은 전역 simulator에 저장되어 다음 방문 때 유지된다.
 */
import { useMemo } from 'react';
import { Coins, TrendingUp, Wallet } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { Card, SectionTitle, Field, Input } from '@/components/ui';
import { StatCard } from '@/components/ui/Stat';
import { AssetAreaChart, CompoundLineChart } from '@/components/charts';
import { simulate } from '@/utils/finance';
import { parseAmount } from '@/utils/validate';
import { formatMoney, formatShort } from '@/utils/format';
import type { SimulatorInput } from '@/types';

export function SimulatorPage() {
  const { data, updateSimulator } = useAppData();
  const sim = data.simulator;
  const { currency } = data.settings;

  const points = useMemo(() => simulate(sim), [sim]);
  const last = points[points.length - 1];

  // 그래프용: 연 단위로 샘플링 (매년 12월)
  const yearly = points.filter((p) => p.monthIndex % 12 === 11);
  const areaData = yearly.map((p) => ({ x: `${p.year}`, total: p.total, principal: p.principal }));
  const compoundData = yearly.map((p) => ({
    x: `${p.year}`,
    principal: p.principal,
    profit: p.profit,
  }));

  // 슬라이더용: 퍼센트·연수는 소수점/범위가 있으므로 raw Number 유지
  const numField = (key: keyof SimulatorInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    updateSimulator({ [key]: Number(e.target.value) });

  // 금액 입력용: 음수·NaN·비현실적 값 방어 (parseAmount)
  const amountField = (key: keyof SimulatorInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    updateSimulator({ [key]: parseAmount(e.target.value) });

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-3 gap-4">
        {/* 입력 */}
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
            <Field label={`연 수익률 (${sim.annualReturnRate}%)`}>
              <input
                type="range"
                min={1}
                max={15}
                step={0.5}
                value={sim.annualReturnRate}
                onChange={numField('annualReturnRate')}
                className="w-full accent-accent"
              />
            </Field>
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

        {/* 결과 요약 + 자산 그래프 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-3 gap-3">
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

      {/* 복리 성장 */}
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
    </div>
  );
}
