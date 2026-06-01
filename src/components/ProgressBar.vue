<script setup>
/**
 * ProgressBar.vue — 进度条组件
 *
 * 【功能概述】
 * 显示当前分数相对于目标分数的完成百分比进度。
 * 进度条使用渐变色彩（橙→黄→绿），有发光阴影效果。
 *
 * 【计算逻辑】
 * progress = min(100, (score / target) × 100)
 * 上限为 100%，防止超额时超出显示。
 *
 * 【Props】
 * @prop {number} score  - 当前得分
 * @prop {number} target - 目标分数
 *
 * 【使用示例】
 *   <ProgressBar :score="score" :target="target" />
 */

import { computed } from 'vue'

const props = defineProps({
  score: Number,
  target: Number
})

const progress = computed(() => {
  return Math.min(100, (props.score / props.target) * 100)
})
</script>

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

<style scoped>
.progress-bar-container {
  padding: 0 4px;
}

.progress-fill {
  box-shadow: 0 0 12px rgba(72, 219, 251, 0.5);
  background: linear-gradient(90deg, #f97316, #fbbf24, #34d399);
}
</style>
