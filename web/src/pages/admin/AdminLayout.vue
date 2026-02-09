<template>
  <div class="min-h-screen">
    <div class="absolute inset-0 grid-overlay pointer-events-none opacity-30"></div>
    <div class="relative mx-auto max-w-7xl px-4 py-8">
      <div class="flex items-center justify-between gap-3">
        <BrandHeader />
        <div class="flex items-center gap-3">
          <button
            class="relative rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-mono text-white/70 hover:bg-white/10"
            @click="openApplicants"
            :title="newCount ? `新增面试人员：${newCount}` : '面试人员'"
          >
            面试人员
            <span
              v-if="newCount"
              class="absolute -top-2 -right-2 min-w-[22px] rounded-full border border-cyan/30 bg-cyan/15 px-2 py-0.5 text-[10px] font-mono text-cyan text-center"
            >
              {{ newCount > 99 ? "99+" : newCount }}
            </span>
          </button>
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import BrandHeader from "../../components/BrandHeader.vue";
import { http } from "../../api";

const route = useRoute();
const router = useRouter();

const STORAGE_KEY = "admin_last_seen_interview_id";
const newCount = ref(0);
const latestId = ref(0);
let timer = null;

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

function getLastSeenId() {
  const v = Number(localStorage.getItem(STORAGE_KEY) || 0);
  return Number.isFinite(v) ? v : 0;
}

function setLastSeenId(id) {
  const n = Number(id || 0);
  if (!Number.isFinite(n) || n <= 0) return;
  localStorage.setItem(STORAGE_KEY, String(n));
}

async function pollSummary() {
  try {
    const sinceId = getLastSeenId();
    const { data } = await http.get("/api/admin/interviews/summary", {
      params: { since_id: sinceId || 0 }
    });
    latestId.value = Number(data.latestId || 0);

    // First visit: don't show "new" badge for historical records.
    if (!sinceId && latestId.value) {
      setLastSeenId(latestId.value);
      newCount.value = 0;
      return;
    }
    newCount.value = Number(data.newCount || 0);
  } catch {
    // ignore polling errors; UI should remain usable even if summary fails.
  }
}

function markAllSeen() {
  if (latestId.value) setLastSeenId(latestId.value);
  newCount.value = 0;
}

function openApplicants() {
  markAllSeen();
  router.push("/admin/applicants");
}

function logout() {
  localStorage.removeItem("employee_token");
  localStorage.removeItem("employee_profile");
  router.replace("/login");
}

onMounted(() => {
  pollSummary();
  timer = setInterval(pollSummary, 15_000);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
  timer = null;
});

watch(
  () => route.fullPath,
  (p) => {
    if (String(p || "").startsWith("/admin/applicants")) {
      // When the list is open, treat items as seen.
      markAllSeen();
    }
  }
);
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
</style>
