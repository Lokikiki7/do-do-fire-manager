import { useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { fireNumberByRule, fireProgress, estimateFireDate } from '@/utils/finance';

export function useMetrics() {
  const { data } = useAppData();
  const { snapshots, records, settings } = data;

  return useMemo(() => {
    // 초기 자산과 부채
    const initialNetWorth = settings.initialAsset - settings.initialLiability;

    // 수입/지출 기록으로부터 누적 순자산 계산
    const recordsNet = (() => {
      if (records.length === 0) return 0;
      const sorted = [...records].sort((a, b) => a.month.localeCompare(b.month));
      return sorted.reduce((acc, r) => {
        const netMonth = r.income - (r.fixedExpense + r.variableExpense + r.debt);
        return acc + netMonth;
      }, 0);
    })();

    // 최신 자산 스냅샷 2개로 총자산/순자산/일변화 계산
    const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];

    // snapshots이 있으면 사용, 없으면 records + 초기 자산에서 계산
    const totalAssets = latest?.totalAssets ?? (recordsNet + settings.initialAsset);
    const liabilities = latest?.liabilities ?? settings.initialLiability;
    const netWorth = totalAssets - liabilities;

    const prevNet = prev
      ? prev.totalAssets - prev.liabilities
      : recordsNet + initialNetWorth;
    const dayChange = netWorth - prevNet;
    const dayChangePct = prevNet !== 0 ? (dayChange / prevNet) * 100 : 0;

    // 최근 월 투자금
    const lastRecord = [...records].sort((a, b) => a.month.localeCompare(b.month)).pop();
    const monthlyInvestment = lastRecord?.investment ?? 0;

    // 4% 룰 기반 목표액 (설정값이 있으면 우선)
    const ruleTarget = fireNumberByRule(settings.annualExpense, settings.withdrawalRate);
    const target = settings.fireTarget || ruleTarget;

    const progress = fireProgress(netWorth, target);
    const eta = estimateFireDate(netWorth, target, monthlyInvestment || 1, settings.defaultReturnRate);

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
      recordsNet,
    };
  }, [snapshots, records, settings]);
}
