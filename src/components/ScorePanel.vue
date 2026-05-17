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

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  score: Number,
  target: Number,
  moves: Number
})

defineEmits(['scoreAnimEnd'])

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

<style scoped>
.animate-bounce-score {
  animation: bounceScore 0.5s ease-out;
}

@keyframes bounceScore {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}
</style>
