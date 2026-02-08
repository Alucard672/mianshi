<template>
    <div class="space-y-4">
      <div class="rounded-2xl border border-white/10 bg-bg1/50 p-5">
      <div class="text-xs font-mono text-white/60">面试总分</div>
      <div class="mt-2 text-3xl font-mono font-semibold text-neon">{{ total.toFixed(0) }}</div>
      <div class="mt-2 text-xs font-mono text-white/55">
        建议：关键词命中占 60%，表达占 40%。尽量给出结构化回答（首先/其次/最后），并覆盖岗位核心技术词。
      </div>
    </div>

    <div v-for="r in results" :key="r.questionId" class="rounded-2xl border border-white/10 bg-black/25 p-5">
      <div class="text-xs font-mono text-white/60">第 {{ r.order }} 题</div>
      <div class="mt-2 font-mono text-white/90 leading-relaxed">
        {{ r.question }}
      </div>

      <div class="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="rounded-xl border border-white/10 bg-white/5 p-3">
          <div class="text-xs font-mono text-white/60">本题得分</div>
          <div class="mt-1 text-2xl font-mono font-semibold text-cyan">
            {{ r.itemScore.toFixed(0) }}
          </div>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/5 p-3">
          <div class="text-xs font-mono text-white/60">关键词（60）</div>
          <div class="mt-1 text-xl font-mono text-neon">
            {{ r.breakdown.keywordScore.toFixed(1) }}
          </div>
          <div class="mt-1 text-[11px] font-mono text-white/55">
            命中 {{ r.breakdown.hitCount }} / {{ r.breakdown.coreCount }}
          </div>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/5 p-3">
          <div class="text-xs font-mono text-white/60">表达（40）</div>
          <div class="mt-1 text-xl font-mono text-white">
            {{ r.breakdown.expressionScore.toFixed(1) }}
          </div>
          <div class="mt-1 text-[11px] font-mono text-white/55">
            长度 {{ r.breakdown.lengthScore.toFixed(1) }} / 逻辑词 {{ r.breakdown.logicScore.toFixed(1) }}
          </div>
        </div>
      </div>

      <details class="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <summary class="cursor-pointer text-xs font-mono text-white/70">你的回答</summary>
        <div class="mt-2 whitespace-pre-wrap text-xs font-mono text-white/70">
          {{ r.answer }}
        </div>
      </details>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  results: { type: Array, required: true }
});

const total = computed(() => props.results.reduce((acc, r) => acc + (r.itemScore || 0), 0));
</script>
