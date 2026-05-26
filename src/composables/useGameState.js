import { ref, computed, watch } from 'vue'
import { GRID_SIZE, TILE_TYPES, MIN_MATCH, BASE_SCORE, COMBO_MULTIPLIER, STORAGE_KEYS, LEVEL_CONFIG, DDC_CONFIG, DEFAULT_EMOJIS, ICONS_DIR, TOTAL_LEVELS } from '../constants'
import { useImageCache } from './useImageCache'

const debugLog = (...args) => {
  if (import.meta.env.DEV) console.log(...args)
}

export function useGameState() {
  const grid = ref([])
  const score = ref(0)
  const level = ref(1)
  const moves = ref(30)
  const target = ref(1000)
  const selectedIndex = ref(null)
  const isAnimating = ref(false)
  const gameOver = ref(false)
  const levelComplete = ref(false)
  const combo = ref(0)
  const customIcons = ref([])
  const message = ref('点击两个相邻的相同图标开始游戏！')
  const highScore = ref(0)
  const imagesLoaded = ref(false)
  const cacheProgress = ref(0)
  const completedLevels = ref([])
  
  const isLoading = ref(true)
  const loadError = ref(null)
  const loadProgress = ref(0)

  const consecutiveWins = ref(0)
  const consecutiveLosses = ref(0)
  const ddcMovesModifier = ref(0)
  const ddcSpecialBoostModifier = ref(0)
  const activeTileTypes = ref(TILE_TYPES)

  const { loadImage, preloadImages, clearCache, cacheStats } = useImageCache()

  const useCustomIcons = computed(() => customIcons.value.length >= TILE_TYPES)

  const getIcons = () => {
    const count = activeTileTypes.value
    return useCustomIcons.value ? customIcons.value.slice(0, count) : DEFAULT_EMOJIS.slice(0, count)
  }

  const loadHighScore = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HIGH_SCORE)
      if (saved) {
        highScore.value = parseInt(saved, 10)
      }
    } catch (e) {
      console.error('Failed to load high score:', e)
    }
  }

  const saveHighScore = () => {
    try {
      if (score.value > highScore.value) {
        highScore.value = score.value
        localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, highScore.value.toString())
      }
    } catch (e) {
      console.error('Failed to save high score:', e)
    }
  }

  const loadCompletedLevels = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COMPLETED_LEVELS)
      if (saved) {
        completedLevels.value = JSON.parse(saved)
      }
    } catch (e) {
      console.error('Failed to load completed levels:', e)
      completedLevels.value = []
    }
  }

  const loadDDCStreak = () => {
    try {
      const saved = localStorage.getItem(DDC_CONFIG.streakStorageKey)
      if (saved) {
        const data = JSON.parse(saved)
        consecutiveWins.value = data.wins || 0
        consecutiveLosses.value = data.losses || 0
      }
    } catch (e) {
      consecutiveWins.value = 0
      consecutiveLosses.value = 0
    }
  }

  const saveDDCStreak = () => {
    try {
      localStorage.setItem(DDC_CONFIG.streakStorageKey, JSON.stringify({
        wins: consecutiveWins.value,
        losses: consecutiveLosses.value
      }))
    } catch (e) {
      debugLog('Failed to save DDC streak:', e)
    }
  }

  const recordLevelWin = () => {
    consecutiveWins.value++
    consecutiveLosses.value = 0
    saveDDCStreak()
  }

  const recordLevelLoss = () => {
    consecutiveLosses.value++
    consecutiveWins.value = 0
    saveDDCStreak()
  }

  const applyDDCModifiers = () => {
    ddcMovesModifier.value = 0
    ddcSpecialBoostModifier.value = 0

    if (consecutiveLosses.value >= DDC_CONFIG.hardThreshold) {
      ddcMovesModifier.value = DDC_CONFIG.easyExtraMoves
      ddcSpecialBoostModifier.value = DDC_CONFIG.easySpecialBoost
    } else if (consecutiveLosses.value >= DDC_CONFIG.easyThreshold) {
      ddcMovesModifier.value = DDC_CONFIG.easyBonusMoves
      ddcSpecialBoostModifier.value = DDC_CONFIG.easySpecialBoost
    } else if (consecutiveWins.value >= DDC_CONFIG.hardThreshold) {
      ddcMovesModifier.value = -DDC_CONFIG.hardPenaltyMoves
      ddcSpecialBoostModifier.value = DDC_CONFIG.hardSpecialBoost
    }
  }

  const saveCompletedLevels = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.COMPLETED_LEVELS, JSON.stringify(completedLevels.value))
    } catch (e) {
      console.error('Failed to save completed levels:', e)
    }
  }

  const isLevelCompleted = (levelNum) => {
    return completedLevels.value.includes(levelNum)
  }

  const unlockNextLevel = () => {
    if (!completedLevels.value.includes(level.value)) {
      completedLevels.value.push(level.value)
      completedLevels.value.sort((a, b) => a - b)
      saveCompletedLevels()
    }
  }

  const progress = computed(() => {
    return ((level.value - 1) / TOTAL_LEVELS) * 100
  })

  const overallProgress = computed(() => {
    return (completedLevels.value.length / TOTAL_LEVELS) * 100
  })

  const saveGameState = () => {
    try {
      const state = {
        grid: grid.value,
        score: score.value,
        level: level.value,
        moves: moves.value,
        target: target.value
      }
      localStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(state))
    } catch (e) {
      console.error('Failed to save game state:', e)
    }
  }

  const loadGameState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GAME_STATE)
      if (saved) {
        const state = JSON.parse(saved)
        grid.value = state.grid
        score.value = Number.isFinite(state.score) && state.score >= 0 ? state.score : 0
        level.value = Number.isFinite(state.level) && state.level >= 1 && state.level <= TOTAL_LEVELS ? state.level : 1
        moves.value = Number.isFinite(state.moves) && state.moves > 0 ? state.moves : 30
        target.value = Number.isFinite(state.target) && state.target > 0 ? state.target : 1000
        return true
      }
    } catch (e) {
      console.error('Failed to load game state:', e)
    }
    return false
  }

  const clearGameState = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.GAME_STATE)
    } catch (e) {
      console.error('Failed to clear game state:', e)
    }
  }

  const getRandomIcon = () => {
    const icons = getIcons()
    if (icons.length === 0) {
      return DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)]
    }
    return icons[Math.floor(Math.random() * icons.length)]
  }

  const createTile = () => {
    const icon = getRandomIcon()
    return {
      icon: icon || DEFAULT_EMOJIS[0],
      selected: false,
      matched: false,
      falling: false,
      fallDistance: 0,
      fallPhase: null,
      popping: false,
      special: null,
      specialActivated: false
    }
  }

  const initGrid = () => {
    grid.value = []
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      grid.value.push(createTile())
    }

    let matchResult = findMatches()
    while (matchResult.matches.length > 0) {
      const matchedSet = new Set(matchResult.matches)
      for (let i = 0; i < grid.value.length; i++) {
        if (matchedSet.has(i)) {
          grid.value[i].icon = getRandomIcon()
        }
      }
      matchResult = findMatches()
    }
  }

  const getRow = (index) => Math.floor(index / GRID_SIZE)
  const getCol = (index) => index % GRID_SIZE

  const isAdjacent = (index1, index2) => {
    const row1 = getRow(index1)
    const col1 = getCol(index1)
    const row2 = getRow(index2)
    const col2 = getCol(index2)
    return (Math.abs(row1 - row2) === 1 && col1 === col2) ||
           (Math.abs(col1 - col2) === 1 && row1 === row2)
  }

  const findMatches = () => {
    const matches = new Set()
    const specialCandidates = []
    const horizontalMatchTiles = new Set()
    const verticalMatchTiles = new Set()

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col <= GRID_SIZE - MIN_MATCH; col++) {
        const index = row * GRID_SIZE + col
        const icon = grid.value[index].icon
        if (!icon) continue

        let matchCount = 1
        while (col + matchCount < GRID_SIZE &&
               grid.value[index + matchCount].icon === icon) {
          matchCount++
        }

        if (matchCount >= MIN_MATCH) {
          for (let k = 0; k < matchCount; k++) {
            const matchIdx = index + k
            matches.add(matchIdx)
            horizontalMatchTiles.add(matchIdx)
          }
          if (matchCount >= 4) {
            specialCandidates.push({
              index: index + Math.floor(matchCount / 2),
              direction: 'horizontal'
            })
          }
        }
      }
    }

    for (let col = 0; col < GRID_SIZE; col++) {
      for (let row = 0; row <= GRID_SIZE - MIN_MATCH; row++) {
        const index = row * GRID_SIZE + col
        const icon = grid.value[index].icon
        if (!icon) continue

        let matchCount = 1
        while (row + matchCount < GRID_SIZE &&
               grid.value[index + matchCount * GRID_SIZE].icon === icon) {
          matchCount++
        }

        if (matchCount >= MIN_MATCH) {
          for (let k = 0; k < matchCount; k++) {
            const matchIdx = index + k * GRID_SIZE
            matches.add(matchIdx)
            verticalMatchTiles.add(matchIdx)
          }
          if (matchCount >= 4) {
            specialCandidates.push({
              index: index + Math.floor(matchCount / 2) * GRID_SIZE,
              direction: 'vertical'
            })
          }
        }
      }
    }

    for (const idx of matches) {
      if (horizontalMatchTiles.has(idx) && verticalMatchTiles.has(idx)) {
        const alreadySpecial = specialCandidates.some(c => c.index === idx)
        if (!alreadySpecial) {
          specialCandidates.push({
            index: idx,
            direction: 'bomb'
          })
        }
      }
    }

    return {
      matches: Array.from(matches),
      specialCandidates
    }
  }

  const isPartOfMatch = (index) => {
    return findMatches().matches.includes(index)
  }

  const hasValidMoves = () => {
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
        if (matches.length > 0) return true
      }
    }
    return false
  }

  const SWAP_PROPS = ['icon', 'special', 'specialActivated', 'matched', 'popping', 'selected', 'falling', 'fallDistance', 'fallPhase']

  const swapTiles = (index1, index2) => {
    for (const prop of SWAP_PROPS) {
      const temp = grid.value[index1][prop]
      grid.value[index1][prop] = grid.value[index2][prop]
      grid.value[index2][prop] = temp
    }
  }

  const shuffleGrid = () => {
    const icons = grid.value.map(tile => tile.icon)
    for (let i = icons.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[icons[i], icons[j]] = [icons[j], icons[i]]
    }
    icons.forEach((icon, i) => {
      grid.value[i].icon = icon
      grid.value[i].falling = true
      grid.value[i].fallDistance = 0
      grid.value[i].fallPhase = null
      grid.value[i].matched = false
      grid.value[i].popping = false
      grid.value[i].selected = false
      grid.value[i].special = null
      grid.value[i].specialActivated = false
    })
  }

  const setLevelConfig = (levelNum) => {
    const config = LEVEL_CONFIG[levelNum] || {
      startScore: 0,
      target: 1000,
      moves: 30,
      tileTypes: TILE_TYPES,
      specialBoost: 0.05
    }

    applyDDCModifiers()

    const safeStartScore = Math.max(0, Number.isFinite(config.startScore) ? config.startScore : 0)
    score.value = safeStartScore
    target.value = Math.max(100, Number.isFinite(config.target) ? config.target : 1000)
    const baseMoves = Math.max(5, Number.isFinite(config.moves) ? config.moves : 30)
    moves.value = Math.max(5, baseMoves + ddcMovesModifier.value)

    activeTileTypes.value = Math.min(TILE_TYPES, Math.max(3, config.tileTypes || TILE_TYPES))

    if (ddcMovesModifier.value > 0) {
      message.value = `额外获得 ${ddcMovesModifier.value} 步！加油！`
    } else if (ddcMovesModifier.value < 0) {
      message.value = `高手模式！步数略微减少`
    }
  }

  const resetGame = () => {
    score.value = 0
    level.value = 1
    combo.value = 0
    selectedIndex.value = null
    isAnimating.value = false
    gameOver.value = false
    levelComplete.value = false
    setLevelConfig(level.value)
    initGrid()
    clearGameState()
    message.value = '新游戏开始！点击两个相邻的相同图标！'
  }

  const goToLevel = (levelNum) => {
    if (levelNum < 1 || levelNum > TOTAL_LEVELS) return
    level.value = levelNum
    combo.value = 0
    selectedIndex.value = null
    isAnimating.value = false
    gameOver.value = false
    levelComplete.value = false
    setLevelConfig(level.value)
    initGrid()
    clearGameState()
    message.value = `第 ${level.value} 关开始！`
  }

  const nextLevel = () => {
    if (level.value >= TOTAL_LEVELS) {
      message.value = '恭喜通关！你已完成所有关卡！'
      gameOver.value = true
      return
    }
    level.value++
    combo.value = 0
    setLevelConfig(level.value)
    levelComplete.value = false
    initGrid()
    message.value = `恭喜进入第 ${level.value} 关！目标分数: ${target.value}`
  }

  const completeLevel = () => {
    score.value = target.value
    unlockNextLevel()
    levelComplete.value = true
    saveHighScore()
    recordLevelWin()
    message.value = `恭喜通关！第 ${level.value} 关完成！`
  }

  const checkLevelComplete = () => {
    if (score.value >= target.value && !levelComplete.value) {
      completeLevel()
    }
  }

    const loadCustomIcons = async () => {
        debugLog('Attempting to load custom icons from:', `${ICONS_DIR}/config.json`)
        loadProgress.value = 0
        try {
            const configResponse = await fetch(`${ICONS_DIR}/config.json`)
            debugLog('Config fetch status:', configResponse.status)
            if (configResponse.ok) {
                const config = await configResponse.json()
                debugLog('Config loaded:', config)
                if (config.icons && Array.isArray(config.icons)) {
                    const iconPaths = config.icons.map(name => `${ICONS_DIR}/${name}`)
                    debugLog('Icon paths to load:', iconPaths)

                    const loadResults = await Promise.all(iconPaths.map((iconPath, index) =>
                        new Promise((resolve) => {
                            loadImage(iconPath, 1).then((img) => {
                                loadProgress.value = ((index + 1) / iconPaths.length) * 100
                                cacheProgress.value = loadProgress.value
                                debugLog(`Successfully loaded icon (cached): ${iconPath}`)
                                resolve({ path: iconPath, success: true })
                            }).catch((e) => {
                                console.error(`Failed to load icon: ${iconPath}`, e)
                                loadProgress.value = ((index + 1) / iconPaths.length) * 100
                                cacheProgress.value = loadProgress.value
                                resolve({ path: iconPath, success: false })
                            })
                        })
                    ))

                    const successfulPaths = loadResults.filter(r => r.success).map(r => r.path)
                    if (successfulPaths.length >= TILE_TYPES) {
                        customIcons.value = successfulPaths
                        debugLog('Custom icons loaded successfully:', customIcons.value)
                    } else {
                        debugLog(`Only loaded ${successfulPaths.length} of ${TILE_TYPES} required icons, using emojis`)
                    }
                }
            } else {
                debugLog('No custom icons config found, using emojis')
            }
        } catch (e) {
            console.error('Error loading custom icons:', e.message)
            debugLog('Using default emojis instead')
        }
        loadProgress.value = 100
        imagesLoaded.value = true
        debugLog('Image cache stats:', cacheStats.value)
    }

  const preloadAllImages = async () => {
    const icons = getIcons()
    const iconUrls = icons.map((icon, index) => {
      if (icon.startsWith('http') || icon.startsWith('/')) {
        return icon
      }
      return `${ICONS_DIR}/tile${String(index + 1).padStart(2, '0')}.png`
    })

    await preloadImages(iconUrls, 1)
    debugLog('All images preloaded')
  }

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  const initializeGame = async () => {
    isLoading.value = true
    loadError.value = null
    loadProgress.value = 0
    
    try {
      debugLog('Starting game initialization...')
      
      await loadCustomIcons()
      
      debugLog('Preloading images...')
      loadProgress.value = 50
      await preloadAllImages()
      
      loadHighScore()
      loadCompletedLevels()
      loadDDCStreak()
      
      loadProgress.value = 100
      debugLog('All resources loaded, initializing grid...')
      initGrid()
      
      debugLog('Game initialization complete!')
      
    } catch (error) {
      console.error('Failed to initialize game:', error)
      loadError.value = error.message || '加载资源失败，请刷新页面重试'
    } finally {
      isLoading.value = false
    }
  }

  loadHighScore()
  loadCompletedLevels()

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
    customIcons,
    message,
    highScore,
    imagesLoaded,
    cacheProgress,
    cacheStats,
    completedLevels,
    progress,
    overallProgress,
    isLoading,
    loadError,
    loadProgress,
    useCustomIcons,
    getIcons,
    getRow,
    getCol,
    isAdjacent,
    findMatches,
    isPartOfMatch,
    hasValidMoves,
    swapTiles,
    shuffleGrid,
    resetGame,
    nextLevel,
    goToLevel,
    completeLevel,
    checkLevelComplete,
    isLevelCompleted,
    loadCompletedLevels,
    saveCompletedLevels,
    unlockNextLevel,
    loadGameState,
    saveGameState,
    saveHighScore,
    clearGameState,
    clearCache,
    delay,
    consecutiveWins,
    consecutiveLosses,
    ddcMovesModifier,
    ddcSpecialBoostModifier,
    activeTileTypes,
    loadDDCStreak,
    recordLevelWin,
    recordLevelLoss,
    applyDDCModifiers,
    getRandomIcon,
    createTile,
    initializeGame,
    preloadAllImages
  }
}
