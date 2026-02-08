<template>
  <div class="min-h-screen">
    <div class="absolute inset-0 grid-overlay pointer-events-none opacity-25"></div>
    <div class="relative mx-auto max-w-6xl px-4 py-10">
      <div class="flex items-center justify-between gap-3">
        <BrandHeader />
        <div class="text-xs font-mono text-white/60">
          招聘发布页
        </div>
      </div>

      <div class="mt-8 rounded-3xl border border-white/10 bg-bg1/60 p-6 sm:p-8">
        <div class="text-[11px] font-mono text-white/55">杭州衣科</div>
        <h1 class="mt-2 text-2xl sm:text-4xl font-mono font-semibold tracking-tight">
          {{ post?.title || "职位发布" }}
        </h1>
        <p v-if="post?.description" class="mt-3 text-sm sm:text-base text-white/70 leading-relaxed">
          {{ post.description }}
        </p>
        <div class="mt-5 flex flex-wrap gap-2 text-[11px] font-mono text-white/60">
          <span class="chip">更新：{{ post?.updated_at || "-" }}</span>
          <span class="chip">岗位数：{{ jobs.length }}</span>
          <span class="chip">投递：通过 HR 分享链接上传简历</span>
        </div>
      </div>

      <div v-if="error" class="mt-6 text-xs font-mono text-red-300">{{ error }}</div>

      <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
        <article
          v-for="j in jobs"
          :key="j.id"
          class="rounded-3xl border border-white/10 bg-black/25 p-6"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-[11px] font-mono text-white/55">岗位</div>
              <h2 class="mt-1 text-xl font-mono font-semibold text-white/90">{{ j.title }}</h2>
            </div>
            <div class="text-right">
              <div class="text-[11px] font-mono text-white/55">薪资</div>
              <div class="mt-1 text-sm font-mono text-neon">
                {{ salaryText(j) }}
              </div>
              <div v-if="j.salary_note" class="mt-1 text-[11px] font-mono text-white/55">
                {{ j.salary_note }}
              </div>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <span v-if="j.location" class="tag">{{ j.location }}</span>
            <span v-if="j.employment_type" class="tag">{{ j.employment_type }}</span>
            <span v-if="j.experience_level" class="tag">{{ j.experience_level }}</span>
            <span v-if="j.education" class="tag">{{ j.education }}</span>
            <span class="tag" :class="j.status === 'open' ? 'tag-open' : 'tag-closed'">{{ j.status === 'open' ? "招聘中" : "已关闭" }}</span>
          </div>

          <div v-if="j.responsibilities" class="mt-5">
            <div class="text-[11px] font-mono text-white/55">工作内容</div>
            <div class="mt-2 text-sm text-white/75 whitespace-pre-wrap leading-relaxed">
              {{ j.responsibilities }}
            </div>
          </div>

          <div v-if="j.requirements" class="mt-5">
            <div class="text-[11px] font-mono text-white/55">任职要求</div>
            <div class="mt-2 text-sm text-white/75 whitespace-pre-wrap leading-relaxed">
              {{ j.requirements }}
            </div>
          </div>

          <div v-if="j.benefits" class="mt-5">
            <div class="text-[11px] font-mono text-white/55">福利</div>
            <div class="mt-2 text-sm text-white/75 whitespace-pre-wrap leading-relaxed">
              {{ j.benefits }}
            </div>
          </div>

          <div class="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div class="text-[11px] font-mono text-white/55">关键词</div>
            <div class="mt-2 text-[11px] font-mono text-white/70 break-words">
              {{ j.target_keywords || "-" }}
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import BrandHeader from "../components/BrandHeader.vue";
import { http } from "../api";

const route = useRoute();
const post = ref(null);
const jobs = ref([]);
const error = ref("");

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
    const slug = String(route.params.slug || "").trim();
    const { data } = await http.get(`/api/public/posts/${encodeURIComponent(slug)}`);
    post.value = data.post;
    jobs.value = data.jobs || [];
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "加载失败";
  }
}

onMounted(load);
</script>

<style scoped>
.chip {
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.04);
  padding: 6px 10px;
}
.tag {
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.04);
  padding: 6px 10px;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: rgba(255, 255, 255, 0.75);
}
.tag-open { border-color: rgba(124,255,178,0.25); background: rgba(124,255,178,0.10); color: rgba(124,255,178,0.95); }
.tag-closed { border-color: rgba(255,255,255,0.18); background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.60); }
</style>

