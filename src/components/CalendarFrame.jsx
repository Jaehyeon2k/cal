import React from "react";

export default function CalendarFrame({
  title,
  subtitle,
  topRight,
  calendarTitle,
  children, 
  bottom,
  className = "",
}) {
  return (
    <div className={`page-wide ${className}`}>
      <div className="page-head">
        <div>
          <h2 className="page-title-lg">{title}</h2>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>

        {topRight ? <div className="page-actions">{topRight}</div> : null}
      </div>

      <div className="manage-panel">
        {calendarTitle ? (
          <div className="manage-panel-title">{calendarTitle}</div>
        ) : null}
        {children}
      </div>

      {bottom ? (
        <>
          <div className="section-divider" />
          {bottom}
        </>
      ) : null}
    </div>
  );
}
