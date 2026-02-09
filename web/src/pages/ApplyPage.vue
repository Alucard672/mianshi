<template>
  <div class="min-h-screen">
    <div class="absolute inset-0 grid-overlay pointer-events-none opacity-25"></div>
    <div class="relative mx-auto max-w-5xl px-4 py-10">
      <div class="flex items-center justify-between gap-3">
        <BrandHeader />
        <router-link
          :to="`/post/${encodeURIComponent(slug)}`"
          class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-mono text-white/70 hover:bg-white/10"
        >
          返回海报页
        </router-link>
      </div>

      <div class="mt-8 rounded-3xl border border-white/10 bg-bg1/60 p-6 sm:p-8">
        <div class="text-[11px] font-mono text-white/55">报名</div>
        <h1 class="mt-2 text-2xl sm:text-3xl font-mono font-semibold tracking-tight">
          {{ post?.title || "岗位报名" }}
        </h1>
          <div class="mt-3 text-sm text-white/70">
          选择岗位，填写资料并上传简历（PDF/Word，<= 5MB）。可选上传图片（JPG/PNG/WebP，<= 5MB）与视频（MP4，<= 50MB）。
          提交后会自动进入系统，供 HR 在后台查看。
        </div>
      </div>

      <div v-if="error" class="mt-6 text-xs font-mono text-red-300">{{ error }}</div>

      <div class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div class="lg:col-span-2 rounded-3xl border border-white/10 bg-black/25 p-6">
          <div class="text-xs font-mono text-white/60">岗位</div>
          <select v-model="form.jobId" class="mt-3 w-full rounded-xl bg-black/40 border-white/10 font-mono">
            <option v-for="j in jobs" :key="j.id" :value="String(j.id)">
              {{ j.title }}（{{ j.status === "open" ? "招聘中" : "已关闭" }}）
            </option>
          </select>

          <div v-if="selectedJob" class="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-[11px] font-mono text-white/55">岗位信息</div>
                <div class="mt-1 text-sm font-mono text-white/90">{{ selectedJob.title }}</div>
              </div>
              <div class="text-right">
                <div class="text-[11px] font-mono text-white/55">薪资</div>
                <div class="mt-1 text-sm font-mono text-neon">{{ salaryText(selectedJob) }}</div>
              </div>
            </div>
            <div class="mt-3 text-[11px] font-mono text-white/60 break-words">
              关键词：{{ selectedJob.target_keywords || "-" }}
            </div>
          </div>
        </div>

        <div class="rounded-3xl border border-white/10 bg-black/25 p-6">
          <div class="text-xs font-mono text-white/60">个人资料</div>

          <div class="mt-4 space-y-3">
            <div>
              <label class="block text-xs font-mono text-white/60">姓名</label>
              <input v-model="form.name" class="mt-2 w-full rounded-xl bg-black/40 border-white/10 font-mono" placeholder="例如：张三" />
            </div>
            <div>
              <label class="block text-xs font-mono text-white/60">手机号</label>
              <input v-model="form.phone" class="mt-2 w-full rounded-xl bg-black/40 border-white/10 font-mono" placeholder="例如：13800138000" />
            </div>
            <div>
              <label class="block text-xs font-mono text-white/60">邮箱</label>
              <input v-model="form.email" class="mt-2 w-full rounded-xl bg-black/40 border-white/10 font-mono" placeholder="例如：xxx@xx.com" />
            </div>
            <div>
              <label class="block text-xs font-mono text-white/60">补充关键词（可选）</label>
              <textarea
                v-model="form.keywords"
                class="mt-2 w-full min-h-[84px] rounded-xl bg-black/40 border-white/10 font-mono"
                placeholder="例如：nodejs mysql vue"
              />
            </div>
            <div>
              <label class="block text-xs font-mono text-white/60">简历（PDF/Word，<= 5MB）</label>
              <input
                ref="resumeRef"
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                class="mt-2 block w-full text-xs font-mono text-white/70"
              />
            </div>
            <div>
              <label class="block text-xs font-mono text-white/60">图片（可选，JPG/PNG/WebP，<= 5MB）</label>
              <input
                ref="imageRef"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="mt-2 block w-full text-xs font-mono text-white/70"
              />
            </div>
            <div>
              <label class="block text-xs font-mono text-white/60">视频（可选，MP4，<= 50MB）</label>
              <input
                ref="videoRef"
                type="file"
                accept="video/mp4"
                class="mt-2 block w-full text-xs font-mono text-white/70"
              />
            </div>
          </div>

          <div class="mt-5 flex items-center justify-between gap-3">
            <div v-if="success" class="text-xs font-mono text-neon">报名成功（#{{ success.interviewId }}）</div>
            <div v-else class="text-xs font-mono text-white/55">
              提交后可用 IP 访问测试环境（未备案域名可能不稳定）。
            </div>
            <button
              class="rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-2 text-cyan hover:bg-cyan/15 disabled:opacity-50 font-mono"
              :disabled="loading || !canSubmit"
              @click="submit"
            >
              {{ loading ? "提交中..." : "提交报名" }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="success?.questions?.length" class="mt-6 rounded-3xl border border-white/10 bg-bg1/60 p-6">
        <div class="text-xs font-mono text-white/60">随机题目（通过筛选后下发 1-3 题）</div>
        <div class="mt-3 space-y-3">
          <div v-for="(q, idx) in success.questions" :key="q.id" class="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div class="text-[11px] font-mono text-white/55">第 {{ idx + 1 }} 题</div>
            <div class="mt-2 text-sm font-mono text-white/85 leading-relaxed">{{ q.content }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import BrandHeader from "../components/BrandHeader.vue";
import { http } from "../api";

const route = useRoute();
const slug = String(route.params.slug || "").trim();

const post = ref(null);
const jobs = ref([]);
const error = ref("");
const loading = ref(false);
const success = ref(null);
const resumeRef = ref(null);
const imageRef = ref(null);
const videoRef = ref(null);

const form = ref({
  jobId: String(route.query.jobId || ""),
  name: "",
  phone: "",
  email: "",
  keywords: ""
});

const selectedJob = computed(() => {
  const id = Number(form.value.jobId);
  return jobs.value.find((j) => Number(j.id) === id) || null;
});

const canSubmit = computed(() => {
  if (!form.value.jobId) return false;
  if (!String(form.value.name || "").trim()) return false;
  if (!String(form.value.phone || "").trim()) return false;
  if (!String(form.value.email || "").trim()) return false;
  const f = resumeRef.value?.files?.[0];
  return Boolean(f);
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
    const { data } = await http.get(`/api/public/posts/${encodeURIComponent(slug)}`);
    post.value = data.post;
    jobs.value = data.jobs || [];
    if (!form.value.jobId && jobs.value.length) form.value.jobId = String(jobs.value[0].id);
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "加载失败";
  }
}

async function submit() {
  error.value = "";
  success.value = null;
  const resumeFile = resumeRef.value?.files?.[0];
  const imageFile = imageRef.value?.files?.[0];
  const videoFile = videoRef.value?.files?.[0];
  if (!resumeFile) {
    error.value = "请上传简历。";
    return;
  }
  loading.value = true;
  try {
    const fd = new FormData();
    fd.append("job_id", String(form.value.jobId || ""));
    fd.append("name", String(form.value.name || ""));
    fd.append("phone", String(form.value.phone || ""));
    fd.append("email", String(form.value.email || ""));
    fd.append("user_keywords", String(form.value.keywords || ""));
    fd.append("resume", resumeFile);
    if (imageFile) fd.append("image", imageFile);
    if (videoFile) fd.append("video", videoFile);

    const { data } = await http.post(`/api/public/posts/${encodeURIComponent(slug)}/apply`, fd, {
      headers: { "content-type": "multipart/form-data" }
    });
    success.value = data;
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "提交失败";
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
