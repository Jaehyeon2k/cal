// src/api/timetablesApi.js
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE || "http://localhost:4000",
});

// 단건 조회(유저+term)
export async function fetchTimetable({ ownerUid, term }) {
  const res = await api.get("/timetables", { params: { ownerUid, term } });
  const list = Array.isArray(res.data) ? res.data : [];
  return list[0] || null;
}

// 업서트(유저+term 기준 1개 유지)
export async function upsertTimetable({ ownerUid, ownerEmail, term, name, subjects }) {
  // 1) 기존 있는지 조회
  const existing = await fetchTimetable({ ownerUid, term });

  if (existing?.id != null) {
    // 2) 있으면 PATCH 업데이트
    const res = await api.patch(`/timetables/${existing.id}`, {
      ownerUid,
      ownerEmail: ownerEmail || "",
      term,
      name: name || "시간표 없음",
      subjects: Array.isArray(subjects) ? subjects : [],
      updatedAt: new Date().toISOString(),
    });
    return res.data;
  }

  // 3) 없으면 POST 생성
  const res = await api.post("/timetables", {
    ownerUid,
    ownerEmail: ownerEmail || "",
    term,
    name: name || "시간표 없음",
    subjects: Array.isArray(subjects) ? subjects : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return res.data;
}
