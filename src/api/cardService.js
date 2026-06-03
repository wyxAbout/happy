/**
 * 卡牌服务层 — 封装所有与后端卡牌 API 的交互。
 *
 * <h3>端点映射</h3>
 * <table>
 *   <tr><td>fetchAllCardTypes()</td><td>GET /api/card-types</td></tr>
 *   <tr><td>fetchCardTypeById(id)</td><td>GET /api/card-types/{id}</td></tr>
 *   <tr><td>fetchUserCards(userId)</td><td>GET /api/user-cards?userId=</td></tr>
 *   <tr><td>fetchUserCardById(id)</td><td>GET /api/user-cards/{id}</td></tr>
 *   <tr><td>saveUserCard(...)</td><td>POST /api/user-cards</td></tr>
 *   <tr><td>deleteUserCard(id)</td><td>DELETE /api/user-cards/{id}</td></tr>
 *   <tr><td>resetUserCards(userId)</td><td>DELETE /api/user-cards/user/{userId}/all</td></tr>
 *   <tr><td>exchangeCards(...)</td><td>POST /api/user-cards/exchange</td></tr>
 * </table>
 *
 * <h3>安全</h3>
 * 所有请求自动携带 X-Api-Key（API 认证）和 X-User-Id（用户标识）头。
 *
 * <h3>超时</h3>
 * 默认 8 秒超时，通过 AbortController 实现。
 */

const API_BASE = import.meta.env.VITE_API_BASE !== undefined ? import.meta.env.VITE_API_BASE : 'http://localhost:5022'
const API_TIMEOUT_MS = 8000
const API_KEY = import.meta.env.VITE_API_KEY || 'dev-secret-key-change-in-production'

/** 当前默认用户 ID（单用户模式下固定为 1） */
export const DEFAULT_USER_ID = 1

/**
 * 带超时的 fetch 封装。
 * 自动附加 X-Api-Key、X-User-Id 和 Accept 头，超时后通过 AbortController 取消请求。
 */
const fetchWithTimeout = (url, options = {}) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  return fetch(url, {
    ...options,
    signal: controller.signal,
    headers: {
      'Accept': 'application/json',
      'X-Api-Key': API_KEY,
      'X-User-Id': String(DEFAULT_USER_ID),
      ...(options.headers || {})
    }
  }).finally(() => clearTimeout(timeoutId))
}

/**
 * 统一解析标准 Result 响应体。
 * @throws {Error} HTTP 状态码非 2xx 或 code ≠ 200
 */
const parseResult = async (response) => {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  const result = await response.json()
  if (result.code !== 200) {
    throw new Error(`API Error [${result.code}]: ${result.msg || 'Unknown error'}`)
  }
  return result.data
}

/** 查询所有卡牌类型（后端从 card_types 表读取） */
export const fetchAllCardTypes = async () => {
  const response = await fetchWithTimeout(`${API_BASE}/api/card-types`)
  return parseResult(response)
}

/** 按 ID 查单个卡牌类型 */
export const fetchCardTypeById = async (id) => {
  const response = await fetchWithTimeout(`${API_BASE}/api/card-types/${id}`)
  return parseResult(response)
}

/** 查询用户的卡牌收集记录 */
export const fetchUserCards = async (userId = DEFAULT_USER_ID) => {
  const response = await fetchWithTimeout(`${API_BASE}/api/user-cards?userId=${userId}`)
  return parseResult(response)
}

/** 按主键查单条卡牌记录 */
export const fetchUserCardById = async (id) => {
  const response = await fetchWithTimeout(`${API_BASE}/api/user-cards/${id}`)
  return parseResult(response)
}

/**
 * 新增卡牌（游戏通关掉落时调用）。
 * @param {number} userId
 * @param {number} cardTypeId 卡牌类型 ID (1–24)
 * @param {string} source 来源："game_drop"（默认）| "exchange"
 */
export const saveUserCard = async (userId, cardTypeId, source = 'game_drop') => {
  const response = await fetchWithTimeout(`${API_BASE}/api/user-cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, cardTypeId, source })
  })
  return parseResult(response)
}

/** 按主键删除单张卡牌 */
export const deleteUserCard = async (id) => {
  const response = await fetchWithTimeout(`${API_BASE}/api/user-cards/${id}`, {
    method: 'DELETE'
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  const result = await response.json()
  if (result.code !== 200) {
    throw new Error(`API Error [${result.code}]`)
  }
}

/**
 * 图鉴重置：删除用户所有卡牌记录。
 * @returns {Promise<number>} 被删除的卡牌数量
 */
export const resetUserCards = async (userId = DEFAULT_USER_ID) => {
  const response = await fetchWithTimeout(
    `${API_BASE}/api/user-cards/user/${userId}/all`,
    { method: 'DELETE' }
  )
  const result = await response.json()
  if (result.code !== 200) {
    throw new Error(`API Error [${result.code}]`)
  }
  return result.data
}

/**
 * 图片兑换：消耗 4 张相同卡牌 → 获得 1 张目标卡牌。
 *
 * <p>单次 HTTP 请求，后端 @Transactional 保证原子性。
 * 相比旧版 N+1 次调用，性能与可靠性大幅提升。</p>
 *
 * @param {number} userId
 * @param {number} sourceCardTypeId 消耗的卡牌类型（需 ≥4 张）
 * @param {number} targetCardTypeId 目标卡牌类型（可为未解锁）
 * @returns {Promise<object>} { id, userId, cardTypeId, source, obtainedTime }
 */
export const exchangeCards = async (userId, sourceCardTypeId, targetCardTypeId) => {
  const response = await fetchWithTimeout(`${API_BASE}/api/user-cards/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, sourceCardTypeId, targetCardTypeId })
  })
  if (!response.ok) {
    const errorBody = await response.text()
    let msg = `HTTP ${response.status}`
    try {
      const parsed = JSON.parse(errorBody)
      msg = parsed.msg || parsed.message || parsed.detail || msg
    } catch (_) { /* use raw */ }
    throw new Error(msg)
  }
  return parseResult(response)
}

export default {
  fetchAllCardTypes,
  fetchCardTypeById,
  fetchUserCards,
  fetchUserCardById,
  saveUserCard,
  deleteUserCard,
  resetUserCards,
  exchangeCards,
  DEFAULT_USER_ID
}
