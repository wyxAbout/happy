<template>
  <Teleport to="body">
    <div v-if="visible" class="my-images-overlay fixed inset-0 z-100 bg-gradient-to-b from-[#4793cf] to-[#5db6e0] flex flex-col">
      <div class="header bg-white/10 backdrop-blur-md border-b border-white/10 text-white px-4 py-4 flex items-center gap-3 flex-shrink-0">
        <button
          @click="$emit('close')"
          class="back-btn w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/25 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 class="text-xl font-bold">我的图片</h2>
        <div class="ml-auto text-white/80 text-sm">
          {{ collectedCount }} / 24
        </div>
      </div>

      <div class="content flex-1 overflow-y-auto p-4 pb-16">
        <div v-if="exchangeMode" class="exchange-bar bg-gradient-to-r from-yellow-400/25 to-orange-400/25 backdrop-blur-sm border border-yellow-400/40 rounded-xl px-4 py-3 mb-3 text-center">
          <div class="flex items-center justify-between">
            <span class="text-white text-sm font-medium flex items-center gap-2">
              <span class="text-xl">🔄</span>
              <span>选择一张图片作为兑换目标</span>
            </span>
            <button @click="cancelExchange" class="text-white/80 hover:text-white text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg transition-all">
              取消兑换
            </button>
          </div>
          <div class="mt-1 text-white/60 text-xs">
            将用 <span class="text-yellow-300 font-bold">4张</span> 相同图片换得 <span class="text-green-300 font-bold">1张</span> 新图片
          </div>
        </div>

        <div v-if="loading" class="flex flex-col items-center justify-center h-64 text-white/70 gap-3">
          <div class="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          <span>加载图片数据中...</span>
        </div>

        <div v-else-if="error" class="flex flex-col items-center justify-center h-64 text-white/70 gap-3">
          <div class="text-4xl">😵</div>
          <span>{{ error }}</span>
          <button
            @click="loadData"
            class="mt-2 px-5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-colors backdrop-blur-sm"
          >
            重试
          </button>
        </div>

        <div v-else-if="usingLocalFallback" class="local-fallback-banner bg-yellow-400/20 border border-yellow-400/30 rounded-xl px-4 py-2.5 mb-3 flex items-center gap-2">
          <svg class="w-5 h-5 text-yellow-300 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span class="text-yellow-200 text-sm">{{ localFallbackReason }}</span>
          <button
            @click="loadData"
            class="ml-auto text-yellow-300 hover:text-yellow-100 text-xs font-semibold bg-yellow-400/10 hover:bg-yellow-400/20 px-3 py-1 rounded-lg transition-colors"
          >
            重试连接
          </button>
        </div>

        <div v-else class="card-grid grid grid-cols-4 gap-3">
          <div
            v-for="card in cards"
            :key="card.id"
            class="card-item relative aspect-square rounded-xl overflow-hidden bg-white/15 backdrop-blur-sm border border-white/10 shadow-md transition-transform duration-200 hover:scale-[1.02]"
            :class="{
              'cursor-pointer hover:scale-105': card.collected && !exchangeMode,
              'cursor-pointer ring-2 ring-yellow-400 ring-offset-2 ring-offset-transparent': exchangeMode && card.id === exchangeSourceId,
              'cursor-pointer ring-1 ring-white/40': exchangeMode && card.id !== exchangeSourceId && card.collected,
              'cursor-pointer ring-1 ring-yellow-400/30': exchangeMode && card.id !== exchangeSourceId && !card.collected
            }"
            @click="handleCardClick(card)"
          >
            <img
              :src="card.iconUrl"
              :alt="card.cardName"
              class="w-full h-full object-cover"
              @error="handleImgError($event, card)"
            />

            <div
              v-if="!card.collected"
              class="lock-overlay absolute inset-0 rounded-xl bg-gray-500/65 flex items-center justify-center"
            >
              <svg class="w-8 h-8 text-white/90 drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
              </svg>
            </div>

            <div class="count-badge absolute bottom-1 right-1 bg-black/60 backdrop-blur-sm text-white text-xs font-bold min-w-[22px] h-[22px] flex items-center justify-center rounded-full px-1.5">
              {{ card.count }}
            </div>

            <button
              v-if="!exchangeMode"
              @click.stop="startExchange(card)"
              class="exchange-trigger absolute top-1 right-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-orange-500/30 transition-all duration-200 hover:scale-110 active:scale-95 hover:shadow-orange-500/50"
            >
              兑换
            </button>

            <div
              v-if="exchangeMode && card.id === exchangeSourceId"
              class="exchange-source-badge absolute top-1 left-1 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg"
            >
              消耗中
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="exchangeResult"
        class="exchange-result-bar flex-shrink-0 mx-4 mb-3 rounded-xl px-5 py-3.5 text-center text-base font-bold animate-fade-in"
        :class="exchangeResult.success
          ? 'bg-green-500/30 border border-green-400/50 text-green-100'
          : 'bg-amber-400/95 border-2 border-amber-500 text-white shadow-[0_0_20px_rgba(251,191,36,0.4)]'"
      >
        <span v-if="!exchangeResult.success" class="inline-block mr-1.5 text-lg">⚠️</span>
        {{ exchangeResult.message }}
      </div>

      <Teleport to="body">
        <div
          v-if="previewVisible"
          class="preview-overlay fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4"
          @click="closePreview"
        >
          <button
            @click="closePreview"
            class="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white text-2xl transition-colors z-10"
          >
            ✕
          </button>
          <img
            :src="previewImageUrl"
            alt="预览"
            class="max-w-full max-h-full object-contain rounded-xl"
          />
        </div>
      </Teleport>

      <Teleport to="body">
        <div
          v-if="exchangeConfirmVisible"
          class="exchange-confirm-overlay fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          @click.self="cancelExchangeConfirm"
        >
          <div class="exchange-confirm-dialog bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div class="text-4xl mb-3">🔄</div>
            <h3 class="text-lg font-bold text-gray-800 mb-1">确认图片兑换</h3>
            <div class="flex items-center justify-center gap-3 my-4">
              <div class="flex flex-col items-center">
                <div class="text-xs text-gray-400 mb-1">消耗</div>
                <div class="bg-red-50 rounded-xl p-2 border border-red-100">
                  <div class="text-red-500 font-bold">×4</div>
                </div>
                <div class="text-xs text-gray-500 mt-1 max-w-[80px] truncate">{{ getCardName(exchangeSourceId) }}</div>
              </div>
              <div class="text-2xl text-gray-300">→</div>
              <div class="flex flex-col items-center">
                <div class="text-xs text-gray-400 mb-1">获得</div>
                <div class="bg-green-50 rounded-xl p-2 border border-green-100">
                  <div class="text-green-500 font-bold">×1</div>
                </div>
                <div class="text-xs text-gray-500 mt-1 max-w-[80px] truncate">{{ getCardName(exchangeTargetId) }}</div>
              </div>
            </div>
            <p v-if="!exchangeTargetCollected" class="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-1.5 mb-3 inline-block">
              🎉 将解锁一张新图片！
            </p>
            <p class="text-gray-500 text-xs mb-5">兑换后，4张图片将永久消耗</p>
            <div class="flex gap-3 justify-center">
              <button
                @click="cancelExchangeConfirm"
                class="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                @click="confirmExchange"
                :disabled="exchanging"
                class="px-5 py-2.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all duration-200 hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ exchanging ? '兑换中...' : '确认兑换' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { fetchAllCardTypes, fetchUserCards, exchangeCards } from '../api/cardService'
import { IMAGE_API_BASE } from '../constants'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

defineEmits(['close'])

const cards = ref([])
const loading = ref(false)
const error = ref('')
const usingLocalFallback = ref(false)
const localFallbackReason = ref('')
const imgErrorAttempts = {}
const previewVisible = ref(false)
const previewImageUrl = ref('')
const exchangeMode = ref(false)
const exchangeSourceId = ref(0)
const exchangeConfirmVisible = ref(false)
const exchangeTargetId = ref(0)
const exchanging = ref(false)
const exchangeResult = ref(null)
let exchangeResultTimer = null

const collectedCount = computed(() => cards.value.filter(c => c.collected).length)

const getCardName = (id) => {
  const card = cards.value.find(c => c.id === id)
  return card ? card.cardName : `卡片 ${id}`
}

const exchangeTargetCollected = computed(() => {
  if (!exchangeTargetId.value) return false
  const card = cards.value.find(c => c.id === exchangeTargetId.value)
  return card ? card.collected : false
})

const showExchangeResult = (success, message) => {
  exchangeResult.value = { success, message }
  if (exchangeResultTimer) clearTimeout(exchangeResultTimer)
  exchangeResultTimer = setTimeout(() => {
    exchangeResult.value = null
  }, 3000)
}

const getApiImageUrl = (id) => {
  const num = String(id).padStart(2, '0')
  return `${IMAGE_API_BASE}/victory/${num}`
}

const getLocalFallbackUrl = (id) => {
  return `/victory_images/victory_${String(id).padStart(2, '0')}.png`
}

/**
 * 构建前端卡牌网格数据
 *
 * 合并 cardTypes（卡牌元数据）和 userCards（用户收集记录），
 * 生成前端渲染所需的 cards 数组。
 *
 * @param {Array} cardTypes - 后端返回的卡牌类型列表 [{id, cardName, isEnable}]
 * @param {Array} userCards - 后端返回的用户卡牌列表 [{cardTypeId}]
 * @returns {Array} 合并后的卡牌网格 [{id, cardName, iconUrl, collected, count, isEnable}]
 */
const buildCardGrid = (cardTypes, userCards) => {
  const userCardMap = {}
  if (userCards && Array.isArray(userCards)) {
    userCards.forEach(uc => {
      const ctId = uc.cardTypeId
      if (!userCardMap[ctId]) userCardMap[ctId] = 0
      userCardMap[ctId]++
    })
  }

  return cardTypes.map(ct => ({
    id: ct.id,
    cardName: ct.cardName || `卡片 ${ct.id}`,
    iconUrl: getApiImageUrl(ct.id),
    localFallback: getLocalFallbackUrl(ct.id),
    collected: !!userCardMap[ct.id],
    count: userCardMap[ct.id] || 0,
    isEnable: ct.isEnable !== undefined ? ct.isEnable : 1
  }))
}

const loadData = async () => {
  loading.value = true
  error.value = ''
  usingLocalFallback.value = false
  Object.keys(imgErrorAttempts).forEach(k => delete imgErrorAttempts[k])

  try {
    const [cardTypes, userCards] = await Promise.all([
      fetchAllCardTypes(),
      fetchUserCards()
    ])
    cards.value = buildCardGrid(cardTypes, userCards)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[MyImages] API load failed, using local fallback:', msg)
    usingLocalFallback.value = true
    localFallbackReason.value = '⚠️ 无法连接服务器，显示的是本地数据。图鉴状态可能不是最新的。'
    const localCards = []
    for (let i = 1; i <= 24; i++) {
      localCards.push({
        id: i,
        cardName: `卡片 ${i}`,
        iconUrl: getApiImageUrl(i),
        localFallback: getLocalFallbackUrl(i),
        collected: false,
        count: 0,
        isEnable: 1
      })
    }
    cards.value = localCards
  } finally {
    loading.value = false
  }
}

const handleImgError = (event, card) => {
  const key = card.id
  const attempts = imgErrorAttempts[key] || 0
  imgErrorAttempts[key] = attempts + 1

  if (attempts >= 2) return

  if (card.localFallback && event.target.src !== card.localFallback) {
    event.target.src = card.localFallback
    return
  }

  const apiUrl = getApiImageUrl(card.id)
  if (event.target.src !== apiUrl) {
    event.target.src = apiUrl
    return
  }
}

const startExchange = (card) => {
  if (card.count < 4) {
    showExchangeResult(false,
      '「' + getCardName(card.id) + '」只有 ' + card.count + ' 张，需要满 4 张才能兑换')
    return
  }
  exchangeMode.value = true
  exchangeSourceId.value = card.id
  exchangeResult.value = null
}

const handleCardClick = (card) => {
  if (exchangeMode.value) {
    if (card.id === exchangeSourceId.value) {
      cancelExchange()
      return
    }
    exchangeTargetId.value = card.id
    exchangeConfirmVisible.value = true
    return
  }

  if (card.collected) {
    previewImage(card)
  }
}

const cancelExchange = () => {
  exchangeMode.value = false
  exchangeSourceId.value = 0
  exchangeTargetId.value = 0
}

const cancelExchangeConfirm = () => {
  exchangeConfirmVisible.value = false
  exchangeTargetId.value = 0
}

const confirmExchange = async () => {
  if (exchanging.value) return
  exchanging.value = true

  try {
    const result = await exchangeCards(1, exchangeSourceId.value, exchangeTargetId.value)
    exchangeMode.value = false
    exchangeSourceId.value = 0
    exchangeTargetId.value = 0
    exchangeConfirmVisible.value = false
    await loadData()
    showExchangeResult(true,
      '兑换成功！获得了「' + getCardName(result.cardTypeId || exchangeTargetId.value) + '」')
  } catch (err) {
    exchangeConfirmVisible.value = false
    showExchangeResult(false, '兑换失败：' + err.message)
  } finally {
    exchanging.value = false
  }
}

const previewImage = (card) => {
  if (!card.collected) return
  previewImageUrl.value = card.iconUrl
  previewVisible.value = true
}

const closePreview = () => {
  previewVisible.value = false
}

const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    if (previewVisible.value) {
      closePreview()
    } else if (exchangeConfirmVisible.value) {
      cancelExchangeConfirm()
    } else if (exchangeMode.value) {
      cancelExchange()
    }
  }
}

watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadData()
  } else {
    cancelExchange()
    cancelExchangeConfirm()
    exchangeResult.value = null
    if (exchangeResultTimer) clearTimeout(exchangeResultTimer)
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (exchangeResultTimer) clearTimeout(exchangeResultTimer)
})

/**
 * 【图鉴重置-暴露重载方法】
 *
 * 定义本组件的重载方法，供父组件通过 template ref 调用。
 * 当 handleResetAllData() 清空后端数据后，需要调用此方法刷新 UI。
 */
const reload = () => {
  loadData()
}

defineExpose({ reload })
</script>

<style scoped>
.my-images-overlay {
  z-index: 150;
}

@media (max-width: 767px) {
  .my-images-overlay {
    padding-top: calc(env(safe-area-inset-top, 0px) + 48px);
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 56px);
  }

  .exchange-result-bar {
    margin-bottom: 1rem;
  }
}

.card-grid {
  max-width: 500px;
  margin: 0 auto;
}

.card-item {
  min-width: 0;
}

.lock-overlay {
  pointer-events: none;
}

.count-badge {
  pointer-events: none;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

.content {
  -webkit-overflow-scrolling: touch;
}

.animate-pop-in {
  animation: popIn 0.3s ease-out;
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
