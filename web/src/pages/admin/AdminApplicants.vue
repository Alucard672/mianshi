<template>
  <div class="space-y-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-xs font-mono text-white/60">面试人员</div>
        <div class="mt-2 text-sm text-white/70">报名/投递进入系统的面试人员列表，可查看简历与关键信息。</div>
      </div>
      <button class="btn" @click="load">刷新</button>
    </div>

    <div v-if="error" class="text-xs font-mono text-red-300">{{ error }}</div>

    <div class="rounded-2xl border border-white/10 bg-black/25 overflow-hidden">
      <div class="grid grid-cols-12 gap-2 px-4 py-3 text-[11px] font-mono text-white/55 border-b border-white/10">
        <div class="col-span-2">面试ID</div>
        <div class="col-span-3">候选人</div>
        <div class="col-span-3">岗位</div>
        <div class="col-span-2">阶段</div>
        <div class="col-span-2 text-right">操作</div>
      </div>
      <div v-for="it in interviews" :key="it.id" class="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/10">
        <div class="col-span-2 text-xs font-mono text-white/85">#{{ it.id }}</div>
        <div class="col-span-3">
          <div class="text-xs font-mono text-white/85">{{ it.user_name }}</div>
          <div class="mt-1 text-[11px] font-mono text-white/55">
            {{ it.user_phone || "-" }} | {{ it.user_email || "-" }}
          </div>
        </div>
        <div class="col-span-3 text-xs font-mono text-white/80">
          {{ it.job_title }}
        </div>
        <div class="col-span-2 text-xs font-mono text-white/70">
          {{ it.stage }}
        </div>
        <div class="col-span-2 flex justify-end">
          <button class="btn btn-primary" @click="openDetail(it.id)">查看</button>
        </div>
      </div>
      <div v-if="!interviews.length" class="px-4 py-6 text-xs font-mono text-white/55">
        暂无数据。
      </div>
    </div>

    <div v-if="detail" class="rounded-2xl border border-white/10 bg-bg1/60 p-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="text-xs font-mono text-white/60">详情</div>
          <div class="mt-1 text-sm font-mono text-white/85">
            #{{ detail.id }} | {{ detail.user.username }} | {{ detail.job.title }}
          </div>
          <div class="mt-2 text-[11px] font-mono text-white/55">
            {{ detail.user.phone || "-" }} | {{ detail.user.email || "-" }} | {{ detail.created_at }}
          </div>
        </div>
        <button class="btn" @click="detail = null">关闭</button>
      </div>

      <div class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="rounded-xl border border-white/10 bg-black/25 p-4">
          <div class="text-[11px] font-mono text-white/55">简历</div>
          <div class="mt-2 text-xs font-mono text-white/80 break-all">
            {{ detail.resume_path || "-" }}
          </div>
          <a
            v-if="detail.resume_path"
            class="mt-3 inline-block text-xs font-mono text-cyan hover:underline"
            :href="resumeUrl(detail.resume_path)"
            target="_blank"
            rel="noreferrer"
          >
            打开简历
          </a>
        </div>
        <div class="rounded-xl border border-white/10 bg-black/25 p-4">
          <div class="text-[11px] font-mono text-white/55">图片 / 视频</div>
          <div class="mt-2 text-xs font-mono text-white/80 break-all">
            图片：{{ detail.image_path || "-" }}
          </div>
          <a
            v-if="detail.image_path"
            class="mt-2 inline-block text-xs font-mono text-cyan hover:underline"
            :href="resumeUrl(detail.image_path)"
            target="_blank"
            rel="noreferrer"
          >
            打开图片
          </a>
          <div class="mt-3 text-xs font-mono text-white/80 break-all">
            视频：{{ detail.video_path || "-" }}
          </div>
          <a
            v-if="detail.video_path"
            class="mt-2 inline-block text-xs font-mono text-cyan hover:underline"
            :href="resumeUrl(detail.video_path)"
            target="_blank"
            rel="noreferrer"
          >
            打开视频
          </a>
        </div>
        <div class="rounded-xl border border-white/10 bg-black/25 p-4">
          <div class="text-[11px] font-mono text-white/55">筛选</div>
          <div class="mt-2 text-xs font-mono text-white/80">
            MatchRate: {{ detail.match_rate == null ? "-" : detail.match_rate }}%
          </div>
          <div class="mt-2 text-xs font-mono text-white/80">
            关键词: {{ detail.user_keywords || "-" }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { http, uploadsUrl } from "../../api";

const error = ref("");
const interviews = ref([]);
const detail = ref(null);

function resumeUrl(p) {
  return uploadsUrl(p);
}

async function load() {
  error.value = "";
  try {
    const { data } = await http.get("/api/admin/interviews");
    interviews.value = data.interviews || [];
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "加载失败";
  }
}

async function openDetail(id) {
  error.value = "";
  try {
    const { data } = await http.get(`/api/admin/interviews/${id}`);
    detail.value = data.interview;
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "加载失败";
  }
}

onMounted(load);
</script>

<style scoped>
.btn {
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.75);
  padding: 10px 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}
.btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.92);
}
.btn-primary {
  border-color: rgba(124, 255, 178, 0.25);
  background: rgba(124, 255, 178, 0.10);
  color: rgba(124, 255, 178, 0.95);
}
.btn-primary:hover { background: rgba(124, 255, 178, 0.14); }
</style>
