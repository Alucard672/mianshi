<template>
  <div class="w-full">
    <div class="flex items-center gap-3">
      <div
        v-for="s in props.steps"
        :key="s.id"
        class="flex items-center gap-3"
      >
        <div
          class="h-9 w-9 rounded-full border text-sm font-mono flex items-center justify-center"
          :class="circleClass(s.id)"
        >
          {{ s.id }}
        </div>
        <div class="text-xs sm:text-sm font-mono tracking-wide" :class="labelClass(s.id)">
          {{ s.label }}
        </div>
        <div v-if="s.id !== props.steps.length" class="h-px w-8 sm:w-14 bg-white/10"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  current: { type: Number, required: true },
  steps: {
    type: Array,
    default: () => [
      { id: 1, label: "上传" },
      { id: 2, label: "筛选" },
      { id: 3, label: "初面" },
      { id: 4, label: "反馈" }
    ]
  }
});

function circleClass(id) {
  if (id < props.current) return "border-neon/60 bg-neon/15 text-neon";
  if (id === props.current) return "border-cyan/70 bg-cyan/15 text-cyan";
  return "border-white/15 bg-white/5 text-white/60";
}

function labelClass(id) {
  if (id === props.current) return "text-white";
  if (id < props.current) return "text-neon/90";
  return "text-white/50";
}
</script>
