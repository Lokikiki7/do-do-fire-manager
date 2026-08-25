/**
 * 표시 포맷 유틸 — 통화, 축약 숫자, 날짜.
 */
import type { Currency } from '@/types';

/** 통화 전체 포맷: 1,234,567원 / $1,234,567 */
export function formatMoney(value: number, currency: Currency = 'KRW'): string {
  const n = Math.round(value);
  return currency === 'KRW' ? `${n.toLocaleString('ko-KR')}원` : `$${n.toLocaleString('en-US')}`;
}

/** 한국식 축약: 12.3억 / 4,500만 (그래프 축, 카드 요약용) */
export function formatKoreanShort(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1e8) return `${sign}${(abs / 1e8).toFixed(abs >= 1e9 ? 0 : 1)}억`;
  if (abs >= 1e4) return `${sign}${Math.round(abs / 1e4).toLocaleString()}만`;
  return `${sign}${abs.toLocaleString()}`;
}

/** 통화에 맞는 축약 선택 */
export function formatShort(value: number, currency: Currency = 'KRW'): string {
  if (currency === 'KRW') return formatKoreanShort(value);
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toLocaleString()}`;
}

/** 퍼센트: 12.3% */
export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

/** YYYY-MM → "2026년 7월" */
export function formatMonth(month: string): string {
  const [y, m] = month.split('-');
  return `${y}년 ${Number(m)}월`;
}

/** Date → "2032년 4월" */
export function formatDateKo(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

/** 오늘 날짜 YYYY-MM-DD (로컬 시간대 기준 — UTC 사용 시 KST 오전 9시 전에 어제로 표시되던 버그 수정) */
export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * 날짜 문자열을 YYYY-MM-DD로 정규화.
 *
 * 앱 안에서 만드는 날짜는 항상 zero-pad 되지만(todayISO / 달력 셀 / 복제),
 * JSON 임포트나 클라우드 동기화로 '2026-8-5' 같은 값이 들어올 수 있다.
 * 코드 전반이 문자열 비교에 의존하므로(localeCompare 정렬, r.date >= cutoff)
 * 정규화하지 않으면 '2026-8-5' > '2026-12-01' 이 참이 되어
 * 정렬과 누적 합계가 동시에 깨진다.
 *
 * ISO 타임스탬프('2026-08-05T00:00:00Z')는 날짜 부분만 남긴다.
 * 형식을 알 수 없는 값은 그대로 돌려준다 (임의로 버리지 않음).
 */
export function normalizeDate(date: string): string {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/.exec(date.trim());
  if (!m) return date;
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

/** 이번 달 YYYY-MM (로컬 시간대 기준) */
export function currentMonth(): string {
  return todayISO().slice(0, 7);
}

/** 간단한 고유 ID */
export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
