/**
 * 游戏全局常量与配置。
 *
 * <h3>游戏核心参数</h3>
 * <table>
 *   <tr><td>GRID_SIZE = 8</td><td>棋盘 8×8 = 64 格</td></tr>
 *   <tr><td>TILE_TYPES = 6</td><td>默认 6 种砖块类型</td></tr>
 *   <tr><td>MIN_MATCH = 3</td><td>最低消除数量</td></tr>
 *   <tr><td>BASE_SCORE = 10</td><td>单次消除基础分</td></tr>
 *   <tr><td>COMBO_MULTIPLIER = 1.5</td><td>连击倍率</td></tr>
 * </table>
 *
 * <h3>难度阶段</h3>
 * <table>
 *   <tr><td>入门 (Level 1–6)</td><td>32步, 4种砖块</td></tr>
 *   <tr><td>进阶 (Level 7–12)</td><td>28步, 5种砖块</td></tr>
 *   <tr><td>挑战 (Level 13–18)</td><td>24步, 5种砖块</td></tr>
 *   <tr><td>专家 (Level 19–24)</td><td>20步, 6种砖块</td></tr>
 * </table>
 *
 * <h3>DDC 动态难度</h3>
 * 连胜时减步数（高手模式），连败时加步数（助力机制）。
 */

export const MOBILE_BREAKPOINT = 768

/** 棋盘大小：8×8 */
export const GRID_SIZE = 8
/** 默认砖块种类数（自定义图标可替换） */
export const TILE_TYPES = 6
/** 最低消除数 */
export const MIN_MATCH = 3
/** 单次消除基础分 */
export const BASE_SCORE = 10
/** 连击倍率 */
export const COMBO_MULTIPLIER = 1.5
/** 特殊消除额外分倍率 */
export const SPECIAL_CLEAR_SCORE_MULTIPLIER = 2
/** 掉落动画基础延迟(ms) */
export const DROP_BASE_DELAY = 120
/** 每格掉落加速(ms) */
export const DROP_SPEED_PER_CELL = 50
/** 掉落间隔(ms) */
export const DROP_GAP = 6

/** 默认 Emoji 图标集（自定义图标加载失败时的后备方案） */
export const DEFAULT_EMOJIS = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍒']

/** 自定义图标资源目录（前端直接访问） */
export const ICONS_DIR = '/custom-icons'

/** 图片 API 基地址 */
export const IMAGE_API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:5022') + '/api/images'
/** 胜利图片目录 */
export const VICTORY_IMAGES_DIR = '/victory_images'
/** 胜利图片总数（= 卡牌类型数） */
export const VICTORY_IMAGES_COUNT = 24
/** 卡牌类型 API 基地址 */
export const VICTORY_API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:5022') + '/api/card-types'

/** 胜利动画配置 */
export const VICTORY_CONFIG = {
  displayDuration: 2500,   /** 展示时长(ms) */
  fadeInDuration: 400,     /** 淡入时长(ms) */
  fadeOutDuration: 300,    /** 淡出时长(ms) */
  overlayOpacity: 0.85,    /** 遮罩透明度 */
  clickToDismiss: true,    /** 允许点击提前关闭 */
  preloadAll: true         /** 是否预加载全部图片 */
}

/**
 * 关卡持久化存储键定义。
 *
 * <p>localStorage 中的键名，数据在浏览器关闭后依然保留，
 * 这是关卡不会"自动重置"的根本原因。</p>
 */
export const STORAGE_KEYS = {
  GAME_STATE: 'happy-match-game-state',
  HIGH_SCORE: 'happy-match-high-score',
  COMPLETED_LEVELS: 'happy-match-completed-levels'
}

/** 总关卡数 */
export const TOTAL_LEVELS = 24

/** 难度阶段定义 */
export const DIFFICULTY_PHASES = [
  { name: '入门',   levels: [1, 6],  baseMoves: 32, baseTarget: 600,  tileTypes: 4, specialBoost: 0.05 },
  { name: '进阶',   levels: [7, 12], baseMoves: 28, baseTarget: 1200, tileTypes: 5, specialBoost: 0.08 },
  { name: '挑战',   levels: [13, 18], baseMoves: 24, baseTarget: 2000, tileTypes: 5, specialBoost: 0.12 },
  { name: '专家',   levels: [19, 24], baseMoves: 20, baseTarget: 3200, tileTypes: 6, specialBoost: 0.15 }
]

/** 根据关卡号获取对应的难度阶段 */
function getPhaseForLevel(levelNum) {
  for (const phase of DIFFICULTY_PHASES) {
    if (levelNum >= phase.levels[0] && levelNum <= phase.levels[1]) {
      return phase
    }
  }
  return DIFFICULTY_PHASES[DIFFICULTY_PHASES.length - 1]
}

/** DDC（动态难度调整）配置 */
export const DDC_CONFIG = {
  easyThreshold: 2,          /** 连败≥2 → 简单模式 */
  hardThreshold: 3,          /** 连胜≥3 → 高手模式 */
  easyBonusMoves: 2,         /** 简单模式额外步数 */
  easyExtraMoves: 3,         /** 极易模式额外步数 */
  hardPenaltyMoves: 1,       /** 高手模式惩罚步数 */
  easySpecialBoost: 0.20,    /** 简单模式特殊块概率加成 */
  hardSpecialBoost: 0.10,    /** 高手模式特殊块概率加成 */
  streakStorageKey: 'happy-match-ddc-streak'
}

/** 逐关动态生成配置（1→24关难度递增） */
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
