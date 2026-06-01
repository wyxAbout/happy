<script setup>
/**
 * LoadingScreen.vue — 加载屏幕组件
 *
 * 【功能概述】
 * 应用初始化时的全屏加载界面。
 * 支持两种状态：
 * - 正常加载：显示进度条（百分比 + 渐变进度条）
 * - 加载失败：显示错误信息和"重新加载"按钮
 *
 * 【Props】
 * @prop {number} progress - 加载进度（0~100）
 * @prop {string|null} error - 错误信息，非 null 时显示错误状态
 *
 * 【事件】
 * @event retry - 用户点击"重新加载"按钮
 *
 * 【使用示例】
 *   <LoadingScreen :progress="50" :error="null" @retry="handleRetry" />
 */

defineProps({
  progress: {
    type: Number,
    default: 0
  },
  error: {
    type: String,
    default: null
  }
})

defineEmits(['retry'])
</script>

<template>
  <div class="loading-screen fixed inset-0 bg-gradient-to-b from-[#4793cf] to-[#5db6e0] flex items-center justify-center z-50">
    <div class="loading-content text-center text-white max-w-sm mx-auto px-6">
      <div class="loading-icon text-6xl mb-6 animate-bounce">
        🎮
      </div>
      <h2 class="text-2xl font-bold mb-4">{{ error ? '加载失败' : '加载中...' }}</h2>
      
      <div v-if="error" class="error-message mb-6">
        <div class="bg-red-500/20 backdrop-blur-sm rounded-xl p-4 border border-red-300/30">
          <p class="text-red-100 mb-4">{{ error }}</p>
          <button
            @click="$emit('retry')"
            class="bg-white text-purple-600 font-bold py-2.5 px-7 rounded-2xl
                   shadow-lg shadow-black/20
                   transition-all duration-200 ease-out
                   hover:shadow-xl hover:-translate-y-1 hover:bg-pink-50
                   active:translate-y-0.5 active:scale-[0.97]
                   focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
          >
            重新加载
          </button>
        </div>
      </div>
      
      <div v-else class="loading-progress">
        <div class="progress-bar-container bg-white/20 rounded-full h-4 mb-2 overflow-hidden">
          <div
            class="progress-bar h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-300"
            :style="{ width: `${progress}%` }"
          ></div>
        </div>
        <p class="text-white/80">{{ Math.round(progress) }}%</p>
        <p class="text-sm text-white/60 mt-2">正在加载游戏资源...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.animate-bounce {
  animation: bounce 1.5s ease-in-out infinite;
}
</style>
