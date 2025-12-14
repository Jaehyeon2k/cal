import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";

export default function MonthCalendar({
  events,
  onEventClick,
  className = "fc-clean",
}) {
  return (
    <div className={className}>
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        locale="ko"
        height="auto"
        events={events}
        dayMaxEvents
        displayEventTime={false}
        fixedWeekCount={false}
        showNonCurrentDates
        headerToolbar={{
          left: "title",
          center: "",
          right: "today prev,next",
        }}
        buttonText={{ today: "today" }}
        eventClick={onEventClick}
      />
    </div>
  );
}
