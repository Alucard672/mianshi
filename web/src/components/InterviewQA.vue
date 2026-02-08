<template>
  <div class="space-y-5">
    <div class="rounded-2xl border border-white/10 bg-bg1/60 p-5 relative overflow-hidden">
      <div class="absolute inset-0 grid-overlay pointer-events-none opacity-50"></div>
      <div class="relative">
        <div class="text-xs font-mono text-white/60">第 {{ idx + 1 }} 题 / 共 {{ questions.length }} 题</div>
        <div class="mt-3 text-lg sm:text-xl leading-relaxed">
          <span class="font-mono text-cyan/90">$</span>
          <span class="ml-2 font-mono">{{ typed }}</span>
          <span class="inline-block w-2 animate-pulse text-neon">|</span>
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-white/10 bg-black/30 p-5">
      <label class="block text-xs font-mono text-white/60">你的回答</label>
      <textarea
        v-model="answer"
        class="mt-2 w-full min-h-[180px] rounded-xl bg-black/40 border-white/10 text-slate-100 font-mono focus:border-cyan/60 focus:ring-cyan/30"
        placeholder="在这里输入你的回答..."
      />
      <div class="mt-2 flex items-center justify-between text-xs font-mono text-white/55">
        <div>字数：{{ answer.length }}</div>
        <div class="flex items-center gap-2">
          <button
            class="rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
            :disabled="submitting"
            @click="clear"
          >
            清空
          </button>
          <button
            class="rounded-lg border border-neon/30 bg-neon/10 px-4 py-2 text-neon hover:bg-neon/15 disabled:opacity-50"
            :disabled="submitting || !answer.trim()"
            @click="submit"
          >
            {{ submitting ? "评分中..." : "提交" }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="lastScore" class="rounded-2xl border border-white/10 bg-bg1/50 p-5">
      <div class="text-xs font-mono text-white/60">本题得分</div>
      <div class="mt-2 flex flex-wrap items-baseline gap-3">
        <div class="text-3xl font-mono font-semibold text-neon">{{ lastScore.itemScore.toFixed(0) }}</div>
        <div class="text-xs font-mono text-white/55">
          关键词 {{ lastScore.breakdown.keywordScore.toFixed(1) }} / 60，
          表达 {{ lastScore.breakdown.expressionScore.toFixed(1) }} / 40
        </div>
      </div>
      <div class="mt-3 text-xs font-mono text-white/55">
        面试累计总分：{{ lastScore.totalScore.toFixed(0) }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps({
  interviewId: { type: Number, required: true },
  questions: { type: Array, required: true },
  onSubmitAnswer: { type: Function, required: true },
  onFinished: { type: Function, required: true }
});

const idx = ref(0);
const answer = ref("");
const submitting = ref(false);
const typed = ref("");
const lastScore = ref(null);

const current = computed(() => props.questions[idx.value] || null);

let timer = null;
function startTypewriter(text) {
  typed.value = "";
  if (timer) clearInterval(timer);
  const s = String(text || "");
  let i = 0;
  timer = setInterval(() => {
    i += 1;
    typed.value = s.slice(0, i);
    if (i >= s.length) {
      clearInterval(timer);
      timer = null;
    }
  }, 18);
}

watch(
  () => current.value?.content,
  (v) => startTypewriter(v),
  { immediate: true }
);

function clear() {
  answer.value = "";
}

async function submit() {
  if (!current.value) return;
  submitting.value = true;
  try {
    const resp = await props.onSubmitAnswer({
      interviewId: props.interviewId,
      questionId: current.value.id,
      answer: answer.value
    });
    lastScore.value = resp;

    // advance
    answer.value = "";
    if (idx.value + 1 >= props.questions.length) {
      props.onFinished();
      return;
    }
    idx.value += 1;
  } finally {
    submitting.value = false;
  }
}

onMounted(() => startTypewriter(current.value?.content));
onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
</script>
