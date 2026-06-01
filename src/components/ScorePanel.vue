<script setup>
/**
 * ScorePanel.vue — 分数面板组件
 *
 * 【功能概述】
 * 显示游戏的三个核心数值：当前分数、目标分数、剩余步数。
 * 分数变化时有弹跳动画（bounceScore），步数 ≤5 时有红色脉冲警告。
 *
 * 【Props】
 * @prop {number} score  - 当前得分
 * @prop {number} target - 通关目标分数
 * @prop {number} moves  - 剩余可操作步数
 *
 * 【动画机制】
 * - 分数增加时：watch score → 添加 animate-bounce-score CSS 类 → 500ms 后移除
 * - 步数 ≤5：添加 text-red-300 animate-pulse 样式
 *
 * 【使用示例】
 *   <ScorePanel :score="score" :target="target" :moves="moves" />
 */

import { ref, watch } from 'vue'

const props = defineProps({
  score: Number,
  target: Number,
  moves: Number
})

let prevScore = 0
const scoreAnimation = ref(false)

watch(() => props.score, (newVal) => {
  if (newVal > prevScore) {
    scoreAnimation.value = true
    setTimeout(() => {
      scoreAnimation.value = false
    }, 500)
  }
  prevScore = newVal
})
</script>

<template>
  <div class="score-panel bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 shadow-lg shadow-black/10">
    <div class="flex justify-around items-center">
      <div class="score-item flex flex-col items-center bg-white/15 backdrop-blur-sm rounded-xl px-3.5 py-2 min-w-[70px] border border-white/10">
        <div class="text-white/70 text-xs font-medium">分数</div>
        <div class="text-white font-bold text-lg" :class="{ 'animate-bounce-score': scoreAnimation }">{{ score }}</div>
      </div>

      <div class="score-item flex flex-col items-center bg-white/15 backdrop-blur-sm rounded-xl px-3.5 py-2 min-w-[70px] border border-white/10">
        <div class="text-white/70 text-xs font-medium">目标</div>
        <div class="text-white font-bold text-lg">{{ target }}</div>
      </div>

      <div class="score-item flex flex-col items-center bg-white/15 backdrop-blur-sm rounded-xl px-3.5 py-2 min-w-[70px] border border-white/10">
        <div class="text-white/70 text-xs font-medium">剩余步数</div>
        <div class="text-white font-bold text-lg" :class="{ 'text-red-300 animate-pulse': moves <= 5 }">{{ moves }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-bounce-score {
  animation: bounceScore 0.5s ease-out;
}

@keyframes bounceScore {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}
</style>
