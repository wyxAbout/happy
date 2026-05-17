<template>
  <div v-if="visible" class="modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div class="modal-content bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl transform animate-pop-in">
      <div class="text-6xl mb-4">
        {{ isWin ? (isLastLevel ? '🏆' : '🎉') : '😢' }}
      </div>
      <h2 class="text-2xl font-bold mb-2" :class="isWin ? 'text-green-600' : 'text-red-600'">
        {{ isWin ? (isLastLevel ? '恭喜通关！' : '恭喜过关！') : '游戏结束' }}
      </h2>
      
      <div v-if="level !== undefined" class="text-gray-500 text-sm mb-2">
        {{ isWin ? (isLastLevel ? '已完成所有关卡！' : `第 ${level} 关完成`) : `第 ${level} 关` }}
      </div>
      
      <div class="text-gray-600 mb-2">最终得分</div>
      <div class="text-4xl font-bold text-purple-600 mb-4">{{ score }}</div>
      
      <div v-if="highScore > 0" class="text-yellow-600 mb-4">
        🏆 最高记录: {{ highScore }}
      </div>
      
      <div v-if="isWin && !isLastLevel" class="bg-green-100 text-green-700 rounded-lg p-3 mb-4">
        目标分数: {{ level * 1000 }} | 已达成 ✔️
      </div>
      
      <div class="flex flex-col gap-3">
        <div class="flex gap-3 justify-center">
          <button 
            @click="$emit('restart')"
            class="btn-primary flex-1 max-w-[160px] bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-5 rounded-2xl
                   shadow-lg shadow-purple-500/25
                   transition-all duration-200 ease-out
                   hover:shadow-xl hover:shadow-purple-500/35 hover:-translate-y-1 hover:brightness-110
                   active:translate-y-0.5 active:scale-[0.97] active:shadow-sm
                   focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
          >
            {{ isWin ? '重新开始' : '再来一局' }}
          </button>
          <button 
            v-if="isWin && !isLastLevel"
            @click="$emit('nextLevel')"
            class="btn-secondary flex-1 max-w-[160px] bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold py-3 px-5 rounded-2xl
                   shadow-lg shadow-emerald-500/25
                   transition-all duration-200 ease-out
                   hover:shadow-xl hover:shadow-emerald-500/35 hover:-translate-y-1 hover:brightness-110
                   active:translate-y-0.5 active:scale-[0.97] active:shadow-sm
                   focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
          >
            下一关
          </button>
        </div>
        
        <div v-if="isWin && isLastLevel" class="text-yellow-500 text-lg font-medium">
          🎊 你已完成全部 {{ totalLevels }} 关！ 🎊
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: Boolean,
  isWin: Boolean,
  score: Number,
  highScore: Number,
  level: Number,
  totalLevels: {
    type: Number,
    default: 24
  }
})

defineEmits(['restart', 'nextLevel'])

const isLastLevel = computed(() => {
  return props.level === props.totalLevels
})
</script>

<style scoped>
.modal-overlay {
  backdrop-filter: blur(5px);
}

.animate-pop-in {
  animation: popIn 0.3s ease-out;
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
