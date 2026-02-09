<template>
  <div class="space-y-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-xs font-mono text-white/60">职位发布</div>
        <div class="mt-2 text-sm text-white/70">
          选择多个岗位生成一个对外展示页面（响应式），并生成分享链接与二维码。
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn" @click="showCreate = !showCreate">{{ showCreate ? "收起新增" : "新增发布页" }}</button>
        <button class="btn" @click="loadAll">刷新</button>
      </div>
    </div>

    <div v-if="showCreate" class="rounded-xl border border-white/10 bg-black/25 p-4">
      <div class="text-[11px] font-mono text-white/55">创建发布页</div>
      <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input v-model="form.title" class="input" placeholder="发布页标题（例如：杭州衣科 2026 春招）" />
        <input v-model="form.slug" class="input" placeholder="slug（例如：2026-spring）" />
      </div>
      <textarea v-model="form.description" class="input mt-3 min-h-[84px]" placeholder="发布页简介（可选）" />

      <div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
        <div class="flex items-center justify-between gap-3">
          <div class="text-[11px] font-mono text-white/55">选择岗位（可多选）</div>
          <div class="text-[11px] font-mono text-white/55">已选择 {{ form.jobIds.length }} 个</div>
        </div>
        <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-auto">
          <label
            v-for="j in jobs"
            :key="j.id"
            class="flex items-center gap-2 text-xs font-mono text-white/75 cursor-pointer select-none"
          >
            <input
              type="checkbox"
              :value="j.id"
              v-model="form.jobIds"
              class="h-4 w-4 rounded border-white/20 bg-black/30 text-cyan focus:ring-cyan/30"
            />
            <span>#{{ j.id }} {{ j.title }}</span>
          </label>
        </div>
      </div>

      <div class="mt-3 flex items-center justify-between gap-3">
        <div class="text-[11px] font-mono text-white/55">会生成公开页面：`/post/{slug}`</div>
        <button class="btn btn-primary" @click="createPost">生成发布页</button>
      </div>

      <div v-if="created.url" class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="rounded-xl border border-white/10 bg-white/5 p-4">
          <div class="text-[11px] font-mono text-white/55">公开链接</div>
          <div class="mt-2 text-xs font-mono break-all text-white/80">{{ created.url }}</div>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/5 p-4">
          <div class="text-[11px] font-mono text-white/55">二维码</div>
          <img v-if="created.qr" :src="created.qr" alt="post qr" class="mt-2 w-40 h-40 rounded-lg border border-white/10" />
        </div>
      </div>
    </div>

    <div class="rounded-xl border border-white/10 bg-black/25 p-4">
      <div class="text-[11px] font-mono text-white/55">已有发布页</div>
      <div class="mt-3 space-y-2">
        <div v-for="p in posts" :key="p.id" class="rounded-xl border border-white/10 bg-white/5 p-4">
          <div class="flex items-center justify-between gap-3">
            <div class="text-xs font-mono text-white/85">#{{ p.id }} {{ p.title }}</div>
            <button class="btn" @click="remove(p)">删除</button>
          </div>
          <div class="mt-2 text-[11px] font-mono text-white/55">slug: {{ p.slug }} | {{ p.status }} | {{ p.updated_at }}</div>
          <div class="mt-2 text-xs font-mono text-cyan break-all">{{ publicUrl(p.slug) }}</div>
        </div>
      </div>
    </div>

    <div v-if="error" class="text-xs font-mono text-red-300">{{ error }}</div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import QRCode from "qrcode";
import { http } from "../../api";

const error = ref("");
const jobs = ref([]);
const posts = ref([]);
const showCreate = ref(false);

const form = reactive({
  title: "",
  slug: "",
  description: "",
  jobIds: []
});

const created = reactive({ url: "", qr: "" });

function publicUrl(slug) {
  return `${window.location.origin}/post/${encodeURIComponent(slug)}`;
}

async function loadAll() {
  error.value = "";
  try {
    const [j, p] = await Promise.all([http.get("/api/admin/jobs"), http.get("/api/admin/posts")]);
    jobs.value = j.data.jobs || [];
    posts.value = p.data.posts || [];
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "加载失败";
  }
}

async function createPost() {
  error.value = "";
  created.url = "";
  created.qr = "";
  try {
    if (!form.slug.trim()) {
      // basic auto slug
      form.slug = `post-${Date.now()}`;
    }
    const { data } = await http.post("/api/admin/posts", {
      title: form.title,
      slug: form.slug,
      description: form.description,
      status: "published",
      job_ids: form.jobIds
    });
    posts.value = [data.post, ...posts.value];
    created.url = publicUrl(data.post.slug);
    created.qr = await QRCode.toDataURL(created.url, { errorCorrectionLevel: "M", margin: 1, scale: 6 });
    showCreate.value = true;
    form.title = "";
    form.slug = "";
    form.description = "";
    form.jobIds = [];
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "创建失败";
  }
}

async function remove(p) {
  error.value = "";
  try {
    await http.delete(`/api/admin/posts/${p.id}`);
    posts.value = posts.value.filter((x) => x.id !== p.id);
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "删除失败";
  }
}

onMounted(loadAll);
</script>
