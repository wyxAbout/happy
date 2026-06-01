/**
 * useTileSwipe.js — 方块滑动手势识别（Touch 事件版）
 *
 * 【功能概述】
 * 基于原生 Touch 事件实现轻量级滑动方向识别。
 * 监听 touchstart → touchmove → touchend 全生命周期，
 * 在 touchend 时计算滑动向量并返回方向（'up'|'down'|'left'|'right'）。
 *
 * 【与 useSwipeGestureEnhanced 的区别】
 * - useTileSwipe：轻量级，仅识别方向，无惯性、无轴锁定、无鼠标支持
 * - useSwipeGestureEnhanced：完整手势系统，支持惯性滚动、轴锁定、鼠标拖拽
 *
 * 【使用场景】
 * 旧版方块交换手势（现已被 useSwipeGestureEnhanced 替代）。
 * 保留此文件用于向后兼容和作为简化版参考实现。
 *
 * 【使用示例】
 *   import { useTileSwipe } from './composables/useTileSwipe'
 *   const { handleTouchStart, handleTouchEnd } = useTileSwipe({ threshold: 30, maxTime: 300 })
 *   // 绑定到 DOM 元素
 *   element.addEventListener('touchstart', handleTouchStart)
 *   element.addEventListener('touchend', handleTouchEnd)
 */

import { ref } from 'vue'

/**
 * useTileSwipe — 触摸滑动识别 Composable
 *
 * @param {Object} [options={}] - 配置选项
 * @param {number} [options.threshold=30] - 触发滑动的像素阈值：滑动距离必须超过此值才算有效滑动
 * @param {number} [options.maxTime=300]  - 最大识别时间（毫秒）：超过此时间的慢速拖拽不算滑动
 *
 * @returns {Object} 手势识别对象
 * @returns {import('vue').Ref<boolean>} isSwiping       - 是否正在滑动中（touchmove 阶段为 true）
 * @returns {import('vue').Ref<string|null>} swipeDirection - 最后识别的滑动方向（'up'|'down'|'left'|'right'|null）
 * @returns {Function} handleTouchStart - 绑定到 touchstart 的处理器
 * @returns {Function} handleTouchMove  - 绑定到 touchmove 的处理器，返回 {deltaX, deltaY, absX, absY}
 * @returns {Function} handleTouchEnd   - 绑定到 touchend 的处理器，返回 {direction, deltaX, deltaY} 或 false
 *
 * 【handleTouchEnd 返回值】
 * - 成功识别方向：{ direction: 'left', deltaX: -50, deltaY: 5 }
 * - 不满足阈值/超时：false
 *
 * 【方向判定逻辑】
 * - 比较 |deltaX| 和 |deltaY|，较大者决定主轴方向
 * - deltaX > 0 → 'right', deltaX < 0 → 'left'
 * - deltaY > 0 → 'down',  deltaY < 0 → 'up'
 */
export function useTileSwipe(options = {}) {
    const {
        threshold = 30,      // 触发滑动的阈值（像素）
        maxTime = 300,       // 最大识别时间（毫秒）
    } = options

    const isSwiping = ref(false)
    const swipeDirection = ref(null)

    let startX = 0
    let startY = 0
    let startTime = 0
    let isDragging = false

    /**
     * 处理触摸开始
     * 记录起始坐标和时间，重置所有状态
     * @param {TouchEvent} e - 原生 touchstart 事件
     */
    const handleTouchStart = (e) => {
        const touch = e.touches[0]
        startX = touch.clientX
        startY = touch.clientY
        startTime = Date.now()
        isDragging = false
        isSwiping.value = false
        swipeDirection.value = null
    }

    /**
     * 处理触摸移动
     * 计算实时偏移量，超过阈值则标记为滑动中并阻止页面滚动
     * @param {TouchEvent} e - 原生 touchmove 事件
     * @returns {{deltaX: number, deltaY: number, absX: number, absY: number}|undefined} 当前偏移量（用于视觉反馈）
     */
    const handleTouchMove = (e) => {
        const touch = e.touches[0]
        const deltaX = touch.clientX - startX
        const deltaY = touch.clientY - startY
        const absX = Math.abs(deltaX)
        const absY = Math.abs(deltaY)

        if (absX > threshold || absY > threshold) {
            isDragging = true
            isSwiping.value = true
            e.preventDefault() // 阻止页面滚动
        }

        // 可选：返回当前偏移量用于视觉反馈
        return { deltaX, deltaY, absX, absY }
    }

    /**
     * 处理触摸结束
     * 计算最终方向和距离，满足条件则返回方向信息，否则返回 false
     * @param {TouchEvent} e - 原生 touchend 事件
     * @returns {{direction: string, deltaX: number, deltaY: number}|false}
     *   - 成功：包含 direction（方向字符串）、deltaX、deltaY 的对象
     *   - 失败（未拖拽/超时/距离不足）：false
     */
    const handleTouchEnd = (e) => {
        if (!isDragging) {
            // 没有滑动，视为点击
            return false
        }

        const deltaTime = Date.now() - startTime
        if (deltaTime > maxTime) {
            isDragging = false
            isSwiping.value = false
            return false
        }

        const touch = e.changedTouches[0]
        const deltaX = touch.clientX - startX
        const deltaY = touch.clientY - startY
        const absX = Math.abs(deltaX)
        const absY = Math.abs(deltaY)

        if (absX < threshold && absY < threshold) {
            isDragging = false
            isSwiping.value = false
            return false
        }

        // 确定方向：比较 X 和 Y 轴偏移量的绝对值，较大者为主轴
        let direction = ''
        if (absX > absY) {
            direction = deltaX > 0 ? 'right' : 'left'
        } else {
            direction = deltaY > 0 ? 'down' : 'up'
        }

        swipeDirection.value = direction
        isSwiping.value = false
        isDragging = false

        return { direction, deltaX, deltaY }
    }

    return {
        isSwiping,
        swipeDirection,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd
    }
}
