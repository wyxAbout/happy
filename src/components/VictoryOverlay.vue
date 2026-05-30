<template>
  <Teleport to="body">
    <Transition name="victory-fade">
      <div
        v-if="visible"
        class="victory-overlay"
        :style="overlayStyle"
        @click="handleDismiss"
      >
        <div class="victory-image-wrapper">
          <div v-if="isFetching && !currentImage" class="victory-loading text-white/80 text-lg">
            加载中...
          </div>
          <img
            v-if="currentImage"
            :src="currentImage"
            alt="Victory"
            class="victory-image"
            :class="{ 'image-loaded': imageLoaded }"
            @load="onImageLoad"
            @error="onImageError"
          />
        </div>
        <div class="victory-hint" v-if="imageLoaded">
          点击任意位置继续
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import {
  VICTORY_IMAGES_DIR,
  VICTORY_IMAGES_COUNT,
  VICTORY_CONFIG,
  VICTORY_API_BASE
} from '../constants'
import { saveUserCard, DEFAULT_USER_ID } from '../api/cardService'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  duration: {
    type: Number,
    default: VICTORY_CONFIG.displayDuration
  },
  fadeInDuration: {
    type: Number,
    default: VICTORY_CONFIG.fadeInDuration
  },
  fadeOutDuration: {
    type: Number,
    default: VICTORY_CONFIG.fadeOutDuration
  },
  overlayOpacity: {
    type: Number,
    default: VICTORY_CONFIG.overlayOpacity
  },
  clickToDismiss: {
    type: Boolean,
    default: VICTORY_CONFIG.clickToDismiss
  }
})

const emit = defineEmits(['dismiss'])

const currentImage = ref('')
const currentCardTypeId = ref(0)
const imageLoaded = ref(false)
const isDismissing = ref(false)
const isFetching = ref(false)
const lastShownIndex = ref(-1)
let dismissTimer = null

const overlayStyle = computed(() => ({
  '--fade-in-duration': `${props.fadeInDuration}ms`,
  '--fade-out-duration': `${props.fadeOutDuration}ms`,
  '--overlay-opacity': props.overlayOpacity
}))

const getLocalImagePath = (index) => {
  const num = String(index).padStart(2, '0')
  return `${VICTORY_IMAGES_DIR}/victory_${num}.png`
}

const pickRandomId = () => {
  if (VICTORY_IMAGES_COUNT <= 1) return 1
  let id
  do {
    id = Math.floor(Math.random() * VICTORY_IMAGES_COUNT) + 1
  } while (id === lastShownIndex.value && VICTORY_IMAGES_COUNT > 1)
  lastShownIndex.value = id
  return id
}

const extractImageUrl = (data) => {
  if (!data) return null
  if (typeof data === 'string') return data
  return data.imageUrl || data.image_url || data.image || data.url || data.path || data.src || null
}

const API_TIMEOUT_MS = 5000
let abortController = null

const fetchImageFromApi = async (id) => {
  abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort(), API_TIMEOUT_MS)

  try {
    const response = await fetch(`${VICTORY_API_BASE}/${id}`, {
      signal: abortController.signal,
      headers: { 'Accept': 'application/json' }
    })
    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`)
    }
    const data = await response.json()
    const imageUrl = extractImageUrl(data)
    if (!imageUrl) {
      throw new Error('No image URL found in API response')
    }
    return imageUrl
  } finally {
    clearTimeout(timeoutId)
    abortController = null
  }
}

const cancelFetch = () => {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
}

const onImageLoad = () => {
  imageLoaded.value = true
}

const onImageError = () => {
  imageLoaded.value = true
  alert('胜利图片加载失败，请检查网络连接')
}

const clearTimer = () => {
  if (dismissTimer) {
    clearTimeout(dismissTimer)
    dismissTimer = null
  }
}

const handleDismiss = () => {
  if (!props.clickToDismiss || isDismissing.value) return
  if (!imageLoaded.value) return
  dismiss()
}

const dismiss = () => {
  if (isDismissing.value) return
  isDismissing.value = true
  clearTimer()

  setTimeout(() => {
    emit('dismiss')
  }, props.fadeOutDuration)
}

const showVictory = async () => {
  isDismissing.value = false
  imageLoaded.value = false
  currentImage.value = ''
  isFetching.value = true

  const id = pickRandomId()
  currentCardTypeId.value = id

  try {
    currentImage.value = await fetchImageFromApi(id)
  } catch (err) {
    console.warn(`API fetch failed for id ${id}:`, err.message)
    currentImage.value = getLocalImagePath(id)
  } finally {
    isFetching.value = false
  }

  try {
    await saveUserCard(DEFAULT_USER_ID, currentCardTypeId.value, 'game_drop')
  } catch (err) {
    console.warn('Failed to save victory card:', err.message)
  }

  clearTimer()
  dismissTimer = setTimeout(() => {
    dismiss()
  }, props.duration)
}

watch(() => props.visible, (newVal) => {
  if (newVal) {
    showVictory()
  } else {
    cancelFetch()
    clearTimer()
    isDismissing.value = false
    imageLoaded.value = false
    isFetching.value = false
  }
})

onUnmounted(() => {
  cancelFetch()
  clearTimer()
})
</script>

<style scoped>
.victory-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, var(--overlay-opacity, 0.85));
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}

.victory-image-wrapper {
  position: relative;
  width: 90vw;
  height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.victory-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  opacity: 0;
  transform: scale(0.85);
  transition: opacity 0.5s ease-out, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.victory-image.image-loaded {
  opacity: 1;
  transform: scale(1);
}

.victory-hint {
  position: absolute;
  bottom: 8vh;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  letter-spacing: 0.1em;
  animation: hint-pulse 2s ease-in-out infinite;
}

@keyframes hint-pulse {
  0%, 100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

.victory-fade-enter-active {
  transition: opacity var(--fade-in-duration, 400ms) ease-out;
}

.victory-fade-leave-active {
  transition: opacity var(--fade-out-duration, 300ms) ease-in;
}

.victory-fade-enter-from {
  opacity: 0;
}

.victory-fade-leave-to {
  opacity: 0;
}
</style>