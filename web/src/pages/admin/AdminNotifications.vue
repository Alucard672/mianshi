<template>
  <div class="space-y-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-xs font-mono text-white/60">通知</div>
        <div class="mt-2 text-sm text-white/70">集中查看系统通知，支持未读标记与批量已读。</div>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn" @click="markAll">全部已读</button>
        <button class="btn" @click="reload">刷新</button>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button class="tab" :class="filter === 'unread' ? 'tab-on' : ''" @click="filter = 'unread'">
        未读（{{ unread }}）
      </button>
      <button class="tab" :class="filter === 'all' ? 'tab-on' : ''" @click="filter = 'all'">
        全部（{{ allCount }}）
      </button>
    </div>

    <div class="rounded-2xl border border-white/10 bg-black/25 overflow-hidden">
      <div v-for="n in visible" :key="n.id" class="row" :class="n.readAt ? 'row-read' : 'row-unread'">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-xs font-mono text-white/85 truncate">{{ n.title }}</div>
            <div class="mt-1 text-[11px] font-mono text-white/55">{{ fmtTime(n.createdAt) }}</div>
            <div v-if="n.body" class="mt-2 text-xs text-white/70">{{ n.body }}</div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button v-if="!n.readAt" class="btn btn-primary" @click="markRead(n.id)">标记已读</button>
            <button v-if="n.href" class="btn" @click="open(n)">查看</button>
          </div>
        </div>
      </div>
      <div v-if="!visible.length" class="px-4 py-6 text-xs font-mono text-white/55">暂无通知。</div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadCount
} from "../../notifications";

const router = useRouter();

const list = ref([]);
const filter = ref("unread"); // unread | all

function reload() {
  list.value = loadNotifications();
}

function markAll() {
  list.value = markAllNotificationsRead();
}

function markRead(id) {
  list.value = markNotificationRead(id);
}

function open(n) {
  if (!n) return;
  if (n.id) list.value = markNotificationRead(n.id);
  if (n.href) router.push(String(n.href));
}

function fmtTime(ts) {
  const t = new Date(Number(ts || 0));
  if (Number.isNaN(t.getTime())) return "-";
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  const hh = String(t.getHours()).padStart(2, "0");
  const mm = String(t.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

const unread = computed(() => unreadCount(list.value));
const allCount = computed(() => list.value.length);
const visible = computed(() => {
  if (filter.value === "all") return list.value;
  return list.value.filter((x) => x && !x.readAt);
});

onMounted(reload);
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
.btn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.92); }
.btn-primary {
  border-color: rgba(124, 255, 178, 0.25);
  background: rgba(124, 255, 178, 0.10);
  color: rgba(124, 255, 178, 0.95);
}
.btn-primary:hover { background: rgba(124,255,178,0.14); }
.tab {
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.70);
  padding: 8px 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}
.tab:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.9); }
.tab-on {
  border-color: rgba(100,210,255,0.35);
  background: rgba(100,210,255,0.12);
  color: rgba(100,210,255,0.95);
}
.row {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.row:last-child { border-bottom: none; }
.row-unread { background: rgba(100, 210, 255, 0.04); }
.row-read { background: transparent; }
</style>

