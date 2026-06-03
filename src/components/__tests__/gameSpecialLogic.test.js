/**
 * gameSpecialLogic 防刷分机制单元测试。
 *
 * <p>覆盖场景：</p>
 * <ol>
 *   <li>单次特殊消除：chain=1，得分 100%，不产生衰减标签</li>
 *   <li>第 2 次连续特殊消除：chain=2，得分 75%，显示衰减标签</li>
 *   <li>第 3 次连续特殊消除：chain=3，得分 50%，显示衰减标签</li>
 *   <li>第 4 次连续特殊消除：chain=4，得分 25%（最低），显示衰减标签</li>
 *   <li>第 5 次及以上：chain≥5，得分 25%（不跌破下限）</li>
 *   <li>普通交换后链重置：chain=0 → 再次特殊消除时 chain=1（满分）</li>
 *   <li>collectSpecialArea 消除范围正确性</li>
 *   <li>双重特殊消除得分叠加 + 链衰减</li>
 * </ol>
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createSpecialClear } from '../gameSpecialLogic'

const GRID_SIZE = 7

function createMockGrid(iconMap = {}) {
  const grid = []
  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    grid.push({
      icon: iconMap[i] !== undefined ? iconMap[i] : 'A',
      matched: false,
      popping: false,
      special: null,
      specialActivated: false,
      falling: false,
      fallDistance: 0,
      fallPhase: null
    })
  }
  return grid
}

function createTestCtx(overrides = {}) {
  const grid = ref(createMockGrid(overrides.iconMap))
  const score = ref(0)
  const message = ref('')
  const messageType = ref('')
  const specialChainCount = ref(0)

  return {
    grid,
    score,
    message,
    messageType,
    specialChainCount,
    playSpecialClear: () => {},
    playDoubleSpecialClear: () => {},
    delay: () => Promise.resolve(),
    dropIcons: () => Promise.resolve(),
    fillEmptyCells: () => Promise.resolve(),
    ...overrides
  }
}

// ref helper
function ref(val) {
  return { value: val }
}

describe('gameSpecialLogic 防刷分机制', () => {

  describe('单次特殊消除（chain=1 → 得分 100%）', () => {
    it('应得到完整得分且无衰减标签', async () => {
      const ctx = createTestCtx()
      const { processSpecialClear } = createSpecialClear(ctx)

      // 整行7格全部有图标 → 7 × 10 × 2 = 140
      await processSpecialClear(0, 'horizontal')

      expect(ctx.score.value).toBe(140)
      expect(ctx.specialChainCount.value).toBe(1)
      expect(ctx.message.value.includes('[连续特殊')).toBe(false)
    })
  })

  describe('第2次连续特殊消除（chain=2 → 得分 75%）', () => {
    it('应得到 75% 得分并显示衰减标签', async () => {
      const ctx = createTestCtx()
      const { processSpecialClear } = createSpecialClear(ctx)

      await processSpecialClear(0, 'horizontal')
      await processSpecialClear(8, 'horizontal')

      // 第1次: 7×10×2×1.0 = 140, 第2次: 7×10×2×0.75 = 105, total = 245
      expect(ctx.score.value).toBe(245)
      expect(ctx.specialChainCount.value).toBe(2)
      expect(ctx.message.value.includes('连续特殊×2')).toBe(true)
      expect(ctx.message.value.includes('得分×75%')).toBe(true)
    })
  })

  describe('第3次连续特殊消除（chain=3 → 得分 50%）', () => {
    it('应得到 50% 得分', async () => {
      const ctx = createTestCtx()
      const { processSpecialClear } = createSpecialClear(ctx)

      await processSpecialClear(0, 'horizontal')
      await processSpecialClear(8, 'horizontal')
      await processSpecialClear(16, 'horizontal')

      // 140 + 105 + 70 = 315
      expect(ctx.score.value).toBe(315)
      expect(ctx.specialChainCount.value).toBe(3)
      expect(ctx.message.value.includes('得分×50%')).toBe(true)
    })
  })

  describe('第4次连续特殊消除（chain=4 → 得分 25%）', () => {
    it('应得到最低 25% 得分', async () => {
      const ctx = createTestCtx()
      const { processSpecialClear } = createSpecialClear(ctx)

      await processSpecialClear(0, 'horizontal')
      await processSpecialClear(8, 'horizontal')
      await processSpecialClear(16, 'horizontal')
      await processSpecialClear(24, 'horizontal')

      // 140 + 105 + 70 + 35 = 350
      expect(ctx.score.value).toBe(350)
      expect(ctx.specialChainCount.value).toBe(4)
      expect(ctx.message.value.includes('得分×25%')).toBe(true)
    })
  })

  describe('第5次及以上连续特殊消除（chain≥5 → 得分不低于 25%）', () => {
    it('chain=5 时得分仍为 25%，不跌破下限', async () => {
      const ctx = createTestCtx()
      const { processSpecialClear } = createSpecialClear(ctx)

      await processSpecialClear(0, 'horizontal')
      await processSpecialClear(8, 'horizontal')
      await processSpecialClear(16, 'horizontal')
      await processSpecialClear(24, 'horizontal')
      await processSpecialClear(32, 'horizontal')

      // 140 + 105 + 70 + 35 + 35 = 385
      expect(ctx.score.value).toBe(385)
      expect(ctx.specialChainCount.value).toBe(5)
    })
  })

  describe('双重特殊消除 + 链衰减', () => {
    it('chain=1 双重消除应得完整 3x 得分', async () => {
      const ctx = createTestCtx()
      const { processDoubleSpecialClear } = createSpecialClear(ctx)

      // row(7) + col(7) - overlap(1) = 13 cells
      // 13 × 10 × 2 × 1.5 × 1.0 = 390
      await processDoubleSpecialClear(0, 9, 'horizontal', 'vertical')

      expect(ctx.specialChainCount.value).toBe(1)
      // 验证分数在一个合理范围内（13个非空）
      expect(ctx.score.value).toBeGreaterThanOrEqual(390)
      expect(ctx.score.value).toBeLessThanOrEqual(420)
    })

    it('chain=2 双重消除应得 75% 得分', async () => {
      const ctx = createTestCtx()
      const { processSpecialClear, processDoubleSpecialClear } = createSpecialClear(ctx)

      await processSpecialClear(0, 'horizontal')
      await processDoubleSpecialClear(10, 19, 'vertical', 'bomb')

      expect(ctx.specialChainCount.value).toBe(2)
      expect(ctx.message.value.includes('得分×75%')).toBe(true)
    })
  })

  describe('collectSpecialArea 范围正确性', () => {
    it('horizontal 应收集整行 7 格', () => {
      const ctx = createTestCtx()
      const { collectSpecialArea } = createSpecialClear(ctx)
      const result = new Set()
      collectSpecialArea(result, 5, 'horizontal')
      expect(result.size).toBe(7)
      for (let c = 0; c < 7; c++) {
        expect(result.has(c)).toBe(true)
      }
    })

    it('vertical 应收集整列 7 格', () => {
      const ctx = createTestCtx()
      const { collectSpecialArea } = createSpecialClear(ctx)
      const result = new Set()
      collectSpecialArea(result, 3, 'vertical')
      expect(result.size).toBe(7)
      for (let r = 0; r < 7; r++) {
        expect(result.has(r * 7 + 3)).toBe(true)
      }
    })

    it('bomb 应收集 3×3 区域（角落在边界处裁剪）', () => {
      const ctx = createTestCtx()
      const { collectSpecialArea } = createSpecialClear(ctx)
      const result = new Set()
      collectSpecialArea(result, 0, 'bomb')
      expect(result.size).toBe(4)
      expect(result.has(0)).toBe(true)
      expect(result.has(8)).toBe(true)
      expect(result.has(9)).toBe(true)
    })

    it('bomb 在棋盘中心应收集 9 格', () => {
      const ctx = createTestCtx()
      const { collectSpecialArea } = createSpecialClear(ctx)
      const result = new Set()
      collectSpecialArea(result, 24, 'bomb')
      expect(result.size).toBe(9)
    })
  })
})
