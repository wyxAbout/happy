<script setup>
/**
 * GameGrid.vue — 游戏网格容器组件
 *
 * 【功能概述】
 * 渲染消消乐棋盘的核心容器组件，负责：
 * - 根据 cellSize 和 GRID_SIZE 计算网格布局（CSS Grid）
 * - 渲染 GameTile 子组件（v-for 遍历 grid 数组）
 * - 集成手势系统（useSwipeGestureEnhanced + useTileDrag）
 * - 处理点击和拖拽两种交互模式
 *
 * 【交互流程】
 *
 * 点击模式（handleTileClick）：
 *   用户点击方块 → emit('tile-click', index) → GameLogic.handleTileClick
 *
 * 拖拽模式（pointerStart → onSwipeMove → onSwipeEnd）：
 *   1. pointerStart：记录 pointerStartIndex，如果是新方块则先 emit tile-click
 *   2. onSwipeMove：调用 startDrag + updateDrag，实时更新方块偏移
 *   3. onSwipeEnd：调用 endDrag，触发 emit('swap') 执行交换
 *
 * 【Props】
 * @prop {Array} grid          - 棋盘数据数组
 * @prop {number} cellSize     - 每个方块的像素尺寸
 * @prop {number|null} selectedIndex - 当前选中的方块索引
 * @prop {boolean} disabled    - 是否禁用交互（动画进行中）
 *
 * 【事件】
 * @event tile-click - 方块被点击，参数 index
 * @event swap       - 拖拽交换完成，参数 {from, to}
 * @event swipe      - 滑动方向，参数 {direction, from, to}
 *
 * 【使用示例】
 *   <GameGrid :grid="grid" :cell-size="40" :selected-index="idx" @tile-click="handleTileClick" @swap="handleSwap" />
 */

import { ref, computed } from 'vue'
import GameTile from './GameTile.vue'
import { GRID_SIZE } from '../constants'
import { useSwipeGestureEnhanced } from '../composables/useSwipeGestureEnhanced'
import { useTileDrag } from '../composables/useTileDrag'

const props = defineProps({
  grid: Array,
  cellSize: Number,
  selectedIndex: Number,
  disabled: Boolean
})

const emit = defineEmits(['tile-click', 'swap', 'swipe'])

const gridRef = ref(null)
const isSwiping = ref(false)
const lastSwapTime = ref(0)
const pointerStartIndex = ref(null)

/**
 * 网格容器样式（CSS Grid）
 * 列数 = GRID_SIZE，间距 = 6px
 */
const containerStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${GRID_SIZE}, ${props.cellSize}px)`,
  gridTemplateRows: `repeat(${GRID_SIZE}, ${props.cellSize}px)`,
  gap: '6px',
  justifyContent: 'start'
}))

/**
 * 网格整体高度 = cellSize × GRID_SIZE + 间距 × (GRID_SIZE-1) + 内边距
 */
const gridStyle = computed(() => ({
  height: `${props.cellSize * GRID_SIZE + 6 * (GRID_SIZE - 1) + 32}px`
}))

/**
 * 使用 useTileDrag 管理拖拽状态
 */
const { dragState, getTileOffset, startDrag, updateDrag, endDrag, resetDrag } = useTileDrag(
  computed(() => props.grid),
  computed(() => props.selectedIndex),
  emit,
  { minDragDistance: 10 }
)

/**
 * 方块点击处理
 * 忽略正在滑动或拖拽中的点击
 */
const handleTileClick = (index) => {
  if (props.disabled || isSwiping.value || dragState.value.active) return
  emit('tile-click', index)
}

/**
 * 根据客户端坐标计算对应的方块索引
 *
 * 算法：考虑 padding 和 gap，从渲染矩形推算网格单元格
 *
 * @param {number} clientX - 鼠标/触摸 X 坐标
 * @param {number} clientY - 鼠标/触摸 Y 坐标
 * @returns {number|null} 方块索引，越界返回 null
 */
const getCellIndexFromClientPoint = (clientX, clientY) => {
  const rect = gridRef.value.getBoundingClientRect()
  const styles = getComputedStyle(gridRef.value)
  const padding = parseFloat(styles.paddingLeft) || 12
  const gap = 6
  const cellTotal = props.cellSize + gap

  const relX = clientX - rect.left - padding
  const relY = clientY - rect.top - padding

  if (relX < 0 || relY < 0) return null

  const col = Math.floor(relX / cellTotal)
  const row = Math.floor(relY / cellTotal)

  if (col < 0 || col >= GRID_SIZE || row < 0 || row >= GRID_SIZE) return null

  return row * GRID_SIZE + col
}

/**
 * 指针按下处理（touchstart / mousedown）
 * 记录起始位置和方块索引，如果点击的是新方块则触发 tile-click
 */
const handlePointerStart = (e) => {
  e.preventDefault()
  if (props.disabled) return
  if (dragState.value.active) {
    resetDrag()
  }

  pointerStartIndex.value = null

  const point = e.touches ? e.touches[0] : e
  const index = getCellIndexFromClientPoint(point.clientX, point.clientY)
  if (index === null) return

  if (props.selectedIndex !== index) {
    emit('tile-click', index)
  }

  pointerStartIndex.value = index
}

/**
 * 滑动移动回调（来自 useSwipeGestureEnhanced）
 * 如果拖拽尚未开始且有 pointerStartIndex，则启动拖拽。
 * 然后更新拖拽偏移。
 *
 * @param {{moveX: number, moveY: number, direction: string|null}} data
 */
const onSwipeMove = ({ moveX, moveY, direction }) => {
  isSwiping.value = true

  if (!dragState.value.active && pointerStartIndex.value !== null) {
    startDrag(pointerStartIndex.value)
  }

  if (!dragState.value.active) return

  const distance = Math.sqrt(moveX * moveX + moveY * moveY)

  let dir = direction
  if (!dir) {
    if (Math.abs(moveX) > Math.abs(moveY)) {
      dir = moveX > 0 ? 'right' : 'left'
    } else {
      dir = moveY > 0 ? 'down' : 'up'
    }
  }

  updateDrag(dir, distance)
}

/**
 * 滑动结束回调
 * 防抖：200ms 内不允许连续交换（防止手势抖动触发多次交换）
 */
const onSwipeEnd = () => {
  isSwiping.value = false
  pointerStartIndex.value = null

  if (!dragState.value.active) return

  const now = Date.now()
  if (now - lastSwapTime.value < 200) {
    resetDrag()
    return
  }

  const didSwap = endDrag()

  if (didSwap) {
    lastSwapTime.value = now
  } else {
    resetDrag()
  }
}

/**
 * 集成增强手势系统
 * threshold: 20px — 触发滑动的阈值
 * maxTime: 400ms — 最大识别时间
 * enableMouse: true — 支持 PC 鼠标拖拽
 */
useSwipeGestureEnhanced(gridRef, {
  threshold: 20,
  maxTime: 400,
  minDragDistance: 8,
  enableMouse: true,
  onSwipeMove,
  onSwipeEnd
})
</script>

<template>
  <div
    ref="gridRef"
    class="game-grid bg-gradient-to-br from-gray-100 to-gray-200 p-4 rounded-2xl shadow-inner mt-4 select-none"
    :class="{ 'game-grid--dragging': dragState.active }"
    :style="gridStyle"
    @touchstart.prevent="handlePointerStart"
    @mousedown.prevent="handlePointerStart"
  >
    <div
      class="grid-container"
      :style="containerStyle"
    >
      <GameTile
        v-for="(tile, index) in grid"
        :key="index"
        :tile="tile"
        :index="index"
        :cell-size="cellSize"
        :is-selected="selectedIndex === index"
        :drag-offset="getTileOffset(index)"
        :is-dragging="dragState.active"
        @click="handleTileClick"
      />
    </div>
  </div>
</template>

<style scoped>
.game-grid {
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  overflow: hidden;
  cursor: pointer;
}

.game-grid--dragging {
  cursor: grabbing;
}

/* Desktop: show grab cursor when hovering over the grid */
@media (hover: hover) and (pointer: fine) {
  .game-grid {
    cursor: grab;
  }

  .game-grid--dragging {
    cursor: grabbing;
  }

  .game-grid:active {
    cursor: grabbing;
  }
}

.grid-container {
  position: relative;
  width: 100%;
  max-width: 100%;
}
</style>
