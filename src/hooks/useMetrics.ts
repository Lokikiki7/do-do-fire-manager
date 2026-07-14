import { useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { fireNumberByRule, fireProgress, estimateFireDate } from '@/utils/finance';

export function useMetrics() {
  const { data } = useAppData();
  const { snapshots, records, settings } = data;

  return useMemo(() => {
    const recordsNet = (() => {
      if (records.length === 0) return 0;
      const sorted = [...records].sort((a, b) => a.month.localeCompare(b.month));
      return sorted.reduce((acc, r) => {
        const netMonth = r.income - (r.fixedExpense + r.variableExpense + r.debt);
        return acc + netMonth;
      }, 0);
    })();

    const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];

    const totalAssets = latest?.totalAssets ?? recordsNet;
    const liabilities = latest?.liabilities ?? 0;
    const netWorth = totalAssets - liabilities;

    const prevNet = prev ? prev.totalAssets - prev.liabilities : recordsNet - liabilities;
    const dayChange = netWorth - prevNet;
    const dayChangePct = prevNet !== 0 ? (dayChange / prevNet) * 100 : 0;

    const lastRecord = [...records].sort((a, b) => a.month.localeCompare(b.month)).pop();
    const monthlyInvestment = lastRecord?.investment ?? 0;

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
