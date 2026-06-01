/**
 * useSound.js — 游戏音效系统（Web Audio API）
 *
 * 【功能概述】
 * 基于浏览器原生 Web Audio API 实现纯程序化音效，无需加载任何外部音频文件。
 * 通过振荡器（OscillatorNode）生成不同频率/波形的声音，配合增益节点（GainNode）
 * 模拟消除、连击、特殊消除、胜利、失败等游戏事件音效。
 *
 * 【技术栈】
 * - Web Audio API（AudioContext, OscillatorNode, GainNode, AudioBufferSourceNode）
 * - 零依赖，所有声音实时合成
 *
 * 【架构特点】
 * - 懒初始化 AudioContext：首次用户交互时才创建，避免浏览器自动播放策略限制
 * - soundEnabled ref：全局静音开关，所有音效函数内部首先检查此标志
 * - 音效短暂（<1秒），无需管理 AudioContext 生命周期
 *
 * 【使用示例】
 *   import { useSound } from './composables/useSound'
 *   const { playMatch, playCombo, toggleSound } = useSound()
 *   playMatch(1)       // 普通消除音效
 *   playCombo(3)       // 3连击音效
 *   toggleSound()      // 切换静音
 *
 * 【注意事项】
 * - iOS Safari 要求 AudioContext 必须在用户手势中创建/resume，ensureContext() 用于此目的
 * - AudioContext 数量有限制（通常 ~6 个），本模块复用单例避免超限
 * - playTone/playNoise 创建的对象在 stop() 后自动被 GC 回收
 */

import { ref } from 'vue'

/**
 * 全局 AudioContext 单例
 * 懒初始化：首次调用 getAudioContext() 时创建，避免浏览器自动播放策略拦截
 * @type {AudioContext|null}
 */
let audioCtx = null

/**
 * 获取或创建 AudioContext 单例
 *
 * 自动处理 suspended 状态（iOS Safari 常见问题）：
 * - 首次创建时如果状态为 suspended，调用 resume()
 * - 后续每次获取时再次检查并 resume()
 *
 * @returns {AudioContext} 可用的音频上下文实例
 *
 * 【调用时机】
 * - 任何 play*() 函数被调用前（通过 ensureContext()）
 * - 首次用户交互时（如点击方块）
 *
 * 【AutoPlay 策略兼容】
 * 现代浏览器（Chrome 66+, Safari 11+）禁止无用户手势的自动播放。
 * 解决方案：在用户第一次点击/触摸时调用 ensureContext() 来 resume AudioContext。
 */
const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

/**
 * 播放单音调声音
 *
 * 使用 OscillatorNode 生成指定频率的正弦波（或其他波形），
 * 通过 GainNode 控制音量衰减（指数衰减到接近零）。
 *
 * @param {number}  frequency - 声音频率（Hz），如 440=A4, 523=C5
 * @param {number}  duration  - 声音持续时间（秒）
 * @param {string}  [type='sine'] - 波形类型：'sine'|'square'|'sawtooth'|'triangle'
 * @param {number}  [volume=0.15] - 初始音量（0~1），过大会失真
 * @param {number}  [startTime=0] - 延迟启动时间（秒），用于编排多音符和弦
 * @returns {{ stop: Function }} 包含 stop() 方法的对象，可提前终止声音
 *
 * 【波形特性】
 * - 'sine':      纯净单音，用于常规消除音效
 * - 'triangle':  柔和泛音，用于胜利旋律
 * - 'sawtooth':  丰富泛音，用于特殊消除音效
 * - 'square':    复古电子音，用于无效操作提示
 *
 * 【音量衰减曲线】
 * exponentialRampToValueAtTime(0.001, ...) 产生自然的渐弱效果，
 * 不能衰减到 0（指数函数特性），0.001 ≈ 静音。
 */
const playTone = (frequency, duration, type = 'sine', volume = 0.15, startTime = 0) => {
  const ctx = getAudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = type
  osc.frequency.value = frequency
  gain.gain.setValueAtTime(volume, ctx.currentTime + startTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(ctx.currentTime + startTime)
  osc.stop(ctx.currentTime + startTime + duration)

  return { stop: () => { try { osc.stop() } catch (e) { /* 已停止，忽略 */ } } }
}

/**
 * 播放白噪声
 *
 * 使用 AudioBufferSourceNode 生成随机噪声样本，
 * 通过 GainNode 控制音量和衰减。噪声经过包络处理（随时间减弱）。
 *
 * @param {number} duration  - 持续时间（秒）
 * @param {number} [volume=0.06] - 初始音量（建议很小，噪声容易刺耳）
 * @param {number} [startTime=0] - 延迟启动时间（秒）
 *
 * 【噪声生成算法】
 * Math.random() 生成 [-1, 1] 随机值，乘以 Math.pow(1-i/bufferSize, 2)
 * 实现二次衰减包络 —— 噪声随时间逐渐变小，听起来更自然。
 *
 * 【用途】
 * - 消除音效的"沙沙"质感补充
 * - 无效操作的"嗡嗡"提示音
 * - 特殊消除的低频轰鸣感
 */
const playNoise = (duration, volume = 0.06, startTime = 0) => {
  const ctx = getAudioContext()
  const bufferSize = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2)
  }

  const source = ctx.createBufferSource()
  const gain = ctx.createGain()

  source.buffer = buffer
  gain.gain.setValueAtTime(volume, ctx.currentTime + startTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration)

  source.connect(gain)
  gain.connect(ctx.destination)

  source.start(ctx.currentTime + startTime)
  source.stop(ctx.currentTime + startTime + duration)
}

/**
 * useSound — 游戏音效 Composable
 *
 * Vue 3 Composable，封装所有游戏音效逻辑。
 * 返回一组音效播放函数和静音控制。
 *
 * @returns {Object} 音效控制对象
 * @returns {import('vue').Ref<boolean>} soundEnabled - 是否启用音效（双向绑定）
 * @returns {Function} playMatch       - 播放消除音效，参数 comboLevel: number（连击等级，影响音高）
 * @returns {Function} playCombo       - 播放连击音效（多音符上行和弦）
 * @returns {Function} playSpecialClear     - 播放特殊消除音效（锯齿波上下行）
 * @returns {Function} playDoubleSpecialClear - 播放双重特殊消除（更丰富的和弦）
 * @returns {Function} playVictory     - 播放胜利旋律（完整乐句）
 * @returns {Function} playGameStart   - 播放游戏开始音效
 * @returns {Function} playGameOver    - 播放游戏结束旋律（下行悲伤）
 * @returns {Function} playInvalidMove - 播放无效操作提示
 * @returns {Function} playSwap        - 播放交换音效
 * @returns {Function} playDrop        - 播放下落音效
 * @returns {Function} toggleSound     - 切换静音状态，返回新的 soundEnabled 值
 * @returns {Function} ensureContext   - 确保 AudioContext 可用（用于首次用户交互）
 *
 * 【使用示例】
 *   const { playMatch, toggleSound, soundEnabled } = useSound()
 *   // 在消除匹配时
 *   playMatch(1)
 *   // 切换静音
 *   const isOn = toggleSound() // false → 已静音
 */
export function useSound() {
  const soundEnabled = ref(true)

  /**
   * 播放消除音效
   * 基频 520Hz + 连击等级偏移，产生"叮"的清脆感
   * @param {number} [comboLevel=1] - 连击等级，每级升高 80Hz（约 1.5 个半音）
   */
  const playMatch = (comboLevel = 1) => {
    if (!soundEnabled.value) return
    const basePitch = 520 + comboLevel * 80
    playTone(basePitch, 0.12, 'sine', 0.14)
    playTone(basePitch * 1.25, 0.1, 'sine', 0.1, 0.02)
    playNoise(0.08, 0.03, 0.0)
  }

  /**
   * 播放连击音效
   * 上行大三和弦序列，连击越高音越高、和弦越丰富
   * @param {number} comboLevel - 连击等级（≥2）
   */
  const playCombo = (comboLevel) => {
    if (!soundEnabled.value) return
    const pitches = [523, 659, 784, 880, 1047, 1175]
    const idx = Math.min(comboLevel - 2, pitches.length - 1)
    const base = pitches[idx]

    playTone(base, 0.2, 'triangle', 0.16, 0)
    playTone(base * 1.5, 0.15, 'triangle', 0.12, 0.04)
    playTone(base * 2, 0.12, 'sine', 0.08, 0.08)
    playNoise(0.1, 0.04, 0)
  }

  /**
   * 播放特殊消除音效（整行/整列/炸弹）
   * 锯齿波快速上行，营造"能量释放"感
   */
  const playSpecialClear = () => {
    if (!soundEnabled.value) return
    playTone(440, 0.08, 'sawtooth', 0.06, 0)
    playTone(554, 0.08, 'sawtooth', 0.06, 0.02)
    playTone(659, 0.08, 'sawtooth', 0.06, 0.04)
    playTone(880, 0.12, 'sawtooth', 0.07, 0.06)
    playNoise(0.12, 0.05, 0.06)
  }

  /**
   * 播放双重特殊消除音效
   * 更长的锯齿波序列 + 高音正弦波收尾，营造史诗感
   */
  const playDoubleSpecialClear = () => {
    if (!soundEnabled.value) return
    playTone(330, 0.1, 'sawtooth', 0.07, 0)
    playTone(415, 0.1, 'sawtooth', 0.07, 0.02)
    playTone(554, 0.1, 'sawtooth', 0.07, 0.04)
    playTone(659, 0.1, 'sawtooth', 0.08, 0.06)
    playTone(880, 0.15, 'sine', 0.1, 0.08)
    playTone(1047, 0.2, 'sine', 0.12, 0.1)
    playNoise(0.15, 0.06, 0.06)
  }

  /**
   * 播放胜利旋律
   * C5→E5→G5→C6 上行大三和弦 + 微调频率产生和声厚度（chorus 效果）
   */
  const playVictory = () => {
    if (!soundEnabled.value) return
    const melody = [
      { f: 523, d: 0.15, delay: 0 },
      { f: 659, d: 0.15, delay: 0.12 },
      { f: 784, d: 0.15, delay: 0.24 },
      { f: 1047, d: 0.35, delay: 0.36 },
      { f: 784, d: 0.12, delay: 0.55 },
      { f: 1047, d: 0.5, delay: 0.65 },
    ]
    melody.forEach(note => {
      playTone(note.f, note.d, 'triangle', 0.16, note.delay)
      playTone(note.f * 1.002, note.d, 'triangle', 0.08, note.delay + 0.01)
    })
  }

  /**
   * 播放游戏开始音效
   * A4→C#5→E5→A5 上行，营造期待感
   */
  const playGameStart = () => {
    if (!soundEnabled.value) return
    playTone(440, 0.12, 'sine', 0.12, 0)
    playTone(554, 0.12, 'sine', 0.12, 0.08)
    playTone(659, 0.12, 'sine', 0.12, 0.16)
    playTone(880, 0.25, 'sine', 0.15, 0.24)
  }

  /**
   * 播放游戏结束音效
   * C5→Bb4→Ab4→F4 下行，营造失落感
   */
  const playGameOver = () => {
    if (!soundEnabled.value) return
    playTone(523, 0.2, 'triangle', 0.14, 0)
    playTone(466, 0.2, 'triangle', 0.14, 0.15)
    playTone(415, 0.25, 'triangle', 0.14, 0.3)
    playTone(349, 0.35, 'triangle', 0.12, 0.45)
  }

  /**
   * 播放无效操作提示音
   * 短噪声 + 低频方波 = "嗡嗡"的否定音效
   */
  const playInvalidMove = () => {
    if (!soundEnabled.value) return
    playNoise(0.15, 0.04, 0)
    playTone(180, 0.12, 'square', 0.04, 0)
  }

  /**
   * 播放交换音效
   * 两个短促正弦波：先高后低 = "唰"的交换感
   */
  const playSwap = () => {
    if (!soundEnabled.value) return
    playTone(600, 0.06, 'sine', 0.08, 0)
    playTone(500, 0.06, 'sine', 0.08, 0.04)
  }

  /**
   * 播放下落音效
   * 低频短促音 = 方块落地的"咚"感
   */
  const playDrop = () => {
    if (!soundEnabled.value) return
    playTone(300, 0.1, 'sine', 0.05, 0)
  }

  /**
   * 切换静音状态
   * 翻转 soundEnabled ref 的值
   * @returns {boolean} 切换后的状态（true=有声, false=静音）
   */
  const toggleSound = () => {
    soundEnabled.value = !soundEnabled.value
    return soundEnabled.value
  }

  /**
   * 确保 AudioContext 可用
   * 应在首次用户交互（点击/触摸）时调用，触发浏览器的用户手势检测
   */
  const ensureContext = () => {
    getAudioContext()
  }

  return {
    soundEnabled,
    playMatch,
    playCombo,
    playSpecialClear,
    playDoubleSpecialClear,
    playVictory,
    playGameStart,
    playGameOver,
    playInvalidMove,
    playSwap,
    playDrop,
    toggleSound,
    ensureContext
  }
}
