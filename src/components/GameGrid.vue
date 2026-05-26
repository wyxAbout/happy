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

<script setup>
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

const containerStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${GRID_SIZE}, ${props.cellSize}px)`,
  gridTemplateRows: `repeat(${GRID_SIZE}, ${props.cellSize}px)`,
  gap: '6px',
  justifyContent: 'start'
}))

const gridStyle = computed(() => ({
  height: `${props.cellSize * GRID_SIZE + 6 * (GRID_SIZE - 1) + 32}px`
}))

const { dragState, getTileOffset, startDrag, updateDrag, endDrag, resetDrag } = useTileDrag(
  computed(() => props.grid),
  computed(() => props.selectedIndex),
  emit,
  { minDragDistance: 10 }
)

const handleTileClick = (index) => {
  if (props.disabled || isSwiping.value || dragState.value.active) return
  emit('tile-click', index)
}

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

useSwipeGestureEnhanced(gridRef, {
  threshold: 20,
  maxTime: 400,
  minDragDistance: 8,
  enableMouse: true,
  onSwipeMove,
  onSwipeEnd
})
</script>

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

.swipe-hint {
  animation: fadeInOut 3s ease-in-out;
}

@keyframes fadeInOut {
  0%, 100% { opacity: 0; }
  10%, 90% { opacity: 1; }
}
</style>
