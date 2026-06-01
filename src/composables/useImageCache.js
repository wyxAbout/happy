/**
 * useImageCache.js — 图片缓存与预加载系统
 *
 * 【功能概述】
 * 基于 LRU（最近最少使用）策略的内存图片缓存系统。
 * 支持图片预加载、本地持久化元数据、自动内存清理。
 * 用于缓存游戏图标和胜利图片，避免重复 HTTP 请求，提升渲染性能。
 *
 * 【架构设计】
 * - 内存缓存（cache 对象）：存储已加载的 Image 对象，最多 50 张
 * - LRU 驱逐队列（LRUOrder 数组）：追踪使用顺序，溢出时移除最久未用的
 * - 请求去重（pending Map）：同一 URL 的并发请求合并为一个 Promise
 * - 本地存储备份（localStorage）：缓存元数据时间戳用于版本管理
 *
 * 【使用示例】
 *   import { useImageCache, initGlobalImageCache } from './composables/useImageCache'
 *   // 全局初始化（在 App.vue 或 main.js 中）
 *   await initGlobalImageCache()
 *   // 组件中使用
 *   const { loadImage, preloadImages, clearCache } = useImageCache()
 *   const img = await loadImage('/icons/tile01.png')
 */

import { ref, shallowRef } from 'vue'
import { storage } from '../api/storageService'

/**
 * 开发环境调试日志
 * @param {...any} args
 */
const debugLog = (...args) => {
  if (import.meta.env.DEV) console.log(...args)
}

/**
 * 内存缓存池
 * key: 图片 URL 字符串
 * value: 已加载的 HTMLImageElement 实例
 * @type {Object<string, HTMLImageElement>}
 */
const cache = {}

/**
 * 待处理的加载 Promise 映射
 * 用于请求去重：同一 URL 的并发调用共享同一个 Promise
 * @type {Map<string, Promise<HTMLImageElement>>}
 */
const pending = new Map()

/**
 * LRU 使用顺序队列
 * 最近使用的 URL 在末尾，最久未使用的在开头
 * @type {string[]}
 */
const LRUOrder = []

/**
 * 最大内存缓存数量
 * 超过此值后，最久未使用的图片将被移除
 * @constant {number}
 */
const MAX_MEMORY_CACHE = 50

/**
 * localStorage 中缓存元数据的键名
 * @constant {string}
 */
const STORAGE_KEY = 'game_image_cache'

/**
 * useImageCache — 图片缓存 Composable
 *
 * 每次调用返回一个新的缓存实例（模块级 cache/pending/LRUOrder 是共享的）。
 *
 * @returns {Object} 缓存管理对象
 * @returns {Function} loadImage      - 加载单张图片并缓存
 * @returns {Function} preloadImages  - 批量预加载图片
 * @returns {Function} clearCache     - 清空所有缓存
 * @returns {Function} initCache      - 从 localStorage 恢复缓存元数据
 * @returns {import('vue').Ref<boolean>} isReady     - 缓存是否初始化完成
 * @returns {import('vue').Ref<Object>} cacheStats  - 缓存命中统计 {hits: number, misses: number}
 */
export function useImageCache() {
  const isReady = ref(false)
  const cacheStats = ref({ hits: 0, misses: 0 })

  /**
   * 加载单张图片
   *
   * 流程：
   * 1. 检查缓存 → 命中则直接返回（updateLRU 刷新使用时间）
   * 2. 检查 pending → 正在加载中则返回现有 Promise（请求去重）
   * 3. 创建新 Image 加载 → 成功后存入缓存 → 检查 LRU 驱逐
   *
   * @param {string} src       - 图片 URL
   * @param {number} [priority=1] - 加载优先级（预留给未来负载排序）
   * @returns {Promise<HTMLImageElement>} 加载完成的 Image 对象
   *
   * 【错误处理】
   * 加载失败时 reject 并清理 pending 条目，不会污染缓存。
   */
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

  /**
   * 更新 LRU 使用顺序
   * 将指定 URL 移到队列末尾（最近使用）
   * @param {string} src - 图片 URL
   */
  const updateLRU = (src) => {
    const index = LRUOrder.indexOf(src)
    if (index > -1) {
      LRUOrder.splice(index, 1)
    }
    LRUOrder.push(src)
  }

  /**
   * 清理超出上限的内存缓存
   * 从 LRUOrder 开头（最久未使用）开始移除，直到数量 ≤ MAX_MEMORY_CACHE
   */
  const cleanupMemoryCache = () => {
    while (LRUOrder.length > MAX_MEMORY_CACHE) {
      const oldest = LRUOrder.shift()
      delete cache[oldest]
    }
  }

  /**
   * 批量预加载图片
   *
   * 按优先级排序后并发加载所有图片。
   * 使用 Promise.allSettled 确保部分失败不影响整体。
   *
   * @param {string[]} sources     - 图片 URL 数组
   * @param {number}   [priority=1] - 加载优先级
   * @returns {Promise<void>}
   */
  const preloadImages = async (sources, priority = 1) => {
    const sortedSources = [...sources].sort((a, b) => {
      return priority - 1
    })
    
    const promises = sortedSources.map(src => loadImage(src, priority))
    await Promise.allSettled(promises)
  }

  /**
   * 清空所有缓存
   * 移除内存缓存、LRU 队列、pending 请求、localStorage 元数据
   */
  const clearCache = () => {
    Object.keys(cache).forEach(key => {
      cache[key] = null
      delete cache[key]
    })
    LRUOrder.length = 0
    pending.clear()
    storage.removeItem(STORAGE_KEY)
  }

  /**
   * 初始化缓存系统
   *
   * 从 localStorage 读取缓存元数据（若存在且未过期），
   * 7 天前的元数据视为过期，自动忽略。
   *
   * @returns {Promise<void>}
   */
  const initCache = async () => {
    try {
      const cachedData = storage.getItem(STORAGE_KEY)
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

/**
 * 全局图片缓存实例（浅响应式）
 * 通过 shallowRef 包裹，仅追踪引用变化（.value 被替换时触发响应）
 * 内部 cache 对象的变化不触发响应式更新（性能考虑）
 * @type {import('vue').ShallowRef<Object|null>}
 */
export const imageCache = shallowRef(null)

/**
 * 初始化全局图片缓存
 * 应在应用启动时调用一次（如 App.vue onMounted 中）
 * @returns {Promise<void>}
 */
export function initGlobalImageCache() {
  imageCache.value = useImageCache()
  return imageCache.value.initCache()
}
