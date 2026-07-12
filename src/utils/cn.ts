/**
 * 조건부 className 병합 유틸.
 * falsy 값을 걸러 공백으로 join한다. (UI 컴포넌트에서 광범위 사용)
 *
 * 컴포넌트 파일이 아닌 별도 유틸로 분리한 이유:
 * React Fast Refresh는 컴포넌트만 export하는 파일에서 가장 잘 동작한다.
 * 순수 함수를 컴포넌트 파일에서 export하면 HMR 경고가 발생하므로 분리한다.
 */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
