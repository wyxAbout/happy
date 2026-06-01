<script setup>
/**
 * LevelSelector.vue — 关卡选择器组件
 *
 * 【功能概述】
 * 显示所有关卡的网格选择面板，包含：
 * - 关卡按钮网格（⭐ = 已完成, 🔒 = 未解锁, 数字 = 可玩）
 * - 进度统计（已完成数 / 总数）
 * - "重新开始"按钮（清除所有关卡记录）
 *
 * 【关卡解锁规则】
 * - 线性递进：第 N 关需要第 N-1 关已通关才能解锁
 * - 第 1 关始终解锁
 * - 数据来源：props.completedLevels（来自 localStorage 的关卡记录）
 *
 * 【Props】
 * @prop {boolean} visible         - 是否显示面板
 * @prop {number[]} completedLevels - 已通关关卡编号数组
 * @prop {number} currentLevel     - 当前所在关卡
 * @prop {number} totalLevels      - 关卡总数（默认 24）
 *
 * 【事件】
 * @event close        - 关闭面板
 * @event select-level - 选中关卡，携带关卡编号
 * @event reset-all    - 重置所有关卡进度
 *
 * 【使用示例】
 *   <LevelSelector :visible="show" :completed-levels="[1,2,3]" :current-level="3" @select-level="handleGoToLevel" @close="show=false" />
 */

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  completedLevels: {
    type: Array,
    default: () => []
  },
  currentLevel: {
    type: Number,
    default: 1
  },
  totalLevels: {
    type: Number,
    default: 24
  }
})

const emit = defineEmits(['close', 'select-level', 'reset-all'])

/**
 * 检查关卡是否已完成（⭐）
 * @param {number} levelNum - 关卡编号
 * @returns {boolean}
 */
const isLevelCompleted = (levelNum) => {
  return props.completedLevels.includes(levelNum)
}

/**
 * 【关卡持久化-UI解锁判定】
 *
 * 关卡解锁遵循"线性递进"规则：
 *   - 第1关始终解锁
 *   - 第N关解锁条件：第N-1关必须已完成（completedLevels 中包含 N-1）
 *
 * 由于 completedLevels 数据来自 localStorage（永久存储），
 * 只要 completedLevels 中有数据，对应的后续关卡就会显示为解锁状态。
 *
 * 数据流：
 *   localStorage["happy-match-completed-levels"]
 *     → loadCompletedLevels() → completedLevels.value (Vue ref)
 *       → props.completedLevels (父传子 prop)
 *         → isLevelUnlocked(n) → 决定按钮是否可点击
 *
 * 因此，本地存储有数据 → 内存中有数据 → UI 显示已解锁 → "关卡不会重置"
 *
 * @param {number} levelNum
 * @returns {boolean}
 */
const isLevelUnlocked = (levelNum) => {
  if (levelNum === 1) return true
  return props.completedLevels.includes(levelNum - 1)
}

/**
 * 获取关卡按钮的 CSS 类
 * 根据状态（未解锁/已完成/当前）返回不同的渐变和样式
 * @param {number} levelNum
 * @returns {string[]}
 */
const getLevelClass = (levelNum) => {
  if (!isLevelUnlocked(levelNum)) {
    return 'bg-gray-200 text-gray-400 cursor-not-allowed'
  }
  if (isLevelCompleted(levelNum)) {
    return levelNum === props.currentLevel
      ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white ring-2 ring-orange-400 shadow-lg'
      : 'bg-gradient-to-br from-green-400 to-emerald-500 text-white'
  }
  if (levelNum === props.currentLevel) {
    return 'bg-gradient-to-br from-purple-500 to-pink-500 text-white ring-2 ring-purple-400 shadow-lg'
  }
  return 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white hover:scale-105 hover:shadow-lg'
}

const selectLevel = (levelNum) => {
  if (isLevelUnlocked(levelNum)) {
    emit('select-level', levelNum)
    emit('close')
  }
}

const handleResetAll = () => {
  if (confirm('确定要重置所有关卡进度吗？此操作无法撤销。')) {
    emit('reset-all')
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="level-selector-overlay fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
    <div class="level-selector bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
      <div class="header bg-gradient-to-r from-purple-600 to-pink-500 text-white p-4 flex items-center justify-between">
        <h2 class="text-xl font-bold">选择关卡</h2>
        <button @click="$emit('close')" class="close-btn w-8 h-8 flex items-center justify-center bg-white/15 hover:bg-white/30 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95">
          ✕
        </button>
      </div>

      <div class="level-grid p-4 grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[50vh] overflow-y-auto">
        <button
          v-for="lvl in totalLevels"
          :key="lvl"
          @click="selectLevel(lvl)"
          :disabled="!isLevelUnlocked(lvl)"
          class="level-btn w-full aspect-square min-w-[44px] min-h-[44px] rounded-xl font-bold text-sm transition-all duration-200 ease-out flex items-center justify-center
                 hover:scale-105 active:scale-95"
          :class="getLevelClass(lvl)"
        >
          <template v-if="isLevelCompleted(lvl)">
            <span class="text-lg">⭐</span>
          </template>
          <template v-else-if="isLevelUnlocked(lvl)">
            {{ lvl }}
          </template>
          <template v-else>
            <span class="text-lg">🔒</span>
          </template>
        </button>
      </div>

      <div class="stats-bar bg-gray-100 p-3 flex items-center justify-between">
        <div class="text-gray-600">
          <span class="font-medium">已完成:</span>
          <span class="ml-2 font-bold text-purple-600">{{ props.completedLevels.length }}/{{ props.totalLevels }}</span>
        </div>
        <div class="progress-bar-container w-32 h-2 bg-gray-300 rounded-full overflow-hidden">
          <div
            class="progress-bar h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
            :style="{ width: `${(props.completedLevels.length / props.totalLevels) * 100}%` }"
          ></div>
        </div>
      </div>

      <div class="actions p-4 flex gap-3">
        <button
          @click="handleResetAll"
          class="flex-1 bg-white/60 hover:bg-white/80 text-gray-700 font-semibold py-3 rounded-2xl
                 border border-gray-200
                 transition-all duration-200 ease-out
                 hover:shadow-md hover:-translate-y-0.5
                 active:translate-y-0 active:scale-[0.97]
                 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:outline-none"
        >
          重新开始
        </button>
        <button
          @click="$emit('close')"
          class="flex-1 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold py-3 rounded-2xl
                 shadow-lg shadow-purple-500/25
                 transition-all duration-200 ease-out
                 hover:shadow-xl hover:shadow-purple-500/35 hover:brightness-110 hover:-translate-y-0.5
                 active:translate-y-0 active:scale-[0.97]
                 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
        >
          关闭
        </button>
      </div>
    </div>
    </div>
  </Teleport>
</template>

<style scoped>
.level-selector-overlay {
  animation: fadeIn 0.2s ease-out;
}

.level-selector {
  animation: slideUp 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.level-grid::-webkit-scrollbar {
  width: 6px;
}

.level-grid::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.level-grid::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.level-grid::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}
</style>
