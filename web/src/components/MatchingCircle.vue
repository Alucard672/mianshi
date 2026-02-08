<template>
  <div class="relative grid place-items-center">
    <svg :width="size" :height="size" class="drop-shadow-[0_0_18px_rgba(124,255,178,0.18)]">
      <circle
        :cx="c"
        :cy="c"
        :r="r"
        stroke="rgba(255,255,255,0.10)"
        :stroke-width="stroke"
        fill="transparent"
      />
      <circle
        :cx="c"
        :cy="c"
        :r="r"
        :stroke="passed ? 'rgba(124,255,178,0.9)' : 'rgba(100,210,255,0.9)'"
        :stroke-width="stroke"
        fill="transparent"
        stroke-linecap="round"
        :stroke-dasharray="dashArray"
        :stroke-dashoffset="dashOffset"
        :transform="`rotate(-90 ${c} ${c})`"
        class="transition-[stroke-dashoffset] duration-700 ease-out"
      />
    </svg>
    <div class="absolute text-center">
      <div class="text-3xl font-mono font-semibold">
        {{ rate.toFixed(0) }}%
      </div>
      <div class="text-xs font-mono tracking-wide text-white/60 mt-1">
        匹配度
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  rate: { type: Number, required: true },
  passed: { type: Boolean, required: true },
  size: { type: Number, default: 180 }
});

const stroke = 12;
const c = computed(() => props.size / 2);
const r = computed(() => props.size / 2 - stroke - 2);
const circumference = computed(() => 2 * Math.PI * r.value);

const dashArray = computed(() => `${circumference.value} ${circumference.value}`);
const dashOffset = computed(() => {
  const p = Math.max(0, Math.min(100, props.rate)) / 100;
  return circumference.value * (1 - p);
});
</script>
