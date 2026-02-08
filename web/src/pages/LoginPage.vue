<template>
  <div class="min-h-screen">
    <div class="absolute inset-0 grid-overlay pointer-events-none opacity-30"></div>
    <div class="relative mx-auto max-w-4xl px-4 py-10">
      <div class="flex items-center justify-between gap-3">
        <BrandHeader />
        <div class="text-xs font-mono text-white/60">
          API: <span class="text-cyan">{{ apiBase }}</span>
        </div>
      </div>

      <div class="mt-10 flex justify-center">
        <div class="w-full max-w-xl rounded-2xl border border-white/10 bg-bg1/60 p-6">
          <div class="text-xs font-mono text-white/60">系统登录</div>
          <div class="mt-2 text-sm text-white/70">
            输入用户名或手机号登录。系统会根据账号所属员工信息判断身份与权限（管理员/员工）。
          </div>

          <div class="mt-5 space-y-3">
            <div>
              <label class="block text-xs font-mono text-white/60">用户名 / 手机号</label>
              <input
                v-model="form.identifier"
                class="mt-2 w-full rounded-xl bg-black/40 border-white/10 font-mono"
                placeholder="例如：admin 或 13800138000"
                autocomplete="username"
              />
            </div>
            <div>
              <label class="block text-xs font-mono text-white/60">密码</label>
              <input
                v-model="form.password"
                type="password"
                class="mt-2 w-full rounded-xl bg-black/40 border-white/10 font-mono"
                placeholder="例如：111111"
                autocomplete="current-password"
              />
            </div>
          </div>

          <div class="mt-5 flex items-center justify-between gap-3">
            <div v-if="error" class="text-xs font-mono text-red-300">{{ error }}</div>
            <div v-else class="text-xs font-mono text-white/50">
              默认管理员：admin / 111111
            </div>
            <button
              class="rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-2 text-cyan hover:bg-cyan/15 disabled:opacity-50 font-mono"
              :disabled="loading"
              @click="login"
            >
              {{ loading ? "登录中..." : "登录" }}
            </button>
          </div>

          <div class="mt-4 text-[11px] font-mono text-white/55">
            登录成功后会进入管理后台；候选人投递请使用 HR 分享的投递链接进入。
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { http } from "../api";
import BrandHeader from "../components/BrandHeader.vue";

const apiBase = http.defaults.baseURL;
const route = useRoute();
const router = useRouter();

const loading = ref(false);
const error = ref("");

const form = reactive({
  identifier: "admin",
  password: "111111"
});

async function login() {
  error.value = "";
  const identifier = String(form.identifier || "").trim();
  const password = String(form.password || "").trim();
  if (!identifier) {
    error.value = "请输入用户名或手机号。";
    return;
  }
  if (!password) {
    error.value = "请输入密码。";
    return;
  }

  loading.value = true;
  try {
    const { data } = await http.post("/api/auth/login", {
      identifier,
      password
    });
    localStorage.setItem("employee_token", data.token);
    localStorage.setItem("employee_profile", JSON.stringify(data.employee || {}));
    const next = String(route.query.next || "").trim();
    await router.replace(next || "/admin");
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "登录失败";
  } finally {
    loading.value = false;
  }
}
</script>
