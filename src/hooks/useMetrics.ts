/**
 * 원천 데이터(AppData)에서 대시보드/통계가 공통으로 쓰는 파생 지표를 계산.
 * useMemo로 감싸 재계산을 최소화하고, 페이지 간 계산 로직 중복을 없앤다.
 *
 * ✅ 수입/지출과 자산의 연동 기능:
 * - snapshots (수동 기록)가 없으면 → records (수입/지출)로 자동 계산
 * - snapshots과 records가 모두 있으면 → snapshots 우선 (사용자의 정정 입력)
 */
import { useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { fireNumberByRule, fireProgress, estimateFireDate } from '@/utils/finance';

export function useMetrics() {
  const { data } = useAppData();
  const { snapshots, records, settings, milestones } = data;

  return useMemo(() => {
    // 초기 자산과 부채
    const initialNetWorth = settings.initialAsset - settings.initialLiability;

    // 완료된 마일스톤의 목표 금액 합산
    const completedMilestoneAmount = milestones
      .filter((m) => m.done && m.targetAmount)
      .reduce((sum, m) => sum + (m.targetAmount || 0), 0);

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

    // snapshots이 있으면 사용, 없으면 records + 초기 자산 + 완료 마일스톤에서 계산
    const totalAssets = latest?.totalAssets ?? (recordsNet + settings.initialAsset + completedMilestoneAmount);
 