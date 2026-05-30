const API_BASE = 'http://localhost:5022'
const API_TIMEOUT_MS = 8000

export const DEFAULT_USER_ID = 1

const fetchWithTimeout = (url, options = {}) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  return fetch(url, {
    ...options,
    signal: controller.signal,
    headers: {
      'Accept': 'application/json',
      ...(options.headers || {})
    }
  }).finally(() => clearTimeout(timeoutId))
}

const parseResult = async (response) => {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  const result = await response.json()
  if (result.code !== 200) {
    throw new Error(`API Error [${result.code}]: ${result.message || 'Unknown error'}`)
  }
  return result.data
}

export const fetchAllCardTypes = async () => {
  const response = await fetchWithTimeout(`${API_BASE}/api/card-types`)
  return parseResult(response)
}

export const fetchCardTypeById = async (id) => {
  const response = await fetchWithTimeout(`${API_BASE}/api/card-types/${id}`)
  return parseResult(response)
}

export const fetchUserCards = async (userId = DEFAULT_USER_ID) => {
  const response = await fetchWithTimeout(`${API_BASE}/api/user-cards?userId=${userId}`)
  return parseResult(response)
}

export const fetchUserCardById = async (id) => {
  const response = await fetchWithTimeout(`${API_BASE}/api/user-cards/${id}`)
  return parseResult(response)
}

export const saveUserCard = async (userId, cardTypeId, source = 'game_drop') => {
  const response = await fetchWithTimeout(`${API_BASE}/api/user-cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, cardTypeId, source })
  })
  return parseResult(response)
}

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

export const exchangeCards = async (userId, sourceCardTypeId, targetCardTypeId) => {
  const userCards = await fetchUserCards(userId)

  const sourceCards = userCards.filter(uc => uc.cardTypeId === sourceCardTypeId)
  if (sourceCards.length < 4) {
    throw new Error(`卡片数量不足，需要4张，当前${sourceCards.length}张`)
  }

  const deleteIds = sourceCards.slice(0, 4).map(uc => uc.id)
  for (const id of deleteIds) {
    await deleteUserCard(id)
  }

  await saveUserCard(userId, targetCardTypeId, 'exchange')

  return targetCardTypeId
}

export default {
  fetchAllCardTypes,
  fetchCardTypeById,
  fetchUserCards,
  fetchUserCardById,
  saveUserCard,
  deleteUserCard,
  exchangeCards,
  DEFAULT_USER_ID
}
