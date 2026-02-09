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
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-xs font-mono text-white/85">#{{ u.id }} {{ u.username }}</div>
              <div class="mt-2 text-[11px] font-mono text-white/55">
                {{ u.phone || "-" }} | {{ u.email }} | {{ u.status || "active" }} | {{ u.created_at }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button class="btn" @click="beginEditCandidate(u)">编辑</button>
              <button
                class="btn"
                :class="String(u.status || 'active') === 'disabled' ? 'btn-primary' : ''"
                @click="toggleCandidate(u)"
              >
                {{ String(u.status || "active") === "disabled" ? "启用" : "停用" }}
              </button>
            </div>
          </div>

          <div v-if="editingCandId === u.id" class="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input v-model="candEdit.username" class="input" placeholder="姓名/昵称" />
              <input v-model="candEdit.email" class="input" placeholder="邮箱" />
              <input v-model="candEdit.phone" class="input" placeholder="手机号（可选）" />
              <select v-model="candEdit.status" class="input">
                <option value="active">active</option>
                <option value="disabled">disabled</option>
              </select>
            </div>
            <div class="mt-3 flex justify-end gap-2">
              <button class="btn" @click="cancelEditCandidate">取消</button>
              <button class="btn btn-primary" @click="saveCandidate">保存</button>
            </div>
          </div>
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
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-xs font-mono text-white/85">#{{ e.id }} {{ e.name }} ({{ e.role }})</div>
              <div class="mt-2 text-[11px] font-mono text-white/55">
                {{ e.username }} | {{ e.phone || "-" }} | {{ e.email }} | {{ e.status }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button class="btn" @click="beginEditEmployee(e)">编辑</button>
              <button
                class="btn"
                :class="String(e.status || 'active') === 'disabled' ? 'btn-primary' : ''"
                @click="toggleEmployee(e)"
              >
                {{ String(e.status || "active") === "disabled" ? "启用" : "停用" }}
              </button>
            </div>
          </div>

          <div v-if="editingEmpId === e.id" class="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input v-model="empEdit.name" class="input" placeholder="姓名" />
              <input v-model="empEdit.phone" class="input" placeholder="手机号（可选）" />
              <input v-model="empEdit.email" class="input" placeholder="邮箱" />
              <input v-model="empEdit.username" class="input" placeholder="用户名" />
              <input v-model="empEdit.password" class="input" placeholder="重置密码（可选）" />
              <select v-model="empEdit.role" class="input">
                <option value="staff">staff</option>
                <option value="admin">admin</option>
              </select>
              <select v-model="empEdit.status" class="input">
                <option value="active">active</option>
                <option value="disabled">disabled</option>
              </select>
            </div>
            <div class="mt-3 flex justify-end gap-2">
              <button class="btn" @click="cancelEditEmployee">取消</button>
              <button class="btn btn-primary" @click="saveEmployee">保存</button>
            </div>
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

const editingCandId = ref(null);
const candEdit = reactive({ id: null, username: "", email: "", phone: "", status: "active" });

const editingEmpId = ref(null);
const empEdit = reactive({ id: null, name: "", phone: "", email: "", username: "", password: "", role: "staff", status: "active" });

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

function beginEditCandidate(u) {
  if (!u) return;
  editingCandId.value = u.id;
  candEdit.id = u.id;
  candEdit.username = u.username || "";
  candEdit.email = u.email || "";
  candEdit.phone = u.phone || "";
  candEdit.status = String(u.status || "active");
}

function cancelEditCandidate() {
  editingCandId.value = null;
  candEdit.id = null;
  candEdit.username = "";
  candEdit.email = "";
  candEdit.phone = "";
  candEdit.status = "active";
}

async function saveCandidate() {
  if (!editingCandId.value) return;
  error.value = "";
  try {
    const { data } = await http.put(`/api/admin/users/${editingCandId.value}`, {
      username: candEdit.username,
      email: candEdit.email,
      phone: candEdit.phone,
      status: candEdit.status
    });
    candidates.value = candidates.value.map((x) => (x.id === editingCandId.value ? { ...x, ...data.user } : x));
    cancelEditCandidate();
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "保存失败";
  }
}

async function toggleCandidate(u) {
  if (!u) return;
  const nextStatus = String(u.status || "active") === "disabled" ? "active" : "disabled";
  error.value = "";
  try {
    const { data } = await http.put(`/api/admin/users/${u.id}`, {
      username: u.username,
      email: u.email,
      phone: u.phone,
      status: nextStatus
    });
    candidates.value = candidates.value.map((x) => (x.id === u.id ? { ...x, ...data.user } : x));
    if (editingCandId.value === u.id) beginEditCandidate({ ...u, ...data.user });
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "操作失败";
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

function beginEditEmployee(e) {
  if (!e) return;
  editingEmpId.value = e.id;
  empEdit.id = e.id;
  empEdit.name = e.name || "";
  empEdit.phone = e.phone || "";
  empEdit.email = e.email || "";
  empEdit.username = e.username || "";
  empEdit.password = "";
  empEdit.role = String(e.role || "staff");
  empEdit.status = String(e.status || "active");
}

function cancelEditEmployee() {
  editingEmpId.value = null;
  empEdit.id = null;
  empEdit.name = "";
  empEdit.phone = "";
  empEdit.email = "";
  empEdit.username = "";
  empEdit.password = "";
  empEdit.role = "staff";
  empEdit.status = "active";
}

async function saveEmployee() {
  if (!editingEmpId.value) return;
  error.value = "";
  try {
    const body = {
      name: empEdit.name,
      phone: empEdit.phone,
      email: empEdit.email,
      username: empEdit.username,
      role: empEdit.role,
      status: empEdit.status
    };
    if (String(empEdit.password || "").trim()) body.password = String(empEdit.password || "").trim();
    const { data } = await http.put(`/api/admin/employees/${editingEmpId.value}`, body);
    employees.value = employees.value.map((x) => (x.id === editingEmpId.value ? { ...x, ...data.employee } : x));
    cancelEditEmployee();
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "保存失败";
  }
}

async function toggleEmployee(e) {
  if (!e) return;
  const nextStatus = String(e.status || "active") === "disabled" ? "active" : "disabled";
  error.value = "";
  try {
    const { data } = await http.put(`/api/admin/employees/${e.id}`, {
      name: e.name,
      phone: e.phone,
      email: e.email,
      username: e.username,
      role: e.role,
      status: nextStatus
    });
    employees.value = employees.value.map((x) => (x.id === e.id ? { ...x, ...data.employee } : x));
    if (editingEmpId.value === e.id) beginEditEmployee({ ...e, ...data.employee });
  } catch (e2) {
    error.value = e2?.response?.data?.error || e2?.message || "操作失败";
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
