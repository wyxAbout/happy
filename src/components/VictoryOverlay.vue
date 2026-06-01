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

        <div v-if="imageLoaded" class="victory-footer">
          <div class="save-status" :class="saveStatusClass">
            <template v-if="saveStatus === 'saving'">
              <span class="save-spinner"></span>
              <span>正在记录图鉴...</span>
            </template>
            <template v-else-if="saveStatus === 'success'">
              <svg class="save-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>已记录到图鉴</span>
            </template>
            <template v-else-if="saveStatus === 'error'">
              <svg class="save-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span class="save-error-msg">{{ saveError }}</span>
              <button class="retry-save-btn" @click.stop="retrySave">重试保存</button>
            </template>
          </div>
          <div class="victory-hint" v-if="saveStatus !== 'error'">
            点击任意位置继续
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
/**
 * VictoryOverlay.vue — 胜利弹窗组件
 *
 * 【功能概述】
 * 通关后显示全屏胜利图片覆盖层。
 * 核心流程：
 * 1. visible 变为 true → 随机选择一张胜利图片
 * 2. 从后端 API 加载图片（失败时降级到本地文件）
 * 3. 自动调用 saveUserCard() 将图片记入图鉴收集
 * 4. 图片加载完成后可点击关闭，或等待 duration 毫秒自动关闭
 *
 * 【保存状态三态机制】
 * - saving：蓝色旋转指示器，显示"正在记录图鉴..."
 * - success：绿色勾，显示"已记录到图鉴"，自动关闭
 * - error：红色警告 + 错误信息 + "重试保存"按钮，阻止自动关闭
 *
 * 【图片加载策略】
 * - 优先从后端 API 获取（getApiImagePath）
 * - 加载失败时降级到本地静态文件（getLocalImagePath）
 * - 再次失败时显示 alert 提示
 */

import { ref, computed, watch, onUnmounted } from 'vue'
import {
  VICTORY_IMAGES_DIR,
  VICTORY_IMAGES_COUNT,
  VICTORY_CONFIG,
  IMAGE_API_BASE
} from '../constants'
import { saveUserCard, DEFAULT_USER_ID } from '../api/cardService'
import { storage } from '../api/storageService'

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
const useLocalFallback = ref(false)
const lastShownIndex = ref(-1)
const saveStatus = ref('idle')
const saveError = ref('')
let dismissTimer = null
let saveRetryCount = 0
const MAX_SAVE_RETRIES = 3

const saveStatusClass = computed(() => ({
  'save-status--saving': saveStatus.value === 'saving',
  'save-status--success': saveStatus.value === 'success',
  'save-status--error': saveStatus.value === 'error'
}))

const overlayStyle = computed(() => ({
  '--fade-in-duration': `${props.fadeInDuration}ms`,
  '--fade-out-duration': `${props.fadeOutDuration}ms`,
  '--overlay-opacity': props.overlayOpacity
}))

const getLocalImagePath = (index) => {
  const num = String(index).padStart(2, '0')
  return `${VICTORY_IMAGES_DIR}/victory_${num}.png`
}

const getApiImagePath = (id, token) => {
  const num = String(id).padStart(2, '0')
  let url = `${IMAGE_API_BASE}/victory/${num}`
  if (token) {
    url += `?token=${encodeURIComponent(token)}`
  }
  return url
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

const getSessionToken = () => {
  try {
    return storage.getItem('session_token') || null
  } catch {
    return null
  }
}

const onImageLoad = () => {
  imageLoaded.value = true
}

const onImageError = () => {
  if (!useLocalFallback.value && currentCardTypeId.value > 0) {
    useLocalFallback.value = true
    currentImage.value = getLocalImagePath(currentCardTypeId.value)
    return
  }
  imageLoaded.value = true
  alert('胜利图片加载失败，请检查网络连接')
}

/**
 * 执行保存卡牌操作。
 * 自动重试最多 MAX_SAVE_RETRIES 次，递增延迟。
 */
const performSave = async () => {
  saveStatus.value = 'saving'
  saveError.value = ''
  saveRetryCount = 0

  while (true) {
    try {
      await saveUserCard(DEFAULT_USER_ID, currentCardTypeId.value, 'game_drop')
      saveStatus.value = 'success'
      saveRetryCount = 0
      return
    } catch (err) {
      saveRetryCount++
      const msg = err instanceof Error ? err.message : String(err)
      if (saveRetryCount >= MAX_SAVE_RETRIES) {
        saveStatus.value = 'error'
        saveError.value = msg || '保存失败，请检查网络连接'
        return
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * saveRetryCount))
    }
  }
}

const retrySave = () => {
  saveRetryCount = 0
  performSave()
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
  if (saveStatus.value === 'saving') return
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
  useLocalFallback.value = false
  currentImage.value = ''
  isFetching.value = true
  saveStatus.value = 'idle'
  saveError.value = ''

  const id = pickRandomId()
  currentCardTypeId.value = id
  const token = getSessionToken()
  currentImage.value = getApiImagePath(id, token)
  isFetching.value = false

  performSave()

  clearTimer()
  dismissTimer = setTimeout(() => {
    if (saveStatus.value !== 'error') {
      dismiss()
    }
  }, props.duration)
}

watch(() => props.visible, (newVal) => {
  if (newVal) {
    showVictory()
  } else {
    clearTimer()
    isDismissing.value = false
    imageLoaded.value = false
    isFetching.value = false
    saveStatus.value = 'idle'
    saveError.value = ''
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

.victory-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  position: absolute;
  bottom: 8vh;
}

.save-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 500;
  backdrop-filter: blur(8px);
  transition: all 0.3s ease;
}

.save-status--saving {
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.4);
  color: #93c5fd;
}

.save-status--success {
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid rgba(34, 197, 94, 0.4);
  color: #86efac;
}

.save-status--error {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
  flex-wrap: wrap;
  justify-content: center;
}

.save-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(147, 197, 253, 0.3);
  border-top-color: #60a5fa;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.save-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.save-error-msg {
  max-width: 260px;
  text-align: center;
  line-height: 1.4;
}

.retry-save-btn {
  padding: 6px 16px;
  background: rgba(239, 68, 68, 0.3);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #fca5a5;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-save-btn:hover {
  background: rgba(239, 68, 68, 0.5);
  color: #fecaca;
  transform: scale(1.05);
}

.retry-save-btn:active {
  transform: scale(0.95);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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
