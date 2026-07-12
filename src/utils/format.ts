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

/** 오늘 날짜 YYYY-MM-DD */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 이번 달 YYYY-MM */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** 간단한 고유 ID */
export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
