/**
 * 일별 수입/지출 관리 — 달력 우선, 모달 입력.
 * 모바일 최적화:
 *  - 기록 내역: 데스크톱은 테이블, 모바일은 세로 카드(가로 스크롤 제거)
 *  - 액션 버튼: 터치 기기에서 항상 노출 + 44px 터치 타깃
 *  - "오늘 기록하기" 원탭 버튼
 * 버그 수정: 복제 버튼이 값을 복사하지 않던 문제 → 원본 값을 프리필
 */
import { useState } from 'react';
import { Trash2, Wallet, Pencil, Copy, Plus, ChevronDown } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Card, SectionTitle, Button, Field, Input, EmptyState, cn, Modal } from '@/components/ui';
import { BudgetCalendar } from '@/components/budget/BudgetCalendar';
import { BudgetBarChart } from '@/components/charts';
import { savingRate } from '@/utils/finance';
import { parseAmount } from '@/utils/validate';
import { formatMoney, formatPercent, todayISO, uid } from '@/utils/format';
import type { DailyRecord } from '@/types';

const EMPTY = { income: '', fixedExpense: '', variableExpense: '', debt: '', investment: '', saving: '', investmentReturnRate: '' };
type FormState = Record<keyof typeof EMPTY, string>;
const PAGE_SIZE = 20;

function formatDateKor(date: string): string {
  const [y, m, d] = date.split('-');
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

function toForm(r: DailyRecord): FormState {
  return {
    income: String(r.income || ''),
    fixedExpense: String(r.fixedExpense || ''),
    variableExpense: String(r.variableExpense || ''),
    debt: String(r.debt || ''),
    investment: String(r.investment || ''),
    saving: String(r.saving || ''),
    investmentReturnRate: String(r.investmentReturnRate || ''),
  };
}

export function BudgetPage() {
  const { data, upsertRecord, removeRecord } = useAppData();
  const confirm = useConfirm();
  const { currency } = data.settings;
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const records = data.records;
  const existing = modalDate ? records.find((r) => r.date === modalDate) : null;

  const openModal = (value: string, prefill?: FormState) => {
    setModalDate(value);
    const r = records.find((x) => x.date === value);
    setForm(r ? toForm(r) : (prefill ?? EMPTY));
  };

  const closeModal = () => {
    setModalDate(null);
    setForm(EMPTY);
  };

  const income = parseAmount(form.income);
  const fixedExp = parseAmount(form.fixedExpense);
  const varExp = parseAmount(form.variableExpense);
  const debtPayment = parseAmount(form.debt);
  const investment = parseAmount(form.investment);
  const saving = parseAmount(form.saving);

  const totalExpense = fixedExp + varExp + debtPayment;
  const savableAmount = Math.max(0, income - totalExpense);

  const autoSaving = investment > 0 ? Math.max(0, savableAmount - investment) : saving;
  const autoInvestment = saving > 0 ? Math.max(0, savableAmount - saving) : investment;

  const submit = () => {
    if (!modalDate) return;
    upsertRecord({
      id: existing?.id || uid(),
      date: modalDate,
      income,
      fixedExpense: fixedExp,
      variableExpense: varExp,
      debt: debtPayment,
      investment: autoInvestment,
      saving: autoSaving,
      investmentReturnRate: parseAmount(form.investmentReturnRate),
    });
    closeModal();
  };

  const setField = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  /** 다음 날짜로 복제 — 원본 기록의 값을 프리필해서 모달을 연다 */
  const duplicate = (r: DailyRecord) => {
    const [y, m, d] = r.date.split('-').map(Number);
    const next = new Date(y, m - 1, d + 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    const targetDate = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
    openModal(targetDate, toForm(r));
  };

  const handleRemove = async (id: string, d: string) => {
    if (
      await confirm({
        title: '기록을 삭제할까요?',
        message: `${formatDateKor(d)} 기록이 삭제됩니다. 되돌릴 수 없습니다.`,
        confirmLabel: '삭제',
        danger: true,
      })
    )
      removeRecord(id);
  };

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const cutoffDate = thirtyDaysAgo.toISOString().slice(0, 10);

  const chartData = records
    .filter((r) => r.date >= cutoffDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      x: r.date.slice(5),
      수입: r.income,
      지출: r.fixedExpense + r.variableExpense,
      투자: r.investment,
    }));

  const sortedDesc = [...records].reverse();
  const visibleRecords = sortedDesc.slice(0, visibleCount);

  const actionButtons = (r: DailyRecord, alwaysVisible: boolean) => (
    <div
      className={cn(
        'flex items-center justify-end gap-1',
        alwaysVisible
          ? ''
          : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity',
      )}
    >
      <button
        onClick={() => openModal(r.date)}
        aria-label={`${formatDateKor(r.date)} 기록 수정`}
        title="수정"
        className="min-w-[36px] min-h-[36px] grid place-items-center rounded-lg text-ink-faint hover:text-accent hover:bg-accent/10 transition-colors touch-manipulation"
      >
        <Pencil size={16} />
      </button>
      <button
        onClick={() => duplicate(r)}
        aria-label={`${formatDateKor(r.date)} 기록 복제`}
        title="다음 날짜로 복제"
        className="min-w-[36px] min-h-[36px] grid place-items-center rounded-lg text-ink-faint hover:text-positive hover:bg-positive/10 transition-colors touch-manipulation"
      >
        <Copy size={16} />
      </button>
      <button
        onClick={() => void handleRemove(r.id, r.date)}
        aria-label={`${formatDateKor(r.date)} 기록 삭제`}
        title="삭제"
        className="min-w-[36px] min-h-[36px] grid place-items-center rounded-lg text-ink-faint hover:text-negative hover:bg-negative/10 transition-colors touch-manipulation"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* 원탭 오늘 기록 */}
      <div className="flex justify-end">
        <Button onClick={() => openModal(todayISO())} className="w-full sm:w-auto min-h-[44px]">
          <Plus size={16} /> 오늘 기록하기
        </Button>
      </div>

      <BudgetCalendar date={todayISO()} onDateChange={openModal} records={records} currency={currency} />

      {modalDate && (
        <Modal
          open={!!modalDate}
          onOpenChange={(open) => !open && closeModal()}
          title={`${formatDateKor(modalDate)} 기록`}
        >
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-ink-faint mb-3 uppercase tracking-wide">필수</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="수입">
                  <Input type="number" inputMode="numeric" placeholder="0" value={form.income} onChange={setField('income')} autoFocus />
                </Field>
                <Field label="고정지출">
                  <Input type="number" inputMode="numeric" placeholder="0" value={form.fixedExpense} onChange={setField('fixedExpense')} />
                </Field>
                <Field label="변동지출">
                  <Input type="number" inputMode="numeric" placeholder="0" value={form.variableExpense} onChange={setField('variableExpense')} />
                </Field>
                <Field label="부채 상환" hint="선택">
                  <Input type="number" inputMode="numeric" placeholder="0" value={form.debt} onChange={setField('debt')} />
                </Field>
                <Field label="순저축" hint="자동">
                  <div className="flex items-center justify-center h-11 rounded-xl bg-canvas dark:bg-elevated border border-line/[0.08] text-xs font-semibold text-accent tabular">
                    {formatMoney(savableAmount, currency)}
                  </div>
                </Field>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-canvas dark:bg-elevated border border-line/[0.06]">
              <div className="text-xs font-semibold text-ink-faint mb-3 uppercase tracking-wide">투자 배분</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="투자금">
                  <Input type="number" inputMode="numeric" placeholder="0" value={form.investment} onChange={setField('investment')} />
                </Field>
                <Field label="수익률 (%)">
                  <Input type="number" inputMode="decimal" placeholder="0" value={form.investmentReturnRate} onChange={setField('investmentReturnRate')} step="0.1" min="0" max="100" />
                </Field>
                <Field label="저축">
                  <Input type="number" inputMode="numeric" placeholder={autoSaving > 0 ? String(autoSaving) : '0'} value={form.saving} onChange={setField('saving')} />
                </Field>
              </div>
            </div>

            <div className="text-xs text-ink-faint">
              총지출 <span className="font-semibold text-ink">{formatMoney(totalExpense, currency)}</span>
              <span className="mx-2 text-line/40">|</span>
              순저축 <span className="font-semibold text-ink">{formatMoney(savableAmount, currency)}</span>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="ghost" onClick={closeModal} className="min-h-[44px] flex-1 sm:flex-none">취소</Button>
              <Button onClick={submit} className="min-h-[44px] flex-1 sm:flex-none">
                {existing ? '수정 저장' : '기록 저장'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {chartData.length > 0 && (
        <Card>
          <SectionTitle>최근 30일 수입 · 지출 · 투자</SectionTitle>
          <BudgetBarChart data={chartData} currency={currency} />
        </Card>
      )}

      <Card>
        <SectionTitle right={records.length > 0 ? <span className="text-xs text-ink-faint">{records.length}건</span> : undefined}>
          기록 내역
        </SectionTitle>
        {records.length === 0 ? (
          <EmptyState icon={<Wallet size={32} />} title="기록이 없어요" desc="달력에서 날짜를 탭해 기록을 추가하세요." />
        ) : (
          <>
            {/* 모바일: 세로 카드 리스트 (가로 스크롤 없음) */}
            <div className="sm:hidden space-y-2">
              {visibleRecords.map((r) => {
                const expense = r.fixedExpense + r.variableExpense;
                const invSave = r.investment + r.saving;
                const rate = savingRate(r.income, r.investment, r.saving);
                return (
                  <div key={r.id} className="rounded-xl border border-line/[0.08] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">{formatDateKor(r.date)}</span>
                      {actionButtons(r, true)}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm tabular">
                      <div className="flex justify-between">
                        <span className="text-ink-faint text-xs">수입</span>
                        <span className="text-positive font-medium">{formatMoney(r.income, currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-faint text-xs">지출</span>
                        <span className="text-negative font-medium">{formatMoney(expense, currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-faint text-xs">투자+저축</span>
                        <span className="text-accent font-medium">{formatMoney(invSave, currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-faint text-xs">저축률</span>
                        <span className={cn('font-semibold', rate >= 30 ? 'text-positive' : rate >= 15 ? 'text-gold' : 'text-ink-soft')}>
                          {formatPercent(rate)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 데스크톱: 테이블 */}
            <div className="hidden sm:block overflow-x-auto -mx-2">
              <table className="w-full text-sm min-w-[620px]">
                <thead>
                  <tr className="text-ink-faint text-left border-b border-line/10">
                    <th className="font-medium py-2 px-2">날짜</th>
                    <th className="font-medium py-2 px-2 text-right">수입</th>
                    <th className="font-medium py-2 px-2 text-right">지출</th>
                    <th className="font-medium py-2 px-2 text-right">투자+저축</th>
                    <th className="font-medium py-2 px-2 text-right">수익률</th>
                    <th className="font-medium py-2 px-2 text-right">저축률</th>
                    <th className="py-2 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {visibleRecords.map((r) => {
                    const expense = r.fixedExpense + r.variableExpense;
                    const invSave = r.investment + r.saving;
                    const rate = savingRate(r.income, r.investment, r.saving);
                    return (
                      <tr key={r.id} className="border-b border-line/[0.06] group">
                        <td className="py-2.5 px-2 font-medium">{formatDateKor(r.date)}</td>
                        <td className="py-2.5 px-2 text-right tabular text-positive">{formatMoney(r.income, currency)}</td>
                        <td className="py-2.5 px-2 text-right tabular text-negative">{formatMoney(expense, currency)}</td>
                        <td className="py-2.5 px-2 text-right tabular text-accent">{formatMoney(invSave, currency)}</td>
                        <td className="py-2.5 px-2 text-right tabular font-semibold text-accent">
                          {r.investmentReturnRate ? formatPercent(r.investmentReturnRate) : '-'}
                        </td>
                        <td className="py-2.5 px-2 text-right tabular font-semibold">
                          <span className={cn(rate >= 30 ? 'text-positive' : rate >= 15 ? 'text-gold' : 'text-ink-soft')}>
                            {formatPercent(rate)}
                          </span>
                        </td>
                        <td className="py-2.5 px-2">{actionButtons(r, false)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {sortedDesc.length > visibleCount && (
              <div className="mt-3 text-center">
                <Button variant="ghost" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                  <ChevronDown size={16} /> 더 보기 ({sortedDesc.length - visibleCount}건 남음)
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
