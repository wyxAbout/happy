<template>
  <div class="app min-h-screen bg-gradient-to-b from-[#4793cf] to-[#5db6e0] flex items-center justify-center p-4 landscape-safe">
    <LoadingScreen
      v-if="isLoading || loadError"
      :progress="loadProgress"
      :error="loadError"
      @retry="handleRetry"
    />
    
    <div v-else class="game-container w-full max-w-md landscape-adjust">
      <div class="header-section relative flex items-center justify-center mb-3">
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
            :src="decorationLeftSrc"
            alt="装饰"
            class="left-decor-img object-contain w-56 lg:w-64 xl:w-80 h-auto"
          />
        </div>
        <div class="relative z-10" style="padding: 5px 6px;">
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
            :src="decorationLeftSrc"
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
        ref="myImagesRef"
        :visible="showMyImages"
        @close="showMyImages = false"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
import { TOTAL_LEVELS, GRID_SIZE, STORAGE_KEYS } from './constants'
import { storage } from './api/storageService'
import { resetUserCards } from './api/cardService'

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
  initializeGame,
} = useGameLogic()

const cellSize = ref(40)
const showLevelSelector = ref(false)
const showMyImages = ref(false)
const myImagesRef = ref(null)
const totalLevels = TOTAL_LEVELS
const decorationLeftSrc = computed(() => '/decorations/decoration-left.png')

/**
 * 【关卡持久化-手动重置入口】
 *
 * 这是整个应用中唯一能彻底清除关卡进度的函数。
 * 被 LevelSelector 组件底部的"重新开始"按钮触发。
 *
 * 操作：
 *   1. storage.removeItem(STORAGE_KEYS.COMPLETED_LEVELS) → 删除关卡记录
 *   2. storage.removeItem(STORAGE_KEYS.GAME_STATE) → 删除当前游戏进度
 *   3. completedLevels.value = []                              → 清空内存中的通关列表
 *   4. handleRestart()                                         → 重置游戏回到第1关
 *
 * 注意：
 *   - 此操作不可逆，一旦执行所有关卡进度永久丢失
 *   - 仅清除关卡数据，不影响最高分（HIGH_SCORE key 未删除）
 *   - 仅清除关卡数据，不影响 DDC 连胜记录（streakStorageKey 未删除）
 */
const handleResetAllLevels = () => {
  storage.removeItem(STORAGE_KEYS.COMPLETED_LEVELS)
  storage.removeItem(STORAGE_KEYS.GAME_STATE)
  completedLevels.value = []
  handleRestart()
  showLevelSelector.value = false
}

/**
 * 【测试环境专用-完全重置】
 *
 * 生产环境：不执行（生产数据保护）
 * 开发/测试环境：
 *   1. 调用 resetUserCards() → 删除 MySQL 中所有用户卡牌记录
 *   2. 调用 storage.resetAll() → 清除前端 localStorage/内存 Map
 *   3. 清空内存关卡状态 → completedLevels.value = []
 *   4. 重载 MyImages 图鉴 UI → myImagesRef.reload()
 *   5. 重启游戏 → handleRestart()
 *
 * 这就是图鉴"重置"失效的根因修复：
 *   之前仅清除了前端存储，从未删除后端 MySQL 中的 user_cards 数据。
 *   导致 MyImages.loadData() 重新从后端拉取数据时，旧的收集记录依然存在。
 *
 * 触发方式：
 *   - 页面顶部黄色"重置数据"按钮
 */
const handleResetAllData = async () => {
  if (storage.isProduction()) {
    console.warn('[App] Reset blocked in production')
    return
  }

  try {
    await resetUserCards()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[App] Failed to reset user cards on server:', msg)
  }

  storage.resetAll()
  completedLevels.value = []
  showLevelSelector.value = false
  messageType.value = 'info'

  if (myImagesRef.value) {
    myImagesRef.value.reload()
  }

  handleRestart()
}

const storageEnv = computed(() => storage.getEnv())
const showDevReset = computed(() => storage.isDevOrTest())

const handleRetry = async () => {
  try {
    await initializeGame()
  } catch (err) {
    console.error('[App] Retry initialization failed:', err)
  }
}

const calculateCellSize = () => {
  const screenWidth = window.innerWidth
  const screenHeight = window.innerHeight
  const isLandscape = screenWidth > screenHeight

  const outerPadding = isLandscape ? 56 : 20  // 移动端预留10px×2边距
  const gridPadding = 18                       // 9px内边距 × 2
  const gap = 3                                // 砖块间距 3px
  const maxContainerWidth = 449                // 网格固定宽度

  const containerWidth = Math.min(screenWidth - outerPadding, maxContainerWidth)
  const gridContentWidth = containerWidth - gridPadding
  const totalGapWidth = gap * (GRID_SIZE - 1)
  const availableForCells = gridContentWidth - totalGapWidth

  let newSize = Math.floor(availableForCells / GRID_SIZE)
  newSize = Math.max(32, Math.min(62, newSize))
  cellSize.value = newSize
}

const handleOrientationChange = () => {
  setTimeout(calculateCellSize, 300)
}

/**
 * 【环境感知-启动钩子】
 *
 * 测试模式（npm run dev:test）：内存存储，每次刷新自动清空，无需额外操作。
 * 生产模式（npm run dev）：localStorage 原生键，数据永久保留。
 * 生产构建（npm run build:prod）：localStorage 原生键，数据永久保留。
 */
onMounted(() => {
  calculateCellSize()
  window.addEventListener('resize', calculateCellSize)
  window.addEventListener('orientationchange', handleOrientationChange)
})

onUnmounted(() => {
  window.removeEventListener('resize', calculateCellSize)
  window.removeEventListener('orientationchange', handleOrientationChange)
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

/* 移动端：容器与屏幕边缘保持10px间距 */
@media (max-width: 767px) {
  .app {
    padding: 10px;
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
