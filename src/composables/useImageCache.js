import { ref, shallowRef } from 'vue'

const debugLog = (...args) => {
  if (import.meta.env.DEV) console.log(...args)
}

const cache = {}
const pending = new Map()
const LRUOrder = []
const MAX_MEMORY_CACHE = 50
const STORAGE_KEY = 'game_image_cache'

export function useImageCache() {
  const isReady = ref(false)
  const cacheStats = ref({ hits: 0, misses: 0 })

  const loadImage = async (src, priority = 1) => {
    if (cache[src]) {
      cacheStats.value.hits++
      updateLRU(src)
      return cache[src]
    }

    if (pending.has(src)) {
      return pending.get(src)
    }

    cacheStats.value.misses++
    const promise = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        cache[src] = img
        pending.delete(src)
        updateLRU(src)
        cleanupMemoryCache()
        resolve(img)
      }
      img.onerror = () => {
        pending.delete(src)
        reject(new Error(`Failed to load image: ${src}`))
      }
      img.src = src
    })

    pending.set(src, promise)
    return promise
  }

  const updateLRU = (src) => {
    const index = LRUOrder.indexOf(src)
    if (index > -1) {
      LRUOrder.splice(index, 1)
    }
    LRUOrder.push(src)
  }

  const cleanupMemoryCache = () => {
    while (LRUOrder.length > MAX_MEMORY_CACHE) {
      const oldest = LRUOrder.shift()
      delete cache[oldest]
    }
  }

  const preloadImages = async (sources, priority = 1) => {
    const sortedSources = [...sources].sort((a, b) => {
      return priority - 1
    })
    
    const promises = sortedSources.map(src => loadImage(src, priority))
    await Promise.allSettled(promises)
  }

  const clearCache = () => {
    Object.keys(cache).forEach(key => {
      cache[key] = null
      delete cache[key]
    })
    LRUOrder.length = 0
    pending.clear()
    localStorage.removeItem(STORAGE_KEY)
  }

  const initCache = async () => {
    try {
      const cachedData = localStorage.getItem(STORAGE_KEY)
      if (cachedData) {
        const data = JSON.parse(cachedData)
        if (data.timestamp && Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) {
          debugLog('Loading cached image metadata...')
        }
      }
    } catch (e) {
      console.warn('Failed to load cache metadata:', e)
    }
    isReady.value = true
  }

  return {
    loadImage,
    preloadImages,
    clearCache,
    initCache,
    isReady,
    cacheStats
  }
}

export const imageCache = shallowRef(null)

export function initGlobalImageCache() {
  imageCache.value = useImageCache()
  return imageCache.value.initCache()
}
