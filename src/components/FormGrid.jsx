export default function FormGrid({
  titleLabel = "제목",
  titlePlaceholder = "예) 팀플 발표, 과제 마감",
  titleValue,
  onTitleChange,

  startLabel = "시작",
  startValue,
  onStartChange,

  endLabel = "끝",
  endOptionalLabel = "",
  endValue,
  onEndChange,

  primaryText,
  showCancel = false,
  cancelText = "취소",
  onCancel,

  onSubmit,
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="dept-form-grid">
        <div className="field">
          <label>{titleLabel}</label>
          <input
            className="input"
            placeholder={titlePlaceholder}
            value={titleValue}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </div>

        <div className="field">
          <label>{startLabel}</label>
          <input
            className="input"
            type="date"
            value={startValue}
            onChange={(e) => onStartChange(e.target.value)}
          />
        </div>

        <div className="field">
          <label>
            {endLabel}{" "}
            {endOptionalLabel ? <span className="muted">{endOptionalLabel}</span> : null}
          </label>
          <input
            className="input"
            type="date"
            value={endValue}
            onChange={(e) => onEndChange(e.target.value)}
          />
        </div>

        <div className="dept-form-actions">
          <span />

          <button className="btn btn-primary" type="submit">
            {primaryText}
          </button>

          {showCancel && (
            <button className="btn" type="button" onClick={onCancel}>
              {cancelText}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
