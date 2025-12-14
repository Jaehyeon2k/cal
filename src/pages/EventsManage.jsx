import React, { useEffect, useMemo, useState, useCallback } from "react";

import { useAuth } from "../auth/AuthContext";
import CalendarFrame from "../components/CalendarFrame";
import MonthCalendar from "../components/MonthCalendar";

import {
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../api/eventsApi";

import ScheduleFormCard from "../components/ScheduleFormCard";
import MyEventsTable from "../components/MyEventsTable";
import MemoModal from "../components/MemoModal";

function toDateInputValue(d) {
  if (!d) return "";
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const COLOR_OPTIONS = [
  { key: "red",   label: "중요", bg: "#ef4444", border: "#dc2626", text: "#ffffff" },
  { key: "blue",  label: "보통", bg: "#3b82f6", border: "#2563eb", text: "#ffffff" },
  { key: "green", label: "낮음", bg: "#22c55e", border: "#16a34a", text: "#ffffff" },
];

function getColorStyle(key) {
  return COLOR_OPTIONS.find((x) => x.key === key) || COLOR_OPTIONS[1];
}

export default function EventsManage() {
  const { user } = useAuth();
  const email = user?.email || "";

  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const [editId, setEditId] = useState(null);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const [memoModal, setMemoModal] = useState(null);

  const loadMyEvents = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    setErrMsg("");

    try {
      const data = await fetchEvents();

      const onlyMine = (Array.isArray(data) ? data : []).filter(
        (ev) => ev.scope === "USER" && ev.ownerEmail === email
      );

      setMyEvents(onlyMine);
    } catch (e) {
      setErrMsg("개인 일정 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    loadMyEvents();
  }, [loadMyEvents]);

  const resetForm = useCallback(() => {
    setEditId(null);
    setTitle("");
    setStart("");
    setEnd("");
  }, []);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!email) return;

      const payload = {
        title: String(title || "").trim(),
        start: start || "",
        end: end || "",
        allDay: true,
        scope: "USER",
        ownerEmail: email,
      };

      if (!payload.title || !payload.start) {
        setErrMsg("제목/시작일은 필수입니다.");
        return;
      }

      setLoading(true);
      setErrMsg("");
      try {
        if (editId) {
          await updateEvent(editId, payload);
        } else {
          await createEvent(payload);
        }
        resetForm();
        await loadMyEvents();
      } catch (e2) {
        setErrMsg(editId ? "수정 실패" : "추가 실패");
      } finally {
        setLoading(false);
      }
    },
    [email, title, start, end, editId, resetForm, loadMyEvents]
  );

  const onEdit = useCallback((row) => {
    setEditId(row.id);
    setTitle(row.title || "");
    setStart(toDateInputValue(row.start));
    setEnd(toDateInputValue(row.end));
  }, []);

  const onDelete = useCallback(
    async (id) => {
      if (!id) return;
      setLoading(true);
      setErrMsg("");
      try {
        await deleteEvent(id);
        await loadMyEvents();
      } catch (e) {
        setErrMsg("삭제 실패");
      } finally {
        setLoading(false);
      }
    },
    [loadMyEvents]
  );

  const onOpenMemo = useCallback((row) => {
    setMemoModal({
      id: row.id,
      title: row.title,
      memo: row.memo || "",
      color: row.color || "blue",
    });
  }, []);

  const saveMemo = useCallback(async () => {
    if (!memoModal?.id) return;

    setLoading(true);
    setErrMsg("");
    try {
      await updateEvent(memoModal.id, {
        memo: memoModal.memo || "",
        color: memoModal.color || "blue",
      });
      setMemoModal(null);
      await loadMyEvents();
    } catch (e) {
      setErrMsg("메모 저장 실패");
    } finally {
      setLoading(false);
    }
  }, [memoModal, loadMyEvents]);

  const fcEvents = useMemo(() => {
    return (myEvents || []).map((ev) => {
      const c = getColorStyle(ev.color || "blue");
      return {
        id: ev.id,
        title: ev.title,
        start: ev.start,
        end: ev.end || undefined,
        allDay: true,
        backgroundColor: c.bg,
        borderColor: c.border,
        textColor: c.text,
        extendedProps: ev,
      };
    });
  }, [myEvents]);

  const onCalendarClick = useCallback(
    (info) => {
      const row = info?.event?.extendedProps;
      if (!row?.id) return;
      onOpenMemo(row);
    },
    [onOpenMemo]
  );

  const columns = useMemo(
    () => [
      { label: "제목" },
      { label: "중요도" },
      { label: "시작" },
      { label: "끝" },
      { label: "", align: "right" },
    ],
    []
  );

  return (
    <CalendarFrame
      title="내 일정 관리"
      bottom={
        <>
          {(loading || errMsg) && (
            <p className={`form-msg ${errMsg ? "error" : ""}`}>
              {loading ? "불러오는 중..." : errMsg}
            </p>
          )}

          <div className="manage-stack">
            <ScheduleFormCard
              editId={editId}
              title={title}
              setTitle={setTitle}
              start={start}
              setStart={setStart}
              end={end}
              setEnd={setEnd}
              onSubmit={onSubmit}
              onCancel={resetForm}
            />

            <MyEventsTable
              rows={myEvents}
              columns={columns}
              colorOptions={COLOR_OPTIONS}
              getColorStyle={getColorStyle}
              toDateInputValue={toDateInputValue}
              onEdit={onEdit}
              onDelete={onDelete}
              onOpenMemo={onOpenMemo}
            />
          </div>
        </>
      }
    >
      <MonthCalendar events={fcEvents} onEventClick={onCalendarClick} />

      <div className="manage-hint">
        💡 일정 바를 클릭하면 <b>메모</b>와 <b>중요도</b>(색상)을 설정할 수
        있어요.
      </div>

      <MemoModal
        modal={memoModal}
        colorOptions={COLOR_OPTIONS}
        onClose={() => setMemoModal(null)}
        onChange={(next) => setMemoModal(next)}
        onSave={saveMemo}
      />
    </CalendarFrame>
  );
}
