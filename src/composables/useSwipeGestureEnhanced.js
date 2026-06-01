/**
 * useSwipeGestureEnhanced.js — 增强手势识别系统（Touch + Mouse）
 *
 * 【功能概述】
 * 完整的手势识别引擎，支持：
 * - 触摸（Touch Events）和鼠标（Mouse Events）双模式
 * - 轴锁定机制：一旦识别到主轴方向，锁定该轴避免方向抖动
 * - 惯性滚动：基于 velocity 和 friction 的帧动画模拟
 * - 实时回调：onSwipeStart / onSwipeMove / onSwipeEnd 三个生命周期回调
 *
 * 【核心概念】
 * - 轴锁定（Lock Axis）：防止斜向滑动在两种方向间摇摆
 *   当 |delta| > threshold 时锁定主轴（X 或 Y），后续移动忽略副轴
 * - 惯性（Inertia）：手指/鼠标释放后，通过 requestAnimationFrame 模拟
 *   摩擦减速的余量运动
 * - hasMoved：防止单击也被识别为滑动（需超过 minDragDistance）
 *
 * 【与 useTileSwipe 的区别】
 * - useTileSwipe：轻量（92行），仅 Touch，无惯性/轴锁定/鼠标
 * - useSwipeGestureEnhanced：完整（223行），Touch+Mouse，惯性+轴锁定
 *
 * 【使用示例】
 *   import { useSwipeGestureEnhanced } from './composables/useSwipeGestureEnhanced'
 *   const { isSwiping, swipeDistance } = useSwipeGestureEnhanced(gridRef, {
 *     threshold: 20,
 *     onSwipeMove: ({ moveX, moveY }) => { console.log(moveX, moveY) },
 *     onSwipeEnd: ({ direction }) => { console.log('Swipe:', direction) }
 *   })
 */

import { ref, onMounted, onUnmounted } from 'vue'

/**
 * useSwipeGestureEnhanced — 增强手势识别 Composable
 *
 * 在 onMounted 中自动绑定事件到 elementRef 对应的 DOM 元素。
 * 在 onUnmounted 中自动解绑。
 *
 * @param {import('vue').Ref<HTMLElement|null>} elementRef - 绑定手势的目标 DOM 元素 Ref
 * @param {Object} [options={}] - 配置选项
 * @param {number} [options.threshold=30]  - 触发滑动的像素阈值
 * @param {number} [options.maxTime=400]   - 最大识别时间（毫秒），超时不算滑动
 * @param {number} [options.minDragDistance=8] - 最小拖动距离（像素），防止单击误识别
 * @param {boolean} [options.enableMouse=true]  - 是否启用鼠标拖拽支持
 * @param {boolean} [options.enableHorizontal=true] - 是否启用水平滑动
 * @param {boolean} [options.enableVertical=true]   - 是否启用垂直滑动
 * @param {Function} [options.onSwipeStart]  - 滑动开始回调
 * @param {Function} [options.onSwipeMove]   - 滑动中回调，参数 {deltaX, deltaY, moveX, moveY, isLocked, lockAxis, isInertia}
 * @param {Function} [options.onSwipeEnd]    - 滑动结束回调，参数 {direction, distance, velocity, time, lockAxis} 或 null（取消时）
 * @param {boolean} [options.useInertia=true] - 是否启用惯性滚动
 * @param {number} [options.friction=0.95]   - 惯性摩擦系数（越大滚动越远）
 *
 * @returns {Object}
 * @returns {import('vue').Ref<boolean>} isSwiping      - 是否正在手势中
 * @returns {import('vue').Ref<{x:number,y:number}>} swipeDistance - 当前累计滑动距离
 * @returns {import('vue').Ref<{x:number,y:number}>} velocity      - 当前速度（像素/毫秒）
 */
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

  /**
   * 重置所有状态为初始值
   */
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

  /**
   * 从事件中提取坐标点（兼容 Touch → clientX/clientY，Mouse → clientX/clientY）
   * @param {TouchEvent|MouseEvent} e
   * @returns {{x: number, y: number}}
   */
  const getPoint = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    return { x: e.clientX, y: e.clientY }
  }

  /**
   * 处理手势开始（touchstart / mousedown）
   * 记录起始坐标，重置所有状态，初始化手势生命周期
   * @param {TouchEvent|MouseEvent} e
   */
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

  /**
   * 处理手势移动（touchmove / mousemove）
   *
   * 核心逻辑：
   * 1. 计算实时速度和增量
   * 2. hasMoved 判定（超过 minDragDistance 才算有效滑动）
   * 3. 轴锁定判定（超过 threshold 锁定主轴）
   * 4. 触发 onSwipeMove 回调
   *
   * @param {TouchEvent|MouseEvent} e
   */
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

  /**
   * 处理手势结束（touchend / mouseup）
   *
   * 判定逻辑：
   * - 滑动距离 > threshold 且 时间 < maxTime → 有效滑动 → 触发 onSwipeEnd
   * - 否则 → 取消手势 → 触发 onSwipeEnd(null)
   * - 如果速度足够大 → 启动惯性动画
   *
   * @param {TouchEvent|MouseEvent} e
   */
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

  /**
   * 惯性动画
   *
   * 使用 requestAnimationFrame 循环：
   * 1. 每帧速度 × friction（逐渐减速）
   * 2. 当前位置 += 速度
   * 3. 速度 < 0.1 时停止
   *
   * @param {string} direction - 方向
   * @param {number} distance  - 总距离
   * @param {number} time      - 耗时
   */
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

  /**
   * 处理手势取消（touchcancel）
   */
  const handleCancel = () => {
    resetState()
  }

  /**
   * 生命周期：挂载时绑定事件
   *
   * Touch 事件绑定在元素上（passive: true 用于 start/end 提升性能）
   * Mouse 事件：mousedown 在元素上，mousemove/mouseup 在 document 上
   *   （防止鼠标移出元素后丢失事件）
   */
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

  /**
   * 生命周期：卸载时解绑所有事件
   */
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
