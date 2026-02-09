<template>
  <div class="space-y-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-xs font-mono text-white/60">用户管理</div>
        <div class="mt-2 text-sm text-white/70">管理候选人用户与部门员工账号（管理员可授权员工）。</div>
      </div>
      <button class="btn" @click="loadAll">刷新</button>
    </div>

    <div class="flex flex-wrap gap-2">
      <button class="tab" :class="tab === 'candidates' ? 'tab-on' : ''" @click="tab = 'candidates'">候选人用户</button>
      <button class="tab" :class="tab === 'employees' ? 'tab-on' : ''" @click="tab = 'employees'">部门员工</button>
    </div>

    <!-- Candidates -->
    <div v-if="tab === 'candidates'" class="space-y-4">
      <div class="rounded-xl border border-white/10 bg-black/25 p-4">
        <div class="text-[11px] font-mono text-white/55">创建候选人用户</div>
        <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input v-model="candForm.username" class="input" placeholder="姓名/昵称" />
          <input v-model="candForm.email" class="input" placeholder="邮箱" />
          <input v-model="candForm.phone" class="input" placeholder="手机号（可选）" />
        </div>
        <div class="mt-3 flex justify-end">
          <button class="btn btn-primary" @click="createCandidate">创建</button>
        </div>
      </div>

      <div class="space-y-2 max-h-[520px] overflow-auto">
        <div v-for="u in candidates" :key="u.id" class="rounded-xl border border-white/10 bg-white/5 p-4">
          <div class="text-xs font-mono text-white/85">#{{ u.id }} {{ u.username }}</div>
          <div class="mt-2 text-[11px] font-mono text-white/55">{{ u.phone || "-" }} | {{ u.email }} | {{ u.created_at }}</div>
        </div>
      </div>
    </div>

    <!-- Employees -->
    <div v-else class="space-y-4">
      <div class="rounded-xl border border-white/10 bg-black/25 p-4">
        <div class="text-[11px] font-mono text-white/55">创建员工账号（管理员）</div>
        <div v-if="!isAdmin" class="mt-3 text-sm text-white/70">
          你不是管理员，无法创建员工。
        </div>
        <div v-else>
          <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input v-model="empForm.name" class="input" placeholder="姓名" />
            <input v-model="empForm.phone" class="input" placeholder="手机号（可选）" />
            <input v-model="empForm.email" class="input" placeholder="邮箱" />
            <input v-model="empForm.username" class="input" placeholder="用户名" />
            <input v-model="empForm.password" class="input" placeholder="初始密码（可选）" />
            <select v-model="empForm.role" class="input">
              <option value="staff">staff</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div class="mt-3 flex justify-end">
            <button class="btn btn-primary" @click="createEmployee">创建员工账号</button>
          </div>
        </div>
      </div>

      <div class="space-y-2 max-h-[520px] overflow-auto">
        <div v-for="e in employees" :key="e.id" class="rounded-xl border border-white/10 bg-white/5 p-4">
          <div class="text-xs font-mono text-white/85">#{{ e.id }} {{ e.name }} ({{ e.role }})</div>
          <div class="mt-2 text-[11px] font-mono text-white/55">
            {{ e.username }} | {{ e.phone || "-" }} | {{ e.email }} | {{ e.status }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="error" class="text-xs font-mono text-red-300">{{ error }}</div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { http } from "../../api";

const error = ref("");
const tab = ref("candidates");

const candidates = ref([]);
const employees = ref([]);

const candForm = reactive({ username: "", email: "", phone: "" });
const empForm = reactive({ name: "", phone: "", email: "", username: "", password: "", role: "staff" });

const profile = computed(() => {
  try {
    return JSON.parse(localStorage.getItem("employee_profile") || "{}") || {};
  } catch {
    return {};
  }
});
const isAdmin = computed(() => String(profile.value.role || "") === "admin");

async function loadCandidates() {
  const { data } = await http.get("/api/admin/users");
  candidates.value = data.users || [];
}

async function loadEmployees() {
  const { data } = await http.get("/api/admin/employees");
  employees.value = data.employees || [];
}

async function loadAll() {
  error.value = "";
  try {
    await Promise.all([loadCandidates(), loadEmployees()]);
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "加载失败";
  }
}

async function createCandidate() {
  error.value = "";
  try {
    const { data } = await http.post("/api/admin/users", {
      username: candForm.username,
      email: candForm.email,
      phone: candForm.phone
    });
    candForm.username = "";
    candForm.email = "";
    candForm.phone = "";
    candidates.value = [data.user, ...candidates.value];
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "创建失败";
  }
}

async function createEmployee() {
  if (!isAdmin.value) return;
  error.value = "";
  try {
    const { data } = await http.post("/api/admin/employees", {
      name: empForm.name,
      phone: empForm.phone,
      email: empForm.email,
      username: empForm.username,
      password: empForm.password,
      role: empForm.role
    });
    empForm.name = "";
    empForm.phone = "";
    empForm.email = "";
    empForm.username = "";
    empForm.password = "";
    empForm.role = "staff";
    employees.value = [data.employee, ...employees.value];
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "创建失败";
  }
}

onMounted(loadAll);
</script>

<style scoped>
.input {
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.10);
  color: rgba(255, 255, 255, 0.9);
  padding: 10px 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}
.btn {
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.75);
  padding: 10px 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}
.btn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.92); }
.btn-primary { border-color: rgba(124,255,178,0.25); background: rgba(124,255,178,0.10); color: rgba(124,255,178,0.95); }
.btn-primary:hover { background: rgba(124,255,178,0.14); }
.tab {
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.70);
  padding: 8px 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}
.tab:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.9); }
.tab-on {
  border-color: rgba(100,210,255,0.35);
  background: rgba(100,210,255,0.12);
  color: rgba(100,210,255,0.95);
}
</style>
