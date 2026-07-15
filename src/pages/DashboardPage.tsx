/**
 * 대시보드 — 앱의 첫 화면.
 * 총자산/순자산/월투자금/FIRE달성률/오늘의 변화 + 자산 성장 그래프 + 로드맵 미리보기.
 *
 * 자산 성장 그래프는 "수입/지출" 기록에서 자동으로 파생된다.
 * (예전의 수동 "자산 기록" 입력은 수입/지출과 중복 + 지표와 값이 어긋나 제거)
 */
import { Wallet, PiggyBank, TrendingUp, Flame, ArrowRight, Landmark } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useMetrics } from '@/hooks/useMetrics';
import { StatCard, ProgressRing } from '@/components/ui/Stat';
import { Card, SectionTitle, Button, EmptyState, cn } from '@/components/ui';
import { AssetAreaChart } from '@/components/charts';
import { formatMoney, formatShort, formatDateKo, formatPercent } from '@/utils/format';

export function DashboardPage() {
  const { data } = useAppData();
  const m = useMetrics();
  const { currency, name } = data.settings;

  // 자산 그래프 데이터 — 수입/지출 기록에서 파생 (지표 카드와 동일한 계산)
  const chartData = m.series.map((p) => ({
    x: p.date.slice(5), // MM-DD
    total: p.netWorth,
  }));

  const upcomingMilestones = data.milestones.filter((x) => !x.done).slice(0, 3);

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
        {m.liabilities > 0 ? (
          <StatCard
            label="남은 부채"
            value={formatMoney(m.liabilities, currency)}
            delta={m.debtPaid > 0 ? `${formatShort(m.debtPaid, currency)} 상환` : undefined}
            deltaType="up"
            icon={<Landmark size={16} />}
            accent="red"
            delay={0.15}
          />
        ) : (
          <StatCard
            label="최근 변화"
            value={`${m.dayChange >= 0 ? '+' : ''}${formatShort(m.dayChange, currency)}`}
            delta={formatPercent(m.dayChangePct)}
            deltaType={m.dayChange >= 0 ? 'up' : 'down'}
            icon={<Flame size={16} />}
            accent={m.dayChange >= 0 ? 'green' : 'red'}
            delay={0.15}
          />
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* 자산 성장 그래프 — 수입/지출 기록에서 자동 생성 */}
        <Card className="lg:col-span-2" delay={0.2}>
          <SectionTitle
            right={
              <Button size="sm" variant="ghost" onClick={() => (window.location.hash = '/budget')}>
                수입/지출 <ArrowRight size={14} />
              </Button>
            }
          >
            자산 성장 추이
          </SectionTitle>

          {chartData.length > 0 ? (
            <>
              <AssetAreaChart data={chartData} currency={currency} />
              <p className="text-xs text-ink-faint mt-3">
                수입/지출 기록 {m.series.length}건에서 자동 계산됩니다 · 초기 자산{' '}
                {formatShort(data.settings.initialAsset, currency)} 기준
                {m.debtPaid > 0 && ` · 부채 ${formatShort(m.debtPaid, currency)} 상환 반영`}
              </p>
            </>
          ) : (
            <EmptyState
              icon={<Wallet size={32} />}
              title="아직 기록이 없어요"
              desc="'수입/지출'에서 하루만 기록해도 자산 성장 그래프가 자동으로 그려집니다."
            />
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
