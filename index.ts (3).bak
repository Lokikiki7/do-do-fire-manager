/**
 * 수입/지출 달력.
 * - 데스크톱(sm↑): 셀 안에 금액 상세 표시
 * - 모바일: 컴팩트 셀(날짜 + 색상 점 + 축약 순액) → 가로 스크롤 없이 한 화면에
 * - 셀은 최소 44px 터치 타깃, "오늘" 버튼으로 즉시 복귀
 */
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, SectionTitle, Button, cn } from '@/components/ui';
import { formatMoney, formatShort, todayISO } from '@/utils/format';
import type { DailyRecord, Currency } from '@/types';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

interface BudgetCalendarProps {
  date: string;
  onDateChange: (date: string) => void;
  records: DailyRecord[];
  currency: Currency;
}

export function BudgetCalendar({ date, onDateChange, records, currency }: BudgetCalendarProps) {
  const initialDate = date.split('-');
  const [displayYear, setDisplayYear] = useState(Number(initialDate[0]));
  const [displayMonth, setDisplayMonth] = useState(Number(initialDate[1]));

  const year = displayYear;
  const monthNum = displayMonth;

  // date → record 매핑 (렌더마다 find로 O(n²) 탐색하던 것을 O(n)으로)
  const recordMap = useMemo(() => {
    const map = new Map<string, DailyRecord>();
    for (const r of records) map.set(r.date, r);
    return map;
  }, [records]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, monthNum - 1, 1).getDay();
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    // 42칸 고정 대신 필요한 주 수만큼만 → 모바일 세로 공간 절약
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    return Array.from({ length: totalCells }, (_, i) => {
      const day = i - firstDay + 1;
      return day > 0 && day <= daysInMonth ? day : null;
    });
  }, [year, monthNum]);

  const move = (delta: number) => {
    const d = new Date(year, monthNum - 1 + delta, 1);
    setDisplayYear(d.getFullYear());
    setDisplayMonth(d.getMonth() + 1);
  };

  const goToday = () => {
    const [y, m] = todayISO().split('-').map(Number);
    setDisplayYear(y);
    setDisplayMonth(m);
  };

  const todayStr = todayISO();
  const getDayString = (day: number) =>
    `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return (
    <Card>
      <SectionTitle
        right={
          <Button size="sm" variant="ghost" onClick={goToday}>
            오늘
          </Button>
        }
      >
        일별 달력
      </SectionTitle>

      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <Button size="sm" variant="ghost" onClick={() => move(-1)} aria-label="이전 달" className="min-w-[44px] min-h-[40px]">
          <ChevronLeft size={18} />
        </Button>
        <span className="font-semibold text-base sm:text-lg text-ink tabular">
          {year}년 {String(monthNum).padStart(2, '0')}월
        </span>
        <Button size="sm" variant="ghost" onClick={() => move(1)} aria-label="다음 달" className="min-w-[44px] min-h-[40px]">
          <ChevronRight size={18} />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1 sm:mb-2">
        {DAYS.map((day, i) => (
          <div
            key={day}
            className={cn(
              'text-center text-[11px] sm:text-xs font-semibold py-1.5 sm:py-2',
              i === 0 ? 'text-negative/70' : i === 6 ? 'text-accent/70' : 'text-ink-faint',
            )}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {calendarDays.map((day, idx) => {
          const dayString = day ? getDayString(day) : '';
          const record = day ? recordMap.get(dayString) : undefined;
          const isToday = dayString === todayStr;
          const expense = record ? record.fixedExpense + record.variableExpense : 0;
          const net = record ? record.income - expense : 0;

          return (
            <button
              key={idx}
              onClick={() => day && onDateChange(dayString)}
              disabled={day === null}
              aria-label={day ? `${monthNum}월 ${day}일${record ? ' 기록 있음' : ''}` : undefined}
              className={cn(
                'rounded-lg text-left transition-all touch-manipulation',
                'min-h-[52px] p-1 sm:min-h-24 sm:p-2',
                day === null
                  ? 'bg-canvas/30 opacity-40 cursor-default'
                  : 'bg-surface border border-line/[0.08] hover:border-line/20 hover:bg-surface-secondary active:scale-[0.97] cursor-pointer',
                isToday ? 'ring-2 ring-accent border-accent' : '',
              )}
            >
              {day && (
                <>
                  <div
                    className={cn(
                      'text-[11px] sm:text-xs font-semibold mb-0.5 sm:mb-1 px-0.5',
                      isToday ? 'text-accent' : 'text-ink',
                    )}
                  >
                    {day}
                  </div>

                  {/* 모바일: 색상 점 + 축약 순액 */}
                  {record && (
                    <div className="sm:hidden px-0.5">
                      <div className="flex gap-0.5 mb-0.5">
                        {record.income > 0 && <span className="w-1.5 h-1.5 rounded-full bg-positive" />}
                        {expense > 0 && <span className="w-1.5 h-1.5 rounded-full bg-negative" />}
                        {record.investment > 0 && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                        {record.investmentReturnRate ? <span className="w-1.5 h-1.5 rounded-full bg-gold" /> : null}
                      </div>
                      {net !== 0 && (
                        <div className={cn('text-[9px] font-semibold tabular leading-tight', net > 0 ? 'text-positive' : 'text-negative')}>
                          {net > 0 ? '+' : ''}{formatShort(net, currency)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 데스크톱: 금액 상세 */}
                  <div className="hidden sm:block space-y-0.5 text-xs">
                    {record ? (
                      <>
                        {record.income > 0 && (
                          <div className="text-positive font-semibold truncate">+{formatMoney(record.income, currency)}</div>
                        )}
                        {expense > 0 && (
                          <div className="text-negative truncate">-{formatMoney(expense, currency)}</div>
                        )}
                        {record.investment > 0 && (
                          <div className="text-accent font-medium truncate">💰 {formatShort(record.investment, currency)}</div>
                        )}
                      </>
                    ) : (
                      <div className="text-ink-faint/60">기록 없음</div>
                    )}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-line/10 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {(
          [
            ['bg-positive', '수입'],
            ['bg-negative', '지출'],
            ['bg-accent', '투자'],
            ['bg-gold', '수익률'],
          ] as const
        ).map(([colorClass, label]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full', colorClass)} />
            <span className="text-ink-soft">{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
