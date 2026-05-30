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

      <div class="content flex-1 overflow-y-auto p-4">
        <div v-if="exchangeMode" class="exchange-bar bg-yellow-400/20 backdrop-blur-sm border border-yellow-400/30 rounded-xl px-3 py-2 mb-3 text-center text-white text-sm">
          <span>🔄 选择4张相同图片兑换为1张其他图片 — </span>
          <button @click="cancelExchange" class="underline font-bold hover:text-yellow-200 transition-colors">取消</button>
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

        <div v-else class="card-grid grid grid-cols-4 gap-3">
          <div
            v-for="card in cards"
            :key="card.id"
            class="card-item relative aspect-square rounded-xl overflow-hidden bg-white/15 backdrop-blur-sm border border-white/10 shadow-md transition-transform duration-200 hover:scale-[1.02]"
            :class="{
              'cursor-pointer hover:scale-105': card.collected && !exchangeMode,
              'cursor-pointer ring-2 ring-yellow-400 ring-offset-2 ring-offset-transparent': exchangeMode && card.id === exchangeSourceId,
              'cursor-pointer ring-1 ring-white/40': exchangeMode && card.id !== exchangeSourceId && card.collected,
              'opacity-50': exchangeMode && !card.collected && card.id !== exchangeSourceId
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
          </div>
        </div>
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
          <div class="exchange-confirm-dialog bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl animate-pop-in">
            <div class="text-4xl mb-3">🔄</div>
            <h3 class="text-lg font-bold text-gray-800 mb-2">确认兑换</h3>
            <p class="text-gray-600 text-sm mb-4">
              消耗 <span class="font-bold text-red-500">4张</span> 相同的图片，兑换 <span class="font-bold text-green-500">1张</span> 新图片
            </p>
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
const previewVisible = ref(false)
const previewImageUrl = ref('')
const exchangeMode = ref(false)
const exchangeSourceId = ref(0)
const exchangeConfirmVisible = ref(false)
const exchangeTargetId = ref(0)
const exchanging = ref(false)

const collectedCount = computed(() => cards.value.filter(c => c.collected).length)

const getLocalFallbackUrl = (id) => {
  return `/victory_images/victory_${String(id).padStart(2, '0')}.png`
}

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
    iconUrl: ct.icon ? `${ct.icon}.png` : getLocalFallbackUrl(ct.id),
    localFallback: getLocalFallbackUrl(ct.id),
    collected: !!userCardMap[ct.id],
    count: userCardMap[ct.id] || 0,
    isEnable: ct.isEnable !== undefined ? ct.isEnable : 1
  }))
}

const loadData = async () => {
  loading.value = true
  error.value = ''

  try {
    const [cardTypes, userCards] = await Promise.all([
      fetchAllCardTypes(),
      fetchUserCards()
    ])
    cards.value = buildCardGrid(cardTypes, userCards)
  } catch (err) {
    console.warn('API load failed, using local fallback:', err.message)
    const localCards = []
    for (let i = 1; i <= 24; i++) {
      const url = getLocalFallbackUrl(i)
      localCards.push({
        id: i,
        cardName: `卡片 ${i}`,
        iconUrl: url,
        localFallback: url,
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
  if (card.localFallback && event.target.src !== card.localFallback) {
    event.target.src = card.localFallback
    return
  }
  const num = String(card.id).padStart(2, '0')
  event.target.src = `/victory_images/victory_${num}.png`
}

const handleCardClick = (card) => {
  if (exchangeMode.value) {
    if (card.id === exchangeSourceId.value) return
    if (!card.collected && card.id !== exchangeSourceId.value) return
    exchangeTargetId.value = card.id
    exchangeConfirmVisible.value = true
    return
  }

  if (card.count >= 4) {
    exchangeMode.value = true
    exchangeSourceId.value = card.id
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
    await exchangeCards(1, exchangeSourceId.value, exchangeTargetId.value)
    exchangeMode.value = false
    exchangeSourceId.value = 0
    exchangeTargetId.value = 0
    exchangeConfirmVisible.value = false
    await loadData()
  } catch (err) {
    console.warn('Exchange failed:', err.message)
    alert('兑换失败：' + err.message)
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
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

defineExpose({ loadData })
</script>

<style scoped>
.my-images-overlay {
  z-index: 150;
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
