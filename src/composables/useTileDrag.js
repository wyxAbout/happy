/**
 * useTileDrag.js — 方块拖动交互 Composable
 *
 * 【功能概述】
 * 管理游戏棋盘上方块的拖动交互状态。
 * 与 useSwipeGestureEnhanced 配合使用：
 *   - useSwipeGestureEnhanced：负责原始手势数据采集（触摸/鼠标 → 方向+距离）
 *   - useTileDrag：负责将手势数据转换为方块级别的拖拽偏移和交换逻辑
 *
 * 【核心概念】
 * - fromIndex：被拖动的起始方块索引
 * - toIndex：根据滑动方向计算出的目标方块索引
 * - offsetX/offsetY：当前拖动偏移量（像素），用于 GameTile 的 CSS transform
 * - 拖动时两个方块同时移动：from 方块沿方向偏移，to 方块反向偏移
 *
 * 【使用示例】
 *   import { useTileDrag } from './composables/useTileDrag'
 *   const { dragState, getTileOffset, startDrag, updateDrag, endDrag } = useTileDrag(grid, selectedIndex, emit, { minDragDistance: 10 })
 *   // 在 onSwipeMove 回调中
 *   updateDrag('left', 25)
 *   // 在 onSwipeEnd 回调中
 *   endDrag()
 */

import { ref, computed } from 'vue'
import { GRID_SIZE } from '../constants'

/**
 * 开发环境调试日志
 * 仅在 import.meta.env.DEV 为 true 时输出，生产构建自动 tree-shaking 移除
 * @param {...any} args - 传递给 console.log 的参数
 */
const debugLog = (...args) => {
  if (import.meta.env.DEV) console.log(...args)
}

/**
 * useTileDrag — 方块拖动状态管理 Composable
 *
 * @param {import('vue').Ref<Array>}  grid           - 游戏棋盘数据（响应式数组）
 * @param {import('vue').Ref<number|null>} selectedIndex - 当前选中的方块索引
 * @param {Function} emit            - Vue emit 函数，用于触发 'swap' 和 'swipe' 事件
 * @param {Object}   [options={}]    - 配置选项
 * @param {number}   [options.minDragDistance=8] - 最小拖动距离（像素），低于此值不触发更新
 *
 * @returns {Object} 拖动状态管理对象
 * @returns {import('vue').Ref<Object>} dragState     - 拖动状态对象 {active, fromIndex, toIndex, offsetX, offsetY, direction}
 * @returns {import('vue').ComputedRef<boolean>} isDragging - 是否正在拖动中（computed）
 * @returns {Function} getTileOffset - 获取指定索引方块的 CSS 偏移量
 * @returns {Function} startDrag     - 开始拖动
 * @returns {Function} updateDrag    - 更新拖动位置
 * @returns {Function} endDrag       - 结束拖动，触发交换
 * @returns {Function} resetDrag     - 重置拖动状态
 */
export function useTileDrag(grid, selectedIndex, emit, options = {}) {
    const {
        minDragDistance = 8
    } = options

    /**
     * 拖动状态对象
     * @property {boolean} active    - 是否正在拖动
     * @property {number|null} fromIndex - 拖动起始方块索引
     * @property {number|null} toIndex   - 拖动目标方块索引
     * @property {number} offsetX     - X 轴偏移像素
     * @property {number} offsetY     - Y 轴偏移像素
     * @property {string|null} direction - 拖动方向（'left'|'right'|'up'|'down'）
     */
    const dragState = ref({
        active: false,
        fromIndex: null,
        toIndex: null,
        offsetX: 0,
        offsetY: 0,
        direction: null
    })

    const isDragging = computed(() => dragState.value.active)

    /**
     * 获取指定方块的拖动偏移量（用于 CSS transform）
     *
     * 约定：
     * - fromIndex 方块：朝拖动方向偏移 (offsetX, offsetY)
     * - toIndex 方块：反向偏移 (-offsetX, -offsetY)，形成"互相靠近"的视觉效果
     * - 其他方块：零偏移
     *
     * @param {number} index - 方块在 grid 数组中的索引
     * @returns {{x: number, y: number}} CSS 偏移量（像素）
     */
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

    /**
     * 开始拖动
     * 设置 active=true，记录起始方块索引
     * @param {number} fromIndex - 被拖动的起始方块索引
     */
    const startDrag = (fromIndex) => {
        if (fromIndex === null || fromIndex === undefined) return
        dragState.value.active = true
        dragState.value.fromIndex = fromIndex
        dragState.value.toIndex = null
        dragState.value.offsetX = 0
        dragState.value.offsetY = 0
        dragState.value.direction = null
    }

    /**
     * 更新拖动位置
     *
     * 根据方向和距离计算：
     * 1. 目标方块索引（toIndex）：由 fromIndex 的行列 + 方向推导
     * 2. 偏移量：限制最大偏移为 25px，防止拖出太远
     *
     * @param {string} direction - 拖动方向（'left'|'right'|'up'|'down'）
     * @param {number} distance  - 拖动距离（像素）
     *
     * 【边界处理】
     * - 边缘方块（col=0 向左、col=GRID_SIZE-1 向右等）：toIndex 设为 null，偏移清零
     * - 距离 < minDragDistance：忽略更新，防止抖动
     */
    const updateDrag = (direction, distance) => {
        if (!dragState.value.active || dragState.value.fromIndex === null) return
        
        if (distance < minDragDistance) return

        const fromIdx = dragState.value.fromIndex
        const row = Math.floor(fromIdx / GRID_SIZE)
        const col = fromIdx % GRID_SIZE
        let toIdx = null

        // 根据方向确定目标方块索引（仅当不越界时）
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

        // 限制最大偏移量，避免视觉上拖出太远
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

        debugLog('updateDrag:', { fromIdx, toIdx, direction, distance })
    }

    /**
     * 结束拖动 — 执行交换或回弹
     *
     * 只要 fromIndex 和 toIndex 都有效就触发交换（已移除距离限制）。
     * 交换通过 emit('swap') 和 emit('swipe') 向上传递。
     *
     * @param {number} [threshold=5] - （已弃用）触发交换的最小距离阈值
     * @returns {boolean} 是否触发了交换操作
     */
    const endDrag = (threshold = 5) => {
        if (!dragState.value.active) return false

        const { fromIndex, toIndex, offsetX, offsetY, direction } = dragState.value
        const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY)

        // 重置状态
        dragState.value.active = false

        // 只要 toIndex 和 fromIndex 有效，就触发交换（移除距离限制）
        if (fromIndex !== null && toIndex !== null) {
            debugLog('swap:', fromIndex, '↔', toIndex, 'distance:', distance)
            emit('swap', { from: fromIndex, to: toIndex })
            emit('swipe', { direction, from: fromIndex, to: toIndex })
            return true
        }

        return false
    }

    /**
     * 重置拖动状态（用于取消操作）
     * 将所有状态恢复为初始值，方块偏移归零
     */
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
