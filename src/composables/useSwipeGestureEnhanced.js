
import { ref, onMounted, onUnmounted } from 'vue'

export function useSwipeGestureEnhanced(elementRef, options = {}) {
  const {
    threshold = 30,
    maxTime = 400,
    minDragDistance = 8,
    enableMouse = true,
    enableHorizontal = true,
    enableVertical = true,
    onSwipeStart,
    onSwipeMove,
    onSwipeEnd,
    useInertia = true,
    friction = 0.95
  } = options

  const isSwiping = ref(false)
  const isMouseDown = ref(false)
  const swipeDistance = ref({ x: 0, y: 0 })
  const velocity = ref({ x: 0, y: 0 })

  let startX = 0, startY = 0
  let lastX = 0, lastY = 0
  let startTime = 0
  let lastTime = 0
  let rafId = null
  let isLocked = false
  let lockAxis = null
  let hasMoved = false

  const resetState = () => {
    isSwiping.value = false
    isMouseDown.value = false
    isLocked = false
    lockAxis = null
    hasMoved = false
    velocity.value = { x: 0, y: 0 }
    swipeDistance.value = { x: 0, y: 0 }
    if (rafId) cancelAnimationFrame(rafId)
    rafId = null
  }

  const getPoint = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    return { x: e.clientX, y: e.clientY }
  }

  const handleStart = (e) => {
    if (e.type === 'mousedown' && e.button !== 0) return

    const point = getPoint(e)
    startX = point.x
    startY = point.y
    lastX = startX
    lastY = startY
    startTime = Date.now()
    lastTime = startTime
    isSwiping.value = true
    isMouseDown.value = e.type === 'mousedown'
    isLocked = false
    lockAxis = null
    hasMoved = false
    velocity.value = { x: 0, y: 0 }
    swipeDistance.value = { x: 0, y: 0 }

    if (onSwipeStart) onSwipeStart({ startX: point.x, startY: point.y })
  }

  const handleMove = (e) => {
    if (!isSwiping.value) return
    if (e.type === 'mousemove' && !isMouseDown.value) return

    const point = getPoint(e)
    const deltaX = point.x - startX
    const deltaY = point.y - startY
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)
    const deltaTime = Date.now() - lastTime

    if (!hasMoved && (absX > minDragDistance || absY > minDragDistance)) {
      hasMoved = true
    }

    if (!hasMoved) return

    if (deltaTime > 0) {
      velocity.value.x = (point.x - lastX) / deltaTime
      velocity.value.y = (point.y - lastY) / deltaTime
    }

    if (!isLocked) {
      if (absX > threshold || absY > threshold) {
        isLocked = true
        lockAxis = absX > absY ? 'x' : 'y'
      }
    }

    let filteredX = deltaX
    let filteredY = deltaY
    if (lockAxis === 'x') filteredY = 0
    else if (lockAxis === 'y') filteredX = 0

    const moveX = point.x - lastX
    const moveY = point.y - lastY

    swipeDistance.value.x = filteredX
    swipeDistance.value.y = filteredY

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

    lastX = point.x
    lastY = point.y
    lastTime = Date.now()

    e.preventDefault()
  }

  const handleEnd = (e) => {
    if (!isSwiping.value) return

    const deltaTime = Date.now() - startTime
    const absX = Math.abs(swipeDistance.value.x)
    const absY = Math.abs(swipeDistance.value.y)

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

      if (useInertia && (Math.abs(velocity.value.x) > 0.3 || Math.abs(velocity.value.y) > 0.3)) {
        performInertia(direction, absX, absY, deltaTime)
      }
    } else {
      if (onSwipeEnd) onSwipeEnd(null)
    }

    resetState()
  }

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

  const handleCancel = () => {
    resetState()
  }

  onMounted(() => {
    const el = elementRef.value
    if (!el) return

    el.addEventListener('touchstart', handleStart, { passive: true })
    el.addEventListener('touchmove', handleMove, { passive: false })
    el.addEventListener('touchend', handleEnd, { passive: true })
    el.addEventListener('touchcancel', handleCancel, { passive: true })

    if (enableMouse) {
      el.addEventListener('mousedown', handleStart)
      document.addEventListener('mousemove', handleMove)
      document.addEventListener('mouseup', handleEnd)
    }
  })

  onUnmounted(() => {
    const el = elementRef.value
    if (el) {
      el.removeEventListener('touchstart', handleStart)
      el.removeEventListener('touchmove', handleMove)
      el.removeEventListener('touchend', handleEnd)
      el.removeEventListener('touchcancel', handleCancel)
      el.removeEventListener('mousedown', handleStart)
    }
    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('mouseup', handleEnd)
    if (rafId) cancelAnimationFrame(rafId)
  })

  return { isSwiping, swipeDistance, velocity }
}
