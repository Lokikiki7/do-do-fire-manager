/**
 * 스키마 정규화 테스트.
 * 손상/불완전한 데이터가 앱을 오염시키지 않는지, 살릴 수 있는 데이터는
 * 보존하는지 검증한다. 자동 백업 복구의 신뢰성이 여기에 달려 있다.
 */
import { describe, it, expect } from 'vitest';
import { normalizeAppData } from '@/utils/schema';

describe('normalizeAppData — 거부 케이스', () => {
  it('null·원시값·배열은 null 반환', () => {
    expect(normalizeAppData(null)).toBeNull();
    expect(normalizeAppData(42)).toBeNull();
    expect(normalizeAppData('string')).toBeNull();
    expect(normalizeAppData([])).toBeNull();
  });
  it('version이 1이 아니면 null', () => {
    expect(normalizeAppData({ version: 2, settings: {} })).toBeNull();
    expect(normalizeAppData({ settings: {} })).toBeNull();
  });
  it('settings 객체가 없으면 null', () => {
    expect(normalizeAppData({ version: 1 })).toBeNull();
    expect(normalizeAppData({ version: 1, settings: 'bad' })).toBeNull();
  });
});

describe('normalizeAppData — 정상 정규화', () => {
  it('최소 데이터(version + settings)로 전체 구조를 채운다', () => {
    const result = normalizeAppData({ version: 1, settings: {} });
    expect(result).not.toBeNull();
    expect(result!.snapshots).toEqual([]);
    expect(result!.records).toEqual([]);
    expect(result!.milestones).toEqual([]);
    expect(result!.goals).toEqual([]);
    expect(result!.simulator).toBeDefined();
  });

  it('settings의 알 수 없는 통화/테마는 기본값으로 대체', () => {
    const result = normalizeAppData({
      version: 1,
      settings: { currency: 'BTC', theme: 'neon' },
    });
    expect(result!.settings.currency).toBe('KRW');
    expect(result!.settings.theme).toBe('system');
  });

  it('settings의 정상 값은 보존', () => {
    const result = normalizeAppData({
      version: 1,
      settings: { name: '홍길동', currency: 'USD', theme: 'dark', fireTarget: 500_000_000 },
    });
    expect(result!.settings.name).toBe('홍길동');
    expect(result!.settings.currency).toBe('USD');
    expect(result!.settings.theme).toBe('dark');
    expect(result!.settings.fireTarget).toBe(500_000_000);
  });
});

describe('normalizeAppData — 배열 아이템 방어', () => {
  it('id 없는 스냅샷·객체 아닌 항목은 버리고 정상만 보존', () => {
    const result = normalizeAppData({
      version: 1,
      settings: {},
      snapshots: [
        { id: 'a', date: '2026-01-01', totalAssets: 1000, liabilities: 0 }, // 정상
        { date: '2026-02-01', totalAssets: 2000 }, // id 없음 → 버림
        'garbage', // 객체 아님 → 버림
        null, // null → 버림
      ],
    });
    expect(result!.snapshots).toHaveLength(1);
    expect(result!.snapshots[0].id).toBe('a');
    expect(result!.snapshots[0].totalAssets).toBe(1000);
  });

  it('숫자 필드가 문자열이면 0으로 방어', () => {
    const result = normalizeAppData({
      version: 1,
      settings: {},
      snapshots: [{ id: 'x', date: '2026-01-01', totalAssets: 'NaN값', liabilities: null }],
    });
    expect(result!.snapshots[0].totalAssets).toBe(0);
    expect(result!.snapshots[0].liabilities).toBe(0);
  });

  it('목표의 잘못된 term은 short로 대체', () => {
    const result = normalizeAppData({
      version: 1,
      settings: {},
      goals: [
        { id: 'g1', term: 'forever', title: '집 사기', done: false, createdAt: '2026-01-01' },
      ],
    });
    expect(result!.goals[0].term).toBe('short');
    expect(result!.goals[0].title).toBe('집 사기');
  });

  it('제목 없는 마일스톤은 기본 제목으로 보존', () => {
    const result = normalizeAppData({
      version: 1,
      settings: {},
      milestones: [{ id: 'm1', year: 2030 }],
    });
    expect(result!.milestones[0].title).toBeTruthy();
    expect(result!.milestones[0].year).toBe(2030);
    expect(result!.milestones[0].done).toBe(false);
  });

  it('배열이 아닌 필드는 빈 배열로 처리', () => {
    const result = normalizeAppData({
      version: 1,
      settings: {},
      snapshots: 'not-an-array',
      records: 123,
    });
    expect(result!.snapshots).toEqual([]);
    expect(result!.records).toEqual([]);
  });
});
