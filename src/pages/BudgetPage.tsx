/**
 * 월별 수입/지출 관리 — 스마트 자동 계산
 * 수입과 지출만 입력하면 → 순저축가능금액이 자동 계산됨
 * 투자금/저축 중 하나만 입력하면 → 나머지가 자동 계산됨
 */
import { useRef, useState } from 'react';
import { Trash2, Wallet, Pencil, Copy, X } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Card, SectionTitle, Button, Field, Input, EmptyState, cn } from '@/components/ui';
import { BudgetBarChart } from '@/components/charts';
import { savingRate } from '@/utils/finance';
import { parseAmount } from '@/utils/validate';
import { formatMoney, formatMonth, formatPercent, currentMonth, uid } from '@/utils/format';
import type { MonthlyRecord } from '@/types';

const EMPTY = { income: '', fixedExpense: '', variableExpense: '', debt: '', investment: '', saving: '' };
type FormState = Record<keyof typeof EMPTY, string>;

/** YYYY-MM → 다음 달 YYYY-MM */
function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** 기록 → 폼 문자열 값 */
function toForm(r: MonthlyRecord): FormState {
  return {
    income: String(r.income || ''),
    fixedExpense: String(r.fixedExpense || ''),
    variableExpense: String(r.variableExpense || ''),
    debt: String(r.debt || ''),
    investment: String(r.investment || ''),
    saving: String(r.saving || ''),
  };
}

export function BudgetPage() {
  const { data, upsertRecord, removeRecord } = useAppData();
  const confirm = useConfirm();
  const { currency } = data.settings;
  const [month, setMonth] = useState(currentMonth());
  const [form, setForm] = useState<FormState>(EMPTY);
  const formRef = useRef<HTMLDivElement>(null);

  const records = data.records;
  const existing = records.find((r) => r.month === month);

  /** 월 변경 시 기존 기록 자동으로 불러오기 */
  const changeMonth = (value: string) => {
    setMonth(value);
    const r = records.find((x) => x.month === value);
    setForm(r ? toForm(r) : EMPTY);
  };

  // 현재 입력값들 (숫자로 변환)
  const income = parseAmount(form.income);
  const fixedExp = parseAmount(form.fixedExpense);
  const varExp = parseAmount(form.variableExpense);
  const debtPayment = parseAmount(form.debt);
  const investment = parseAmount(form.investment);
  const saving = parseAmount(form.saving);

  // 자동 계산
  const totalExpense = fixedExp + varExp + debtPayment; // 부채 상환 포함
  const savableAmount = Math.max(0, income - totalExpense); // 순저축가능금액

  // 투자금 입력됨 → 저축은 자동 계산
  const autoSaving = investment > 0 ? Math.max(0, savableAmount - investment) : saving;

  // 저축 입력됨 → 투자금은 자동 계산
  const autoInvestment = saving > 0 ? Math.max(0, savableAmount - saving) : investment;

  const submit = () => {
    const wasEdit = !!existing;
    upsertRecord({
      id: uid(),
      month,
      income,
      fixedExpense: fixedExp,
      variableExpense: varExp,
      debt: debtPayment,
      investment: autoInvestment,
      saving: autoSaving,
    });
    // 새 기록이면 다음 달 준비, 수정이면 그대로 유지
    if (!wasEdit) {
      const nm = nextMonth(month);
      setMonth(nm);
      const nr = records.find((x) => x.month === nm);
      setForm(nr ? toForm(nr) : EMPTY);
    }
  };

  const setField = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  /** 행의 '수정' */
  const startEdit = (r: MonthlyRecord) => {
    setMonth(r.month);
    setForm(toForm(r));
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /** 행의 '복제' */
  const duplicate = (r: MonthlyRecord) => {
    let target = nextMonth(r.month);
    while (records.some((x) => x.month === target)) target = nextMonth(target);
    setMonth(target);
    setForm(toForm(r));
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /** 삭제 전 확인 다이얼로그 */
  const handleRemove = async (id: string, m: string) => {
    if (
      await confirm({
        title: '기록을 삭제할까요?',
        message: `${formatMonth(m)} 기록이 삭제되고, 총자산·통계·FIRE 달성률에서 즉시 제외됩니다. 되돌릴 수 없습니다.`,
        confirmLabel: '삭제',
        danger: true,
      })
    )
      removeRecord(id);
  };

  // 차트 데이터 (최근 12개월)
  const chartData = records.slice(-12).map((r) => ({
    x: r.month.slice(2), // YY-MM
    수입: r.income,
    지출: r.fixedExpense + r.variableExpense,
    투자: r.investment,
  }));

  return (
    <div className="space-y-4">
      {/* 입력 폼 */}
      <Card>
        <div ref={formRef}>
          <SectionTitle
            right={
              existing && (
                <Button size="sm" variant="ghost" onClick={() => changeMonth(currentMonth())}>
                  <X size={14} /> 취소
                </Button>
              )
            }
          >
            {existing ? `${formatMonth(month)} 기록 수정` : '월별 기록 입력'}
          </SectionTitle>
        </div>

        {/* 섹션 1: 필수 입력 (수입, 지출) */}
        <div className="mb-6">
          <div className="text-xs font-semibold text-ink-faint mb-3 uppercase tracking-wide">필수</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <Field label="월" hint={existing ? '기존 기록을 불러왔어요' : undefined}>
              <Input type="month" value={month} onChange={(e) => changeMonth(e.target.value)} />
            </Field>
            <Field label="수입">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={form.income}
                onChange={setField('income')}
              />
            </Field>
            <Field label="고정지출">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={form.fixedExpense}
                onChange={setField('fixedExpense')}
              />
            </Field>
            <Field label="변동지출">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={form.variableExpense}
                onChange={setField('variableExpense')}
              />
            </Field>
            <Field label="부채 상환" hint="선택">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={form.debt}
                onChange={setField('debt')}
              />
            </Field>
            {/* 자동 계산 표시 */}
            <Field label="순저축가능금액" hint="자동 계산됨">
              <div className="flex items-center justify-center h-10 rounded-lg bg-surface-secondary border border-line/20 text-sm font-semibold text-accent">
                {formatMoney(savableAmount, currency)}
              </div>
            </Field>
          </div>
        </div>

        {/* 섹션 2: 선택 입력 (투자/저축 중 하나만 입력) */}
        <div className="mb-6 p-3 rounded-lg bg-surface-secondary/50 border border-line/20">
          <div className="text-xs font-semibold text-ink-faint mb-3 uppercase tracking-wide">투자 배분</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="투자금" hint={investment > 0 ? '입력함' : '선택'}>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={form.investment}
                onChange={setField('investment')}
              />
            </Field>
            <Field label="저축" hint={saving > 0 ? '입력함' : `자동: ${formatMoney(autoSaving, currency)}`}>
              <Input
                type="number"
                inputMode="numeric"
                placeholder={autoSaving > 0 ? String(autoSaving) : '0'}
                value={form.saving}
                onChange={setField('saving')}
              />
            </Field>
          </div>
          <p className="text-xs text-ink-faint mt-2">
            💡 투자금을 입력하면 저축이 자동 계산되고, 저축을 입력하면 투자금이 자동 계산됩니다.
          </p>
        </div>

        {/* 요약 및 버튼 */}
        <div className="mt-4 flex flex-col items-start gap-3">
          <div className="text-xs text-ink-faint space-y-1">
            <p>
              총지출: <span className="font-semibold">{formatMoney(totalExpense, currency)}</span> | 순저축: <span className="font-semibold">{formatMoney(savableAmount, currency)}</span> | 투자+저축: <span className="font-semibold">{formatMoney(autoInvestment + autoSaving, currency)}</span>
            </p>
          </div>
          <Button onClick={submit} className="self-end">
            {existing ? '수정 저장' : '기록 추가'}
          </Button>
        </div>
      </Card>

      {/* 차트 */}
      {chartData.length > 0 && (
        <Card>
          <SectionTitle>최근 수입 · 지출 · 투자</SectionTitle>
          <BudgetBarChart data={chartData} currency={currency} />
        </Card>
      )}

      {/* 기록 테이블 */}
      <Card>
        <SectionTitle>기록 내역</SectionTitle>
        {records.length === 0 ? (
          <EmptyState
            icon={<Wallet size={32} />}
            title="기록이 없어요"
            desc="수입과 지출을 입력하면 저축률이 자동 계산됩니다."
          />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[620px]">
              <thead>
                <tr className="text-ink-faint text-left border-b border-line/10">
                  <th className="font-medium py-2 px-2">월</th>
                  <th className="font-medium py-2 px-2 text-right">수입</th>
                  <th className="font-medium py-2 px-2 text-right">지출</th>
                  <th className="font-medium py-2 px-2 text-right">투자+저축</th>
                  <th className="font-medium py-2 px-2 text-right">저축률</th>
                  <th className="py-2 px-2" />
                </tr>
              </thead>
              <tbody>
                {[...records].reverse().map((r) => {
                  const expense = r.fixedExpense + r.variableExpense;
                  const invSave = r.investment + r.saving;
                  const rate = savingRate(r.income, r.investment, r.saving);
                  return (
                    <tr key={r.id} className="border-b border-line/[0.06] group">
                      <td className="py-2.5 px-2 font-medium">{formatMonth(r.month)}</td>
                      <td className="py-2.5 px-2 text-right tabular text-positive">
                        {formatMoney(r.income, currency)}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular text-negative">
                        {formatMoney(expense, currency)}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular text-accent">
                        {formatMoney(invSave, currency)}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular font-semibold">
                        <span
                          className={cn(
                            rate >= 30
                              ? 'text-positive'
                              : rate >= 15
                                ? 'text-gold'
                                : 'text-ink-soft',
                          )}
                        >
                          {formatPercent(rate)}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(r)}
                            aria-label={`${formatMonth(r.month)} 기록 수정`}
                            title="수정"
                            className="text-ink-faint hover:text-accent transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => duplicate(r)}
                            aria-label={`${formatMonth(r.month)} 기록 복제`}
                            title="다음 달로 복제"
                            className="text-ink-faint hover:text-positive transition-colors"
                          >
                            <Copy size={15} />
                          </button>
                          <button
                            onClick={() => handleRemove(r.id, r.month)}
                            aria-label={`${formatMonth(r.month)} 기록 삭제`}
                            title="삭제"
                            className="text-ink-faint hover:text-negative transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
