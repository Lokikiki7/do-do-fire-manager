/**
 * 원천 데이터(AppData)에서 대시보드/통계가 공통으로 쓰는 파생 지표를 계산.
 *
 * 자산은 "수입/지출 기록"에서만 파생된다 (단일 진실 공급원).
 * 과거에는 수동 자산 스냅샷이 있으면 그쪽을 우선했는데, 그 결과
 * 지표 카드와 자산 성장 그래프가 서로 다른 값을 보는 문제가 있었다.
 */
import { useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import {
  fireNumberByRule,
  fireProgress,
  estimateFireDate,
  buildAssetSeries,
  monthlyInvestmentRate,
} from '@/utils/finance';

export function useMetrics() {
  const { data } = useAppData();
  const { records, settings } = data;

  return useMemo(() => {
    // 수입/지출 기록 → 자산 추이 (차트와 동일한 함수)
    const series = buildAssetSeries(records, settings.initialAsset, settings.initialLiability);
    const latest = series[series.length - 1];

    const totalAssets = latest?.totalAssets ?? settings.initialAsset;
    // 부채는 상환 기록만큼 줄어든다 (기록이 없으면 초기 부채 그대로)
    const liabilities = latest?.liabilities ?? Math.max(0, settings.initialLiability);
    const netWorth = totalAssets - liabilities;
    // 지금까지 실제로 갚은 부채 (초기 부채 - 남은 부채)
    const debtPaid = Math.max(0, Math.max(0, settings.initialLiability) - liabilities);

    // 최근 기록일의 순자산 증감 (기록이 없으면 0)
    const dayChange = latest?.change ?? 0;
    const prevNet = netWorth - dayChange;
    const dayChangePct = prevNet !== 0 ? (dayChange / Math.abs(prevNet)) * 100 : 0;

    // 누적 투자 원금 / 누적 투자 수익
    const totalInvested = latest?.investedPrincipal ?? 0;
    const totalGain = latest?.investmentGain ?? 0;

    // 이번 달에 투자한 금액 (월별 진행 상황 확인용)
    const thisMonth = new Date().toISOString().slice(0, 7);
    const investedThisMonth = records
      .filter((r) => r.date.startsWith(thisMonth))
      .reduce((s, r) => s + Math.max(0, r.investment), 0);

    // FIRE 예상일용 월 투자액 — 최근 90일 실적을 월 환산 (마지막 기록 1건이 아님)
    const monthlyInvestment = monthlyInvestmentRate(records);

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
      /** 수입/지출 기록에서 파생된 자산 추이 — 차트가 그대로 사용 */
      series,
      totalAssets,
      liabilities,
      debtPaid,
      netWorth,
      totalInvested,
      totalGain,
      investedThisMonth,
      dayChange,
      dayChangePct,
      monthlyInvestment,
      target,
      ruleTarget,
      progress,
      eta,
      hasData: records.length > 0,
    };
  }, [records, settings]);
}
