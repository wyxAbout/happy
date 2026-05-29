import { ref } from 'vue'

let audioCtx = null

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

  return { stop: () => { try { osc.stop() } catch (e) { /* already stopped */ } } }
}

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

export function useSound() {
  const soundEnabled = ref(true)

  const playMatch = (comboLevel = 1) => {
    if (!soundEnabled.value) return
    const basePitch = 520 + comboLevel * 80
    playTone(basePitch, 0.12, 'sine', 0.14)
    playTone(basePitch * 1.25, 0.1, 'sine', 0.1, 0.02)
    playNoise(0.08, 0.03, 0.0)
  }

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

  const playSpecialClear = () => {
    if (!soundEnabled.value) return
    playTone(440, 0.08, 'sawtooth', 0.06, 0)
    playTone(554, 0.08, 'sawtooth', 0.06, 0.02)
    playTone(659, 0.08, 'sawtooth', 0.06, 0.04)
    playTone(880, 0.12, 'sawtooth', 0.07, 0.06)
    playNoise(0.12, 0.05, 0.06)
  }

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

  const playGameStart = () => {
    if (!soundEnabled.value) return
    playTone(440, 0.12, 'sine', 0.12, 0)
    playTone(554, 0.12, 'sine', 0.12, 0.08)
    playTone(659, 0.12, 'sine', 0.12, 0.16)
    playTone(880, 0.25, 'sine', 0.15, 0.24)
  }

  const playGameOver = () => {
    if (!soundEnabled.value) return
    playTone(523, 0.2, 'triangle', 0.14, 0)
    playTone(466, 0.2, 'triangle', 0.14, 0.15)
    playTone(415, 0.25, 'triangle', 0.14, 0.3)
    playTone(349, 0.35, 'triangle', 0.12, 0.45)
  }

  const playInvalidMove = () => {
    if (!soundEnabled.value) return
    playNoise(0.15, 0.04, 0)
    playTone(180, 0.12, 'square', 0.04, 0)
  }

  const playSwap = () => {
    if (!soundEnabled.value) return
    playTone(600, 0.06, 'sine', 0.08, 0)
    playTone(500, 0.06, 'sine', 0.08, 0.04)
  }

  const playDrop = () => {
    if (!soundEnabled.value) return
    playTone(300, 0.1, 'sine', 0.05, 0)
  }

  const toggleSound = () => {
    soundEnabled.value = !soundEnabled.value
    return soundEnabled.value
  }

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
