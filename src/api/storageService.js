/**
 * 【环境感知存储服务】
 *
 * 根据运行环境自动切换存储策略，满足测试与生产环境的不同需求。
 *
 * ┌────────────┬──────────────────┬──────────────────────────────┐
 * │ 环境        │ 识别方式           │ 存储行为                       │
 * ├────────────┼──────────────────┼──────────────────────────────┤
 * │ production │ MODE==='production' │ localStorage 原生键（永久保留） │
 * │ development│ MODE==='development'│ localStorage + "dev_" 前缀      │
 * │ test       │ VITE_STORAGE_MODE   │ 内存 Map（刷新即清除）         │
 * └────────────┴──────────────────┴──────────────────────────────┘
 *
 * 使用方式：
 *   import { storage } from '../api/storageService'
 *   storage.setItem(key, value)
 *   storage.getItem(key)
 *   storage.removeItem(key)
 *   storage.resetAll()      // 仅 dev/test 有效
 *   storage.isProduction()  // true = 生产环境
 */

const MODE = import.meta.env.MODE
const STORAGE_MODE = import.meta.env.VITE_STORAGE_MODE

const isProduction = MODE === 'production'
const isTest = STORAGE_MODE === 'test' || MODE === 'test'
const isDev = MODE === 'development'

/**
 * 在非生产环境下，所有键加 "dev_" 前缀，确保测试数据不会污染生产环境。
 * 生产环境使用原始键名，保持向后兼容。
 */
const keyPrefix = isProduction ? '' : 'dev_'

const resolvedKey = (key) => keyPrefix + key

/**
 * 测试模式专用：内存存储 Map。
 * 页面刷新后自动清空，实现"每次打开应用数据重置"。
 */
const memoryStore = new Map()

const storage = {
  /**
   * 获取存储项。
   * 测试模式从内存 Map 读取，其他模式从 localStorage 读取。
   */
  getItem(key) {
    if (isTest) {
      const val = memoryStore.get(resolvedKey(key))
      return val !== undefined ? val : null
    }
    try {
      return localStorage.getItem(resolvedKey(key))
    } catch (e) {
      console.error('[storage] getItem failed:', e)
      return null
    }
  },

  /**
   * 写入存储项。
   * 测试模式写入内存 Map，其他模式写入 localStorage。
   */
  setItem(key, value) {
    if (isTest) {
      memoryStore.set(resolvedKey(key), value)
      return
    }
    try {
      localStorage.setItem(resolvedKey(key), value)
    } catch (e) {
      console.error('[storage] setItem failed:', e)
    }
  },

  /**
   * 删除存储项。
   */
  removeItem(key) {
    if (isTest) {
      memoryStore.delete(resolvedKey(key))
      return
    }
    try {
      localStorage.removeItem(resolvedKey(key))
    } catch (e) {
      console.error('[storage] removeItem failed:', e)
    }
  },

  /**
   * 【环境隔离-重置所有应用数据】
   *
   * 生产环境：不执行任何操作（防止误删用户数据）
   * 开发/测试环境：清除所有带当前前缀的 localStorage 键 + 清空内存 Map
   *
   * 这是环境隔离的核心保障：
   *   isProduction → return（生产数据永不被本方法删除）
   *   isTest      → memoryStore.clear()
   *   isDev       → 删除所有 dev_ 前缀的 localStorage 键
   */
  resetAll() {
    if (isProduction) {
      console.warn('[storage] resetAll blocked in production environment')
      return
    }

    memoryStore.clear()

    if (!isTest) {
      try {
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (k && k.startsWith(keyPrefix)) {
            keysToRemove.push(k)
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k))
      } catch (e) {
        console.error('[storage] resetAll failed:', e)
      }
    }
  },

  /**
   * 获取所有存储键（仅当前环境前缀下的键）。
   */
  getAllKeys() {
    if (isTest) {
      return [...memoryStore.keys()]
    }
    try {
      const keys = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith(keyPrefix)) {
          keys.push(k)
        }
      }
      return keys
    } catch (e) {
      return []
    }
  },

  /**
   * 调试：导出当前环境全部存储数据。
   */
  exportData() {
    const data = {}
    if (isTest) {
      memoryStore.forEach((v, k) => { data[k] = v })
    } else {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (k && k.startsWith(keyPrefix)) {
            data[k] = localStorage.getItem(k)
          }
        }
      } catch (e) { /* ignore */ }
    }
    return data
  },

  /** 当前是否为生产环境 */
  isProduction() {
    return isProduction
  },

  /** 当前是否为测试/开发环境 */
  isDevOrTest() {
    return isDev || isTest
  },

  /** 当前环境名称 */
  getEnv() {
    if (isTest) return 'test'
    if (isProduction) return 'production'
    return 'development'
  }
}

export { storage }
