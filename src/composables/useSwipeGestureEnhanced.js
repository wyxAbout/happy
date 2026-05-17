
import { ref, onMounted, onUnmounted } from 'vue'

export function useSwipeGestureEnhanced(elementRef, options = {}) {
    const {
        threshold = 30,        // 触发滑动的阈值（像素）
        maxTime = 300,         // 最大识别时间（毫秒）
        enableHorizontal = true,
        enableVertical = true,
        onSwipeStart,          // 触摸开始回调
        onSwipeMove,           // 触摸移动回调（返回偏移量）
        onSwipeEnd,            // 触摸结束回调
        useInertia = true,     // 是否启用惯性
        friction = 0.95,       // 惯性衰减系数
    } = options

    const isSwiping = ref(false)
    const swipeDistance = ref({ x: 0, y: 0 })
    const velocity = ref({ x: 0, y: 0 })

    // 核心变量
    let startX = 0, startY = 0          // 触摸起始位置
    let lastX = 0, lastY = 0            // 上一次触摸位置
    let startTime = 0                   // 触摸起始时间
    let lastTime = 0                    // 上一次移动时间
    let rafId = null                    // requestAnimationFrame ID
    let isLocked = false                // 是否已锁定方向
    let lockAxis = null                 // 'x' 或 'y'

    // 1. 触摸开始
    const handleStart = (e) => {
        const point = e.touches ? e.touches[0] : e
        startX = point.clientX
        startY = point.clientY
        lastX = startX
        lastY = startY
        startTime = Date.now()
        lastTime = startTime
        isSwiping.value = true
        isLocked = false
        lockAxis = null
        velocity.value = { x: 0, y: 0 }
        swipeDistance.value = { x: 0, y: 0 }

        if (onSwipeStart) onSwipeStart({ startX: point.clientX, startY: point.clientY })
    }

    // 2. 滑动过程
    const handleMove = (e) => {
        if (!isSwiping.value) return

        const point = e.touches ? e.touches[0] : e
        const deltaX = point.clientX - startX
        const deltaY = point.clientY - startY
        const deltaTime = Date.now() - lastTime

        // 计算速度（像素/毫秒）
        if (deltaTime > 0) {
            velocity.value.x = (point.clientX - lastX) / deltaTime
            velocity.value.y = (point.clientY - lastY) / deltaTime
        }

        // 方向锁定（首次明显移动后锁定）
        if (!isLocked) {
            const absX = Math.abs(deltaX)
            const absY = Math.abs(deltaY)
            if (absX > threshold || absY > threshold) {
                isLocked = true
                lockAxis = absX > absY ? 'x' : 'y'
            }
        }

        // 根据锁定方向过滤移动
        let filteredX = deltaX
        let filteredY = deltaY
        if (lockAxis === 'x') filteredY = 0
        else if (lockAxis === 'y') filteredX = 0

        // 实际移动量用于反馈
        const moveX = point.clientX - lastX
        const moveY = point.clientY - lastY

        // 更新距离
        swipeDistance.value.x = filteredX
        swipeDistance.value.y = filteredY

        // 回调通知外部（用于视觉更新）
        if (onSwipeMove) {
            onSwipeMove({
                deltaX: filteredX,
                deltaY: filteredY,
                moveX: (lockAxis === 'x' || !lockAxis) ? moveX : 0,
                moveY: (lockAxis === 'y' || !lockAxis) ? moveY : 0,
                isLocked,
                lockAxis
            })
        }

        lastX = point.clientX
        lastY = point.clientY
        lastTime = Date.now()

        // 阻止页面滚动
        e.preventDefault()
    }

    // 3. 触摸结束
    const handleEnd = (e) => {
        if (!isSwiping.value) return

        const deltaTime = Date.now() - startTime
        const absX = Math.abs(swipeDistance.value.x)
        const absY = Math.abs(swipeDistance.value.y)

        // 判断是否为有效滑动
        if ((absX > threshold || absY > threshold) && deltaTime < maxTime) {
            let direction = null
            if (absX > absY) direction = swipeDistance.value.x > 0 ? 'right' : 'left'
            else direction = swipeDistance.value.y > 0 ? 'down' : 'up'

            onSwipeEnd({
                direction,
                distance: Math.max(absX, absY),
                velocity: velocity.value,
                time: deltaTime,
                lockAxis
            })

            // 如果启用惯性，执行惯性滑动
            if (useInertia && (Math.abs(velocity.value.x) > 0.3 || Math.abs(velocity.value.y) > 0.3)) {
                performInertia(direction, absX, absY, deltaTime)
            }
        } else {
            // 未触发滑动，可能是点击操作
            if (onSwipeEnd) onSwipeEnd(null)
        }

        isSwiping.value = false
    }

    // 惯性动画
    const performInertia = (direction, distance, time) => {
        let vx = velocity.value.x * 5
        let vy = velocity.value.y * 5
        let currentX = 0, currentY = 0

        const animate = () => {
            vx *= friction
            vy *= friction
            currentX += vx
            currentY += vy

            if (Math.abs(vx) < 0.1 && Math.abs(vy) < 0.1) return

            // 通知外部更新位置
            if (onSwipeMove) {
                onSwipeMove({
                    deltaX: currentX,
                    deltaY: currentY,
                    moveX: vx,
                    moveY: vy,
                    isInertia: true
                })
                rafId = requestAnimationFrame(animate)
            }
        }
        animate()
    }

    // 取消滑动
    const handleCancel = () => {
        isSwiping.value = false
        if (rafId) cancelAnimationFrame(rafId)
        rafId = null
    }

    onMounted(() => {
        const el = elementRef.value
        if (!el) return

        el.addEventListener('touchstart', handleStart, { passive: true })
        el.addEventListener('touchmove', handleMove, { passive: false })
        el.addEventListener('touchend', handleEnd, { passive: true })
        el.addEventListener('touchcancel', handleCancel, { passive: true })
    })

    onUnmounted(() => {
        const el = elementRef.value
        if (!el) return
        el.removeEventListener('touchstart', handleStart)
        el.removeEventListener('touchmove', handleMove)
        el.removeEventListener('touchend', handleEnd)
        el.removeEventListener('touchcancel', handleCancel)
        if (rafId) cancelAnimationFrame(rafId)
    })

    return { isSwiping, swipeDistance, velocity }
}