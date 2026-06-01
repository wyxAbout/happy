<script setup>
/**
 * GameTile.vue — 单个游戏方块渲染组件
 *
 * 【功能概述】
 * 渲染棋盘上的单个方块，支持以下视觉状态：
 * - 普通方块（emoji 或自定义图片）
 * - 选中高亮（金色光晕 + 放大）
 * - 消除动画（matched/popping → fadeOut 动画）
 * - 下落动画（falling + fallPhase start/end → CSS transition）
 * - 拖动偏移（dragOffset → CSS transform translate）
 * - 特殊方块（水平/垂直/炸弹 → 不同颜色光晕和箭头/炸弹图标）
 * - 特殊方块激活（specialActivated → 闪光动画）
 *
 * 【Props】
 * @prop {Object} tile       - 方块数据对象 {icon, selected, matched, falling, popping, special, ...}
 * @prop {number} index      - 方块在 grid 数组中的索引
 * @prop {number} cellSize   - 方块的像素尺寸
 * @prop {boolean} isSelected - 是否为当前选中方块
 * @prop {boolean} isDragging - 是否正在拖动中
 * @prop {{x:number, y:number}} dragOffset - 拖动偏移量（像素）
 *
 * 【事件】
 * @event click - 方块被点击，参数 index
 *
 * 【使用示例】
 *   <GameTile :tile="grid[i]" :index="i" :cell-size="40" :drag-offset="getTileOffset(i)" @click="handleClick" />
 */

import { computed } from 'vue'

const props = defineProps({
  tile: Object,
  index: Number,
  cellSize: Number,
  isSelected: Boolean,
  isDragging: {
    type: Boolean,
    default: false
  },
  dragOffset: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
})

const emit = defineEmits(['click'])

/**
 * 判断是否为自定义图片图标（以 / 开头的路径）
 */
const isCustomIcon = computed(() => {
  return props.tile.icon && props.tile.icon.startsWith('/')
})

/**
 * 判断是否有拖动偏移（非零）
 */
const hasDragOffset = computed(() => {
  return props.dragOffset.x !== 0 || props.dragOffset.y !== 0
})

/**
 * 动态计算方块样式
 *
 * 处理三种视觉模式：
 * 1. 拖动模式：translate 偏移 + 阴影增强 + z-index 提升
 * 2. 下落模式：fallPhase start（瞬间到上方）→ end（CSS transition 下落）
 * 3. 默认模式：基础尺寸 + 标准 transition
 *
 * @returns {Object} CSS 样式对象
 */
const tileStyle = computed(() => {
  const size = props.cellSize
  const { x, y } = props.dragOffset

  const style = {
    width: `${size}px`,
    height: `${size}px`,
    fontSize: `${size * 0.6}px`
  }

  if (x !== 0 || y !== 0) {
    style.transform = `translate(${x}px, ${y}px)`
    style.transition = 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)'
    style.zIndex = 10
    style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)'
    style.borderRadius = '16px'
    return style
  }

  if (props.tile.falling && (props.tile.fallDistance || 0) > 0) {
    const gap = 6
    const offsetY = -(props.tile.fallDistance) * (size + gap)

    if (props.tile.fallPhase === 'start') {
      style.transform = `translateY(${offsetY}px)`
      style.transition = 'none'
      style.zIndex = 5
    } else if (props.tile.fallPhase === 'end') {
      style.transform = 'translateY(0)'
      style.transition = `transform ${0.15 + props.tile.fallDistance * 0.05}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`
      style.zIndex = 5
    } else {
      style.transform = `translateY(${offsetY}px)`
      style.transition = 'none'
    }
    return style
  }

  style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
  return style
})

const handleClick = () => {
  emit('click', props.index)
}

const handleTouchStart = (e) => {
  e.preventDefault()
}
</script>

<template>
  <div
      class="game-tile relative flex items-center justify-center cursor-pointer select-none overflow-hidden"
      :class="{
      'selected': tile.selected,
      'matched': tile.matched,
      'falling': tile.falling,
      'popping': tile.popping,
      'custom-icon': isCustomIcon,
      'dragging': hasDragOffset,
      'special-horizontal': tile.special === 'horizontal' && !tile.specialActivated,
      'special-vertical': tile.special === 'vertical' && !tile.specialActivated,
      'special-bomb': tile.special === 'bomb' && !tile.specialActivated,
      'special-activated': tile.specialActivated
    }"
      :style="tileStyle"
      @click="handleClick"
      @touchstart.prevent="handleTouchStart"
  >
    <div class="tile-content absolute inset-0 flex items-center justify-center">
      <img
          v-if="isCustomIcon"
          :src="tile.icon"
          alt="tile"
          class="tile-image w-full h-full object-cover"
      />
      <span v-else class="tile-emoji text-center leading-none">
        {{ tile.icon }}
      </span>
    </div>

    <div v-if="tile.special === 'horizontal' && !tile.specialActivated" class="special-overlay horizontal-overlay">
      <span class="arrow arrow-left">◀</span>
      <span class="arrow arrow-right">▶</span>
    </div>

    <div v-if="tile.special === 'vertical' && !tile.specialActivated" class="special-overlay vertical-overlay">
      <span class="arrow arrow-up">▲</span>
      <span class="arrow arrow-down">▼</span>
    </div>

    <div v-if="tile.special === 'bomb' && !tile.specialActivated" class="special-overlay bomb-overlay">
      <span class="bomb-icon">💣</span>
    </div>

    <div v-if="tile.specialActivated" class="special-overlay activated-overlay">
      <span class="activated-flash">✨</span>
    </div>
  </div>
</template>

<style scoped>
.game-tile {
  position: relative;
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
  will-change: transform;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  transition: box-shadow 0.3s ease, transform 0.2s ease;
}

.tile-content {
  width: 100%;
  height: 100%;
  border-radius: 16px;
  overflow: hidden;
}

.game-tile:hover:not(.dragging) {
  transform: scale(1.08) translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1);
}

@media (hover: hover) and (pointer: fine) {
  .game-tile:hover:not(.dragging) {
    transform: scale(1.08) translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .game-tile:active:not(.dragging) {
    transform: scale(0.98);
  }
}

@media (hover: none) and (pointer: coarse) {
  .game-tile:hover:not(.dragging) {
    transform: none;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
  }
}

.game-tile:active:not(.dragging) {
  transform: scale(0.98);
}

.game-tile.selected {
  box-shadow: 0 0 25px rgba(255, 215, 0, 0.7), 0 8px 16px rgba(0, 0, 0, 0.2);
  transform: scale(1.15);
}

.game-tile.matched,
.game-tile.popping {
  animation: fadeOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.game-tile.falling {
  opacity: 1;
}

.game-tile.dragging {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
  border-radius: 16px;
}

.special-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  border-radius: 16px;
}

.special-horizontal {
  box-shadow: 0 0 18px rgba(0, 180, 255, 0.7), 0 0 36px rgba(0, 180, 255, 0.35);
  border: 2.5px solid rgba(0, 180, 255, 0.8);
  animation: specialPulse 1.2s ease-in-out infinite;
}

.special-horizontal .horizontal-overlay {
  background: radial-gradient(ellipse at center, rgba(0, 180, 255, 0.15) 0%, transparent 70%);
}

.special-horizontal .arrow {
  position: absolute;
  font-size: 0.45em;
  color: #00b4ff;
  text-shadow: 0 0 8px rgba(0, 180, 255, 0.9), 0 0 16px rgba(0, 180, 255, 0.5);
  animation: arrowPulseHorizontal 0.8s ease-in-out infinite;
}

.special-horizontal .arrow-left {
  left: 3px;
}

.special-horizontal .arrow-right {
  right: 3px;
}

.special-vertical {
  box-shadow: 0 0 18px rgba(255, 100, 180, 0.7), 0 0 36px rgba(255, 100, 180, 0.35);
  border: 2.5px solid rgba(255, 100, 180, 0.8);
  animation: specialPulse 1.2s ease-in-out infinite;
}

.special-vertical .vertical-overlay {
  background: radial-gradient(ellipse at center, rgba(255, 100, 180, 0.15) 0%, transparent 70%);
}

.special-vertical .arrow {
  position: absolute;
  font-size: 0.45em;
  color: #ff64b4;
  text-shadow: 0 0 8px rgba(255, 100, 180, 0.9), 0 0 16px rgba(255, 100, 180, 0.5);
  animation: arrowPulseVertical 0.8s ease-in-out infinite;
}

.special-vertical .arrow-up {
  top: 3px;
}

.special-vertical .arrow-down {
  bottom: 3px;
}

.special-bomb {
  box-shadow: 0 0 20px rgba(255, 60, 30, 0.8), 0 0 40px rgba(255, 120, 30, 0.4);
  border: 2.5px solid rgba(255, 80, 30, 0.85);
  animation: bombPulse 0.7s ease-in-out infinite;
}

.special-bomb .bomb-overlay {
  background: radial-gradient(ellipse at center, rgba(255, 60, 30, 0.2) 0%, rgba(255, 120, 30, 0.08) 50%, transparent 70%);
}

.special-bomb .bomb-icon {
  font-size: 0.55em;
  animation: bombShake 0.15s ease-in-out infinite;
  filter: drop-shadow(0 0 6px rgba(255, 60, 30, 0.9));
}

.special-activated {
  animation: specialActivateFlash 0.5s ease-out forwards;
}

.special-activated .activated-overlay {
  background: radial-gradient(ellipse at center, rgba(255, 255, 100, 0.4) 0%, rgba(255, 200, 50, 0.2) 50%, transparent 70%);
}

.special-activated .activated-flash {
  font-size: 0.6em;
  animation: flashSpin 0.4s ease-out forwards;
}

@keyframes fadeOut {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.15);
  }
  100% {
    opacity: 0;
    transform: scale(0.3);
  }
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: scale(0.4) translateY(-30px);
  }
  60% {
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes specialPulse {
  0%, 100% {
    box-shadow: 0 0 18px rgba(0, 180, 255, 0.7), 0 0 36px rgba(0, 180, 255, 0.35);
  }
  50% {
    box-shadow: 0 0 28px rgba(0, 180, 255, 0.9), 0 0 50px rgba(0, 180, 255, 0.5);
  }
}

@keyframes bombPulse {
  0%, 100% {
    box-shadow: 0 0 20px rgba(255, 60, 30, 0.8), 0 0 40px rgba(255, 120, 30, 0.4);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 32px rgba(255, 60, 30, 1), 0 0 56px rgba(255, 120, 30, 0.6);
    transform: scale(1.06);
  }
}
</style>
