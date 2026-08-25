/**
 * 저장/임포트 데이터 정규화 테스트.
 * 손상되거나 예전 로직이 만든 데이터를 불러오는 지점이라
 * 여기서 걸러내지 못하면 앱 전체 계산이 오염된다.
 */
import { describe, it, expect } from 'vitest';
import { normalizeAppData } from '@/utils/schema';
import { netSavingOf } from '@/utils/finance';
import type { DailyRecord } from '@/types';

/** 기록 하나만 담은 최소 AppData를 통과시켜 정규화 결과를 꺼낸다 */
function loadRecord(raw: Record<string, unknown>): DailyRecord {
  const data = normalizeAppData({ records: [raw] });
  return data!.records[0];
}

const base = {
  id: 'r1',
  date: '2026-01-01',
  income: 1000,
  fixedExpense: 0,
  variableExpense: 0,
  debt: 0,
  investment: 0,
  saving: 0,
};

describe('normalizeRecord — 날짜 정규화', () => {
  it('zero-pad 되지 않은 날짜를 교정한다', () => {
    expect(loadRecord({ ...base, date: '2026-8-5' }).date).toBe('2026-08-05');
  });

  it('id나 date가 없는 기록은 버린다', () => {
    expect(normalizeAppData({ records: [{ ...base, id: 1 }] })!.records).toHaveLength(0);
    expect(normalizeAppData({ records: [{ ...base, date: undefined }] })!.records).toHaveLength(0);
  });
});

describe('normalizeRecord — 투자금 + 저축 = 순저축 복구', () => {
  it('둘 다 직접 입력해 합이 넘치던 기록을 바로잡는다', () => {
    // 예전 로직: 순저축 1000인데 투자 600 + 저축 700 = 1300으로 저장됨
    const r = loadRecord({ ...base, investment: 600, saving: 700 });
    expect(r.investment).toBe(600); // 사용자가 정한 값은 보존
    expect(r.saving).toBe(400); // 파생값만 다시 계산
    expect(r.investment + r.saving).toBe(netSavingOf(r));
  });

  it('둘 다 비어 있던 기록은 순저축 전액을 저축으로 잡는다', () => {
    const r = loadRecord(base);
    expect(r.saving).toBe(1000);
    expect(r.investment + r.saving).toBe(netSavingOf(r));
  });

  it('이미 맞는 기록은 건드리지 않는다', () => {
    const r = loadRecord({ ...base, investment: 400, saving: 600 });
    expect(r.investment).toBe(400);
    expect(r.saving).toBe(600);
  });

  it('지출이 수입보다 크면 저축이 음수가 된다', () => {
    const r = loadRecord({ ...base, income: 0, fixedExpense: 500 });
    expect(r.saving).toBe(-500);
    expect(r.investment + r.saving).toBe(netSavingOf(r));
  });

  it('순저축보다 많이 투자한 날은 저축이 음수 (기존 현금을 헐어 투자)', () => {
    const r = loadRecord({ ...base, income: 0, investment: 300 });
    expect(r.saving).toBe(-300);
    expect(r.investment + r.saving).toBe(netSavingOf(r));
  });

  it('부채 상환도 순저축에서 빠진다', () => {
    const r = loadRecord({ ...base, income: 1000, debt: 300, investment: 200 });
    expect(r.saving).toBe(500); // 1000 - 300 - 200
    expect(r.investment + r.saving).toBe(netSavingOf(r));
  });
});

describe('normalizeRecord — 통합 지출 / 과거 고정·변동 기록', () => {
  it('통합 지출을 보존한다', () => {
    const r = loadRecord({ ...base, expense: 300 });
    expect(r.expense).toBe(300);
    expect(r.saving).toBe(700); // 1000 - 300
  });

  it('expense가 없던 과거 기록은 0으로 채운다', () => {
    expect(loadRecord(base).expense).toBe(0);
  });

  it('고정/변동으로 나뉜 과거 기록의 값은 지우지 않는다', () => {
    const r = loadRecord({ ...base, fixedExpense: 200, variableExpense: 100 });
    expect(r.fixedExpense).toBe(200);
    expect(r.variableExpense).toBe(100);
  });

  it('과거 기록의 순저축도 고정+변동을 합쳐서 계산한다', () => {
    const r = loadRecord({ ...base, fixedExpense: 200, variableExpense: 100, investment: 400 });
    expect(r.saving).toBe(300); // 1000 - 300 - 400
    expect(r.investment + r.saving).toBe(netSavingOf(r));
  });

  it('통합 지출과 과거 지출이 섞여 있어도 전부 반영한다', () => {
    const r = loadRecord({ ...base, expense: 100, fixedExpense: 200, variableExpense: 100 });
    expect(r.saving).toBe(600); // 1000 - 400
    expect(r.investment + r.saving).toBe(netSavingOf(r));
  });
});
