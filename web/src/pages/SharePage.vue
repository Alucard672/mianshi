<template>
  <div class="min-h-screen">
    <div class="absolute inset-0 grid-overlay pointer-events-none opacity-30"></div>
    <div class="relative mx-auto max-w-4xl px-4 py-10">
      <div class="flex items-center justify-between gap-3">
        <BrandHeader />
        <router-link
          to="/login"
          class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-mono text-white/70 hover:bg-white/10"
        >
          返回登录
        </router-link>
      </div>

      <div class="mt-8 rounded-2xl border border-white/10 bg-bg1/60 p-6">
        <div class="text-xs font-mono text-white/60">候选人投递（分享链接）</div>
        <div class="mt-2 text-sm text-white/70">
          通过 HR 分享的链接进入后，你可以查看岗位信息并上传简历。无需手动填写任何 token。
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div class="lg:col-span-2 rounded-2xl border border-white/10 bg-black/25 p-6">
          <div class="text-xs font-mono text-white/60">岗位信息</div>
          <div class="mt-3 text-sm font-mono text-white/85">
            岗位：<span class="text-neon">{{ job?.title || "-" }}</span>
          </div>
          <div class="mt-2 text-[11px] font-mono text-white/55">
            关键词：{{ job?.target_keywords || "-" }}
          </div>

          <div v-if="inviteState" class="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <div class="text-[11px] font-mono text-white/55">链接状态</div>
            <div class="mt-1 text-xs font-mono text-white/80">
              {{ inviteState }}
            </div>
          </div>

          <div v-if="error" class="mt-4 text-xs font-mono text-red-300">{{ error }}</div>
        </div>

        <div class="rounded-2xl border border-white/10 bg-black/25 p-6">
          <div class="text-xs font-mono text-white/60">上传简历</div>
          <div class="mt-4 space-y-3">
            <div>
              <label class="block text-xs font-mono text-white/60">姓名</label>
              <input v-model="form.username" class="mt-2 w-full rounded-xl bg-black/40 border-white/10 font-mono" placeholder="例如：张三" />
            </div>
            <div>
              <label class="block text-xs font-mono text-white/60">邮箱</label>
              <input v-model="form.email" class="mt-2 w-full rounded-xl bg-black/40 border-white/10 font-mono" placeholder="例如：xxx@xx.com" />
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
              <label class="block text-xs font-mono text-white/60">补充关键词（可选）</label>
              <textarea
                v-model="form.userKeywords"
                class="mt-2 w-full min-h-[84px] rounded-xl bg-black/40 border-white/10 font-mono"
                placeholder="可选：补充你的关键词（例如：nodejs mysql）"
              />
            </div>
          </div>

          <div class="mt-5 flex items-center justify-end">
            <button
              class="rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-2 text-cyan hover:bg-cyan/15 disabled:opacity-50 font-mono"
              :disabled="loading || !canSubmit"
              @click="submit"
            >
              {{ loading ? "提交中..." : "提交简历" }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="preview.resumeUrl" class="mt-6 rounded-2xl border border-white/10 bg-black/25 p-6">
        <div class="text-xs font-mono text-white/60">简历预览</div>
        <iframe :src="preview.resumeUrl" class="mt-3 h-[420px] w-full rounded-xl border border-white/10"></iframe>
      </div>

      <div v-if="submitted" class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div class="rounded-2xl border border-white/10 bg-bg1/60 p-6 lg:col-span-1">
          <div class="text-xs font-mono text-white/60">筛选结果</div>
          <div class="mt-4 flex justify-center">
            <MatchingCircle :rate="match.matchRate" :passed="match.passed" />
          </div>
          <div class="mt-4 text-sm font-mono">
            <span :class="match.passed ? 'text-neon' : 'text-cyan'">{{ match.passed ? "通过" : "未通过" }}</span>
            <span class="text-white/55">（阈值 60%）</span>
          </div>
          <div class="mt-2 text-xs font-mono text-white/55">
            命中关键词：<span class="text-white/80">{{ (match.hits || []).join(", ") || "-" }}</span>
          </div>
          <div class="mt-4 text-[11px] font-mono text-white/55">
            下一步：HR 将根据结果安排后续面试流程。
          </div>
        </div>

        <div class="rounded-2xl border border-white/10 bg-black/25 p-6 lg:col-span-2">
          <div class="text-xs font-mono text-white/60">随机题目（通过后下发 1-3 题）</div>
          <div class="mt-3 space-y-3">
            <div v-for="q in questions" :key="q.id" class="rounded-xl border border-white/10 bg-white/5 p-4">
              <div class="text-xs font-mono text-white/60">第 {{ q.ord }} 题 | {{ q.category || "通用" }}</div>
              <div class="mt-2 text-sm font-mono leading-relaxed text-white/85">{{ q.content }}</div>
            </div>
            <div v-if="match.passed && !questions.length" class="text-xs font-mono text-white/55">
              题库为空，请联系 HR。
            </div>
            <div v-if="!match.passed" class="text-xs font-mono text-white/55">
              未通过筛选，本次投递已结束。
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import BrandHeader from "../components/BrandHeader.vue";
import MatchingCircle from "../components/MatchingCircle.vue";
import { http, uploadsUrl } from "../api";

const route = useRoute();

const loading = ref(false);
const error = ref("");

const token = computed(() => String(route.params.token || "").trim());
const job = ref(null);
const invite = ref(null);
const inviteState = ref("");

const resumeRef = ref(null);
const form = reactive({ username: "", email: "", userKeywords: "" });

const preview = reactive({ resumeUrl: "" });
const submitted = ref(false);
const questions = ref([]);
const match = reactive({ matchRate: 0, passed: false, hits: [] });

const canSubmit = computed(() => {
  return Boolean(token.value) && Boolean(form.username.trim()) && Boolean(form.email.trim()) && Boolean(resumeRef.value?.files?.[0]);
});

async function loadInvite() {
  error.value = "";
  inviteState.value = "";
  const { data } = await http.get(`/api/invite/${encodeURIComponent(token.value)}`);
  invite.value = data.invitation;
  job.value = data.job;
  if (data.invitation?.expired) inviteState.value = "已过期";
  else if (data.invitation?.exhausted) inviteState.value = "已用完";
  else inviteState.value = "有效";
}

async function submit() {
  error.value = "";
  const resume = resumeRef.value?.files?.[0];
  if (!resume) return;
  loading.value = true;
  try {
    const fd = new FormData();
    fd.append("invite_token", token.value);
    fd.append("username", form.username);
    fd.append("email", form.email);
    if (form.userKeywords.trim()) fd.append("user_keywords", form.userKeywords);
    fd.append("resume", resume);

    const { data } = await http.post("/api/candidate/submit-resume", fd, {
      headers: { "Content-Type": "multipart/form-data" }
    });

    preview.resumeUrl = uploadsUrl(data.resumePath);
    match.matchRate = Number(data.match?.matchRate || 0);
    match.passed = Boolean(data.match?.passed);
    match.hits = data.match?.hits || [];
    questions.value = (data.questions || []).map((q, i) => ({
      id: q.id,
      ord: i + 1,
      content: q.content,
      category: q.category
    }));
    submitted.value = true;
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "提交失败";
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  if (!token.value) return;
  try {
    await loadInvite();
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "邀请链接不可用";
  }
});
</script>

