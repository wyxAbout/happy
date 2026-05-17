// src/composables/useTileSwipe.js
import { ref } from 'vue'

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

    const handleTouchStart = (e) => {
        const touch = e.touches[0]
        startX = touch.clientX
        startY = touch.clientY
        startTime = Date.now()
        isDragging = false
        isSwiping.value = false
        swipeDirection.value = null
    }

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

        // 确定方向
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