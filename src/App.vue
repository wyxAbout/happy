<template>
  <div class="app min-h-screen bg-gradient-to-b from-[#4793cf] to-[#5db6e0] flex items-center justify-center p-4 landscape-safe">
    <LoadingScreen
      v-if="isLoading || loadError"
      :progress="loadProgress"
      :error="loadError"
      @retry="handleRetry"
    />
    
    <div v-else class="game-container w-full max-w-md landscape-adjust">      <div class="header-section relative flex items-center justify-center mb-3">
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
        <button
          @click="showMyImages = true"
          class="absolute right-0 my-images-btn flex items-center gap-1.5
                 bg-white/10 backdrop-blur-md border border-white/15
                 text-white font-semibold text-sm px-4 py-2 rounded-2xl
                 shadow-md shadow-black/10
                 transition-all duration-200 ease-out
                 hover:bg-white/20 hover:shadow-lg hover:-translate-y-0.5
                 active:translate-y-0 active:scale-[0.97]
                 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span>图鉴</span>
        </button>
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

      <MessageBar
        :message="message"
        :combo="combo"
        :type="messageType"
      />

      <div class="game-grid-row relative flex items-center justify-center" style="overflow: visible;">
        <div class="left-decor-wrapper hidden md:block absolute z-0" style="left: 0; top: 50%; transform: translate(calc(-100% - 2px), -50%); pointer-events: none;">
          <img
            src="/decorations/decoration-left.png"
            alt="装饰"
            class="left-decor-img object-contain w-56 lg:w-64 xl:w-80 h-auto"
          />
        </div>
        <div class="relative z-10">
          <GameGrid
            :grid="grid"
            :cell-size="cellSize"
            :selected-index="selectedIndex"
            :disabled="isAnimating"
            @tile-click="handleTileClick"
            @swap="handleSwap"
          />
        </div>
        <div class="right-decor-wrapper hidden md:block absolute z-0" style="right: 0; top: 50%; transform: translate(calc(100% + 2px), -50%); pointer-events: none;">
          <img
            src="/decorations/decoration-left.png"
            alt="装饰"
            class="right-decor-img object-contain w-56 lg:w-64 xl:w-80 h-auto"
          />
        </div>
      </div>

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
      <MyImages
        :visible="showMyImages"
        @close="showMyImages = false"
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
import MessageBar from './components/MessageBar.vue'
import MyImages from './components/MyImages.vue'
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
const showMyImages = ref(false)
const totalLevels = TOTAL_LEVELS

const handleResetAllLevels = () => {
  localStorage.removeItem('happy-match-completed-levels')
  localStorage.removeItem('happy-match-game-state')
  completedLevels.value = []
  handleRestart()
  showLevelSelector.value = false
}

const handleRetry = async () => {
  await initializeGame()
}

const calculateCellSize = () => {
  const screenWidth = window.innerWidth
  const screenHeight = window.innerHeight
  const isLandscape = screenWidth > screenHeight

  const outerPadding = isLandscape ? 56 : 32
  const gridPadding = 32
  const gap = 6
  const maxContainerWidth = isLandscape ? 420 : 448

  const containerWidth = Math.min(screenWidth - outerPadding, maxContainerWidth)
  const gridContentWidth = containerWidth - gridPadding
  const totalGapWidth = gap * (GRID_SIZE - 1)
  const availableForCells = gridContentWidth - totalGapWidth

  let newSize = Math.floor(availableForCells / GRID_SIZE)
  newSize = Math.max(32, Math.min(52, newSize))
  cellSize.value = newSize
}

onMounted(() => {
  calculateCellSize()
  window.addEventListener('resize', calculateCellSize)
  window.addEventListener('orientationchange', () => {
    setTimeout(calculateCellSize, 300)
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', calculateCellSize)
  window.removeEventListener('orientationchange', calculateCellSize)
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

@media (max-width: 374px) {
  .app {
    padding: 0.5rem;
  }

  .game-container {
    transform: translateY(-2vh);
  }
}

@media (orientation: landscape) and (max-height: 500px) {
  .landscape-safe {
    padding: 0.5rem;
    align-items: flex-start;
  }

  .landscape-adjust {
    transform: translateY(0);
  }
}

@media (max-width: 767px) {
  .game-container {
    transform: translateY(0);
  }
}

@media (min-width: 768px) {
  .game-container {
    transform: translateY(-2vh);
  }
}

@media (min-width: 1024px) {
  .game-container {
    transform: translateY(-1vh);
  }
}
</style>
