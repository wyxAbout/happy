<template>
  <div
      class="game-tile relative flex items-center justify-center cursor-pointer select-none overflow-hidden"
      :class="{
      'selected': tile.selected,
      'matched': tile.matched,
      'falling': tile.falling,
      'popping': tile.popping,
      'custom-icon': isCustomIcon,
      'dragging': isDragging,
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

<script setup>
import { computed } from 'vue'
import { DEFAULT_EMOJIS } from '../constants'

const props = defineProps({
  tile: Object,
  index: Number,
  cellSize: Number,
  isSelected: Boolean,
  dragOffset: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
})

const emit = defineEmits(['click'])

const isCustomIcon = computed(() => {
  return props.tile.icon && props.tile.icon.startsWith('/')
})

// 是否正在拖动（偏移量非零）
const isDragging = computed(() => {
  return props.dragOffset.x !== 0 || props.dragOffset.y !== 0
})

const tileStyle = computed(() => {
  const size = props.cellSize
  const { x, y } = props.dragOffset

  // 基础样式
  const style = {
    width: `${size}px`,
    height: `${size}px`,
    fontSize: `${size * 0.6}px`
  }

  // 如果有拖动偏移，添加 transform
  if (x !== 0 || y !== 0) {
    style.transform = `translate(${x}px, ${y}px)`
    style.transition = 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)'
    style.zIndex = 10
    style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)'
    style.borderRadius = '16px'
  } else {
    // 回弹动画
    style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
  }

  return style
})

const handleClick = () => {
  emit('click', props.index)
}

const handleTouchStart = (e) => {
  // 阻止默认行为，但不阻止事件冒泡
  e.preventDefault()
}
</script>

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
  animation: popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
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

@keyframes arrowPulseHorizontal {
  0%, 100% {
    transform: translateX(0);
    opacity: 0.8;
  }
  50% {
    transform: translateX(3px);
    opacity: 1;
  }
}

@keyframes arrowPulseVertical {
  0%, 100% {
    transform: translateY(0);
    opacity: 0.8;
  }
  50% {
    transform: translateY(3px);
    opacity: 1;
  }
}

@keyframes bombShake {
  0%, 100% {
    transform: rotate(0deg) scale(1);
  }
  25% {
    transform: rotate(3deg) scale(1.08);
  }
  75% {
    transform: rotate(-3deg) scale(1.08);
  }
}

@keyframes specialActivateFlash {
  0% {
    transform: scale(1);
    filter: brightness(1);
  }
  30% {
    transform: scale(1.25);
    filter: brightness(1.8);
  }
  100% {
    transform: scale(1);
    filter: brightness(1);
  }
}

@keyframes flashSpin {
  0% {
    transform: scale(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: scale(2.5) rotate(180deg);
    opacity: 0;
  }
}

.tile-emoji {
  user-select: none;
  pointer-events: none;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.2));
}

.tile-image {
  user-select: none;
  pointer-events: none;
  border-radius: 0;
}
</style>