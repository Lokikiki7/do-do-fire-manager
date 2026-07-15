-- ============================================================
-- FIRE Manager — Supabase 데이터베이스 설정
-- ============================================================
-- 실행 방법:
--   1. https://supabase.com/dashboard → 프로젝트 선택
--   2. 왼쪽 메뉴 [SQL Editor] → [New query]
--   3. 이 파일 전체를 붙여넣고 [Run] 클릭
--
-- 이 스크립트는 여러 번 실행해도 안전합니다 (idempotent).
-- ============================================================

-- 1) 사용자 데이터 테이블 (사용자당 1행, 전체 AppData를 jsonb로 저장)
create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 2) Row Level Security 활성화
--    ⚠ RLS가 켜져 있는데 정책이 없으면 anon 키로는 모든 요청이 거부됩니다.
--    (동기화가 "조용히" 실패하던 근본 원인)
alter table public.user_data enable row level security;

-- 3) 정책: 본인 행만 읽기/쓰기 가능
drop policy if exists "user_data_select_own" on public.user_data;
create policy "user_data_select_own"
  on public.user_data for select
  using (auth.uid() = user_id);

drop policy if exists "user_data_insert_own" on public.user_data;
create policy "user_data_insert_own"
  on public.user_data for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_data_update_own" on public.user_data;
create policy "user_data_update_own"
  on public.user_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_data_delete_own" on public.user_data;
create policy "user_data_delete_own"
  on public.user_data for delete
  using (auth.uid() = user_id);

-- 4) updated_at 자동 갱신 트리거
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_user_data_updated_at on public.user_data;
create trigger trg_user_data_updated_at
  before update on public.user_data
  for each row execute function public.set_updated_at();

-- 5) 확인용: 테이블/정책이 잘 만들어졌는지 조회
select
  policyname as policy,
  cmd
from pg_policies
where schemaname = 'public' and tablename = 'user_data';
