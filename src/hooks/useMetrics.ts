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
    // 최신 자산 스냅샷 2개로 총자산/순자산/일변화 계산
    const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];

    const totalAssets = latest?.totalAssets ?? 0;
    const liabilities = latest?.liabilities ?? 0;
    const netWorth = totalAssets - liabilities;

    const prevNet = prev ? prev.totalAssets - prev.liabilities : netWorth;
    const dayChange = netWorth - prevNet;
    const dayChangePct = prevNet !== 0 ? (dayChange / prevNet) * 100 : 0;

    // 최근 월 투자금
    const lastRecord = [...records].sort((a, b) => a.month.localeCompare(b.month)).pop();
    const monthlyInvestment = lastRecord?.investment ?? 0;

    // 4% 룰 기반 목표액 (설정값이 있으면 우선)
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
      hasData: snapshots.length > 0,
    };
  }, [snapshots, records, settings]);
}
