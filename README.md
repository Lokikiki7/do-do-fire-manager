# 🔥 FIRE Manager

평생 사용하는 개인 경제적 자유(FIRE) 관리 시스템.
React + TypeScript + Tailwind + Vite로 만든 실제 서비스 수준의 SPA.
모든 데이터는 브라우저 **LocalStorage**에 저장되며, JSON으로 백업·복원할 수 있습니다.

![stack](https://img.shields.io/badge/React-18-61dafb) ![ts](https://img.shields.io/badge/TypeScript-strict-3178c6) ![vite](https://img.shields.io/badge/Vite-5-646cff)

## ✨ 기능

| 페이지 | 내용 |
|--------|------|
| **대시보드** | 총자산·순자산·월투자금·FIRE 달성률·오늘의 변화, 자산 성장 그래프 |
| **FIRE 계산기** | 4% 룰 기반 필요 자금 및 달성 예상일 계산 |
| **투자 시뮬레이터** | 초기금·월투자·수익률·연봉인상·투자증가율 반영 월 단위 복리 |
| **인생 로드맵** | 연도별 마일스톤 타임라인, 완료 체크 |
| **목표 관리** | 단기·중기·장기 분류 + 완료 체크 |
| **수입/지출** | 월별 수입·고정/변동지출·투자·저축 기록, 저축률 자동 계산 |
| **통계** | 평균 저축률·투자율, 소비 구성, 자산 성장률, 인사이트 |
| **설정** | 프로필·목표·수익률·통화·테마, JSON 백업/복원/초기화 |

## 🎨 디자인

- Apple Human Interface 기반 iOS 시스템 컬러
- 라이트 / 다크 / 시스템 테마 (CSS 변수 한 곳에서 전환)
- 완전 반응형 — 데스크톱 사이드바 ↔ 모바일 하단 탭바
- Framer Motion 애니메이션 (카드 스태거, 페이지 전환, 진행률 링)
- `prefers-reduced-motion` 및 키보드 포커스 대응

## 🚀 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
npm test         # 단위 + 컴포넌트 테스트 (Vitest)
npm run test:watch  # 테스트 watch 모드
npm run lint     # ESLint 검사
npm run format   # Prettier 포맷 적용
```

## 🧪 테스트 & 품질

핵심 로직과 UI를 Vitest로 커버합니다 (84개 케이스).

- `finance.test.ts` — 복리, 4% 룰, FIRE 예상일, **실질 수익률·현재가치**, 저축률
- `validate.test.ts` — 금액/퍼센트/연도 파싱, 음수·NaN 방어
- `schema.test.ts` — 손상 데이터 정규화, 자동 복구 신뢰성
- `format.test.ts` — 통화·한국식 억/만 축약·퍼센트 포맷
- `ConfirmDialog.test.tsx` — 확인/취소/닫힘/접근성 (컴포넌트 테스트)
- `Checkbox.test.tsx` — 완료 체크 상태·클릭

**코드 품질**: ESLint(flat config) + Prettier로 일관성 유지. 배포 워크플로우는
`lint → test → build` 순서로 게이트를 걸어, 하나라도 실패하면 배포되지 않습니다.

## 📦 GitHub Pages 배포

1. 이 저장소를 GitHub에 push
2. **Settings → Pages → Source: GitHub Actions** 선택
3. `main`에 push하면 `.github/workflows/deploy.yml`이 자동 빌드·배포
   (저장소 이름이 base 경로로 자동 주입되므로 별도 설정 불필요)

## 🗂 폴더 구조

```
src/
├── types/          도메인 타입 (AppData = 단일 진실 공급원)
├── constants/      기본값, 네비게이션 정의
├── utils/
│   ├── finance.ts    복리·4%룰·FIRE 예상일·실질수익률 (순수 함수, 테스트 완료)
│   ├── validate.ts   입력 검증 (금액·퍼센트·연도 파싱)
│   ├── schema.ts     런타임 스키마 정규화 (손상 데이터 방어)
│   ├── format.ts     통화·축약·날짜 포맷
│   ├── cn.ts         className 병합 유틸
│   └── storage.ts    LocalStorage + JSON 백업/복원 + 자동 백업
├── hooks/
│   ├── useAppData.tsx  전역 데이터 컨텍스트 + CRUD (debounce 자동저장)
│   ├── useHashRoute.ts URL 해시 라우팅
│   ├── useTheme.ts     테마 → DOM 반영
│   └── useMetrics.ts   파생 지표 계산 (useMemo)
├── components/
│   ├── layout/     Sidebar, MobileNav, Header
│   ├── ui/         Card, Button, Input, ConfirmDialog, ErrorBoundary 등
│   └── charts/     Recharts 테마 래퍼 (접근성 프레임 포함)
├── pages/          8개 페이지 + PageRouter (lazy 코드 스플리팅)
├── test/           Vitest 셋업
└── App.tsx         Provider(데이터/확인) + Shell 조립
```

## ⚙️ 아키텍처 원칙

- **단일 데이터 소스** — 모든 상태가 `AppData` 하나에 모여 백업이 직렬화 한 번으로 끝남
- **계산과 UI 분리** — `utils/finance.ts`는 순수 함수라 여러 페이지가 공유·재사용
- **시맨틱 색상 토큰만 사용** — `bg-surface`, `text-ink` 등으로 다크모드 자동 대응 (컴포넌트에 분기 없음)
- **성능 최적화** — 페이지별 lazy 로딩, 벤더 청크 분리, `memo`/`useMemo`/`useCallback`, debounce 저장

## 🔒 데이터

모든 데이터는 브라우저에만 저장됩니다. 서버로 전송되지 않으며,
기기 이전·백업은 설정 페이지의 JSON 내보내기/가져오기로 처리합니다.

**안전장치**
- 저장 시 하루 한 번 자동 백업(최근 7일치 롤링 보관)
- 메인 데이터 손상 시 최근 백업에서 자동 복구
- 모든 저장/복원 데이터는 런타임 스키마 검증을 거쳐 손상 필드를 방어
- 렌더 오류는 Error Boundary가 격리(앱 전체 흰 화면 방지)
