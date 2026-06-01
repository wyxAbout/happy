<script setup>
/**
 * Controls.vue — 游戏控制按钮组件
 *
 * 【功能概述】
 * 提供三个游戏控制按钮：重新开始、重新排列、提示。
 * 每个按钮通过 emit 向上传递事件，父组件（App.vue）处理具体逻辑。
 *
 * 【事件】
 * @event restart - 点击"重新开始"按钮
 * @event shuffle - 点击"重新排列"按钮
 * @event hint   - 点击"提示"按钮
 *
 * 【样式特性】
 * - 毛玻璃效果（bg-white/10 + backdrop-blur-md）
 * - hover 时上浮（-translate-y-1）并增强阴影
 * - active 时缩小（scale-[0.97]）
 * - 内置 SVG 图标，无外部依赖
 *
 * 【使用示例】
 *   <Controls @restart="handleRestart" @shuffle="handleShuffle" @hint="handleHint" />
 */

defineEmits(['restart', 'shuffle', 'hint'])
</script>

<template>
  <div class="controls flex gap-2.5 mt-3">
    <button
      @click="$emit('restart')"
      class="control-card group flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-2xl
             bg-white/10 backdrop-blur-md border border-white/15
             shadow-md shadow-black/10
             transition-all duration-200 ease-out
             hover:bg-white/20 hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-1
             active:translate-y-0.5 active:scale-[0.97] active:shadow-sm
             focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none"
      style="min-height: 52px; min-width: 52px;"
    >
      <svg class="w-6 h-6 text-white/90 group-hover:scale-110 group-hover:text-white transition-all duration-200 group-active:scale-95" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
      <span class="text-xs font-semibold text-white/80 group-hover:text-white transition-colors">重新开始</span>
    </button>

    <button
      @click="$emit('shuffle')"
      class="control-card group flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-2xl
             bg-white/10 backdrop-blur-md border border-white/15
             shadow-md shadow-black/10
             transition-all duration-200 ease-out
             hover:bg-white/20 hover:shadow-xl hover:shadow-cyan-500/20 hover:-translate-y-1
             active:translate-y-0.5 active:scale-[0.97] active:shadow-sm
             focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none"
      style="min-height: 52px; min-width: 52px;"
    >
      <svg class="w-6 h-6 text-white/90 group-hover:scale-110 group-hover:text-white transition-all duration-200 group-active:scale-95" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="16 3 21 3 21 8" />
        <line x1="4" y1="20" x2="21" y2="3" />
        <polyline points="21 16 21 21 16 21" />
        <line x1="15" y1="15" x2="21" y2="21" />
        <line x1="4" y1="4" x2="9" y2="9" />
      </svg>
      <span class="text-xs font-semibold text-white/80 group-hover:text-white transition-colors">重新排列</span>
    </button>

    <button
      @click="$emit('hint')"
      class="control-card group flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-2xl
             bg-white/10 backdrop-blur-md border border-white/15
             shadow-md shadow-black/10
             transition-all duration-200 ease-out
             hover:bg-white/20 hover:shadow-xl hover:shadow-amber-500/20 hover:-translate-y-1
             active:translate-y-0.5 active:scale-[0.97] active:shadow-sm
             focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none"
      style="min-height: 52px; min-width: 52px;"
    >
      <svg class="w-6 h-6 text-white/90 group-hover:scale-110 group-hover:text-white transition-all duration-200 group-active:scale-95" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
      </svg>
      <span class="text-xs font-semibold text-white/80 group-hover:text-white transition-colors">提示</span>
    </button>
  </div>
</template>

<style scoped>
.controls {
  width: 100%;
}

.control-card {
  position: relative;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}

.control-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(255,255,255,0.3) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.4s ease-out;
}

.control-card:active::after {
  opacity: 1;
  transition: opacity 0s;
}
</style>
