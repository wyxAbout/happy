import { ref, onMounted } from 'vue'
import { useGameState } from '../composables/useGameState'
import { GRID_SIZE, BASE_SCORE, COMBO_MULTIPLIER, TOTAL_LEVELS } from '../constants'

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
    initializeGame
  } = useGameState()

  const messageType = ref('info')
  const showVictoryOverlay = ref(false)

  const processGame = async () => {
    let { matches, specialCandidates } = findMatches()
    combo.value = 0

    while (matches.length > 0) {
      combo.value++

      if (combo.value > 1) {
        message.value = `${combo.value}连击！消除 ${matches.length} 个！`
      } else {
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
    let dropped = false

    for (let col = 0; col < GRID_SIZE; col++) {
      let emptyRow = GRID_SIZE - 1

      for (let row = GRID_SIZE - 1; row >= 0; row--) {
        const index = row * GRID_SIZE + col
        const icon = grid.value[index].icon

        if (icon && icon !== '') {
          if (row !== emptyRow) {
            const targetIndex = emptyRow * GRID_SIZE + col
            grid.value[targetIndex].icon = icon
            grid.value[targetIndex].special = grid.value[index].special
            grid.value[targetIndex].specialActivated = grid.value[index].specialActivated
            grid.value[index].icon = ''
            grid.value[index].special = null
            grid.value[index].specialActivated = false
            grid.value[targetIndex].falling = true
            dropped = true
          }
          emptyRow--
        }
      }
    }

    if (dropped) {
      await delay(250)
      grid.value.forEach(cell => {
        cell.falling = false
      })
    }
  }

  const fillEmptyCells = async () => {
    let filled = false

    for (let i = 0; i < grid.value.length; i++) {
      if (!grid.value[i].icon || grid.value[i].icon === '') {
        const newTile = createTile()
        grid.value[i].icon = newTile.icon
        grid.value[i].special = null
        grid.value[i].specialActivated = false
        grid.value[i].matched = false
        grid.value[i].popping = false
        grid.value[i].falling = true
        filled = true
      }
    }

    if (filled) {
      await delay(250)
      grid.value.forEach(cell => {
        cell.falling = false
      })
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
      unlockNextLevel()
      levelComplete.value = true
      showVictoryOverlay.value = true
      message.value = '太棒了！完成目标！'
      messageType.value = 'success'
      saveHighScore()
      clearGameState()
      return
    }

    if (moves.value <= 0) {
      gameOver.value = true
      message.value = '步数用完了，再试一次吧！'
      messageType.value = 'error'
      saveHighScore()
      clearGameState()
      return
    }
  }

  const handleTileClick = async (index) => {
    if (isAnimating.value || gameOver.value || levelComplete.value) return

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

      const movingSpecial = grid.value[selectedIndex.value].special
      const targetSpecial = grid.value[index].special

      swapTiles(selectedIndex.value, index)

      const hasMovingSpecial = movingSpecial && !targetSpecial
      const hasTargetSpecial = targetSpecial && !movingSpecial
      const hasBothSpecial = movingSpecial && targetSpecial

      if (hasBothSpecial) {
        grid.value[index].specialActivated = true
        grid.value[selectedIndex.value].specialActivated = true

        await delay(200)
        await processSpecialClear(index, movingSpecial)
        await processSpecialClear(selectedIndex.value, targetSpecial)
        moves.value--
        selectedIndex.value = null
        await processGame()
      } else if (hasMovingSpecial) {
        grid.value[index].special = movingSpecial
        grid.value[index].specialActivated = true
        grid.value[selectedIndex.value].special = null

        await delay(200)
        await processSpecialClear(index, movingSpecial)
        moves.value--
        selectedIndex.value = null
        await processGame()
      } else if (hasTargetSpecial) {
        grid.value[selectedIndex.value].special = targetSpecial
        grid.value[selectedIndex.value].specialActivated = true
        grid.value[index].special = null

        await delay(200)
        await processSpecialClear(selectedIndex.value, targetSpecial)
        moves.value--
        selectedIndex.value = null
        await processGame()
      } else {
        const { matches } = findMatches()
        if (matches.length > 0) {
          moves.value--
          selectedIndex.value = null
          await processGame()
        } else {
          await delay(200)
          swapTiles(selectedIndex.value, index)
          message.value = '无法消除，请重新选择！'
          messageType.value = 'warning'
          selectedIndex.value = null
        }
      }

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
    const row = Math.floor(index / GRID_SIZE)
    const col = index % GRID_SIZE
    const toClear = []

    if (direction === 'horizontal') {
      for (let c = 0; c < GRID_SIZE; c++) {
        toClear.push(row * GRID_SIZE + c)
      }
      message.value = '横向消除！整行清除！'
    } else if (direction === 'vertical') {
      for (let r = 0; r < GRID_SIZE; r++) {
        toClear.push(r * GRID_SIZE + col)
      }
      message.value = '纵向消除！整列清除！'
    } else if (direction === 'bomb') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = row + dr
          const c = col + dc
          if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
            toClear.push(r * GRID_SIZE + c)
          }
        }
      }
      message.value = '炸弹消除！3×3范围清除！'
    }
    messageType.value = 'success'

    toClear.forEach(idx => {
      grid.value[idx].matched = true
      grid.value[idx].popping = true
    })

    score.value += toClear.length * BASE_SCORE * 2

    await delay(400)

    toClear.forEach(idx => {
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
    resetGame()
  }

  const handleShuffle = async () => {
    if (isAnimating.value) return
    isAnimating.value = true
    message.value = '重新排列中...'
    messageType.value = 'info'

    shuffleGridUntilValid()

    await delay(300)
    grid.value.forEach(cell => {
      cell.falling = false
    })

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

    // GameLogic.js - useGameLogic 函数内部

    const handleSwap = async ({ from, to }) => {
        if (isAnimating.value || gameOver.value || levelComplete.value) return
        if (!isAdjacent(from, to)) return

        if (selectedIndex.value !== null) {
            grid.value[selectedIndex.value].selected = false
        }

        isAnimating.value = true

        const fromSpecial = grid.value[from].special
        const toSpecial = grid.value[to].special

        swapTiles(from, to)

        const hasFromSpecial = fromSpecial && !toSpecial
        const hasToSpecial = toSpecial && !fromSpecial
        const hasBothSpecial = fromSpecial && toSpecial

        if (hasBothSpecial) {
            grid.value[to].specialActivated = true
            grid.value[from].specialActivated = true

            await delay(200)
            await processSpecialClear(to, fromSpecial)
            await processSpecialClear(from, toSpecial)
            moves.value--
            selectedIndex.value = null
            await processGame()
        } else if (hasFromSpecial) {
            grid.value[to].special = fromSpecial
            grid.value[to].specialActivated = true
            grid.value[from].special = null

            await delay(200)
            await processSpecialClear(to, fromSpecial)
            moves.value--
            selectedIndex.value = null
            await processGame()
        } else if (hasToSpecial) {
            grid.value[from].special = toSpecial
            grid.value[from].specialActivated = true
            grid.value[to].special = null

            await delay(200)
            await processSpecialClear(from, toSpecial)
            moves.value--
            selectedIndex.value = null
            await processGame()
        } else {
            const { matches } = findMatches()
            if (matches.length > 0) {
                moves.value--
                selectedIndex.value = null
                await processGame()
            } else {
                await delay(200)
                swapTiles(to, from)
                message.value = '无法消除，请重新选择！'
                messageType.value = 'warning'
                selectedIndex.value = null
            }
        }

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
    saveHighScore
  }
}