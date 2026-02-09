<template>
  <div class="space-y-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-xs font-mono text-white/60">题库管理</div>
        <div class="mt-2 text-sm text-white/70">维护题库，简历通过后随机抽题。</div>
      </div>
      <button class="btn" @click="load">刷新</button>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <select v-model="filters.category" class="input !py-2">
        <option value="">全部分类</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
      <input v-model="filters.q" class="input !py-2" placeholder="搜索题目内容" />
      <div class="text-[11px] font-mono text-white/55">共 {{ filtered.length }} 条</div>
    </div>

    <div class="rounded-xl border border-white/10 bg-black/25 p-4">
      <div class="text-[11px] font-mono text-white/55">新增题目</div>
      <div class="mt-3 grid grid-cols-1 gap-3">
        <textarea v-model="form.content" class="input min-h-[92px]" placeholder="题目内容" />
        <input v-model="form.category" class="input" placeholder="分类（可选）" />
      </div>
      <div class="mt-3 flex justify-end">
        <button class="btn btn-primary" @click="create">新增</button>
      </div>
    </div>

    <div class="space-y-2 max-h-[520px] overflow-auto">
      <div v-for="q in filtered" :key="q.id" class="rounded-xl border border-white/10 bg-white/5 p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-xs font-mono text-white/85 truncate">
              #{{ q.id }}
              <span class="ml-2 rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] text-white/70">
                {{ q.category || "通用" }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button class="btn" @click="beginEdit(q)">编辑</button>
            <button class="btn" @click="remove(q)">删除</button>
          </div>
        </div>

        <div v-if="editingId === q.id" class="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <div class="grid grid-cols-1 gap-3">
            <textarea v-model="edit.content" class="input min-h-[92px]" placeholder="题目内容" />
            <input v-model="edit.category" class="input" placeholder="分类（可选）" />
          </div>
          <div class="mt-3 flex justify-end gap-2">
            <button class="btn" @click="cancelEdit">取消</button>
            <button class="btn btn-primary" @click="save">保存</button>
          </div>
        </div>
        <div v-else class="mt-2 text-[11px] font-mono text-white/60 leading-relaxed whitespace-pre-wrap">{{ q.content }}</div>
      </div>
    </div>

    <div v-if="error" class="text-xs font-mono text-red-300">{{ error }}</div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { http } from "../../api";

const questions = ref([]);
const error = ref("");
const form = reactive({ content: "", category: "" });

const filters = reactive({ category: "", q: "" });

const editingId = ref(null);
const edit = reactive({ id: null, content: "", category: "" });

const categories = computed(() => {
  const set = new Set();
  for (const q of questions.value || []) {
    const c = String(q?.category || "").trim();
    if (c) set.add(c);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
});

const filtered = computed(() => {
  const c = String(filters.category || "").trim();
  const q = String(filters.q || "").trim().toLowerCase();
  return (questions.value || []).filter((it) => {
    if (!it) return false;
    if (c && String(it.category || "").trim() !== c) return false;
    if (q && !String(it.content || "").toLowerCase().includes(q)) return false;
    return true;
  });
});

async function load() {
  error.value = "";
  try {
    const { data } = await http.get("/api/admin/questions");
    questions.value = data.questions || [];
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "加载失败";
  }
}

async function create() {
  error.value = "";
  try {
    const { data } = await http.post("/api/admin/questions", {
      content: form.content,
      category: form.category
    });
    form.content = "";
    form.category = "";
    questions.value = [data.question, ...questions.value];
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "新增失败";
  }
}

function beginEdit(q) {
  if (!q) return;
  editingId.value = q.id;
  edit.id = q.id;
  edit.content = q.content || "";
  edit.category = q.category || "";
}

function cancelEdit() {
  editingId.value = null;
  edit.id = null;
  edit.content = "";
  edit.category = "";
}

async function save() {
  if (!editingId.value) return;
  error.value = "";
  try {
    const { data } = await http.put(`/api/admin/questions/${editingId.value}`, {
      content: edit.content,
      category: edit.category
    });
    questions.value = questions.value.map((x) => (x.id === editingId.value ? { ...x, ...data.question } : x));
    cancelEdit();
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "保存失败";
  }
}

async function remove(q) {
  if (!q?.id) return;
  error.value = "";
  try {
    await http.delete(`/api/admin/questions/${q.id}`);
    questions.value = questions.value.filter((x) => x.id !== q.id);
    if (editingId.value === q.id) cancelEdit();
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "删除失败";
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
