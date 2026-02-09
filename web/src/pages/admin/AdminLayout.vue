<template>
  <div class="min-h-screen">
    <div class="absolute inset-0 grid-overlay pointer-events-none opacity-30"></div>
    <div class="relative mx-auto max-w-7xl px-4 py-8">
      <div class="flex items-center justify-between gap-3">
        <BrandHeader />
        <div class="flex items-center gap-3">
          <div class="relative" @click.stop>
            <button
              class="relative rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-mono text-white/70 hover:bg-white/10"
              @click="toggleMenu"
              :title="newCount ? `未读通知：${newCount}` : '通知'"
            >
              通知
              <span
                v-if="newCount"
                class="absolute -top-2 -right-2 min-w-[22px] rounded-full border border-cyan/30 bg-cyan/15 px-2 py-0.5 text-[10px] font-mono text-cyan text-center"
              >
                {{ newCount > 99 ? "99+" : newCount }}
              </span>
            </button>

            <div
              v-if="menuOpen"
              class="absolute right-0 mt-3 w-[420px] max-w-[90vw] rounded-2xl border border-white/10 bg-black/60 backdrop-blur p-3 shadow-xl"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="text-[11px] font-mono text-white/60">通知</div>
                <div class="flex items-center gap-2">
                  <button class="mini" @click="markAllRead" :disabled="!newCount">全部已读</button>
                  <button class="mini" @click="openNotificationsPage">查看全部</button>
                </div>
              </div>

              <div class="mt-3 max-h-[420px] overflow-auto rounded-xl border border-white/10 bg-black/25">
                <div
                  v-for="n in notifications.slice(0, 50)"
                  :key="n.id"
                  class="ntf"
                  :class="n.readAt ? 'ntf-read' : 'ntf-unread'"
                  @click="openNotification(n)"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="text-xs font-mono text-white/85 truncate">{{ n.title }}</div>
                      <div class="mt-1 text-[11px] font-mono text-white/55">{{ fmtTime(n.createdAt) }}</div>
                      <div v-if="n.body" class="mt-2 text-xs text-white/70">{{ n.body }}</div>
                    </div>
                    <div class="shrink-0 text-[11px] font-mono text-cyan/90">
                      {{ n.readAt ? "已读" : "未读" }}
                    </div>
                  </div>
                </div>
                <div v-if="!notifications.length" class="px-3 py-4 text-xs font-mono text-white/55">暂无通知。</div>
                <div v-if="notifications.length > 50" class="px-3 py-3 text-[11px] font-mono text-white/50">
                  仅展示最近 50 条，更多请点“查看全部”。
                </div>
              </div>
            </div>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-mono text-white/60">
            身份: <span class="text-white/80">{{ identityLabel }}</span>
          </div>
          <button
            class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-mono text-white/70 hover:bg-white/10"
            @click="logout"
          >
            退出登录
          </button>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
        <aside class="lg:col-span-3 xl:col-span-2 rounded-2xl border border-white/10 bg-black/25 p-4">
          <div class="text-[11px] font-mono text-white/55 px-2">导航</div>
          <nav class="mt-3 space-y-1">
            <RouterLink class="nav" to="/admin/home">首页</RouterLink>
            <RouterLink class="nav" to="/admin/users">用户管理</RouterLink>
            <RouterLink class="nav" to="/admin/applicants">面试人员</RouterLink>
            <RouterLink class="nav" to="/admin/questions">题库管理</RouterLink>
            <RouterLink class="nav" to="/admin/jobs">岗位管理</RouterLink>
            <RouterLink class="nav" to="/admin/posts">职位发布</RouterLink>
            <RouterLink class="nav" to="/admin/audit">操作记录</RouterLink>
          </nav>

          <div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
            <div class="text-[11px] font-mono text-white/55">权限</div>
            <div class="mt-1 text-xs font-mono" :class="isAdmin ? 'text-neon' : 'text-white/70'">
              {{ isAdmin ? "管理员" : "员工" }}
            </div>
          </div>
        </aside>

        <section class="lg:col-span-9 xl:col-span-10">
          <div class="rounded-2xl border border-white/10 bg-bg1/60 p-5">
            <RouterView />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import BrandHeader from "../../components/BrandHeader.vue";
import { http } from "../../api";
import {
  addNotification,
  getLastSeenInterviewId,
  loadNotifications,
  makeInterviewsNotification,
  markAllNotificationsRead,
  markNotificationRead,
  setLastSeenInterviewId,
  unreadCount
} from "../../notifications";

const router = useRouter();

const newCount = ref(0); // unread notifications count
const latestId = ref(0);
let timer = null;

const menuOpen = ref(false);
const notifications = ref([]);
let onWindowClick = null;

const profile = computed(() => {
  try {
    return JSON.parse(localStorage.getItem("employee_profile") || "{}") || {};
  } catch {
    return {};
  }
});

const isAdmin = computed(() => String(profile.value.role || "") === "admin");

const identityLabel = computed(() => {
  const p = profile.value || {};
  return `${p.name || p.username || "-"} (${p.role || "-"})`;
});

function reloadNotifications() {
  notifications.value = loadNotifications();
  newCount.value = unreadCount(notifications.value);
}

async function pollSummary() {
  try {
    const sinceId = getLastSeenInterviewId();
    const { data } = await http.get("/api/admin/interviews/summary", {
      params: { since_id: sinceId || 0 }
    });
    latestId.value = Number(data.latestId || 0);

    // First visit: don't show "new" badge for historical records.
    if (!sinceId && latestId.value) {
      setLastSeenInterviewId(latestId.value);
      reloadNotifications();
      return;
    }

    const n = Number(data.newCount || 0);
    if (n > 0 && latestId.value) {
      addNotification(makeInterviewsNotification({ newCount: n, latestId: latestId.value }));
      setLastSeenInterviewId(latestId.value);
      reloadNotifications();
    } else {
      reloadNotifications();
    }
  } catch {
    // ignore polling errors; UI should remain usable even if summary fails.
  }
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
  // opening shouldn't auto-mark read; user may have many notifications.
}

function markAllRead() {
  notifications.value = markAllNotificationsRead();
  newCount.value = unreadCount(notifications.value);
}

function openNotificationsPage() {
  menuOpen.value = false;
  router.push("/admin/notifications");
}

function openNotification(n) {
  if (!n) return;
  menuOpen.value = false;
  if (n.id) {
    notifications.value = markNotificationRead(n.id);
    newCount.value = unreadCount(notifications.value);
  }
  if (n.href) router.push(String(n.href));
}

function fmtTime(ts) {
  const t = new Date(Number(ts || 0));
  if (Number.isNaN(t.getTime())) return "-";
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  const hh = String(t.getHours()).padStart(2, "0");
  const mm = String(t.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

function logout() {
  localStorage.removeItem("employee_token");
  localStorage.removeItem("employee_profile");
  router.replace("/login");
}

onMounted(() => {
  reloadNotifications();
  pollSummary();
  timer = setInterval(pollSummary, 15_000);

  // Keep unread badge in sync across tabs.
  window.addEventListener("storage", reloadNotifications);

  // Click outside closes the menu.
  onWindowClick = () => {
    menuOpen.value = false;
  };
  window.addEventListener("click", onWindowClick);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
  timer = null;
  window.removeEventListener("storage", reloadNotifications);
  if (onWindowClick) window.removeEventListener("click", onWindowClick);
});
</script>

<style scoped>
.nav {
  display: block;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.78);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}
.nav:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.92);
}
.router-link-active {
  border-color: rgba(100, 210, 255, 0.35);
  background: rgba(100, 210, 255, 0.12);
  color: rgba(100, 210, 255, 0.95);
}

.mini {
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.75);
  padding: 6px 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
}
.mini:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.92); }
.mini:disabled { opacity: 0.45; cursor: not-allowed; }

.ntf {
  padding: 12px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
}
.ntf:last-child { border-bottom: none; }
.ntf-unread { background: rgba(100, 210, 255, 0.05); }
.ntf-read { background: transparent; }
.ntf:hover { background: rgba(255, 255, 255, 0.05); }
</style>
