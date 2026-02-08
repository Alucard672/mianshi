<template>
  <div class="space-y-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-xs font-mono text-white/60">题库管理</div>
        <div class="mt-2 text-sm text-white/70">维护题库，简历通过后随机抽题。</div>
      </div>
      <button class="btn" @click="load">刷新</button>
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
      <div v-for="q in questions" :key="q.id" class="rounded-xl border border-white/10 bg-white/5 p-4">
        <div class="text-xs font-mono text-white/85">#{{ q.id }} {{ q.category || "通用" }}</div>
        <div class="mt-2 text-[11px] font-mono text-white/60 leading-relaxed">{{ q.content }}</div>
      </div>
    </div>

    <div v-if="error" class="text-xs font-mono text-red-300">{{ error }}</div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { http } from "../../api";

const questions = ref([]);
const error = ref("");
const form = reactive({ content: "", category: "" });

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

