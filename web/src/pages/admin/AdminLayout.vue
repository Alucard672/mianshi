<template>
  <div class="min-h-screen">
    <div class="absolute inset-0 grid-overlay pointer-events-none opacity-30"></div>
    <div class="relative mx-auto max-w-7xl px-4 py-8">
      <div class="flex items-center justify-between gap-3">
        <BrandHeader />
        <div class="flex items-center gap-3">
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
import { computed } from "vue";
import { useRouter } from "vue-router";
import BrandHeader from "../../components/BrandHeader.vue";

const router = useRouter();

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

function logout() {
  localStorage.removeItem("employee_token");
  localStorage.removeItem("employee_profile");
  router.replace("/login");
}
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
