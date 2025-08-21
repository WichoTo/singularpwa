import React, { useState } from "react";
import { Temporal } from "@js-temporal/polyfill";
import "../../../styles/Calendar.css"; // Ajusta la ruta según tu proyecto

export interface Event {
  id: string;
  fecha: string; // formato YYYY-MM-DD
  // ...otros campos que quieras
}

interface CalendarProps {
  events?: Event[];
  renderDayModal: (date: Temporal.PlainDate, close: () => void) => React.ReactNode;
}

const Calendar: React.FC<CalendarProps> = ({ events = [], renderDayModal }) => {
  const [currentMonth, setCurrentMonth] = useState(Temporal.Now.plainDateISO());
  const [selectedDate, setSelectedDate] = useState<Temporal.PlainDate | null>(null);

  const openDayModal = (date: Temporal.PlainDate) => setSelectedDate(date);
  const closeModal = () => setSelectedDate(null);

  const isSameDate = (a: Temporal.PlainDate, b: Temporal.PlainDate) =>
    a.year === b.year && a.month === b.month && a.day === b.day;

  const renderDays = (): React.ReactNode => {
    const startDate = Temporal.PlainDate.from({
      year: currentMonth.year,
      month: currentMonth.month,
      day: 1,
    });
    const startDayOfWeek = startDate.dayOfWeek % 7; // Domingo = 0
    const days: React.ReactNode[] = [];
    let row: React.ReactNode[] = [];

    // Empieza la tabla llenando con los días "vacíos" del mes anterior
    let displayDate = startDate.subtract({ days: startDayOfWeek });

    for (let i = 0; i < 6 * 7; i++) {
      // ¡Esta es la captura correcta!
      const dateForCell = displayDate;

      const isCurrentMonth = dateForCell.month === currentMonth.month;
      const isToday = isSameDate(dateForCell, Temporal.Now.plainDateISO());
      const hasEvent = events.some(ev =>
        isSameDate(Temporal.PlainDate.from(ev.fecha), dateForCell)
      );

      row.push(
        <div
          key={dateForCell.toString()}
          className={`calendar-day
            ${isCurrentMonth ? "" : "calendar-day--muted"}
            ${isToday ? "calendar-day--today" : ""}
            ${hasEvent ? "calendar-day--event" : ""}`}
          onClick={() => {
            if (isCurrentMonth) {
              openDayModal(dateForCell);
            }
          }}
          tabIndex={isCurrentMonth ? 0 : -1}
          title={dateForCell.toString()}
        >
          <span>{dateForCell.day}</span>
          {hasEvent && <span className="event-marker"></span>}
        </div>
      );

      displayDate = displayDate.add({ days: 1 });

      if ((i + 1) % 7 === 0) {
        days.push(<div className="calendar-week" key={i}>{row}</div>);
        row = [];
      }
    }

    return <div className="calendar-days">{days}</div>;
  };

  return (
    <>
      <div className="calendar">
        <div className="calendar-header">
          <button onClick={() => setCurrentMonth(currentMonth.subtract({ months: 1 }))}>⬅️</button>
          <h2>
            {currentMonth.toLocaleString(undefined, { month: "long" })} {currentMonth.year}
          </h2>
          <button onClick={() => setCurrentMonth(currentMonth.add({ months: 1 }))}>➡️</button>
        </div>
        <div className="calendar-weekdays">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(day => (
            <div className="calendar-weekday" key={day}>{day}</div>
          ))}
        </div>
        {renderDays()}
      </div>

      {selectedDate && renderDayModal(selectedDate, closeModal)}
    </>
  );
};

export default Calendar;
