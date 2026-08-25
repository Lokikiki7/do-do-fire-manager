/**
 * 일별 수입/지출 관리 — 달력 우선, 모달 입력.
 * 모바일 최적화:
 *  - 기록 내역: 데스크톱은 테이블, 모바일은 세로 카드(가로 스크롤 제거)
 *  - 액션 버튼: 터치 기기에서 항상 노출 + 44px 터치 타깃
 *  - "오늘 기록하기" 원탭 버튼
 * 버그 수정: 복제 버튼이 값을 복사하지 않던 문제 → 원본 값을 프리필
 */
import { useState } from 'react';
import { Trash2, Wallet, Pencil, Copy, Plus, ChevronDown, Info } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Card, SectionTitle, Button, Field, Input, EmptyState, cn, Modal } from '@/components/ui';
import { BudgetCalendar } from '@/components/budget/BudgetCalendar';
import { BudgetBarChart } from '@/components/charts';
import { savingRate, buildAssetSeries, cumulativeUpTo, netSavingOf } from '@/utils/finance';
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
  /** 투자금·저축 중 사용자가 마지막으로 직접 고친 쪽 — 나머지 한쪽은 여기서 파생된다 */
  const [allocAnchor, setAllocAnchor] = useState<'investment' | 'saving'>('investment');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const records = data.records;
  const existing = modalDate ? records.find((r) => r.date === modalDate) : null;

  const openModal = (value: string, prefill?: FormState) => {
    setModalDate(value);
    const r = records.find((x) => x.date === value);
    setForm(r ? toForm(r) : (prefill ?? EMPTY));
    // 저장된 기록은 이미 투자금 + 저축 = 순저축을 만족하므로
    // 투자금을 기준으로 삼으면 저축이 저장된 값 그대로 다시 계산된다
    setAllocAnchor('investment');
  };

  const closeModal = () => {
    setModalDate(null);
    setForm(EMPTY);
    setAllocAnchor('investment');
  };

  const income = parseAmount(form.income);
  const fixedExp = parseAmount(form.fixedExpense);
  const varExp = parseAmount(form.variableExpense);
  const debtPayment = parseAmount(form.debt);
  const investment = parseAmount(form.investment);
  const saving = parseAmount(form.saving);

  // 지출이 수입보다 크면 음수 그대로 둔다 (0으로 자르면 배분 합이 어긋난다)
  const netSaving = netSavingOf({
    income,
    fixedExpense: fixedExp,
    variableExpense: varExp,
    debt: debtPayment,
  });

  // 투자금과 저축은 순저축을 나눠 담는 한 쌍이라 합이 항상 순저축과 같아야 한다.
  // 마지막으로 건드린 쪽을 기준(anchor)으로 삼고 나머지 한쪽을 자동으로 맞춘다.
  // 예전에는 둘을 각각 계산해서 둘 다 입력하면 합이 순저축을 넘어갔다.
  const allocInvestment = allocAnchor === 'investment' ? investment : netSaving - saving;
  const allocSaving = allocAnchor === 'investment' ? netSaving - investment : saving;

  /** 지금 모달에 입력된 값으로 만든, 아직 저장되지 않은 기록 (id는 저장 시점에 확정) */
  const draftRecord: DailyRecord = {
    id: existing?.id ?? '',
    date: modalDate ?? todayISO(),
    income,
    fixedExpense: fixedExp,
    variableExpense: varExp,
    debt: debtPayment,
    investment: allocInvestment,
    saving: allocSaving,
    investmentReturnRate: parseAmount(form.investmentReturnRate),
  };

  // 선택한 날짜까지의 누적 — 저장 전 입력값을 그 날짜 기록으로 갈아끼워 미리 반영한다.
  // (투자금을 입력하는 순간 누적 카드가 즉시 반응하도록)
  const previewRecords = modalDate
    ? [...records.filter((r) => r.date !== modalDate), draftRecord]
    : records;

  const cumulative = cumulativeUpTo(
    previewRecords,
    draftRecord.date,
    data.settings.initialAsset,
    data.settings.initialLiability,
  );

  const submit = () => {
    if (!modalDate) return;
    upsertRecord({ ...draftRecord, id: existing?.id || uid(), date: modalDate });
    closeModal();
  };

  const setField = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  /** 투자금·저축은 건드린 쪽이 기준이 되고 반대쪽이 자동으로 따라온다 */
  const setAllocField =
    (k: 'investment' | 'saving') => (e: React.ChangeEvent<HTMLInputElement>) => {
      setAllocAnchor(k);
      setField(k)(e);
    };

  /** 파생된 배분 금액을 입력창에 넣을 문자열로 (0은 비워 둬야 바로 덧입력할 수 있다) */
  const allocValue = (side: 'investment' | 'saving', derived: number) =>
    allocAnchor === side ? form[side] : derived === 0 ? '' : String(derived);

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

  // 날짜별 누계 순자산 — 대시보드/지표 카드와 동일한 buildAssetSeries 사용 (단일 진실 공급원)
  // 기록은 날짜당 1건(upsert)이므로 date를 키로 써도 안전하다
  const cumulativeByDate = new Map(
    buildAssetSeries(records, data.settings.initialAsset, data.settings.initialLiability).map(
      (p) => [p.date, p.netWorth] as const,
    ),
  );

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
                  <div
                    className={cn(
                      'flex items-center justify-center h-11 rounded-xl bg-canvas dark:bg-elevated border border-line/[0.08] text-xs font-semibold tabular',
                      netSaving >= 0 ? 'text-accent' : 'text-negative',
                    )}
                  >
                    {formatMoney(netSaving, currency)}
                  </div>
                </Field>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-canvas dark:bg-elevated border border-line/[0.06]">
              <div className="text-xs font-semibold text-ink-faint mb-3 uppercase tracking-wide">투자 배분</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="투자금" hint={allocAnchor === 'saving' ? '자동' : undefined}>
                  <Input type="number" inputMode="numeric" placeholder="0" value={allocValue('investment', allocInvestment)} onChange={setAllocField('investment')} />
                </Field>
                <Field label="수익률 (%)">
                  <Input type="number" inputMode="decimal" placeholder="0" value={form.investmentReturnRate} onChange={setField('investmentReturnRate')} step="0.1" min="0" max="100" />
                </Field>
                <Field label="저축" hint={allocAnchor === 'investment' ? '자동' : undefined}>
                  <Input type="number" inputMode="numeric" placeholder="0" value={allocValue('saving', allocSaving)} onChange={setAllocField('saving')} />
                </Field>
              </div>
              <div className="mt-2 text-[10px] text-ink-faint leading-relaxed">
                투자금과 저축은 순저축{' '}
                <span className="font-semibold text-ink-soft tabular">{formatMoney(netSaving, currency)}</span>
                을 나눠 담습니다. 한쪽을 입력하면 나머지가 자동으로 맞춰집니다.
                {allocSaving < 0 && ' 저축이 음수면 기존 현금을 헐어 투자한 것으로 봅니다.'}
              </div>
            </div>

            {existing && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-gold/10 text-gold text-xs leading-relaxed">
                <Info size={14} className="shrink-0 mt-0.5" />
                <span>
                  이 날짜에 이미 기록이 있어요. 저장하면 <b>기존 값을 덮어씁니다</b>. 더하려면 아래
                  금액을 직접 합산해 입력하세요.
                </span>
              </div>
            )}

            <div>
              <div className="text-xs font-semibold text-ink-faint mb-2 uppercase tracking-wide">
                이 날짜까지 누적
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-canvas dark:bg-elevated border border-line/[0.06]">
                  <div className="text-[10px] text-ink-faint mb-1 leading-tight">
                    누적금액 <span className="opacity-70">(부채 제외)</span>
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-ink tabular break-all">
                    {formatMoney(cumulative.totalAssets, currency)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-canvas dark:bg-elevated border border-line/[0.06]">
                  <div className="text-[10px] text-ink-faint mb-1 leading-tight">부채</div>
                  <div
                    className={cn(
                      'text-xs sm:text-sm font-semibold tabular break-all',
                      cumulative.liabilities > 0 ? 'text-negative' : 'text-ink-faint',
                    )}
                  >
                    {formatMoney(cumulative.liabilities, currency)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20">
                  <div className="text-[10px] text-ink-faint mb-1 leading-tight">총 누적금액</div>
                  <div
                    className={cn(
                      'text-xs sm:text-sm font-semibold tabular break-all',
                      cumulative.netWorth >= 0 ? 'text-accent' : 'text-negative',
                    )}
                  >
                    {formatMoney(cumulative.netWorth, currency)}
                  </div>
                </div>
              </div>

              {/* 투자금이 누적에 어떻게 들어가는지 분해해서 보여준다.
                  원금은 현금 → 투자자산 이동이라 누적금액을 늘리지 않고, 손익만 반영된다 */}
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-ink-faint tabular">
                <span>
                  투자 원금{' '}
                  <span className="font-semibold text-ink-soft">
                    {formatMoney(cumulative.investedPrincipal, currency)}
                  </span>
                </span>
                <span className="text-line/40">·</span>
                <span>
                  평가액{' '}
                  <span className="font-semibold text-accent">
                    {formatMoney(cumulative.investmentValue, currency)}
                  </span>
                </span>
                <span className="text-line/40">·</span>
                <span>
                  손익{' '}
                  <span
                    className={cn(
                      'font-semibold',
                      cumulative.investmentGain >= 0 ? 'text-positive' : 'text-negative',
                    )}
                  >
                    {cumulative.investmentGain > 0 ? '+' : ''}
                    {formatMoney(cumulative.investmentGain, currency)}
                  </span>
                </span>
                <span className="text-line/40">·</span>
                <span>
                  현금저축{' '}
                  <span className="font-semibold text-ink-soft">
                    {formatMoney(cumulative.cashSaving, currency)}
                  </span>
                </span>
              </div>
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
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-line/[0.08] text-sm tabular">
                      <span className="text-ink-faint text-xs">누계 순자산</span>
                      <span className={cn('font-semibold', (cumulativeByDate.get(r.date) ?? 0) >= 0 ? 'text-ink' : 'text-negative')}>
                        {formatMoney(cumulativeByDate.get(r.date) ?? 0, currency)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 데스크톱: 테이블 */}
            <div className="hidden sm:block overflow-x-auto -mx-2">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="text-ink-faint text-left border-b border-line/10">
                    <th className="font-medium py-2 px-2">날짜</th>
                    <th className="font-medium py-2 px-2 text-right">수입</th>
                    <th className="font-medium py-2 px-2 text-right">지출</th>
                    <th className="font-medium py-2 px-2 text-right">투자+저축</th>
                    <th className="font-medium py-2 px-2 text-right">수익률</th>
                    <th className="font-medium py-2 px-2 text-right">저축률</th>
                    <th className="font-medium py-2 px-2 text-right">누계</th>
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
                        <td className={cn('py-2.5 px-2 text-right tabular font-semibold', (cumulativeByDate.get(r.date) ?? 0) >= 0 ? 'text-ink' : 'text-negative')}>
                          {formatMoney(cumulativeByDate.get(r.date) ?? 0, currency)}
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
