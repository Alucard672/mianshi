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
          初次报名仅需上传简历（PDF/Word，<= 5MB）。系统会解析简历并进行关键词匹配，随后随机下发 3 道题目，请上传答题视频（MP4，<= 50MB）。
          提交后会进入系统，供 HR 在后台查看并安排复面。
        </div>
      </div>

      <div v-if="error" class="mt-6 text-xs font-mono text-red-300">{{ error }}</div>

      <div class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div class="lg:col-span-2 rounded-3xl border border-white/10 bg-black/25 p-6">
          <div class="text-xs font-mono text-white/60">岗位</div>
          <div v-if="route.query.jobId" class="mt-3 text-sm font-mono text-white/85">
            已选择：{{ selectedJob?.title || "-" }}
          </div>
          <select
            v-else
            v-model="form.jobId"
            class="mt-3 w-full rounded-xl bg-black/40 border-white/10 font-mono"
          >
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
          <div class="text-xs font-mono text-white/60">报名</div>

          <div class="mt-4 space-y-3">
            <div>
              <label class="block text-xs font-mono text-white/60">简历（PDF/Word，<= 5MB）</label>
              <input
                ref="resumeRef"
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                class="mt-2 block w-full text-xs font-mono text-white/70"
                @change="onResumeChange"
              />
            </div>
            <div class="text-[11px] font-mono text-white/55">
              系统会自动解析简历中的联系方式并做关键词匹配，然后下发 3 道题目。
            </div>
          </div>

          <div class="mt-5 flex items-center justify-between gap-3">
            <div v-if="success" class="text-xs font-mono text-neon">简历提交成功（#{{ success.interviewId }}）</div>
            <div v-else class="text-xs font-mono text-white/55">
              提交后可用 IP 访问测试环境（未备案域名可能不稳定）。
            </div>
            <button
              class="rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-2 text-cyan hover:bg-cyan/15 disabled:opacity-50 font-mono"
              :disabled="loading"
              @click="submit"
            >
              {{ loading ? "提交中..." : "提交简历" }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="success?.questions?.length" class="mt-6 rounded-3xl border border-white/10 bg-bg1/60 p-6">
        <div class="text-xs font-mono text-white/60">随机题目（请录制并上传答题视频）</div>
        <div class="mt-3 space-y-3">
          <div v-for="(q, idx) in success.questions" :key="q.id" class="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="text-[11px] font-mono text-white/55">第 {{ idx + 1 }} 题</div>
                <div class="mt-2 text-sm font-mono text-white/85 leading-relaxed whitespace-pre-wrap">{{ q.content }}</div>
              </div>
              <div class="shrink-0 text-[11px] font-mono text-white/55">{{ q.category || "通用" }}</div>
            </div>
            <div class="mt-3">
              <label class="block text-xs font-mono text-white/60">答题视频（MP4，<= 50MB）</label>
              <input
                type="file"
                accept="video/mp4"
                class="mt-2 block w-full text-xs font-mono text-white/70"
                @change="(e) => onAnswerVideoChange(q.id, e)"
              />
            </div>
          </div>
        </div>

        <div v-if="answerError" class="mt-4 text-xs font-mono text-red-300">{{ answerError }}</div>
        <div v-if="answerOk" class="mt-4 text-xs font-mono text-neon">答题视频已提交，HR 会尽快联系你。</div>

        <div class="mt-4 flex justify-end">
          <button
            class="rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-2 text-cyan hover:bg-cyan/15 disabled:opacity-50 font-mono"
            :disabled="answerLoading"
            @click="submitAnswers"
          >
            {{ answerLoading ? "提交中..." : "提交答题视频" }}
          </button>
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
const resumeFile = ref(null);
const answerVideos = ref({}); // { [questionId]: File }
const answerLoading = ref(false);
const answerError = ref("");
const answerOk = ref(false);

const form = ref({
  jobId: String(route.query.jobId || ""),
  keywords: ""
});

const selectedJob = computed(() => {
  const id = Number(form.value.jobId);
  return jobs.value.find((j) => Number(j.id) === id) || null;
});

const canSubmit = computed(() => {
  if (!form.value.jobId) return false;
  return Boolean(resumeFile.value);
});

function onResumeChange(e) {
  resumeFile.value = resumeRef.value?.files?.[0] || e?.target?.files?.[0] || null;
}

function onAnswerVideoChange(questionId, e) {
  const qid = Number(questionId);
  if (!Number.isFinite(qid)) return;
  const f = e?.target?.files?.[0] || null;
  if (!f) return;
  answerVideos.value = { ...answerVideos.value, [qid]: f };
}

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
  answerOk.value = false;
  answerError.value = "";
  if (!String(form.value.jobId || "").trim()) {
    error.value = "请选择岗位。";
    return;
  }
  if (!resumeFile.value && !resumeRef.value?.files?.[0]) {
    error.value = "请上传简历。";
    return;
  }
  // Fallback: some browsers don't trigger reactive updates for File objects reliably.
  if (!resumeFile.value) resumeFile.value = resumeRef.value?.files?.[0] || null;
  if (!imageFile.value) imageFile.value = imageRef.value?.files?.[0] || null;
  if (!videoFile.value) videoFile.value = videoRef.value?.files?.[0] || null;
  loading.value = true;
  try {
    const fd = new FormData();
    fd.append("job_id", String(form.value.jobId || ""));
    fd.append("user_keywords", String(form.value.keywords || ""));
    fd.append("resume", resumeFile.value);

    const { data } = await http.post(`/api/public/posts/${encodeURIComponent(slug)}/apply`, fd, {
      headers: { "content-type": "multipart/form-data" }
    });
    success.value = data;
    resumeFile.value = null;
    if (resumeRef.value) resumeRef.value.value = "";
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "提交失败";
  } finally {
    loading.value = false;
  }
}

const canSubmitAnswers = computed(() => {
  if (!success.value?.interviewId) return false;
  if (!success.value?.publicToken) return false;
  const qs = success.value?.questions || [];
  if (!Array.isArray(qs) || qs.length !== 3) return false;
  return qs.every((q) => Boolean(answerVideos.value?.[Number(q.id)]));
});

async function submitAnswers() {
  answerError.value = "";
  answerOk.value = false;
  const interviewId = Number(success.value?.interviewId || 0);
  const token = String(success.value?.publicToken || "").trim();
  if (!interviewId || !token) {
    answerError.value = "缺少面试信息，请刷新后重试。";
    return;
  }
  if (!canSubmitAnswers.value) {
    answerError.value = "请为每道题上传一个 MP4 视频后再提交。";
    return;
  }

  answerLoading.value = true;
  try {
    const fd = new FormData();
    fd.append("token", token);
    for (const q of success.value.questions || []) {
      const qid = Number(q?.id);
      const f = answerVideos.value?.[qid];
      if (qid && f) fd.append(`video_${qid}`, f);
    }
    await http.post(`/api/public/interviews/${encodeURIComponent(String(interviewId))}/answers`, fd, {
      headers: { "content-type": "multipart/form-data" }
    });
    answerOk.value = true;
  } catch (e) {
    answerError.value = e?.response?.data?.error || e?.message || "提交失败";
  } finally {
    answerLoading.value = false;
  }
}

onMounted(load);
</script>
