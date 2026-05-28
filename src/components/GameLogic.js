import { ref, onMounted, nextTick } from 'vue'
import { useGameState } from '../composables/useGameState'
import { useSound } from '../composables/useSound'
import { GRID_SIZE, BASE_SCORE, COMBO_MULTIPLIER, SPECIAL_CLEAR_SCORE_MULTIPLIER, DROP_BASE_DELAY, DROP_SPEED_PER_CELL, LEVEL_CONFIG } from '../constants'

export function useGameLogic() {
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
    activeTileTypes
  } = useGameState()

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
        const boostChance = (lvlConfig.specialBoost || 0.05) + ddcSpecialBoostModifier.value
        if (Math.random() < boostChance) {
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

  const shuffleGridUntilValid = () => {
    let attempts = 0
    do {
      shuffleGrid()
      attempts++
    } while (!hasValidMoves() && attempts < 100)
  }

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

  const processDoubleSpecialClear = async (fromIndex, toIndex, fromDir, toDir) => {
    const toClear = new Set()
    collectSpecialArea(toClear, toIndex, fromDir)
    collectSpecialArea(toClear, fromIndex, toDir)

    const nonEmpty = [...toClear].filter(idx => {
      const tile = grid.value[idx]
      return tile && tile.icon && tile.icon !== ''
    })

    nonEmpty.forEach(idx => {
      grid.value[idx].matched = true
      grid.value[idx].popping = true
    })

    score.value += Math.floor(nonEmpty.length * BASE_SCORE * SPECIAL_CLEAR_SCORE_MULTIPLIER * 1.5)
    message.value = `双重特殊消除！清除 ${nonEmpty.length} 个！`
    messageType.value = 'success'
    playDoubleSpecialClear()

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

  const processSpecialClear = async (index, direction) => {
    const toClear = new Set()
    collectSpecialArea(toClear, index, direction)

    if (direction === 'horizontal') {
      message.value = '横向消除！整行清除！'
    } else if (direction === 'vertical') {
      message.value = '纵向消除！整列清除！'
    } else if (direction === 'bomb') {
      message.value = '炸弹消除！3×3范围清除！'
    }
    messageType.value = 'success'
    playSpecialClear()

    const nonEmpty = [...toClear].filter(idx => {
      const tile = grid.value[idx]
      return tile && tile.icon && tile.icon !== ''
    })

    nonEmpty.forEach(idx => {
      grid.value[idx].matched = true
      grid.value[idx].popping = true
    })

    score.value += Math.floor(nonEmpty.length * BASE_SCORE * SPECIAL_CLEAR_SCORE_MULTIPLIER)

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

  const handleRestart = () => {
    playGameStart()
    resetGame()
  }

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

  onMounted(async () => {
    await initializeGame()
  })

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