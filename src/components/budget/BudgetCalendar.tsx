import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, SectionTitle, Button, cn } from '@/components/ui';
import { formatMoney, formatPercent } from '@/utils/format';
import type { DailyRecord, Currency } from '@/types';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

interface BudgetCalendarProps {
  date: string;
  onDateChange: (date: string) => void;
  records: DailyRecord[];
  currency: Currency;
}

export function BudgetCalendar({
  date,
  onDateChange,
  records,
  currency,
}: BudgetCalendarProps) {
  // 달력 월 네비게이션을 위한 내부 상태 (날짜 선택과 독립적)
  const initialDate = date.split('-');
  const [displayYear, setDisplayYear] = useState(Number(initialDate[0]));
  const [displayMonth, setDisplayMonth] = useState(Number(initialDate[1]));

  const year = displayYear;
  const monthNum = displayMonth;

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, monthNum - 1, 1).getDay();
    const daysInMonth = new Date(year, monthNum, 0).getDate();

    return Array.from({ length: 42 }, (_, i) => {
      const day = i - firstDay + 1;
      return day > 0 && day <= daysInMonth ? day : null;
    });
  }, [year, monthNum]);

  const prevMonth = () => {
    const d = new Date(year, monthNum - 2, 1);
    setDisplayYear(d.getFullYear());
    setDisplayMonth(d.getMonth() + 1);
  };

  const nextMonth = () => {
    const d = new Date(year, monthNum, 1);
    setDisplayYear(d.getFullYear());
    setDisplayMonth(d.getMonth() + 1);
  };

  const today = new Date();
  const isCurrentMonth =
    year === today.getFullYear() && monthNum === today.getMonth() + 1;
  const todayDate = today.getDate();

  const getDayString = (day: number): string => {
    return `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getRecord = (day: number): DailyRecord | undefined => {
    return records.find((r) => r.date === getDayString(day));
  };

  const handleCellClick = (day: number) => {
    onDateChange(getDayString(day));
  };

  return (
    <Card>
      <SectionTitle>일별 달력</SectionTitle>

      <div className="flex items-center justify-between mb-6">
        <Button size="sm" variant="ghost" onClick={prevMonth}>
          <ChevronLeft size={16} />
        </Button>
        <span className="font-semibold text-lg text-ink">
          {year}년 {String(monthNum).padStart(2, '0')}월
        </span>
        <Button size="sm" variant="ghost" onClick={nextMonth}>
          <ChevronRight size={16} />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold text-ink-faint py-2"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          const dayString = day ? getDayString(day) : '';
          const record = day ? getRecord(day) : undefined;
          const isSelected = dayString === date;
          const isToday = isCurrentMonth && day === todayDate;

          return (
            <button
              key={idx}
              onClick={() => day && handleCellClick(day)}
              disabled={day === null}
              className={cn(
                'min-h-24 p-2 rounded-lg text-xs transition-all text-left',
                day === null
                  ? 'bg-canvas/30 opacity-40 cursor-default'
                  : 'bg-surface border border-line/[0.08] hover:border-line/20 hover:bg-surface-secondary cursor-pointer',
                isSelected ? 'ring-2 ring-accent border-accent' : '',
                isToday && !isSelected ? 'ring-2 ring-positive/50' : ''
              )}
            >
              {day && (
                <>
                  <div className={cn(
                    'font-semibold mb-1',
                    isToday ? 'text-positive' : 'text-ink'
                  )}>
                    {day}
                  </div>
                  {record ? (
                    <div className="space-y-0.5 text-xs">
                      {record.income > 0 && (
                        <div className="text-positive font-semibold">
                          +{formatMoney(record.income, currency)}
                        </div>
                      )}
                      {record.fixedExpense + record.variableExpense > 0 && (
                        <div className="text-negative">
                          -{formatMoney(
                            record.fixedExpense + record.variableExpense,
                            currency
                          )}
                        </div>
                      )}
                      {record.investment > 0 && (
                        <div className="text-accent font-medium">
                          💰 {formatMoney(record.investment, currency)}
                        </div>
                      )}
                      {record.investmentReturnRate ? (
                        <div className="text-gold font-semibold">
                          {formatPercent(record.investmentReturnRate)}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-ink-faint text-xs">기록 없음</div>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-line/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-positive font-semibold">●</span>
          <span className="text-ink-soft">수입</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-negative font-semibold">●</span>
          <span className="text-ink-soft">지출</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-accent font-semibold">●</span>
          <span className="text-ink-soft">투자</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gold font-semibold">●</span>
          <span className="text-ink-soft">수익률</span>
        </div>
      </div>
    </Card>
  );
}
