const KEY_LIST = "admin_notifications_v1";
const KEY_LAST_ID = "admin_last_seen_interview_id";
const MAX_ITEMS = 200;

function safeJsonParse(s, fallback) {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

export function getLastSeenInterviewId() {
  const v = Number(localStorage.getItem(KEY_LAST_ID) || 0);
  return Number.isFinite(v) ? v : 0;
}

export function setLastSeenInterviewId(id) {
  const n = Number(id || 0);
  if (!Number.isFinite(n) || n <= 0) return;
  localStorage.setItem(KEY_LAST_ID, String(n));
}

export function loadNotifications() {
  const raw = localStorage.getItem(KEY_LIST) || "[]";
  const arr = safeJsonParse(raw, []);
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((x) => x && typeof x === "object" && x.id)
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
}

export function saveNotifications(list) {
  const arr = Array.isArray(list) ? list : [];
  localStorage.setItem(KEY_LIST, JSON.stringify(arr.slice(0, MAX_ITEMS)));
}

export function addNotification(n) {
  if (!n || typeof n !== "object" || !n.id) return loadNotifications();
  const list = loadNotifications();
  const exists = list.some((x) => x && x.id === n.id);
  const next = exists ? list : [n, ...list];
  saveNotifications(next);
  return next;
}

export function markNotificationRead(id) {
  const list = loadNotifications();
  const next = list.map((x) => {
    if (!x || x.id !== id) return x;
    if (x.readAt) return x;
    return { ...x, readAt: Date.now() };
  });
  saveNotifications(next);
  return next;
}

export function markAllNotificationsRead() {
  const now = Date.now();
  const list = loadNotifications();
  const next = list.map((x) => (x && !x.readAt ? { ...x, readAt: now } : x));
  saveNotifications(next);
  return next;
}

export function unreadCount(list = null) {
  const arr = list || loadNotifications();
  return arr.reduce((acc, x) => acc + (x && !x.readAt ? 1 : 0), 0);
}

export function makeInterviewsNotification({ newCount, latestId }) {
  const n = Number(newCount || 0);
  const lid = Number(latestId || 0);
  const now = Date.now();
  return {
    id: `interviews:new:${lid}:${now}`,
    type: "interviews:new",
    title: `新增面试人员 ${n} 条`,
    body: "点击查看面试人员列表。",
    href: "/admin/applicants",
    createdAt: now,
    readAt: null,
    meta: { newCount: n, latestId: lid }
  };
}

