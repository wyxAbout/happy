<template>
  <div
      ref="gridRef"
      class="game-grid bg-gradient-to-br from-gray-100 to-gray-200 p-3 rounded-2xl shadow-inner mt-4 select-none"
      @touchstart.prevent="handleTouchStart"
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
          @click="handleTileClick"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
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

// ✅ 容器样式：只保留网格布局
const containerStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${GRID_SIZE}, ${props.cellSize}px)`,
  gridTemplateRows: `repeat(${GRID_SIZE}, ${props.cellSize}px)`,
  gap: '6px'
}))

// ✅ 集成砖块拖动模块
const { dragState, getTileOffset, startDrag, updateDrag, endDrag, resetDrag } = useTileDrag(
    computed(() => props.grid),
    computed(() => props.selectedIndex),
    emit
)

// ✅ 点击事件
const handleTileClick = (index) => {
  if (props.disabled || isSwiping.value || dragState.value.active) return
  emit('tile-click', index)
}

// ✅ 触摸开始
const handleTouchStart = (e) => {
  e.preventDefault()
  if (props.disabled) return
  if (dragState.value.active) {
    resetDrag()
  }

  // 获取网格容器信息
  const rect = gridRef.value.getBoundingClientRect()
  const touchX = e.touches[0].clientX
  const touchY = e.touches[0].clientY

  // game-grid 的 padding 是 p-3 (12px) + 间隙 gap 6px
  const padding = 12
  const gap = 6
  const cellTotal = props.cellSize + gap

  // 计算相对于网格内容区域的坐标
  const relX = touchX - rect.left - padding
  const relY = touchY - rect.top - padding

  // 判断是否在有效范围内
  if (relX < 0 || relY < 0) return

  const col = Math.floor(relX / cellTotal)
  const row = Math.floor(relY / cellTotal)

  // 验证索引是否合法
  if (col < 0 || col >= GRID_SIZE || row < 0 || row >= GRID_SIZE) return

  const index = row * GRID_SIZE + col

  // 自动选中该砖块（如果是新选中的）
  if (props.selectedIndex !== index) {
    // 通知父组件更新选中状态（父组件会更新 grid 中的 selected 属性）
    emit('tile-click', index)
  }

  // 立即开始拖动（不等父组件响应）
  startDrag(index)
}

// ✅ 滑动过程中：更新砖块位置
const onSwipeMove = ({ moveX, moveY, direction }) => {
  isSwiping.value = true
  if (!dragState.value.active) return

  // 计算移动距离
  const distance = Math.sqrt(moveX * moveX + moveY * moveY)

  // 确定方向
  let dir = direction
  if (!dir) {
    if (Math.abs(moveX) > Math.abs(moveY)) {
      dir = moveX > 0 ? 'right' : 'left'
    } else {
      dir = moveY > 0 ? 'down' : 'up'
    }
  }

  // 更新拖动位置（这一步会设置 toIndex）
  updateDrag(dir, distance)

  // ✅ 添加日志查看 toIndex 是否更新
  if (dragState.value.toIndex !== null) {
    console.log('📍 toIndex set to:', dragState.value.toIndex)
  }
}

// ✅ 滑动结束：执行交换或回弹
const onSwipeEnd = (data) => {
  console.log('🔄 onSwipeEnd called, active:', dragState.value.active, 'fromIndex:', dragState.value.fromIndex)

  isSwiping.value = false

  // 如果 active 为 false 但 fromIndex 有效，强制激活
  if (!dragState.value.active && dragState.value.fromIndex !== null) {
    dragState.value.active = true
    console.log('⚠️ 强制激活 dragState')
  }

  if (!dragState.value.active) {
    console.log('❌ dragState 未激活，跳过交换')
    return
  }

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

// ✅ 启用滑动检测
useSwipeGestureEnhanced(gridRef, {
  threshold: 20,
  maxTime: 400,
  onSwipeMove,
  onSwipeEnd
})

// ✅ 滑动提示（可选）
const showSwipeHint = ref(false)
onMounted(() => {
  setTimeout(() => {
    showSwipeHint.value = true
    setTimeout(() => { showSwipeHint.value = false }, 3000)
  }, 1000)
})
</script>

<style scoped>
.game-grid {
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  overflow: hidden;
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