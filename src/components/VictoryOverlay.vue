<template>
  <Transition name="victory-fade">
    <div
      v-if="visible"
      class="victory-overlay"
      :style="overlayStyle"
      @click="handleDismiss"
    >
      <div class="victory-image-wrapper">
        <img
          v-if="currentImage"
          :src="currentImage"
          alt="Victory"
          class="victory-image"
          :class="{ 'image-loaded': imageLoaded }"
          @load="onImageLoad"
        />
      </div>
      <div class="victory-hint" v-if="imageLoaded">
        点击任意位置继续
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  VICTORY_IMAGES_DIR,
  VICTORY_IMAGES_COUNT,
  VICTORY_CONFIG
} from '../constants'

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
const imageLoaded = ref(false)
const isDismissing = ref(false)
const preloadedImages = new Map()
const lastShownIndex = ref(-1)
let dismissTimer = null

const overlayStyle = computed(() => ({
  '--fade-in-duration': `${props.fadeInDuration}ms`,
  '--fade-out-duration': `${props.fadeOutDuration}ms`,
  '--overlay-opacity': props.overlayOpacity
}))

const getImagePath = (index) => {
  const num = String(index).padStart(2, '0')
  return `${VICTORY_IMAGES_DIR}/victory_${num}.png`
}

const getAllImagePaths = () => {
  const paths = []
  for (let i = 1; i <= VICTORY_IMAGES_COUNT; i++) {
    paths.push(getImagePath(i))
  }
  return paths
}

const pickRandomImage = () => {
  if (VICTORY_IMAGES_COUNT <= 1) {
    return getImagePath(1)
  }

  let randomIndex
  do {
    randomIndex = Math.floor(Math.random() * VICTORY_IMAGES_COUNT) + 1
  } while (randomIndex === lastShownIndex.value && VICTORY_IMAGES_COUNT > 1)

  lastShownIndex.value = randomIndex
  return getImagePath(randomIndex)
}

const preloadImage = (src) => {
  if (preloadedImages.has(src)) {
    return Promise.resolve(preloadedImages.get(src))
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      preloadedImages.set(src, img)
      resolve(img)
    }
    img.onerror = () => {
      console.warn(`Failed to preload victory image: ${src}`)
      resolve(null)
    }
    img.src = src
  })
}

const preloadAllImages = async () => {
  const paths = getAllImagePaths()
  const batchSize = 6
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize)
    await Promise.allSettled(batch.map(preloadImage))
  }
}

const onImageLoad = () => {
  imageLoaded.value = true
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

const showVictory = () => {
  isDismissing.value = false
  imageLoaded.value = false
  currentImage.value = pickRandomImage()

  clearTimer()
  dismissTimer = setTimeout(() => {
    dismiss()
  }, props.duration)
}

watch(() => props.visible, (newVal) => {
  if (newVal) {
    showVictory()
  } else {
    clearTimer()
    isDismissing.value = false
    imageLoaded.value = false
  }
})

onMounted(() => {
  if (VICTORY_CONFIG.preloadAll) {
    preloadAllImages()
  }
})

onUnmounted(() => {
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