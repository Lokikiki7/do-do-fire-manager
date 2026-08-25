/**
 * FIRE 계산기 — 목표·현재자산·저축·수익률을 넣고 달성 시점을 시뮬레이션한다.
 *
 * 예전에는 "계산기(4% 룰)"와 "시뮬레이터(복리 그래프)"가 따로 있었는데
 * 입력값이 거의 같아 두 화면의 숫자가 어긋나기 쉬웠다. 하나로 합쳤다.
 * 목표 자산은 직접 입력하되, 4% 룰로 계산한 추천값을 한 번에 넣을 수 있다.
 */
import { useMemo, useState } from 'react';
import { Target, TrendingUp, CalendarClock, Wand2 } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useMetrics } from '@/hooks/useMetrics';
import { Card, SectionTitle, Field, Input, Button } from '@/components/ui';
import { StatCard, ProgressRing } from '@/components/ui/Stat';
import { AssetAreaChart } from '@/components/charts';
import {
  fireNumberByRule,
  estimateFireDate,
  fireProgress,
  realReturnRate,
  toPresentValue,
  simulate,
} from '@/utils/finance';
import { parseAmount } from '@/utils/validate';
import { formatMoney, formatShort, formatDateKo, formatPercent } from '@/utils/format';

/** 월 수익률 → 연 환산 (복리) */
function annualized(monthlyPercent: number): number {
  return (Math.pow(1 + monthlyPercent / 100, 12) - 1) * 100;
}

export function CalculatorPage() {
  const { data } = useAppData();
  const m = useMetrics();
  const { currency, inflationRate } = data.settings;

  // 로컬 입력 (설정·실적에서 시작하되 계산기 안에서는 자유롭게 실험)
  const [annualExpense, setAnnualExpense] = useState(data.settings.annualExpense);
  const [withdrawalRate, setWithdrawalRate] = useState(data.settings.withdrawalRate);
  const [target, setTarget] = useState(
    data.settings.fireTarget ||
      fireNumberByRule(data.settings.annualExpense, data.settings.withdrawalRate),
  );
  const [currentNet, setCurrentNet] = useState(m.netWorth);
  const [annualSaving, setAnnualSaving] = useState(Math.round((m.monthlyInvestment || 1_000_000) * 12));
  const [returnRate, setReturnRate] = useState(data.settings.defaultReturnRate);

  /** 4% 룰 추천 목표액 — 버튼으로 목표 자산에 그대로 넣을 수 있다 */
  const suggested = fireNumberByRule(annualExpense, withdrawalRate);

  const result = useMemo(() => {
    const monthlySaving = annualSaving / 12;
    const eta = estimateFireDate(currentNet, target, monthlySaving, returnRate);
    const progress = fireProgress(currentNet, target);
    const monthlySafeIncome = (target * withdrawalRate) / 100 / 12; // 달성 후 월 인출 가능액

    // 인플레이션 반영: 실질 수익률 + 달성 시점 목표액의 현재 구매력
    const realRate = realReturnRate(annualized(returnRate), inflationRate);
    const yearsToFire = eta ? eta.getFullYear() - new Date().getFullYear() : 0;
    const targetPresentValue = toPresentValue(target, inflationRate, Math.max(0, yearsToFire));

    // 자산 증가 그래프 — 달성 시점까지(최소 5년, 최대 40년) 연 단위로 표본을 뽑는다
    const years = Math.min(40, Math.max(5, yearsToFire + 1));
    const chart = simulate({
      initialAmount: currentNet,
      monthlyInvestment: monthlySaving,
      monthlyReturnRate: returnRate,
      salaryGrowthRate: 0,
      investmentGrowthRate: 0,
      years,
    })
      .filter((p) => p.monthIndex % 12 === 11) // 매년 말 시점만
      .map((p) => ({ x: `${p.year}`, total: p.total, principal: p.principal }));

    return {
      eta,
      progress,
      monthlySafeIncome,
      realRate,
      targetPresentValue,
      yearsToFire,
      monthlySaving,
      chart,
    };
  }, [target, currentNet, annualSaving, returnRate, withdrawalRate, inflationRate]);

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        {/* 입력 */}
        <Card>
          <SectionTitle>입력값</SectionTitle>
          <div className="space-y-4">
            <Field label="목표 자산" hint="달성하고 싶은 순자산">
              <Input
                type="number"
                inputMode="numeric"
                value={target}
                onChange={(e) => setTarget(parseAmount(e.target.value))}
              />
            </Field>

            {/* 4% 룰 추천 — 목표를 직접 정하기 어려울 때 한 번에 채운다 */}
            <div className="p-3 rounded-xl bg-canvas dark:bg-elevated border border-line/[0.06] space-y-3">
              <div className="text-xs font-semibold text-ink-faint uppercase tracking-wide">
                4% 룰로 목표 정하기
              </div>
              <Field label="연간 지출" hint="은퇴 후 1년간 필요한 생활비">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={annualExpense}
                  onChange={(e) => setAnnualExpense(parseAmount(e.target.value))}
                />
              </Field>
              <Field
                label={`안전 인출률 (${withdrawalRate}%)`}
                hint="낮출수록 안전하지만 필요 자금은 늘어납니다"
              >
                <input
                  type="range"
                  min={2}
                  max={6}
                  step={0.5}
                  value={withdrawalRate}
                  onChange={(e) => setWithdrawalRate(Number(e.target.value))}
                  className="w-full accent-gold"
                />
              </Field>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-ink-soft tabular">
                  추천 목표{' '}
                  <span className="font-semibold text-gold">
                    {formatMoney(suggested, currency)}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setTarget(Math.round(suggested))}
                  disabled={Math.round(suggested) === target}
                >
                  <Wand2 size={14} /> 적용
                </Button>
              </div>
            </div>

            <Field label="현재 자산" hint="지금까지 모은 순자산">
              <Input
                type="number"
                inputMode="numeric"
                value={currentNet}
                onChange={(e) => setCurrentNet(parseAmount(e.target.value))}
              />
            </Field>
            <Field label="연간 저축액" hint={`월 ${formatMoney(result.monthlySaving, currency)}`}>
              <Input
                type="number"
                inputMode="numeric"
                value={annualSaving}
                onChange={(e) => setAnnualSaving(parseAmount(e.target.value))}
              />
            </Field>
            <Field
              label={`예상 월 수익률 (${returnRate}%)`}
              hint={`연 환산 약 ${formatPercent(annualized(returnRate))}`}
            >
              <input
                type="range"
                min={0.1}
                max={3}
                step={0.1}
                value={returnRate}
                onChange={(e) => setReturnRate(Number(e.target.value))}
                className="w-full accent-accent"
              />
            </Field>
          </div>
        </Card>

        {/* 결과 */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="목표 자산"
              value={formatShort(target, currency)}
              icon={<Target size={16} />}
              accent="gold"
            />
            <StatCard
              label="달성 후 월 소득"
              value={formatMoney(result.monthlySafeIncome, currency)}
              icon={<TrendingUp size={16} />}
              accent="green"
            />
          </div>

          <Card className="flex flex-col items-center">
            <SectionTitle>달성 예상</SectionTitle>
            <ProgressRing
              percent={result.progress}
              label={
                <div>
                  <p className="text-3xl font-bold tabular text-gold">
                    {result.progress.toFixed(1)}%
                  </p>
                  <p className="text-xs text-ink-faint mt-1">진행률</p>
                </div>
              }
            />
            <div className="mt-5 flex items-center gap-2 text-ink">
              <CalendarClock size={18} className="text-accent" />
              <span className="font-semibold text-lg">
                {result.eta ? formatDateKo(result.eta) : '60년 내 미달성'}
              </span>
            </div>
            <p className="text-sm text-ink-faint mt-1 tabular">
              {result.yearsToFire > 0
                ? `약 ${result.yearsToFire}년 뒤 · 목표 ${formatShort(target, currency)}`
                : `목표 ${formatMoney(target, currency)}`}
            </p>
          </Card>

          <Card>
            <SectionTitle>인플레이션 반영</SectionTitle>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-soft">
                  실질 수익률 (물가 {formatPercent(inflationRate, 1)} 반영)
                </span>
                <span className="text-sm font-semibold tabular text-accent">
                  {formatPercent(result.realRate)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-soft">목표액의 현재 구매력</span>
                <span className="text-sm font-semibold tabular text-gold">
                  {formatShort(result.targetPresentValue, currency)}
                </span>
              </div>
              <p className="text-xs text-ink-faint leading-relaxed pt-1 border-t border-line/10">
                {result.yearsToFire > 0 ? (
                  <>
                    {result.yearsToFire}년 뒤 {formatShort(target, currency)}은 지금의 물가로{' '}
                    <span className="font-medium text-ink-soft">
                      약 {formatShort(result.targetPresentValue, currency)}
                    </span>
                    의 가치입니다. 명목 금액만 보면 미래 구매력을 과대평가하기 쉬워요.
                  </>
                ) : (
                  '이미 목표에 도달했거나 달성 시점을 계산할 수 없습니다.'
                )}
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* 자산 증가 그래프 — 예전 시뮬레이터의 복리 그래프를 여기로 합쳤다 */}
      <Card>
        <SectionTitle
          right={<span className="text-xs text-ink-faint">{result.chart.length}년 예상</span>}
        >
          자산 증가 예상
        </SectionTitle>
        <AssetAreaChart data={result.chart} currency={currency} />
        <p className="text-xs text-ink-faint mt-3 leading-relaxed">
          현재 자산 {formatShort(currentNet, currency)}에서 시작해 매달{' '}
          {formatShort(result.monthlySaving, currency)}씩 넣고 월 {formatPercent(returnRate)}로
          굴렸을 때의 예상치입니다. 초록선이 원금, 파란선이 수익을 포함한 총자산입니다.
        </p>
      </Card>
    </div>
  );
}
