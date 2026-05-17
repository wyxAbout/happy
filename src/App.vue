<template>
  <div class="app min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center p-4">
    <LoadingScreen
      v-if="isLoading || loadError"
      :progress="loadProgress"
      :error="loadError"
      @retry="handleRetry"
    />
    
    <div v-else class="game-container w-full max-w-md">      <div class="header-section relative flex items-center justify-center mb-3">
        <button 
          @click="showLevelSelector = true"
          class="absolute left-0 level-select-btn flex items-center gap-1.5
                 bg-white/10 backdrop-blur-md border border-white/15
                 text-white font-semibold text-sm px-4 py-2 rounded-2xl
                 shadow-md shadow-black/10
                 transition-all duration-200 ease-out
                 hover:bg-white/20 hover:shadow-lg hover:-translate-y-0.5
                 active:translate-y-0 active:scale-[0.97]
                 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <span>关卡</span>
        </button>
        <div class="level-badge bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold px-5 py-2 rounded-2xl shadow-lg shadow-orange-500/25 text-base">
          第 {{ level }} 关
        </div>
      </div>

      <ScorePanel
        :score="score"
        :target="target"
        :moves="moves"
      />

      <ProgressBar
        :score="score"
        :target="target"
      />

      <GameGrid
        :grid="grid"
        :cell-size="cellSize"
        :selected-index="selectedIndex"
        :disabled="isAnimating"
        @tile-click="handleTileClick"
        @swap="handleSwap"
      />

      <Controls
        @restart="handleRestart"
        @shuffle="handleShuffle"
        @hint="handleHint"
      />

      <GameOverModal
        :visible="(gameOver || levelComplete) && !showVictoryOverlay"
        :is-win="levelComplete"
        :score="score"
        :high-score="highScore"
        :level="level"
        :total-levels="totalLevels"
        @restart="handleRestart"
        @next-level="handleNextLevel"
      />

      <VictoryOverlay
        :visible="showVictoryOverlay"
        @dismiss="handleVictoryDismiss"
      />

      <LevelSelector
        :visible="showLevelSelector"
        :completed-levels="completedLevels"
        :current-level="level"
        :total-levels="totalLevels"
        @close="showLevelSelector = false"
        @select-level="handleGoToLevel"
        @reset-all="handleResetAllLevels"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import ScorePanel from './components/ScorePanel.vue'
import GameGrid from './components/GameGrid.vue'
import Controls from './components/Controls.vue'
import GameOverModal from './components/GameOverModal.vue'
import ProgressBar from './components/ProgressBar.vue'
import LevelSelector from './components/LevelSelector.vue'
import LoadingScreen from './components/LoadingScreen.vue'
import VictoryOverlay from './components/VictoryOverlay.vue'
import { useGameLogic } from './components/GameLogic'
import { TOTAL_LEVELS, GRID_SIZE } from './constants'

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
} = useGameLogic()

const cellSize = ref(40)
const showLevelSelector = ref(false)
const totalLevels = TOTAL_LEVELS

const handleResetAllLevels = () => {
  localStorage.removeItem('happy-match-completed-levels')
  completedLevels.value = []
  handleRestart()
  showLevelSelector.value = false
}

const handleRetry = async () => {
  await initializeGame()
}

const calculateCellSize = () => {
  const screenWidth = window.innerWidth
  const outerPadding = 32
  const gridPadding = 24
  const gap = 6
  const maxContainerWidth = 448

  const containerWidth = Math.min(screenWidth - outerPadding, maxContainerWidth)
  const gridContentWidth = containerWidth - gridPadding
  const totalGapWidth = gap * (GRID_SIZE - 1)
  const availableForCells = gridContentWidth - totalGapWidth
  const newSize = Math.max(35, Math.min(50, Math.floor(availableForCells / GRID_SIZE)))
  cellSize.value = newSize
}

onMounted(() => {
  calculateCellSize()
  window.addEventListener('resize', calculateCellSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', calculateCellSize)
})
</script>

<style scoped>
.game-container {
  animation: fadeIn 0.5s ease-out;
  transform: translateY(-6vh);
}

.header-section {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
