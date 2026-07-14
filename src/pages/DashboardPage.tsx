/**
 * 대시보드 — 앱의 첫 화면.
 * 총자산/순자산/월투자금/FIRE달성률/오늘의 변화 + 자산 성장 그래프 + 로드맵 미리보기.
 */
import { useState } from 'react';
import { Wallet, PiggyBank, TrendingUp, Flame, Plus, CheckCircle, Circle } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useMetrics } from '@/hooks/useMetrics';
import { StatCard, ProgressRing } from '@/components/ui/Stat';
import { Card, SectionTitle, Button, Field, Input, EmptyState, cn } from '@/components/ui';
import { AssetAreaChart } from '@/components/charts';
import {
  formatMoney,
  formatShort,
  formatDateKo,
  formatPercent,
  todayISO,
  uid,
} from '@/utils/format';
import { parseAmount, checkAmount } from '@/utils/validate';
import type { AssetSnapshot } from '@/types';

export function DashboardPage() {
  const { data, addSnapshot } = useAppData();
  const m = useMetrics();
  const { currency, name } = data.settings;
  const [showAdd, setShowAdd] = useState(false);

  // 자산 그래프 데이터 (snapshots 또는 records 기반)
  const chartData = (() => {
    if (data.snapshots.length > 0) {
      // snapshots이 있으면 우선 사용
      return data.snapshots.map((s) => ({
        x: s.date.slice(5), // MM-DD
        total: s.totalAssets - s.liabilities,
      }));
    } else if (data.records.length > 0) {
      // records만 있으면 월별 누적 순자산 계산
      const sorted = [...data.records].sort((a, b) => a.month.localeCompare(b.month));
      let cumulative = 0;
      return sorted.map((r) => {
        const netMonth = r.income - (r.fixedExpense + r.variableExpense + r.debt);
        cumulative += netMonth;
        return {
          x: r.month.slice(5), // MM
          total: Math.max(0, cumulative),
        };
      });
    }
    return [];
  })();

  // targetAmount가 있으면 완료 여부와 상관없이 표시
  const upcomingMilestones = data.milestones
    .filter((x) => !x.done || x.targetAmount)
    .slice(0, 5);

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
        {/* 자산 성장 그래프 */}
        <Card className="lg:col-span-2" delay={0.2}>
          <SectionTitle
            right={
              <Button size="sm" variant="ghost" onClick={() => setShowAdd((v) => !v)}>
                <Plus size={15} /> 자산 기록
              </Button>
            }
          >
            자산 성장 추이
          </SectionTitle>

          {showAdd && (
            <SnapshotForm
              onAdd={(s) => {
                addSnapshot(s);
                setShowAdd(false);
              }}
            />
          )}

          {chartData.length > 0 ? (
            <AssetAreaChart data={chartData} currency={currency} />
          ) : (
            <EmptyState
              icon={<Wallet size={32} />}
              title="아직 자산 기록이 없어요"
              desc="'자산 기록' 버튼으로 오늘의 총자산을 입력하면 그래프가 그려집니다."
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
            {upcomingMilestones.map((ms) => {
              const isAchieved = ms.targetAmount ? m.netWorth >= ms.targetAmount : false;
              return (
                <div key={ms.id} className="flex items-center gap-3 py-2">
                  <span className="w-12 text-sm font-semibold text-accent tabular">{ms.year}</span>
                  <span className="flex-1 text-ink">{ms.title}</span>
                  {ms.targetAmount && (
                    <span
                      className={cn(
                        'text-xs font-semibold px-2 py-1 rounded-full',
                        isAchieved
                          ? 'bg-positive/10 text-positive'
                          : 'bg-negative/10 text-negative',
                      )}
                    >
                      {isAchieved ? '+' : '-'} {formatShort(ms.targetAmount, currency)}
                    </span>
                  )}
                  <span className={cn(isAchieved ? 'text-positive' : 'text-line/20')}>
                    {isAchieved ? (
                      <CheckCircle size={16} />
                    ) : (
                      <Circle size={16} />
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-ink-faint py-4">설정된 마일스톤이 모두 완료됐어요! 🎉</p>
        )}
      </Card>
    </div>
  );
}

// 자산 스냅샷 입력 폼 (인라인)
function SnapshotForm({ onAdd }: { onAdd: (s: AssetSnapshot) => void }) {
  const [date, setDate] = useState(todayISO());
  const [total, setTotal] = useState('');
  const [liab, setLiab] = useState('');
  const [error, setError] = useState<string | undefined>();

  const submit = () => {
    const check = checkAmount(total);
    if (!check.valid || total.trim() === '') {
      setError(check.message ?? '총 자산을 입력해주세요');
      return;
    }
    onAdd({ id: uid(), date, totalAssets: parseAmount(total), liabilities: parseAmount(liab) });
  };

  return (
    <div className="grid sm:grid-cols-4 gap-3 mb-4 p-3 bg-canvas dark:bg-elevated rounded-xl">
      <Field label="날짜">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="총 자산" hint={error}>
        <Input
          type="number"
          inputMode="numeric"
          placeholder="0"
          value={total}
          onChange={(e) => {
            setTotal(e.target.value);
            setError(undefined);
          }}
        />
      </Field>
      <Field label="부채">
        <Input
          type="number"
          inputMode="numeric"
          placeholder="0"
          value={liab}
          onChange={(e) => setLiab(e.target.value)}
        />
      </Field>
      <div className="flex items-end">
        <Button className="w-full" onClick={submit}>
          추가
        </Button>
      </div>
    </div>
  );
}
