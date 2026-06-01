<script setup>
/**
 * GameOverModal.vue — 游戏结算弹窗组件
 *
 * 【功能概述】
 * 游戏结束（胜利或失败）时弹出的模态对话框。
 * 显示最终得分、最高纪录，并提供"重新开始"/"下一关"操作按钮。
 *
 * 【Props】
 * @prop {boolean} visible   - 是否显示弹窗
 * @prop {boolean} isWin     - 是否胜利（true=胜利, false=失败）
 * @prop {number}  score     - 最终得分
 * @prop {number}  highScore - 历史最高分
 * @prop {number}  level     - 当前关卡号
 * @prop {number}  totalLevels - 总关卡数（默认 24）
 *
 * 【事件】
 * @event restart   - 点击"重新开始"/"再来一局"
 * @event nextLevel - 点击"下一关"
 *
 * 【使用示例】
 *   <GameOverModal :visible="gameOver" :is-win="false" :score="1200" :high-score="5000" :level="3" @restart="handleRestart" />
 */

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

<template>
  <Teleport to="body">
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
  </Teleport>
</template>

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
