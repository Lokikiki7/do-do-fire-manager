/**
 * FIRE 계산기 — 4% 룰 기반.
 * 연간 지출 + 인출률로 필요 자금을 구하고, 현재 순자산·월투자금으로 달성 예상일을 계산.
 */
import { useMemo, useState } from 'react';
import { Target, TrendingUp, CalendarClock } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useMetrics } from '@/hooks/useMetrics';
import { Card, SectionTitle, Field, Input } from '@/components/ui';
import { StatCard, ProgressRing } from '@/components/ui/Stat';
import {
  fireNumberByRule,
  estimateFireDate,
  fireProgress,
  realReturnRate,
  toPresentValue,
} from '@/utils/finance';
import { parseAmount } from '@/utils/validate';
import { formatMoney, formatShort, formatDateKo, formatPercent } from '@/utils/format';

export function CalculatorPage() {
  const { data } = useAppData();
  const m = useMetrics();
  const { currency, inflationRate } = data.settings;

  // 로컬 입력 (설정 기본값에서 시작, 계산기 안에서 자유롭게 실험)
  const [annualExpense, setAnnualExpense] = useState(data.settings.annualExpense);
  const [withdrawalRate, setWithdrawalRate] = useState(data.settings.withdrawalRate);
  const [monthlyInvest, setMonthlyInvest] = useState(m.monthlyInvestment || 1_000_000);
  const [returnRate, setReturnRate] = useState(data.settings.defaultReturnRate);
  const [currentNet, setCurrentNet] = useState(m.netWorth);

  const result = useMemo(() => {
    const target = fireNumberByRule(annualExpense, withdrawalRate);
    const eta = estimateFireDate(currentNet, target, monthlyInvest, returnRate);
    const progress = fireProgress(currentNet, target);
    const monthlySafeIncome = (target * withdrawalRate) / 100 / 12; // 달성 후 월 인출 가능액

    // 인플레이션 반영: 실질 수익률 + 달성 시점 목표액의 현재 구매력
    const realRate = realReturnRate(returnRate, inflationRate);
    const yearsToFire = eta ? eta.getFullYear() - new Date().getFullYear() : 0;
    const targetPresentValue = toPresentValue(target, inflationRate, Math.max(0, yearsToFire));

    return { target, eta, progress, monthlySafeIncome, realRate, targetPresentValue, yearsToFire };
  }, [annualExpense, withdrawalRate, monthlyInvest, returnRate, currentNet, inflationRate]);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* 입력 */}
      <Card>
        <SectionTitle>입력값</SectionTitle>
        <div className="space-y-4">
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
            hint="일반적으로 4% — 낮출수록 안전, 필요 자금 증가"
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
          <Field label="현재 순자산">
            <Input
              type="number"
              inputMode="numeric"
              value={currentNet}
              onChange={(e) => setCurrentNet(parseAmount(e.target.value))}
            />
          </Field>
          <Field label="월 투자금">
            <Input
              type="number"
              inputMode="numeric"
              value={monthlyInvest}
              onChange={(e) => setMonthlyInvest(parseAmount(e.target.value))}
            />
          </Field>
          <Field label={`예상 월 수익률 (${returnRate}%)`}>
            <input
              type="range"
              min={1}
              max={15}
              step={0.5}
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
            label="필요 자금 (4% 룰)"
            value={formatShort(result.target, currency)}
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
          <SectionTitle>목표 달성 예상</SectionTitle>
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
          <p className="text-sm text-ink-faint mt-1">
            필요 금액 {formatMoney(result.target, currency)}
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
                  {result.yearsToFire}년 뒤 {formatShort(result.target, currency)}은 지금의 물가로{' '}
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

        <Card>
          <p className="text-sm text-ink-soft leading-relaxed">
            <span className="font-semibold text-ink">4% 룰</span>이란 은퇴 자산의 매년{' '}
            {formatPercent(withdrawalRate, 0)}만 인출하면 원금이 크게 줄지 않는다는 경험칙입니다. 연
            지출을 인출률로 나눈 값이 목표 자금이 됩니다.
          </p>
        </Card>
      </div>
    </div>
  );
}
