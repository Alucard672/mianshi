<template>
  <div class="space-y-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-xs font-mono text-white/60">岗位管理</div>
        <div class="mt-2 text-sm text-white/70">维护岗位与岗位关键词（用于简历筛选）。</div>
      </div>
      <button class="btn" @click="load">刷新</button>
    </div>

    <div class="rounded-xl border border-white/10 bg-black/25 p-4">
      <div class="text-[11px] font-mono text-white/55">新增岗位</div>
      <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input v-model="form.title" class="input" placeholder="岗位名称" />
        <input v-model="form.keywords" class="input" placeholder="关键词（逗号分隔）" />
        <input v-model="form.location" class="input" placeholder="工作地点（可选）" />
        <input v-model="form.employmentType" class="input" placeholder="类型（全职/实习等，可选）" />
        <input v-model="form.salaryMin" class="input" placeholder="薪资下限（可选，整数）" />
        <input v-model="form.salaryMax" class="input" placeholder="薪资上限（可选，整数）" />
        <input v-model="form.salaryNote" class="input sm:col-span-2" placeholder="薪资备注（可选）" />
      </div>
      <textarea v-model="form.requirements" class="input mt-3 min-h-[92px]" placeholder="招聘要求 / 任职要求（可选）" />
      <textarea v-model="form.responsibilities" class="input mt-3 min-h-[92px]" placeholder="工作内容 / 岗位职责（可选）" />
      <textarea v-model="form.benefits" class="input mt-3 min-h-[84px]" placeholder="福利待遇（可选）" />
      <div class="mt-3 flex justify-end">
        <button class="btn btn-primary" @click="create">新增</button>
      </div>
    </div>

    <div class="space-y-2">
      <div v-for="j in jobs" :key="j.id" class="rounded-xl border border-white/10 bg-white/5 p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="text-xs font-mono text-white/85">#{{ j.id }} {{ j.title }}</div>
          <button class="btn" @click="toggleEdit(j)">{{ editingId === j.id ? "收起" : "编辑" }}</button>
        </div>
        <div class="mt-2 text-[11px] font-mono text-white/55">
          关键词：{{ j.target_keywords }}
        </div>
        <div class="mt-1 text-[11px] font-mono text-white/55">
          地点：{{ j.location || "-" }} | 薪资：{{ salaryText(j) }} | 状态：{{ j.status || "open" }}
        </div>

        <div v-if="editingId === j.id" class="mt-4 rounded-xl border border-white/10 bg-black/25 p-4">
          <div class="text-[11px] font-mono text-white/55">编辑岗位</div>
          <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input v-model="edit.title" class="input" placeholder="岗位名称" />
            <input v-model="edit.keywords" class="input" placeholder="关键词（逗号分隔）" />
            <input v-model="edit.location" class="input" placeholder="工作地点" />
            <input v-model="edit.employmentType" class="input" placeholder="类型（全职/实习等）" />
            <input v-model="edit.salaryMin" class="input" placeholder="薪资下限（整数）" />
            <input v-model="edit.salaryMax" class="input" placeholder="薪资上限（整数）" />
            <input v-model="edit.salaryNote" class="input sm:col-span-2" placeholder="薪资备注" />
            <select v-model="edit.status" class="input">
              <option value="open">open</option>
              <option value="closed">closed</option>
            </select>
          </div>
          <textarea v-model="edit.requirements" class="input mt-3 min-h-[92px]" placeholder="招聘要求 / 任职要求" />
          <textarea v-model="edit.responsibilities" class="input mt-3 min-h-[92px]" placeholder="工作内容 / 岗位职责" />
          <textarea v-model="edit.benefits" class="input mt-3 min-h-[84px]" placeholder="福利待遇" />
          <div class="mt-3 flex justify-end">
            <button class="btn btn-primary" @click="save(j)">保存修改</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="error" class="text-xs font-mono text-red-300">{{ error }}</div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { http } from "../../api";

const jobs = ref([]);
const error = ref("");
const form = reactive({
  title: "",
  keywords: "",
  requirements: "",
  responsibilities: "",
  salaryMin: "",
  salaryMax: "",
  salaryNote: "",
  location: "",
  employmentType: "",
  benefits: ""
});

const editingId = ref(0);
const edit = reactive({
  title: "",
  keywords: "",
  requirements: "",
  responsibilities: "",
  salaryMin: "",
  salaryMax: "",
  salaryNote: "",
  location: "",
  employmentType: "",
  benefits: "",
  status: "open"
});

function salaryText(j) {
  const min = j.salary_min;
  const max = j.salary_max;
  if (min != null && max != null) return `${min}-${max}`;
  if (min != null) return `${min}+`;
  if (max != null) return `<=${max}`;
  return "面议";
}

async function load() {
  error.value = "";
  try {
    const { data } = await http.get("/api/admin/jobs");
    jobs.value = data.jobs || [];
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "加载失败";
  }
}

async function create() {
  error.value = "";
  try {
    const { data } = await http.post("/api/admin/jobs", {
      title: form.title,
      target_keywords: form.keywords,
      requirements: form.requirements,
      responsibilities: form.responsibilities,
      salary_min: form.salaryMin ? Number(form.salaryMin) : null,
      salary_max: form.salaryMax ? Number(form.salaryMax) : null,
      salary_note: form.salaryNote || null,
      location: form.location || null,
      employment_type: form.employmentType || null,
      benefits: form.benefits || null,
      status: "open"
    });
    form.title = "";
    form.keywords = "";
    form.requirements = "";
    form.responsibilities = "";
    form.salaryMin = "";
    form.salaryMax = "";
    form.salaryNote = "";
    form.location = "";
    form.employmentType = "";
    form.benefits = "";
    jobs.value = [data.job, ...jobs.value];
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "新增失败";
  }
}

function toggleEdit(j) {
  if (editingId.value === j.id) {
    editingId.value = 0;
    return;
  }
  editingId.value = j.id;
  edit.title = j.title || "";
  edit.keywords = j.target_keywords || "";
  edit.requirements = j.requirements || "";
  edit.responsibilities = j.responsibilities || "";
  edit.salaryMin = j.salary_min == null ? "" : String(j.salary_min);
  edit.salaryMax = j.salary_max == null ? "" : String(j.salary_max);
  edit.salaryNote = j.salary_note || "";
  edit.location = j.location || "";
  edit.employmentType = j.employment_type || "";
  edit.benefits = j.benefits || "";
  edit.status = j.status || "open";
}

async function save(j) {
  error.value = "";
  try {
    const { data } = await http.put(`/api/admin/jobs/${j.id}`, {
      title: edit.title,
      target_keywords: edit.keywords,
      requirements: edit.requirements,
      responsibilities: edit.responsibilities,
      salary_min: edit.salaryMin ? Number(edit.salaryMin) : null,
      salary_max: edit.salaryMax ? Number(edit.salaryMax) : null,
      salary_note: edit.salaryNote || null,
      location: edit.location || null,
      employment_type: edit.employmentType || null,
      benefits: edit.benefits || null,
      status: edit.status || "open"
    });
    jobs.value = jobs.value.map((x) => (x.id === j.id ? { ...x, ...data.job } : x));
    editingId.value = 0;
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "保存失败";
  }
}

onMounted(load);
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
</style>
