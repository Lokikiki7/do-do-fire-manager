/**
 * 일별 수입/지출 관리 — 달력 우선, 모달 입력.
 * 모바일 최적화:
 *  - 기록 내역: 데스크톱은 테이블, 모바일은 세로 카드(가로 스크롤 제거)
 *  - 액션 버튼: 터치 기기에서 항상 노출 + 44px 터치 타깃
 *  - "오늘 기록하기" 원탭 버튼
 * 버그 수정: 복제 버튼이 값을 복사하지 않던 문제 → 원본 값을 프리필
 */
import { useState, type ReactNode } from 'react';
import { Trash2, Wallet, Pencil, Copy, Plus, ChevronDown, Info } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Card, SectionTitle, Button, Field, Input, EmptyState, cn, Modal } from '@/components/ui';
import { BudgetCalendar } from '@/components/budget/BudgetCalendar';
import { BudgetBarChart } from '@/components/charts';
import { savingRate, buildAssetSeries, cumulativeUpTo, totalExpenseOf } from '@/utils/finance';
import { parseAmount } from '@/utils/validate';
import { formatMoney, formatPercent, todayISO, uid } from '@/utils/format';
import type { DailyRecord } from '@/types';

// 저축은 폼에 두지 않는다 — 순저축 − 투자금으로 항상 파생되는 값이라
// 입력값으로 들고 있으면 둘이 어긋날 여지가 생긴다.
const EMPTY = { income: '', expense: '', debt: '', investment: '', investmentReturnRate: '' };
type FormState = Record<keyof typeof EMPTY, string>;
/** 순저축을 바꾸는 필드 — 이 값이 바뀌면 투자금이 비율을 유지한 채 따라 조정된다 */
type CashFlowField = 'income' | 'expense' | 'debt';
const PAGE_SIZE = 20;

function formatDateKor(date: string): string {
  const [y, m, d] = date.split('-');
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

function toForm(r: DailyRecord): FormState {
  return {
    income: String(r.income || ''),
    // 고정/변동으로 나눠 저장된 과거 기록은 합쳐서 하나의 지출로 보여준다
    expense: String(totalExpenseOf(r) || ''),
    debt: String(r.debt || ''),
    investment: String(r.investment || ''),
    investmentReturnRate: String(r.investmentReturnRate || ''),
  };
}

/** 폼 입력값 기준 순저축 (수입 − 지출 − 부채상환) */
function formNetSaving(f: FormState): number {
  return parseAmount(f.income) - parseAmount(f.expense) - parseAmount(f.debt);
}

type BoxTone = 'default' | 'negative' | 'positive' | 'accent';
const BOX_TONE: Record<BoxTone, string> = {
  default: 'text-ink',
  negative: 'text-negative',
  positive: 'text-positive',
  accent: 'text-accent',
};

/** 누적 섹션의 지표 박스 — 라벨 + 금액 한 칸 */
function StatBox({
  label,
  value,
  tone = 'default',
  surface = false,
  highlight = false,
}: {
  label: ReactNode;
  value: string;
  tone?: BoxTone;
  /** 색이 깔린 묶음 안에 놓일 때 (카드 배경을 surface로) */
  surface?: boolean;
  /** 그 묶음의 결론값 강조 */
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'p-2.5 rounded-lg border',
        highlight
          ? 'bg-accent/10 border-accent/20'
          : surface
            ? 'bg-surface border-line/[0.06]'
            : 'bg-canvas dark:bg-elevated border-line/[0.06]',
      )}
    >
      <div className="text-[10px] text-ink-faint mb-1 leading-tight">{label}</div>
      <div className={cn('text-xs sm:text-sm font-semibold tabular break-all', BOX_TONE[tone])}>
        {value}
      </div>
    </div>
  );
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
  const expense = parseAmount(form.expense);
  const debtPayment = parseAmount(form.debt);
  const investment = parseAmount(form.investment);

  // 지출이 수입보다 크면 음수 그대로 둔다 (0으로 자르면 배분 합이 어긋난다)
  const netSaving = formNetSaving(form);
  // 저축은 순저축에서 투자금을 뺀 나머지. 입력값이 아니라 파생값이라 어긋날 수 없다.
  const derivedSaving = netSaving - investment;

  /** 지금 모달에 입력된 값으로 만든, 아직 저장되지 않은 기록 (id는 저장 시점에 확정) */
  const draftRecord: DailyRecord = {
    id: existing?.id ?? '',
    date: modalDate ?? todayISO(),
    income,
    expense,
    // 통합 지출로 저장하므로 과거 방식 필드는 비운다 (총지출은 셋의 합)
    fixedExpense: 0,
    variableExpense: 0,
    debt: debtPayment,
    investment,
    saving: derivedSaving,
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

  // 부채가 없으면 부채·소계 카드를, 투자 기록이 없으면 투자 카드 묶음을 숨긴다
  const hasDebt = cumulative.totalDebtPayment > 0;
  const hasInvestment = cumulative.investedPrincipal !== 0;

  const submit = () => {
    if (!modalDate) return;
    upsertRecord({ ...draftRecord, id: existing?.id || uid(), date: modalDate });
    closeModal();
  };

  const setField = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  /**
   * 수입·지출·부채상환이 바뀌면 순저축이 달라지므로,
   * 투자금과 저축의 비율을 유지한 채 투자금을 다시 맞춘다.
   * (지출을 늘렸는데 투자금만 그대로 남아 저축이 음수로 빠지는 걸 막는다)
   * 순저축이 0 이하가 되면 나눌 몫이 없으므로 투자금은 0이 된다.
   */
  const setCashFlowField =
    (k: CashFlowField) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => {
        const next = { ...f, [k]: e.target.value };
        const before = formNetSaving(f);
        const after = formNetSaving(next);
        if (before > 0 && after !== before) {
          const scaled = Math.max(0, Math.round((parseAmount(f.investment) * after) / before));
          next.investment = scaled === 0 ? '' : String(scaled);
        }
        return next;
      });

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
      지출: totalExpenseOf(r),
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
            {/* ── 입력 섹션 ── 이 날짜에 실제로 일어난 거래만 적는다 */}
            <section>
              <div className="flex items-baseline justify-between mb-3">
                <h4 className="text-sm font-semibold text-ink">{formatDateKor(modalDate)} 기록 입력</h4>
                <span className="text-[10px] text-ink-faint">이 날짜의 거래만</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="수입">
                  <Input type="number" inputMode="numeric" placeholder="0" value={form.income} onChange={setCashFlowField('income')} autoFocus />
                </Field>
                <Field label="지출">
                  <Input type="number" inputMode="numeric" placeholder="0" value={form.expense} onChange={setCashFlowField('expense')} />
                </Field>
                <Field label="부채상환" hint="선택">
                  <Input type="number" inputMode="numeric" placeholder="0" value={form.debt} onChange={setCashFlowField('debt')} />
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

              <div className="mt-3 p-3 rounded-xl bg-canvas dark:bg-elevated border border-line/[0.06]">
                <div className="text-xs font-semibold text-ink-faint mb-3 uppercase tracking-wide">투자 배분</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Field label="투자금">
                    <Input type="number" inputMode="numeric" placeholder="0" value={form.investment} onChange={setField('investment')} />
                  </Field>
                  <Field label="수익률 (%)">
                    <Input type="number" inputMode="decimal" placeholder="0" value={form.investmentReturnRate} onChange={setField('investmentReturnRate')} step="0.1" min="0" max="100" />
                  </Field>
                  <Field label="저축" hint="자동">
                    <div
                      className={cn(
                        'flex items-center justify-center h-11 rounded-xl bg-surface border border-line/[0.08] text-xs font-semibold tabular',
                        derivedSaving >= 0 ? 'text-ink' : 'text-negative',
                      )}
                    >
                      {formatMoney(derivedSaving, currency)}
                    </div>
                  </Field>
                </div>
                <div className="mt-2 text-[10px] text-ink-faint leading-relaxed">
                  저축 = 순저축 − 투자금. 지출을 고치면 투자금과 저축이 비율을 유지한 채 함께 조정됩니다.
                  {derivedSaving < 0 && ' 저축이 음수면 기존 현금을 헐어 투자한 것으로 봅니다.'}
                </div>
              </div>

              {existing && (
                <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-gold/10 text-gold text-xs leading-relaxed">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <span>
                    이 날짜에 이미 기록이 있어요. 저장하면 <b>기존 값을 덮어씁니다</b>. 더하려면 위
                    금액을 직접 합산해 입력하세요.
                  </span>
                </div>
              )}
            </section>

            {/* ── 누적 섹션 ── 과거 기록을 전부 합친 결과. 입력값이 즉시 반영된다.
                현금 기준(상단)과 투자(하단)를 분리해 보여준다 */}
            <section className="pt-4 border-t border-line/10">
              <div className="flex items-baseline justify-between mb-3">
                <h4 className="text-sm font-semibold text-ink">{formatDateKor(modalDate)} 기준 누적</h4>
                <span className="text-[10px] text-ink-faint">
                  {cumulative.recordCount > 0 ? `과거 기록 ${cumulative.recordCount}건 포함` : '기록 없음'}
                </span>
              </div>

              {/* 현금 기준 */}
              <div className="rounded-xl border border-line/[0.08] p-2.5">
                <div className="text-[10px] font-semibold text-ink-faint mb-2 uppercase tracking-wide">현금 기준</div>
                <div className={cn('grid gap-2', hasDebt ? 'grid-cols-3' : 'grid-cols-1')}>
                  <StatBox
                    label={<>누적금액 <span className="opacity-70">(투자금·부채 제외)</span></>}
                    value={formatMoney(cumulative.cash, currency)}
                  />
                  {hasDebt && (
                    <>
                      <StatBox label="부채" value={formatMoney(cumulative.totalDebtPayment, currency)} tone="negative" />
                      <StatBox
                        label="소계"
                        value={formatMoney(cumulative.subtotal, currency)}
                        tone={cumulative.subtotal >= 0 ? 'default' : 'negative'}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* 투자 — 두 줄로 나눠 표시 */}
              {hasInvestment && (
                <div className="mt-2 rounded-xl border border-positive/20 bg-positive/[0.04] p-2.5 space-y-2">
                  <div className="text-[10px] font-semibold text-positive/80 uppercase tracking-wide">투자</div>

                  <div className="grid grid-cols-3 gap-2">
                    <StatBox label="누적투자금" value={formatMoney(cumulative.investedPrincipal, currency)} surface />
                    <StatBox
                      label="누적투자수익"
                      value={`${cumulative.investmentGain > 0 ? '+' : ''}${formatMoney(cumulative.investmentGain, currency)}`}
                      tone={cumulative.investmentGain >= 0 ? 'positive' : 'negative'}
                      surface
                    />
                    <StatBox
                      label="투자자산 총평가액"
                      value={formatMoney(cumulative.investmentValue, currency)}
                      tone="accent"
                      surface
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <StatBox
                      label="실제 통장잔액"
                      value={formatMoney(cumulative.bankBalance, currency)}
                      tone={cumulative.bankBalance >= 0 ? 'default' : 'negative'}
                      surface
                    />
                    <StatBox
                      label="이달투자수익"
                      value={`${cumulative.monthlyGain > 0 ? '+' : ''}${formatMoney(cumulative.monthlyGain, currency)}`}
                      tone={cumulative.monthlyGain >= 0 ? 'positive' : 'negative'}
                      surface
                    />
                    <StatBox
                      label="총순자산"
                      value={formatMoney(cumulative.totalAssets, currency)}
                      tone={cumulative.totalAssets >= 0 ? 'accent' : 'negative'}
                      highlight
                    />
                  </div>
                </div>
              )}

              {/* 숫자가 어디서 나왔는지 항목별로 그대로 적어둔다 (검산 가능하도록) */}
              <div className="mt-2 space-y-1 text-[10px] text-ink-faint tabular leading-relaxed">
                <div>
                  누적금액 = 초기자산{' '}
                  <span className="font-semibold text-ink-soft">{formatMoney(data.settings.initialAsset, currency)}</span>
                  {' + 수입 '}
                  <span className="font-semibold text-positive">{formatMoney(cumulative.totalIncome, currency)}</span>
                  {' − 지출 '}
                  <span className="font-semibold text-negative">{formatMoney(cumulative.totalExpense, currency)}</span>
                  {' − 부채상환 '}
                  <span className="font-semibold text-negative">{formatMoney(cumulative.totalDebtPayment, currency)}</span>
                </div>
                {hasInvestment && (
                  <>
                    <div>
                      실제 통장잔액 = 누적금액 − 누적투자금{' '}
                      <span className="font-semibold text-ink-soft">{formatMoney(cumulative.investedPrincipal, currency)}</span>
                      {' · 총순자산 = 통장잔액 + 투자자산 총평가액'}
                    </div>
                    <div>
                      수익률은 누적투자금 전체에 붙습니다 · 원금 대비 수익률{' '}
                      <span className="font-semibold text-ink-soft">{formatPercent(cumulative.averageReturnRate)}</span>
                    </div>
                  </>
                )}
              </div>
            </section>

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
                const expense = totalExpenseOf(r);
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
                    const expense = totalExpenseOf(r);
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
