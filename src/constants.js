export const GRID_SIZE = 8
export const TILE_TYPES = 6
export const MIN_MATCH = 3
export const BASE_SCORE = 10
export const COMBO_MULTIPLIER = 1.5

export const DEFAULT_EMOJIS = []

export const FALLBACK_EMOJIS = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍒']



export const ICONS_DIR = '/custom-icons'

export const VICTORY_IMAGES_DIR = '/victory_images'
export const VICTORY_IMAGES_COUNT = 24
export const VICTORY_CONFIG = {
  displayDuration: 2500,
  fadeInDuration: 400,
  fadeOutDuration: 300,
  overlayOpacity: 0.85,
  clickToDismiss: true,
  preloadAll: true
}

export const STORAGE_KEYS = {
  GAME_STATE: 'happy-match-game-state',
  HIGH_SCORE: 'happy-match-high-score',
  COMPLETED_LEVELS: 'happy-match-completed-levels'
}

export const TOTAL_LEVELS = 24

export const LEVEL_CONFIG = {}
for (let i = 1; i <= TOTAL_LEVELS; i++) {
  LEVEL_CONFIG[i] = {
    startScore: (i - 1) * 1000,
    target: i * 1000,
    moves: Math.max(12, 30 - (i - 1) * 1)
  }
}