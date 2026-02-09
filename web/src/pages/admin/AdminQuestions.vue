<template>
  <div class="space-y-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-xs font-mono text-white/60">题库管理</div>
        <div class="mt-2 text-sm text-white/70">维护题库，简历通过后随机抽题。</div>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn" @click="showCategories = !showCategories">{{ showCategories ? "收起分类" : "分类管理" }}</button>
        <button class="btn" @click="showCreate = !showCreate">{{ showCreate ? "收起新增" : "新增题目" }}</button>
        <button class="btn" @click="load">刷新</button>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <select v-model="filters.category" class="input !py-2">
        <option value="">全部分类</option>
        <option v-for="c in categories" :key="c.name" :value="c.name">{{ c.name }}（{{ c.count }}）</option>
      </select>
      <input v-model="filters.q" class="input !py-2" placeholder="搜索题目内容" />
      <div class="text-[11px] font-mono text-white/55">共 {{ filtered.length }} 条</div>
    </div>

    <div v-if="showCategories" class="rounded-xl border border-white/10 bg-black/25 p-4">
      <div class="text-[11px] font-mono text-white/55">分类管理</div>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <input v-model="newCategoryName" class="input !py-2" placeholder="新增分类名称" />
        <button class="btn btn-primary" @click="createCategory">新增分类</button>
      </div>

      <div class="mt-3 space-y-2 max-h-[220px] overflow-auto">
        <div v-for="c in categories" :key="c.name" class="rounded-xl border border-white/10 bg-white/5 p-3">
          <div class="flex items-start justify-between gap-3">
            <div class="text-xs font-mono text-white/85">
              {{ c.name }} <span class="text-[11px] text-white/55">（{{ c.count }}）</span>
            </div>
            <div class="flex items-center gap-2">
              <button class="btn" @click="beginRenameCategory(c.name)">重命名</button>
              <button class="btn" @click="clearCategory(c.name)">清空分类</button>
            </div>
          </div>

          <div v-if="renaming.from === c.name" class="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <div class="flex flex-wrap items-center gap-2">
              <input v-model="renaming.to" class="input !py-2" placeholder="新分类名称" />
              <button class="btn btn-primary" @click="saveRenameCategory">保存</button>
              <button class="btn" @click="cancelRenameCategory">取消</button>
            </div>
            <div class="mt-2 text-[11px] font-mono text-white/55">
              重命名会把所有题目中分类为「{{ c.name }}」的记录统一改为新名称。
            </div>
          </div>
        </div>

        <div v-if="!categories.length" class="text-xs font-mono text-white/55">暂无分类（只有题目设置了分类才会出现）。</div>
      </div>
    </div>

    <div v-if="showCreate" class="rounded-xl border border-white/10 bg-black/25 p-4">
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
const showCategories = ref(false);
const showCreate = ref(false);

const filters = reactive({ category: "", q: "" });

const editingId = ref(null);
const edit = reactive({ id: null, content: "", category: "" });

const categories = ref([]); // {name,count}
const newCategoryName = ref("");
const renaming = ref({ from: "", to: "" });

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

async function loadCategories() {
  try {
    const { data } = await http.get("/api/admin/question-categories");
    categories.value = (data.categories || []).map((x) => ({
      name: String(x.name || "").trim(),
      count: Number(x.count || 0)
    })).filter((x) => x.name);
  } catch {
    // keep questions usable even if categories endpoint fails
    categories.value = [];
  }
}

async function load() {
  error.value = "";
  try {
    const { data } = await http.get("/api/admin/questions");
    questions.value = data.questions || [];
    await loadCategories();
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
    showCreate.value = false;
    await loadCategories();
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
    await loadCategories();
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
    await loadCategories();
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "删除失败";
  }
}

async function createCategory() {
  error.value = "";
  const name = String(newCategoryName.value || "").trim();
  if (!name) {
    error.value = "请输入分类名称。";
    return;
  }
  try {
    // String-based categories: create is a no-op API, but keep for UX.
    await http.post("/api/admin/question-categories", { name });
    newCategoryName.value = "";
    await loadCategories();
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "新增分类失败";
  }
}

function beginRenameCategory(name) {
  renaming.value = { from: String(name || ""), to: String(name || "") };
}

function cancelRenameCategory() {
  renaming.value = { from: "", to: "" };
}

async function saveRenameCategory() {
  error.value = "";
  const from = String(renaming.value.from || "").trim();
  const to = String(renaming.value.to || "").trim();
  if (!from || !to) return;
  try {
    await http.put(`/api/admin/question-categories/${encodeURIComponent(from)}`, { name: to });
    cancelRenameCategory();
    await load();
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "重命名失败";
  }
}

async function clearCategory(name) {
  error.value = "";
  const n = String(name || "").trim();
  if (!n) return;
  try {
    await http.delete(`/api/admin/question-categories/${encodeURIComponent(n)}`);
    if (filters.category === n) filters.category = "";
    await load();
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "清空分类失败";
  }
}

onMounted(load);
</script>
