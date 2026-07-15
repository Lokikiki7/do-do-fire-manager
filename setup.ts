/**
 * 원천 데이터(AppData)에서 대시보드/통계가 공통으로 쓰는 파생 지표를 계산.
 * useMemo로 감싸 재계산을 최소화하고, 페이지 간 계산 로직 중복을 없앤다.
 */
import { useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { fireNumberByRule, fireProgress, estimateFireDate } from '@/utils/finance';

export function useMetrics() {
  const { data } = useAppData();
  const { snapshots, records, settings } = data;

  return useMemo(() => {
    // Records에서 누적 자산 계산
    const recordsNet = records.reduce((acc, r) => {
      const savableAmount = r.income - (r.fixedExpense + r.variableExpense + r.debt);
      const investmentGain = r.investment * ((r.investmentReturnRate || 0) / 100);
      return acc + savableAmount + investmentGain;
    }, 0);

    // 초기자산 + records로부터의 누적 자산
    const recordsBasedAssets = settings.initialAsset + recordsNet;

    // snapshots가 있으면 그것 사용, 없으면 records 기반 사용
    const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];

    const totalAssets = latest?.totalAssets ?? recordsBasedAssets;
    const liabilities = latest?.liabilities ?? settings.initialLiability;
    const netWorth = totalAssets - liabilities;

    const prevNet = prev ? prev.totalAssets - prev.liabilities : netWorth;
    const dayChange = netWorth - prevNet;
    const dayChangePct = prevNet !== 0 ? (dayChange / prevNet) * 100 : 0;

    const lastRecord = [...records].sort((a, b) => a.date.localeCompare(b.date)).pop();
    const monthlyInvestment = lastRecord?.investment ?? 0;

    const ruleTarget = fireNumberByRule(settings.annualExpense, settings.withdrawalRate);
    const target = settings.fireTarget || ruleTarget;

    const progress = fireProgress(netWorth, target);
    const eta = estimateFireDate(
      netWorth,
      target,
      monthlyInvestment || 1,
      settings.defaultReturnRate,
    );

    return {
      totalAssets,
      liabilities,
      netWorth,
      dayChange,
      dayChangePct,
      monthlyInvestment,
      target,
      ruleTarget,
      progress,
      eta,
      hasData: snapshots.length > 0 || records.length > 0,
    };
  }, [snapshots, records, settings]);
}
