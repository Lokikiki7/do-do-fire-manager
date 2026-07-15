/**
 * 해시 기반 URL 라우팅 훅 (의존성 없음).
 *
 * 왜 hash 라우팅인가:
 * - 이 앱은 GitHub Pages 같은 정적 호스팅에 배포된다.
 * - BrowserRouter(history API)는 새로고침 시 서버 리라이트 설정이 필요해
 *   정적 호스팅에서 404가 난다. hash(#/simulator)는 서버 설정 없이 항상 동작한다.
 *
 * 기존 라우팅 인터페이스(current: PageKey / onNavigate: (p) => void)를
 * 그대로 유지하도록 [page, navigate] 튜플을 반환한다.
 * → Sidebar/MobileNav/PageRouter 등 기존 컴포넌트를 수정할 필요가 없다.
 */
import { useCallback, useEffect, useState } from 'react';
import type { PageKey } from '@/types';
import { NAV_ITEMS } from '@/constants';

/** 앱이 아는 유효한 페이지 키 집합 (NAV_ITEMS 재사용 — 중복 정의 방지) */
const VALID_PAGES = new Set<string>(NAV_ITEMS.map((n) => n.key));
const DEFAULT_PAGE: PageKey = 'dashboard';

/** location.hash("#/simulator")를 안전하게 PageKey로 파싱. 알 수 없으면 기본값. */
function parseHash(): PageKey {
  const raw = window.location.hash.replace(/^#\/?/, '').trim();
  return VALID_PAGES.has(raw) ? (raw as PageKey) : DEFAULT_PAGE;
}

export function useHashRoute(): [PageKey, (next: PageKey) => void] {
  const [page, setPage] = useState<PageKey>(() => parseHash());

  // 브라우저 뒤로/앞으로 가기, 주소창 직접 수정, 새로고침에 반응
  useEffect(() => {
    const onChange = () => setPage(parseHash());
    window.addEventListener('hashchange', onChange);

    // 최초 진입 시 해시가 비어 있으면 기본 경로를 명시적으로 심어
    // 뒤로가기 히스토리가 일관되게 쌓이도록 한다.
    if (!window.location.hash) {
      window.history.replaceState(null, '', `#/${DEFAULT_PAGE}`);
    }
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  /** 프로그래밍 방식 이동 — 해시를 바꾸면 hashchange가 상태를 갱신한다. */
  const navigate = useCallback((next: PageKey) => {
    if (next === parseHash()) return; // 같은 페이지면 히스토리 오염 방지
    window.location.hash = `/${next}`;
    // 페이지 전환 시 스크롤 최상단으로 (긴 페이지에서 자연스러운 이동감)
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  return [page, navigate];
}
