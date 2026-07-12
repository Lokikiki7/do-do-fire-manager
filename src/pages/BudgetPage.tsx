/**
 * 월별 수입/지출 관리.
 * 월 단위로 수입·고정지출·변동지출·투자·저축을 기록하고 저축률을 자동 계산.
 */
import { useState } from 'react';
import { Trash2, Wallet } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Card, SectionTitle, Button, Field, Input, EmptyState, cn } from '@/components/ui';
import { BudgetBarChart } from '@/components/charts';
import { savingRate } from '@/utils/finance';
import { parseAmount } from '@/utils/validate';
import { formatMoney, formatMonth, formatPercent, currentMonth, uid } from '@/utils/format';
import type { MonthlyRecord } from '@/types';

const EMPTY = { income: '', fixedExpense: '', variableExpense: '', investment: '', saving: '' };

export function BudgetPage() {
  const { data, upsertRecord, removeRecord } = useAppData();
  const confirm = useConfirm();
  const { currency } = data.settings;
  const [month, setMonth] = useState(currentMonth());
  const [form, setForm] = useState<Record<keyof typeof EMPTY, string>>(EMPTY);

  const records = data.records; // 훅에서 월순 정렬됨

  const submit = () => {
    const record: MonthlyRecord = {
      id: uid(),
      month,
      income: parseAmount(form.income),
      fixedExpense: parseAmount(form.fixedExpense),
      variableExpense: parseAmount(form.variableExpense),
      investment: parseAmount(form.investment),
      saving: parseAmount(form.saving),
    };
    upsertRecord(record);
    setForm(EMPTY);
  };

  const setField = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  /** 삭제 전 확인 다이얼로그 */
  const handleRemove = async (id: string, month: string) => {
    if (
      await confirm({
        title: '기록을 삭제할까요?',
        message: `${formatMonth(month)} 기록이 삭제됩니다. 되돌릴 수 없습니다.`,
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
        <SectionTitle>월별 기록 입력</SectionTitle>
        <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Field label="월">
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
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
          <Field label="투자금">
            <Input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={form.investment}
              onChange={setField('investment')}
            />
          </Field>
          <Field label="저축">
            <Input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={form.saving}
              onChange={setField('saving')}
            />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={submit}>
            {records.some((r) => r.month === month) ? '수정 저장' : '기록 추가'}
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
            desc="이번 달 수입과 지출을 입력하면 저축률이 자동 계산됩니다."
          />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[560px]">
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
                      <td className="py-2.5 px-2 text-right">
                        <button
                          onClick={() => handleRemove(r.id, r.month)}
                          aria-label={`${formatMonth(r.month)} 기록 삭제`}
                          className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-negative transition-all"
                        >
                          <Trash2 size={15} />
                        </button>
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
