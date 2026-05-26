export const MOBILE_BREAKPOINT = 768

export const GRID_SIZE = 8
export const TILE_TYPES = 6
export const MIN_MATCH = 3
export const BASE_SCORE = 10
export const COMBO_MULTIPLIER = 1.5
export const SPECIAL_CLEAR_SCORE_MULTIPLIER = 2
export const DROP_BASE_DELAY = 120
export const DROP_SPEED_PER_CELL = 50
export const DROP_GAP = 6

export const DEFAULT_EMOJIS = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍒']

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

export const DIFFICULTY_PHASES = [
  { name: '入门',   levels: [1, 6],  baseMoves: 32, baseTarget: 600,  tileTypes: 4, specialBoost: 0.05 },
  { name: '进阶',   levels: [7, 12], baseMoves: 28, baseTarget: 1200, tileTypes: 5, specialBoost: 0.08 },
  { name: '挑战',   levels: [13, 18], baseMoves: 24, baseTarget: 2000, tileTypes: 5, specialBoost: 0.12 },
  { name: '专家',   levels: [19, 24], baseMoves: 20, baseTarget: 3200, tileTypes: 6, specialBoost: 0.15 }
]

function getPhaseForLevel(levelNum) {
  for (const phase of DIFFICULTY_PHASES) {
    if (levelNum >= phase.levels[0] && levelNum <= phase.levels[1]) {
      return phase
    }
  }
  return DIFFICULTY_PHASES[DIFFICULTY_PHASES.length - 1]
}

export const DDC_CONFIG = {
  easyThreshold: 2,
  hardThreshold: 3,
  easyBonusMoves: 2,
  easyExtraMoves: 3,
  hardPenaltyMoves: 1,
  easySpecialBoost: 0.20,
  hardSpecialBoost: 0.10,
  streakStorageKey: 'happy-match-ddc-streak'
}

export const LEVEL_CONFIG = {}
for (let i = 1; i <= TOTAL_LEVELS; i++) {
  const phase = getPhaseForLevel(i)
  const phaseStart = phase.levels[0]
  const phaseEnd = phase.levels[1]
  const progress = (i - phaseStart) / (phaseEnd - phaseStart)

  const moveDecay = 1 - progress * 0.5
  const moves = Math.round(phase.baseMoves * moveDecay)

  const target = i * 500

  LEVEL_CONFIG[i] = {
    startScore: (i - 1) * 500,
    target,
    moves,
    tileTypes: phase.tileTypes,
    specialBoost: phase.specialBoost * (1 + progress * 0.5),
    phase: phase.name
  }
}