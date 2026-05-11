import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { GlucoseRecord } from '../types';

interface CalendarProps {
  records: GlucoseRecord[];
  onDateClick?: (date: Date) => void;
}

export default function Calendar({ records, onDateClick }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart);

  const recordDates = new Set(
    records.map((r) => format(new Date(r.timestamp), 'yyyy-MM-dd'))
  );

  const dayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft size={16} />
        </button>
        <h4>{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</h4>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="calendar-grid">
        {dayLabels.map((label, i) => (
          <div key={`label-${i}`} className="day-label">
            {label}
          </div>
        ))}
        {Array.from({ length: startDay }, (_, i) => (
          <div key={`empty-${i}`} className="day other-month" />
        ))}
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const hasRecords = recordDates.has(dateStr);
          return (
            <div
              key={dateStr}
              className={`day ${isToday(day) ? 'today' : ''} ${hasRecords ? 'has-records' : ''} ${!isSameMonth(day, currentMonth) ? 'other-month' : ''}`}
              onClick={() => onDateClick?.(day)}
            >
              {format(day, 'd')}
            </div>
          );
        })}
      </div>
    </div>
  );
}
