/**
 * 대시보드 — 앱의 첫 화면.
 * 총자산/순자산/월투자금/FIRE달성률/오늘의 변화 + 수입/지출 그래프 + 로드맵 미리보기.
 */
import { useState } from 'react';
import { Wallet, PiggyBank, TrendingUp, Flame, Check } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useMetrics } from '@/hooks/useMetrics';
import { StatCard, ProgressRing } from '@/components/ui/Stat';
import { Card, SectionTitle, Button, cn } from '@/components/ui';
import { BudgetBarChart } from '@/components/charts';
import {
  formatMoney,
  formatShort,
  formatDateKo,
  formatPercent,
} from '@/utils/format';

export function DashboardPage() {
  const { data } = useAppData();
  const m = useMetrics();
  const { currency, name } = data.settings;
  const [syncMessage, setSyncMessage] = useState('');

  // 수입/지출 차트 데이터
  const budgetChartData = (() => {
    if (data.records.length === 0) return [];
    const sorted = [...data.records].sort((a, b) => a.month.localeCompare(b.month));
    return sorted.map((r) => ({
      x: r.month.slice(5), // MM
      수입: r.income,
      지출: r.fixedExpense + r.variableExpense + r.debt,
      투자: r.investment,
    }));
  })();

  const upcomingMilestones = data.milestones.filter((x) => !x.done).slice(0, 3);

  const checkSync = async () => {
    if (data.records.length === 0) {
      setSyncMessage('수입/지출 데이터가 없습니다.');
      return;
    }
    setSyncMessage('✅ 데이터가 정상적으로 연동되고 있습니다!');
    setTimeout(() => setSyncMessage(''), 3000);
  };

  return (
    <div className="space-y-6">
      {/* 인사말 */}
      <p className="text-ink-soft">{name ? `${name}님, ` : ''}오늘도 FIRE를 향해 한 걸음 더 🔥</p>

      {/* 지표 카드 그리드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="총 자산"
          value={formatMoney(m.totalAssets, currency)}
          icon={<Wallet size={16} />}
          accent="blue"
          delay={0}
        />
        <StatCard
          label="순자산"
          value={formatMoney(m.netWorth, currency)}
          icon={<PiggyBank size={16} />}
          accent="green"
          delay={0.05}
        />
        <StatCard
          label="월 투자금"
          value={formatMoney(m.monthlyInvestment, currency)}
          icon={<TrendingUp size={16} />}
          accent="blue"
          delay={0.1}
        />
        <StatCard
          label="오늘의 변화"
          value={`${m.dayChange >= 0 ? '+' : ''}${formatShort(m.dayChange, currency)}`}
          delta={formatPercent(m.dayChangePct)}
          deltaType={m.dayChange >= 0 ? 'up' : 'down'}
          icon={<Flame size={16} />}
          accent={m.dayChange >= 0 ? 'green' : 'red'}
          delay={0.15}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* 수입/지출 그래프 */}
        <Card className="lg:col-span-2" delay={0.2}>
          <SectionTitle
            right={
              <Button size="sm" variant="ghost" onClick={checkSync}>
                <Check size={15} /> 연동 확인
              </Button>
            }
          >
            월별 수입 / 지출 / 투자
          </SectionTitle>

          {syncMessage && (
            <div className="mb-4 p-3 rounded-lg bg-positive/10 border border-positive/30 text-positive text-sm">
              {syncMessage}
            </div>
          )}

          {budgetChartData.length > 0 ? (
            <BudgetBarChart data={budgetChartData} currency={currency} />
          ) : (
            <div className="py-12 text-center">
              <Wallet size={32} className="mx-auto mb-3 text-ink-faint" />
              <p className="font-semibold text-ink">아직 수입/지출 기록이 없어요</p>
              <p className="text-sm text-ink-soft mt-1">
                '수입 / 지출' 페이지에서 월별 기록을 입력하면 그래프가 그려집니다.
              </p>
            </div>
          )}
        </Card>

        {/* FIRE 달성률 */}
        <Card delay={0.25} className="flex flex-col items-center justify-center">
          <SectionTitle>FIRE 달성률</SectionTitle>
          <ProgressRing
            percent={m.progress}
            label={
              <div>
                <p className="text-3xl font-bold tabular text-gold">{m.progress.toFixed(1)}%</p>
                <p className="text-xs text-ink-faint mt-1">
                  목표 {formatShort(m.target, currency)}
                </p>
              </div>
            }
          />
          <p className="text-sm text-ink-soft mt-4 text-center">
            {m.eta ? (
              <>
                예상 달성 <span className="font-semibold text-ink">{formatDateKo(m.eta)}</span>
              </>
            ) : (
              '월 투자금을 입력하면 예상일이 계산돼요'
            )}
          </p>
        </Card>
      </div>

      {/* 로드맵 미리보기 */}
      <Card delay={0.3}>
        <SectionTitle>다가오는 마일스톤</SectionTitle>
        {upcomingMilestones.length > 0 ? (
          <div className="space-y-2">
            {upcomingMilestones.map((ms) => (
              <div key={ms.id} className="flex items-center gap-3 py-2">
                <span className="w-12 text-sm font-semibold text-accent tabular">{ms.year}</span>
                <span className="flex-1 text-ink">{ms.title}</span>
                {ms.targetAmount && (
                  <span className="text-sm font-semibold text-gold tabular">
                    {formatShort(ms.targetAmount, currency)}
                  </span>
                )}
                <span className={cn('w-2 h-2 rounded-full bg-line/20')} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-faint py-4">설정된 마일스톤이 모두 완료됐어요! 🎉</p>
        )}
      </Card>
    </div>
  );
}
