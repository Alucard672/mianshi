<template>
  <div class="space-y-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-xs font-mono text-white/60">操作记录</div>
        <div class="mt-2 text-sm text-white/70">查看后台操作审计日志。</div>
      </div>
      <button class="btn" @click="load">刷新</button>
    </div>

    <div class="space-y-2 max-h-[640px] overflow-auto">
      <div v-for="l in logs" :key="l.id" class="rounded-xl border border-white/10 bg-white/5 p-4">
        <div class="flex items-center justify-between gap-3">
          <div class="text-xs font-mono text-white/85">
            #{{ l.id }} {{ l.action }} {{ l.entity_type }} {{ l.entity_id ?? "" }}
          </div>
          <div class="text-[11px] font-mono text-white/55">{{ l.created_at }}</div>
        </div>
        <div class="mt-2 text-[11px] font-mono text-white/55">
          操作人：{{ l.actor_name || l.actor_employee_id || "-" }} | IP：{{ l.ip || "-" }}
        </div>
      </div>
    </div>

    <div v-if="error" class="text-xs font-mono text-red-300">{{ error }}</div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { http } from "../../api";

const logs = ref([]);
const error = ref("");

async function load() {
  error.value = "";
  try {
    const { data } = await http.get("/api/admin/audit-logs?limit=120&offset=0");
    logs.value = data.logs || [];
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || "加载失败";
  }
}

onMounted(load);
</script>
