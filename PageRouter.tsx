/**
 * 입력 검증 유틸.
 *
 * 왜 필요한가:
 * - 기존에는 각 페이지가 raw `Number(value)`를 썼다. 이 경우 빈 문자열은 0,
 *   음수·비정상 큰 수·NaN이 조용히 통과해 계산을 오염시킨다.
 * - 파싱과 검증 정책을 한곳에 모아 모든 페이지가 동일하게 방어하도록 한다 (DRY).
 */

/** 금액 상한 — 비현실적 입력(오타)으로 인한 오버플로/차트 붕괴 방지 (1000조) */
export const MAX_AMOUNT = 1_000_000_000_000_000;

/**
 * 금액 입력 파싱. 음수·NaN은 0으로, 상한 초과는 상한으로 클램프.
 * @returns 항상 유효한 0 이상의 정수
 */
export function parseAmount(value: string | number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.round(n), MAX_AMOUNT);
}

/**
 * 퍼센트(수익률 등) 파싱. 지정 범위로 클램프.
 * @param min 하한 (기본 0)
 * @param max 상한 (기본 100)
 */
export function parsePercent(value: string | number, min = 0, max = 100): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

/**
 * 연도 파싱. 합리적 범위(1900~2200)로 제한.
 */
export function parseYear(value: string | number): number {
  const n = typeof value === 'number' ? value : Number(value);
  const current = new Date().getFullYear();
  if (!Number.isFinite(n)) return current;
  return Math.min(Math.max(Math.round(n), 1900), 2200);
}

/** 검증 결과 (인라인 오류 메시지용) */
export interface FieldCheck {
  valid: boolean;
  message?: string;
}

/** 금액 필드 유효성 (제출 전 검사). 빈 값은 허용(0 처리)하되 음수·초과는 경고. */
export function checkAmount(value: string): FieldCheck {
  if (value.trim() === '') return { valid: true };
  const n = Number(value);
  if (!Number.isFinite(n)) return { valid: false, message: '숫자를 입력해주세요' };
  if (n < 0) return { valid: false, message: '음수는 입력할 수 없어요' };
  if (n > MAX_AMOUNT) return { valid: false, message: '금액이 너무 커요' };
  return { valid: true };
}

/** 필수 텍스트 필드 (제목 등) */
export function checkRequired(value: string, label = '값'): FieldCheck {
  return value.trim() === ''
    ? { valid: false, message: `${label}을(를) 입력해주세요` }
    : { valid: true };
}
