/**
 * gameSpecialLogic.js — 特殊方块消除逻辑
 *
 * <p>从 GameLogic.js 拆分出来的特殊消除子系统，负责：</p>
 * <ul>
 *   <li>特殊方块消除范围计算（整行/整列/炸弹 3×3）</li>
 *   <li>单特殊方块消除流程</li>
 *   <li>双重特殊方块消除流程</li>
 *   <li>【防刷分】连续特殊消除得分衰减</li>
 * </ul>
 *
 * <h3>防刷分机制</h3>
 * <table>
 *   <tr><td>chain=1（首次）</td><td>得分 × 100%</td></tr>
 *   <tr><td>chain=2</td><td>得分 × 75%</td></tr>
 *   <tr><td>chain=3</td><td>得分 × 50%</td></tr>
 *   <tr><td>chain≥4</td><td>得分 × 25%（最低）</td></tr>
 * </table>
 *
 * <h3>设计意图</h3>
 * 将 GameLogic.js 中 ~200 行的特殊消除代码拆分到独立模块，
 * 降低 GameLogic.js 的复杂度，便于独立测试和维护。
 *
 * <h3>使用方式</h3>
 * <pre>
 * import { createSpecialClear } from './gameSpecialLogic'
 * const ctx = { grid, score, message, messageType, ... }
 * const { collectSpecialArea, processSpecialClear, processDoubleSpecialClear } = createSpecialClear(ctx)
 * </pre>
 */

import { GRID_SIZE, BASE_SCORE, SPECIAL_CLEAR_SCORE_MULTIPLIER } from '../constants'

/**
 * 创建特殊消除逻辑实例。
 *
 * <p>所有参数通过 ctx 对象注入，避免直接依赖 Vue 响应式状态，
 * 方便单元测试（可注入 mock 对象）。</p>
 *
 * @param {Object} ctx - 游戏上下文
 * @param {import('vue').Ref<Array>} ctx.grid       - 棋盘数据
 * @param {import('vue').Ref<number>} ctx.score     - 当前分数
 * @param {import('vue').Ref<string>} ctx.message   - 状态消息
 * @param {import('vue').Ref<string>} ctx.messageType - 消息类型
 * @param {Function} ctx.playSpecialClear       - 单特殊消除音效
 * @param {Function} ctx.playDoubleSpecialClear - 双特殊消除音效
 * @param {Function} ctx.delay                  - 异步延迟函数
 * @param {Function} ctx.dropIcons             - 方块下落
 * @param {Function} ctx.fillEmptyCells        - 填充空单元格
 * @param {import('vue').Ref<number>} ctx.specialChainCount - 特殊链计数器
 * @returns {{collectSpecialArea: Function, processSpecialClear: Function, processDoubleSpecialClear: Function}}
 */
export function createSpecialClear(ctx) {
  const {
    grid,
    score,
    message,
    messageType,
    playSpecialClear,
    playDoubleSpecialClear,
    delay,
    dropIcons,
    fillEmptyCells,
    specialChainCount
  } = ctx

  /**
   * 收集特殊方块的消除范围。
   *
   * @param {Set<number>} indices   - 输出集合，收集到的索引添加到这里
   * @param {number}      index     - 特殊方块位置索引
   * @param {string}      direction - 'horizontal'（整行）| 'vertical'（整列）| 'bomb'（3×3）
   */
  const collectSpecialArea = (indices, index, direction) => {
    const row = Math.floor(index / GRID_SIZE)
    const col = index % GRID_SIZE

    if (direction === 'horizontal') {
      for (let c = 0; c < GRID_SIZE; c++) {
        indices.add(row * GRID_SIZE + c)
      }
    } else if (direction === 'vertical') {
      for (let r = 0; r < GRID_SIZE; r++) {
        indices.add(r * GRID_SIZE + col)
      }
    } else if (direction === 'bomb') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = row + dr
          const c = col + dc
          if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
            indices.add(r * GRID_SIZE + c)
          }
        }
      }
    }
  }

  /**
   * 执行特殊区域消除的通用逻辑。
   *
   * @param {Set<number>} toClear       - 要消除的索引集合
   * @param {string}      msgPrefix     - 消息前缀
   * @param {Function}    playSound     - 音效函数
   * @param {number}      scoreMultiplier - 分数倍率
   */
  const executeSpecialClear = async (toClear, msgPrefix, playSound, scoreMultiplier = 1.0) => {
    const nonEmpty = [...toClear].filter(idx => {
      const tile = grid.value[idx]
      return tile && tile.icon && tile.icon !== ''
    })

    specialChainCount.value += 1
    const chain = specialChainCount.value
    const chainMultiplier = Math.max(0.25, 1.0 - (chain - 1) * 0.25)
    const chainLabel = chain >= 2 ? ` [连续特殊×${chain} 得分×${(chainMultiplier * 100).toFixed(0)}%]` : ''

    nonEmpty.forEach(idx => {
      grid.value[idx].matched = true
      grid.value[idx].popping = true
    })

    score.value += Math.floor(
      nonEmpty.length * BASE_SCORE * SPECIAL_CLEAR_SCORE_MULTIPLIER * scoreMultiplier * chainMultiplier
    )
    message.value = msgPrefix + `清除 ${nonEmpty.length} 个！${chainLabel}`
    messageType.value = 'success'
    playSound()

    await delay(400)

    nonEmpty.forEach(idx => {
      grid.value[idx].icon = ''
      grid.value[idx].matched = false
      grid.value[idx].popping = false
      grid.value[idx].special = null
      grid.value[idx].specialActivated = false
    })

    await delay(100)
    await dropIcons()
    await fillEmptyCells()
  }

  /**
   * 单特殊方块消除。
   *
   * @param {number} index     - 特殊方块位置
   * @param {string} direction - 'horizontal' | 'vertical' | 'bomb'
   */
  const processSpecialClear = async (index, direction) => {
    const toClear = new Set()
    collectSpecialArea(toClear, index, direction)

    let msgPrefix
    if (direction === 'horizontal') {
      msgPrefix = '横向消除！整行'
    } else if (direction === 'vertical') {
      msgPrefix = '纵向消除！整列'
    } else {
      msgPrefix = '炸弹消除！3×3范围'
    }

    await executeSpecialClear(toClear, msgPrefix, playSpecialClear)
  }

  /**
   * 双重特殊方块消除 — 两个特殊方块交换时的叠加效果。
   *
   * @param {number} fromIndex - 起始方块索引
   * @param {number} toIndex   - 目标方块索引
   * @param {string} fromDir   - from 的特殊方向
   * @param {string} toDir     - to 的特殊方向
   */
  const processDoubleSpecialClear = async (fromIndex, toIndex, fromDir, toDir) => {
    const toClear = new Set()
    collectSpecialArea(toClear, toIndex, fromDir)
    collectSpecialArea(toClear, fromIndex, toDir)

    await executeSpecialClear(toClear, '双重特殊消除！', playDoubleSpecialClear, 1.5)
  }

  return { collectSpecialArea, processSpecialClear, processDoubleSpecialClear }
}
