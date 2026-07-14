/**
 * 월별 수입/지출 달력 뷰
 * - 각 셀에 해당 월의 수입/지출/투자/수익률 요약 표시
 * - 월 네비게이션으로 이전/다음 달 이동
 * - 오늘 날짜 강조
 */
import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, SectionTitle, Button, cn } from '@/components/ui';
import { formatMoney, formatPercent } from '@/utils/format';
import type { MonthlyRecord, Currency } from '@/types';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

interface BudgetCalendarProps {
  month: string; // YYYY-MM
  onMonthChange: (month: string) => void;
  records: MonthlyRecord[];
  currency: Currency;
}

export function BudgetCalendar({
  month,
  onMonthChange,
  records,
  currency,
}: BudgetCalendarProps) {
  const [year, monthNum] = [Number(month.split('-')[0]), Number(month.split('-')[1])];

  // 해당 월의 기록
  const record = records.find((r) => r.month === month);

  // 달력 그리드 생성
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, monthNum - 1, 1).getDay();
    const daysInMonth = new Date(year, monthNum, 0).getDate();

    return Array.from({ length: 42 }, (_, i) => {
      const day = i - firstDay + 1;
      return day > 0 && day <= daysInMonth ? day : null;
    });
  }, [year, monthNum]);

  // 이전/다음 달로 이동
  const prevMonth = () => {
    const d = new Date(year, monthNum - 2, 1);
    onMonthChange(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    );
  };

  const nextMonth = () => {
    const d = new Date(year, monthNum, 1);
    onMonthChange(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    );
  };

  // 오늘 날짜
  const today = new Date();
  const isCurrentMonth =
    year === today.getFullYear() && monthNum === today.getMonth() + 1;
  const todayDate = today.getDate();

  return (
    <Card>
      <SectionTitle>월별 달력</SectionTitle>

      {/* 월 네비게이션 */}
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

      {/* 요일 헤더 */}
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

      {/* 달력 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => (
          <div
            key={idx}
            className={cn(
              'min-h-24 p-2 rounded-lg text-xs transition-all',
              day === null
                ? 'bg-canvas/30 opacity-40'
                : 'bg-surface border border-line/[0.08] hover:border-line/20',
              isCurrentMonth && day === todayDate ? 'ring-2 ring-accent' : ''
            )}
          >
            {day && (
              <>
                <div className="font-semibold text-ink mb-1">{day}</div>
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
          </div>
        ))}
      </div>

      {/* 범례 */}
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
