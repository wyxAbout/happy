<template>
  <div class="progress-bar-container mt-3">
    <div class="progress-bar bg-white/10 backdrop-blur-sm rounded-full h-3.5 overflow-hidden shadow-inner border border-white/10">
      <div 
        class="progress-fill h-full rounded-full transition-all duration-500 ease-out"
        :style="{ width: `${progress}%` }"
      ></div>
    </div>
    <div class="progress-info flex justify-between mt-1.5 text-xs text-white/70 font-medium">
      <span>{{ Math.floor(progress) }}%</span>
      <span>{{ score }} / {{ target }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  score: Number,
  target: Number
})

const progress = computed(() => {
  return Math.min(100, (props.score / props.target) * 100)
})
</script>

<style scoped>
.progress-bar-container {
  padding: 0 4px;
}

.progress-fill {
  box-shadow: 0 0 12px rgba(72, 219, 251, 0.5);
  background: linear-gradient(90deg, #f97316, #fbbf24, #34d399);
}
</style>
