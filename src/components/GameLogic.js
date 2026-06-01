/**
 * GameLogic.js — 消消乐核心游戏引擎
 *
 * 【功能概述】
 * 这是整个游戏的中枢神经系统，编排所有游戏逻辑：
 * - 方块点击/交换处理
 * - 匹配检测（横向、纵向、交叉 → 炸弹）
 * - 消除动画流程（标记 → 弹跳 → 清空 → 下落 → 填充）
 * - 特殊方块系统（整行消除/整列消除/炸弹 3×3）
 * - 连击系统（combo 计数 + 倍率加成）
 * - DDC 自适应难度（根据连胜/连败动态调整步数和特殊方块概率）
 * - 关卡持久化（通关记录 → localStorage）
 * - 游戏状态管理（分数/步数/目标/游戏结束判定）
 *
 * 【架构设计】
 * GameLogic.js 是 Composable 模式的聚合层：
 *   useGameState()  → 数据层（grid, score, moves, level 等响应式状态）
 *   useSound()      → 音效层（合成音效播放）
 *   本文件内的函数 → 逻辑层（消除流程编排、交换判定、动画控制）
 *
 * 【关键函数调用链】
 * 用户操作 → handleTileClick/handleSwap
 *   → processSwap (检查特殊方块)
 *     → swapTiles (交换两个方块)
 *     → processSpecialClear / processDoubleSpecialClear (特殊消除)
 *     → processGame (标准消除循环)
 *       → findMatches (匹配检测)
 *       → 标记 elimination → delay → 清空
 *       → dropIcons (现有方块下落)
 *       → fillEmptyCells (新方块填充)
 *       → 循环直到无匹配
 *     → checkGameStatus (检查通关/失败)
 *
 * 【使用示例】
 *   import { useGameLogic } from './components/GameLogic'
 *   const { grid, score, handleTileClick, handleSwap, ... } = useGameLogic()
 */

import { ref, onMounted, nextTick } from 'vue'
import { useGameState } from '../composables/useGameState'
import { useSound } from '../composables/useSound'
import { createSpecialClear } from './gameSpecialLogic'
import { GRID_SIZE, BASE_SCORE, COMBO_MULTIPLIER, SPECIAL_CLEAR_SCORE_MULTIPLIER, DROP_BASE_DELAY, DROP_SPEED_PER_CELL, LEVEL_CONFIG } from '../constants'

export function useGameLogic() {
  /**
   * ======================== 数据层（来自 useGameState） ========================
   * grid:            棋盘数据 ref<Array>，每个元素是 {icon, selected, matched, falling, ...}
   * score:           当前分数
   * level:           当前关卡号
   * moves:           剩余步数
   * target:          通关目标分数
   * selectedIndex:   当前选中的方块索引（null = 未选中）
   * isAnimating:     是否正在执行动画（锁定操作）
   * gameOver:        游戏是否结束
   * levelComplete:   当前关卡是否完成
   * combo:           当前连击数
   * message:         状态消息文本
   * highScore:       历史最高分
   * completedLevels: 已通关关卡列表
   */
  const {
    grid,
    score,
    level,
    moves,
    target,
    selectedIndex,
    isAnimating,
    gameOver,
    levelComplete,
    combo,
    message,
    highScore,
    completedLevels,
    isLoading,
    loadError,
    loadProgress,
    isAdjacent,
    findMatches,
    swapTiles,
    shuffleGrid,
    resetGame,
    nextLevel,
    goToLevel,
    completeLevel,
    checkLevelComplete,
    unlockNextLevel,
    isLevelCompleted,
    loadGameState,
    saveGameState,
    saveHighScore,
    clearGameState,
    delay,
    createTile,
    hasValidMoves,
    getRow,
    getCol,
    initializeGame,
    recordLevelWin,
    recordLevelLoss,
    consecutiveWins,
    consecutiveLosses,
    ddcSpecialBoostModifier,
    ddcMovesModifier,
    activeTileTypes,
    specialChainCount
  } = useGameState()

  /**
   * ======================== 音效层（来自 useSound） ========================
   */
  const {
    playMatch,
    playCombo,
    playSpecialClear,
    playDoubleSpecialClear,
    playVictory,
    playGameStart,
    playGameOver,
    playInvalidMove,
    playSwap,
    ensureContext
  } = useSound()

  const messageType = ref('info')
  const showVictoryOverlay = ref(false)

  /**
   * ======================== 核心游戏循环 ========================
   *
   * processGame — 消除→下落→填充的完整流程
   *
   * 流程：
   * 1. findMatches() 检测所有匹配（横向≥3、纵向≥3、交叉→炸弹）
   * 2. 标记匹配方块为 matched/popping 状态
   * 3. 处理特殊方块候选（≥4连消 → 整行/整列）
   * 4. delay 等待消除动画（300ms）
   * 5. 清空已消除方块 + 创建特殊方块标记
   * 6. delay（100ms）
   * 7. 连击≥2 时有机会生成额外特殊方块（概率 = LEVEL_CONFIG.specialBoost + DDC修正）
   * 8. dropIcons() → fillEmptyCells() → 循环直到无匹配
   * 9. checkGameStatus() 检查通关/失败
   * 10. 无有效移动时 shuffleGridUntilValid() 自动重排
   * 11. saveGameState() 持久化当前游戏状态
   *
   * @returns {Promise<void>}
   */
  const processGame = async () => {
    let { matches, specialCandidates } = findMatches()
    combo.value = 0

    while (matches.length > 0) {
      combo.value++

      if (combo.value > 1) {
        playCombo(combo.value)
        message.value = `${combo.value}连击！消除 ${matches.length} 个！`
      } else {
        playMatch(1)
        message.value = `消除 ${matches.length} 个图标！`
      }
      messageType.value = 'success'

      matches.forEach(index => {
        grid.value[index].matched = true
        grid.value[index].popping = true
      })

      const comboBonus = Math.pow(COMBO_MULTIPLIER, combo.value - 1)
      score.value += Math.floor(matches.length * BASE_SCORE * comboBonus)

      await delay(300)

      const matchedSet = new Set(matches)
      specialCandidates.forEach(candidate => {
        if (matchedSet.has(candidate.index)) {
          grid.value[candidate.index].matched = false
          grid.value[candidate.index].popping = false
          grid.value[candidate.index].special = candidate.direction
          grid.value[candidate.index].specialActivated = false
        }
      })

      matches.forEach(index => {
        if (!grid.value[index].special) {
          grid.value[index].icon = ''
          grid.value[index].matched = false
          grid.value[index].popping = false
          grid.value[index].special = null
          grid.value[index].specialActivated = false
        } else {
          grid.value[index].matched = false
          grid.value[index].popping = false
        }
      })

      await delay(100)

      if (combo.value >= 2) {
        const lvlConfig = LEVEL_CONFIG[level.value] || LEVEL_CONFIG[1]
        const rawChance = (lvlConfig.specialBoost || 0.05) + ddcSpecialBoostModifier.value
        const chain = specialChainCount.value
        const effectiveChance = chain >= 4
          ? 0
          : chain >= 2
            ? rawChance / Math.pow(2, chain - 1)
            : rawChance
        if (Math.random() < effectiveChance) {
          const emptyCells = []
          for (let i = 0; i < grid.value.length; i++) {
            if (!grid.value[i].icon || grid.value[i].icon === '') {
              emptyCells.push(i)
            }
          }
          if (emptyCells.length > 0) {
            const targetIdx = emptyCells[Math.floor(Math.random() * emptyCells.length)]
            const specialTypes = ['horizontal', 'vertical', 'bomb']
            grid.value[targetIdx].special = specialTypes[Math.floor(Math.random() * specialTypes.length)]
            grid.value[targetIdx].icon = createTile().icon
            message.value = `${combo.value}连击！触发额外特殊砖块！`
            messageType.value = 'success'
          }
        }
      }

      await dropIcons()
      await fillEmptyCells()

      const result = findMatches()
      matches = result.matches
      specialCandidates = result.specialCandidates
    }

    checkGameStatus()

    if (!gameOver.value && !levelComplete.value) {
      if (!hasValidMoves()) {
        message.value = '没有可用移动，正在重新排列...'
        messageType.value = 'warning'
        await delay(500)
        shuffleGridUntilValid()
      } else {
        message.value = '继续游戏！'
        messageType.value = 'info'
      }
    }

    saveGameState()
  }

  /**
   * dropIcons — 现有方块重力下落
   *
   * 列遍历：从底部向上扫描每列，遇到非空方块就"虚拟上移"到 writeRow 位置。
   * writeRow 从底部（GRID_SIZE-1）开始，每放置一个方块就上移一行。
   *
   * 动画机制：
   * - fallPhase='start'：设置方块在起始位置（上方），transition=none
   * - nextTick + delay(30) → fallPhase='end'：CSS transition 驱动下落动画
   * - delay(DROP_BASE_DELAY + maxFallDistance * DROP_SPEED_PER_CELL)：等待动画完成
   *
   * @returns {Promise<void>}
   */
  const dropIcons = async () => {
    let maxFallDistance = 0

    for (let col = 0; col < GRID_SIZE; col++) {
      let writeRow = GRID_SIZE - 1

      for (let readRow = GRID_SIZE - 1; readRow >= 0; readRow--) {
        const index = readRow * GRID_SIZE + col
        const icon = grid.value[index].icon

        if (icon && icon !== '') {
          if (readRow !== writeRow) {
            const targetIndex = writeRow * GRID_SIZE + col
            const fallDistance = readRow - writeRow

            grid.value[targetIndex].icon = icon
            grid.value[targetIndex].special = grid.value[index].special
            grid.value[targetIndex].specialActivated = grid.value[index].specialActivated
            grid.value[targetIndex].matched = grid.value[index].matched
            grid.value[targetIndex].popping = grid.value[index].popping
            grid.value[targetIndex].selected = grid.value[index].selected
            grid.value[targetIndex].falling = true
            grid.value[targetIndex].fallDistance = fallDistance

            grid.value[index].icon = ''
            grid.value[index].special = null
            grid.value[index].specialActivated = false
            grid.value[index].matched = false
            grid.value[index].popping = false
            grid.value[index].selected = false
            grid.value[index].falling = false
            grid.value[index].fallDistance = 0

            if (fallDistance > maxFallDistance) {
              maxFallDistance = fallDistance
            }
          }
          writeRow--
        }
      }
    }

    if (maxFallDistance > 0) {
      await nextTick()

      for (let i = 0; i < grid.value.length; i++) {
        if (grid.value[i].falling) {
          grid.value[i].fallPhase = 'start'
        }
      }

      await delay(30)

      for (let i = 0; i < grid.value.length; i++) {
        if (grid.value[i].falling) {
          grid.value[i].fallPhase = 'end'
        }
      }

      await delay(DROP_BASE_DELAY + maxFallDistance * DROP_SPEED_PER_CELL)

      for (let i = 0; i < grid.value.length; i++) {
        if (grid.value[i].falling) {
          grid.value[i].falling = false
          grid.value[i].fallDistance = 0
          grid.value[i].fallPhase = null
        }
      }
    }
  }

  /**
   * fillEmptyCells — 填充空单元格（新方块从"屏幕外"掉落）
   *
   * 列遍历：统计每列空位数量，从顶部生成新方块填充。
   * 新方块的 fallDistance = 该列空位数 - 填充顺序（从底部第一空位=最大 fallDistance）。
   *
   * @returns {Promise<void>}
   */
  const fillEmptyCells = async () => {
    let maxFallDistance = 0

    for (let col = 0; col < GRID_SIZE; col++) {
      let emptyCount = 0
      for (let row = GRID_SIZE - 1; row >= 0; row--) {
        const index = row * GRID_SIZE + col
        if (!grid.value[index].icon || grid.value[index].icon === '') {
          emptyCount++
        }
      }

      if (emptyCount === 0) continue

      let placedIndex = 0
      for (let row = GRID_SIZE - 1; row >= 0; row--) {
        const index = row * GRID_SIZE + col
        if (!grid.value[index].icon || grid.value[index].icon === '') {
          const newTile = createTile()
          grid.value[index].icon = newTile.icon
          grid.value[index].special = null
          grid.value[index].specialActivated = false
          grid.value[index].matched = false
          grid.value[index].popping = false
          grid.value[index].selected = false
          grid.value[index].fallPhase = null
          grid.value[index].falling = true
          grid.value[index].fallDistance = emptyCount - placedIndex
          placedIndex++
          if (grid.value[index].fallDistance > maxFallDistance) {
            maxFallDistance = grid.value[index].fallDistance
          }
        }
      }
    }

    if (maxFallDistance > 0) {
      await nextTick()

      for (let i = 0; i < grid.value.length; i++) {
        if (grid.value[i].falling) {
          grid.value[i].fallPhase = 'start'
        }
      }

      await delay(30)

      for (let i = 0; i < grid.value.length; i++) {
        if (grid.value[i].falling) {
          grid.value[i].fallPhase = 'end'
        }
      }

      await delay(DROP_BASE_DELAY + maxFallDistance * DROP_SPEED_PER_CELL)

      for (let i = 0; i < grid.value.length; i++) {
        if (grid.value[i].falling) {
          grid.value[i].falling = false
          grid.value[i].fallDistance = 0
          grid.value[i].fallPhase = null
        }
      }
    }
  }

  /**
   * ======================== 特殊消除层（来自 gameSpecialLogic） ========================
   */
  const {
    collectSpecialArea,
    processSpecialClear,
    processDoubleSpecialClear
  } = createSpecialClear({
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
  })

  /**
   * shuffleGridUntilValid — 重排棋盘直到存在有效移动
   * 最多尝试 100 次，防止无限循环
   */
  const shuffleGridUntilValid = () => {
    let attempts = 0
    do {
      shuffleGrid()
      attempts++
    } while (!hasValidMoves() && attempts < 100)
  }

  /**
   * checkGameStatus — 检查游戏是否通关或失败
   *
   * 通关条件：score >= target
   * 失败条件：moves <= 0
   *
   * 通关后链式操作：
   *   recordLevelWin() → consecutiveWins++, consecutiveLosses=0 (DDC)
   *   unlockNextLevel() → 保存关卡到 completedLevels + localStorage
   *   showVictoryOverlay = true → 触发 VictoryOverlay 组件
   *   playVictory() → 播放胜利音效
   *   saveHighScore() → 更新最高分
   *   clearGameState() → 清除棋盘快照
   */
  const checkGameStatus = () => {
    if (score.value >= target.value) {
      score.value = target.value
      recordLevelWin()
      unlockNextLevel()
      levelComplete.value = true
      showVictoryOverlay.value = true
      message.value = '太棒了！完成目标！'
      messageType.value = 'success'
      playVictory()
      saveHighScore()
      clearGameState()
      return
    }

    if (moves.value <= 0) {
      gameOver.value = true
      recordLevelLoss()
      message.value = '步数用完了，再试一次吧！'
      messageType.value = 'error'
      playGameOver()
      saveHighScore()
      clearGameState()
      return
    }
  }

  /**
   * processSwap — 方块交换处理（四类场景）
   *
   * 场景1：双方都是特殊方块 → 双重特殊消除
   * 场景2：只有 from 是特殊方块 → 特殊消除在 to 位置
   * 场景3：只有 to 是特殊方块 → 特殊消除在 from 位置
   * 场景4：双方都是普通方块 → 检查是否有匹配（无匹配则回交换）
   *
   * 注意：特殊方块交换不会扣步数（已在交换清除内部处理）
   *
   * @param {number}  fromIndex   - 来源方块索引
   * @param {number}  toIndex     - 目标方块索引
   * @param {string|null} fromSpecial - from 的特殊类型
   * @param {string|null} toSpecial   - to 的特殊类型
   */
  const processSwap = async (fromIndex, toIndex, fromSpecial, toSpecial) => {
    swapTiles(fromIndex, toIndex)

    if (fromSpecial && toSpecial) {
      grid.value[toIndex].specialActivated = true
      grid.value[fromIndex].specialActivated = true

      await delay(200)
      await processDoubleSpecialClear(fromIndex, toIndex, fromSpecial, toSpecial)
      moves.value--
      selectedIndex.value = null
      await processGame()
    } else if (fromSpecial) {
      grid.value[toIndex].special = fromSpecial
      grid.value[toIndex].specialActivated = true
      grid.value[fromIndex].special = null

      await delay(200)
      await processSpecialClear(toIndex, fromSpecial)
      moves.value--
      selectedIndex.value = null
      await processGame()
    } else if (toSpecial) {
      grid.value[fromIndex].special = toSpecial
      grid.value[fromIndex].specialActivated = true
      grid.value[toIndex].special = null

      await delay(200)
      await processSpecialClear(fromIndex, toSpecial)
      moves.value--
      selectedIndex.value = null
      await processGame()
    } else {
      specialChainCount.value = 0
      const { matches } = findMatches()
      if (matches.length > 0) {
        playSwap()
        moves.value--
        selectedIndex.value = null
        await processGame()
      } else {
        await delay(200)
        swapTiles(fromIndex, toIndex)
        playInvalidMove()
        message.value = '无法消除，请重新选择！'
        messageType.value = 'warning'
        selectedIndex.value = null
      }
    }
  }

  /**
   * handleTileClick — 方块点击处理
   *
   * 三种状态转换：
   * 1. 无选中 (selectedIndex = null)：选中当前方块
   * 2. 已选中且点击同一方块：取消选中
   * 3. 已选中且点击相邻方块：尝试交换
   * 4. 已选中但点击非相邻方块：切换选中到新方块
   *
   * @param {number} index - 被点击的方块索引
   */
  const handleTileClick = async (index) => {
    if (isAnimating.value || gameOver.value || levelComplete.value) return

    ensureContext()

    if (selectedIndex.value === null) {
      selectedIndex.value = index
      grid.value[index].selected = true
      message.value = '请再点击一个相邻的图标'
      messageType.value = 'info'
    } else if (selectedIndex.value === index) {
      grid.value[index].selected = false
      selectedIndex.value = null
      message.value = '点击两个相邻的相同图标！'
      messageType.value = 'info'
    } else if (isAdjacent(selectedIndex.value, index)) {
      isAnimating.value = true

      grid.value[selectedIndex.value].selected = false

      const fromSpecial = grid.value[selectedIndex.value].special
      const toSpecial = grid.value[index].special

      await processSwap(selectedIndex.value, index, fromSpecial, toSpecial)

      isAnimating.value = false
    } else {
      grid.value[selectedIndex.value].selected = false
      selectedIndex.value = index
      grid.value[index].selected = true
      message.value = '请再点击一个相邻的图标'
      messageType.value = 'info'
    }
  }

  /**
   * handleRestart — 重新开始当前关卡
   * 播放开始音效，调用 resetGame() 重置所有状态
   */
  const handleRestart = () => {
    specialChainCount.value = 0
    playGameStart()
    resetGame()
  }

  /**
   * handleShuffle — 重新排列棋盘
   * 在动画锁定期间不可用。重排后清除下落动画状态。
   */
  const handleShuffle = async () => {
    if (isAnimating.value) return
    isAnimating.value = true
    message.value = '重新排列中...'
    messageType.value = 'info'

    shuffleGridUntilValid()

    await delay(300)
    for (let i = 0; i < grid.value.length; i++) {
      if (grid.value[i].falling) {
        grid.value[i].falling = false
        grid.value[i].fallDistance = 0
        grid.value[i].fallPhase = null
      }
    }

    message.value = '继续游戏！'
    messageType.value = 'info'
    isAnimating.value = false
  }

  /**
   * handleHint — 提示有效移动
   *
   * 遍历所有相邻方块对，尝试交换后检查是否产生匹配。
   * 找到第一个有效交换后高亮两个方块 2 秒。
   * 时间复杂度：O(GRID_SIZE²)
   */
  const handleHint = () => {
    if (isAnimating.value || gameOver.value || levelComplete.value) return

    for (let i = 0; i < grid.value.length; i++) {
      const neighbors = []
      const row = getRow(i)
      const col = getCol(i)

      if (col < GRID_SIZE - 1) neighbors.push(i + 1)
      if (row < GRID_SIZE - 1) neighbors.push(i + GRID_SIZE)

      for (const neighbor of neighbors) {
        swapTiles(i, neighbor)
        const { matches } = findMatches()
        swapTiles(i, neighbor)
        if (matches.length > 0) {
          grid.value[i].selected = true
          grid.value[neighbor].selected = true
          message.value = '提示：这两个图标可以消除！'
          messageType.value = 'info'
          setTimeout(() => {
            grid.value[i].selected = false
            grid.value[neighbor].selected = false
          }, 2000)
          return
        }
      }
    }
  }

  const handleNextLevel = () => {
    nextLevel()
  }

  const handleGoToLevel = (levelNum) => {
    goToLevel(levelNum)
  }

  const handleVictoryDismiss = () => {
    showVictoryOverlay.value = false
  }

  /**
   * 生命周期：挂载时初始化游戏
   */
  onMounted(async () => {
    await initializeGame()
  })

  /**
   * handleSwap — 滑动手势触发的交换入口
   *
   * 来自 GameGrid 组件的 @swap 事件。
   * 与 handleTileClick 不同：这里从滑动手势获取 from/to 索引，
   * 不依赖 selectedIndex 状态。
   *
   * @param {{from: number, to: number}} payload - 交换的两个方块索引
   */
  const handleSwap = async ({ from, to }) => {
    if (isAnimating.value || gameOver.value || levelComplete.value) return
    if (!isAdjacent(from, to)) return

    if (selectedIndex.value !== null) {
      grid.value[selectedIndex.value].selected = false
    }

    isAnimating.value = true

    const fromSpecial = grid.value[from].special
    const toSpecial = grid.value[to].special

    await processSwap(from, to, fromSpecial, toSpecial)

    isAnimating.value = false
  }

  return {
    grid,
    score,
    level,
    moves,
    target,
    selectedIndex,
    isAnimating,
    gameOver,
    levelComplete,
    combo,
    message,
    messageType,
    highScore,
    completedLevels,
    isLoading,
    loadError,
    loadProgress,
    handleTileClick,
    handleSwap,
    handleRestart,
    handleShuffle,
    handleHint,
    handleNextLevel,
    handleGoToLevel,
    handleVictoryDismiss,
    showVictoryOverlay,
    isLevelCompleted,
    loadGameState,
    initializeGame,
    saveHighScore,
    consecutiveWins,
    consecutiveLosses,
    ddcMovesModifier,
    activeTileTypes
  }
}
