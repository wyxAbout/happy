// src/composables/useTileDrag.js
import { ref, computed } from 'vue'
import { GRID_SIZE } from '../constants'

export function useTileDrag(grid, selectedIndex, emit) {
    // 拖动状态
    const dragState = ref({
        active: false,
        fromIndex: null,
        toIndex: null,
        offsetX: 0,
        offsetY: 0,
        direction: null
    })

    // 是否正在拖动
    const isDragging = computed(() => dragState.value.active)

    // 获取砖块偏移量（用于 GameTile）
    const getTileOffset = (index) => {
        if (!dragState.value.active) return { x: 0, y: 0 }
        if (index === dragState.value.fromIndex) {
            return { x: dragState.value.offsetX, y: dragState.value.offsetY }
        }
        if (index === dragState.value.toIndex) {
            return { x: -dragState.value.offsetX, y: -dragState.value.offsetY }
        }
        return { x: 0, y: 0 }
    }

    // 开始拖动
    const startDrag = (fromIndex) => {
        if (fromIndex === null || fromIndex === undefined) return
        dragState.value.active = true
        dragState.value.fromIndex = fromIndex
        dragState.value.toIndex = null
        dragState.value.offsetX = 0
        dragState.value.offsetY = 0
        dragState.value.direction = null
    }

    // 更新拖动位置
    const updateDrag = (direction, distance) => {
        if (!dragState.value.active || dragState.value.fromIndex === null) return

        const fromIdx = dragState.value.fromIndex
        const row = Math.floor(fromIdx / GRID_SIZE)
        const col = fromIdx % GRID_SIZE
        let toIdx = null

        // 根据方向确定目标砖块
        switch (direction) {
            case 'left': if (col > 0) toIdx = fromIdx - 1; break
            case 'right': if (col < GRID_SIZE - 1) toIdx = fromIdx + 1; break
            case 'up': if (row > 0) toIdx = fromIdx - GRID_SIZE; break
            case 'down': if (row < GRID_SIZE - 1) toIdx = fromIdx + GRID_SIZE; break
        }

        if (toIdx === null) {
            dragState.value.offsetX = 0
            dragState.value.offsetY = 0
            dragState.value.toIndex = null
            return
        }

        const maxOffset = 25
        const limitedDist = Math.min(distance, maxOffset)
        let offsetX = 0
        let offsetY = 0

        switch (direction) {
            case 'left': offsetX = -limitedDist; break
            case 'right': offsetX = limitedDist; break
            case 'up': offsetY = -limitedDist; break
            case 'down': offsetY = limitedDist; break
        }

        dragState.value.toIndex = toIdx
        dragState.value.offsetX = offsetX
        dragState.value.offsetY = offsetY
        dragState.value.direction = direction

        console.log('🔄 updateDrag:', { fromIdx, toIdx, direction, distance })
    }

    // 结束拖动（执行交换或回弹）
    // useTileDrag.js 中的 endDrag
    const endDrag = (threshold = 5) => {
        if (!dragState.value.active) return false

        const { fromIndex, toIndex, offsetX, offsetY, direction } = dragState.value
        const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY)

        // 重置状态
        dragState.value.active = false

        // ✅ 只要 toIndex 和 fromIndex 有效，就触发交换（移除距离限制）
        if (fromIndex !== null && toIndex !== null) {
            console.log('✅ 触发交换:', fromIndex, '↔', toIndex, '距离:', distance)
            emit('swap', { from: fromIndex, to: toIndex })
            emit('swipe', { direction, from: fromIndex, to: toIndex })
            return true
        }

        return false
    }

    // 重置拖动状态（用于取消）
    const resetDrag = () => {
        dragState.value.active = false
        dragState.value.fromIndex = null
        dragState.value.toIndex = null
        dragState.value.offsetX = 0
        dragState.value.offsetY = 0
        dragState.value.direction = null
    }

    return {
        dragState,
        isDragging,
        getTileOffset,
        startDrag,
        updateDrag,
        endDrag,
        resetDrag
    }
}