export default function EventTable({
  title,
  columns,
  rows,
  renderRow,
  emptyText = "데이터가 없습니다.",
  className = "",
  tableClassName = "table",
}) {
  const colSpan = columns?.length || 1;

  return (
    <div className={`card ${className}`}>
      {title ? <div className="card-title">{title}</div> : null}

      <table className={tableClassName}>
        {columns?.some((c) => c.width) ? (
          <colgroup>
            {columns.map((c, idx) => (
              <col key={idx} style={c.width ? { width: c.width } : undefined} />
            ))}
          </colgroup>
        ) : null}

        <thead>
          <tr>
            {columns.map((c, idx) => (
              <th
                key={idx}
                className={c.thClassName}
                style={c.thStyle}
                scope="col"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows?.length ? (
            rows.map((row) => renderRow(row))
          ) : (
            <tr>
              <td
                colSpan={colSpan}
                className="muted"
                style={{ padding: 14 }}
              >
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
