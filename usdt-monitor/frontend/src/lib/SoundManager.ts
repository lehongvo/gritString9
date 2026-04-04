/* Web Audio API — synthesized sounds, no external files needed */

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

/* Unlock AudioContext — iOS Safari requires playing a silent buffer inside the gesture */
let unlocked = false

function unlockAudio() {
  if (unlocked) return
  unlocked = true
  const c = getCtx()
  // Play a 1-sample silent buffer — required by iOS to fully unlock Web Audio
  const buf = c.createBuffer(1, 1, 22050)
  const src = c.createBufferSource()
  src.buffer = buf
  src.connect(c.destination)
  src.start(0)
  c.resume()
}

export function isAudioUnlocked() { return unlocked }

if (typeof window !== 'undefined') {
  const events = ['touchstart', 'touchend', 'click', 'keydown']
  const handler = () => {
    unlockAudio()
    events.forEach(e => window.removeEventListener(e, handler))
  }
  events.forEach(e => window.addEventListener(e, handler, { passive: true }))
}

function playTone(freq: number, type: OscillatorType, duration: number,
  gainVal: number, fadeOut = true, delay = 0) {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.connect(gain); gain.connect(c.destination)
  osc.type = type; osc.frequency.setValueAtTime(freq, c.currentTime + delay)
  gain.gain.setValueAtTime(0, c.currentTime + delay)
  gain.gain.linearRampToValueAtTime(gainVal, c.currentTime + delay + 0.02)
  if (fadeOut) gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration)
  osc.start(c.currentTime + delay)
  osc.stop(c.currentTime + delay + duration + 0.05)
}

function playNoise(duration: number, gainVal: number, delay = 0) {
  const c = getCtx()
  const bufSize = c.sampleRate * duration
  const buf = c.createBuffer(1, bufSize, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const gain = c.createGain()
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'; filter.frequency.value = 1000; filter.Q.value = 0.5
  src.connect(filter); filter.connect(gain); gain.connect(c.destination)
  gain.gain.setValueAtTime(gainVal, c.currentTime + delay)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration)
  src.start(c.currentTime + delay)
  src.stop(c.currentTime + delay + duration + 0.05)
}

/* ── Tier 1: Coin clink melody (bright, happy) ── */
export function playCashRain() {
  const notes = [523, 659, 784, 1047, 1319]
  notes.forEach((freq, i) => {
    playTone(freq, 'triangle', 0.3, 0.25, true, i * 0.08)
  })
  // coin clink
  for (let i = 0; i < 8; i++) {
    playTone(2000 + Math.random() * 1500, 'sine', 0.15, 0.12, true, i * 0.12)
  }
}

/* ── Tier 2: Whale boom + ascending chime ── */
export function playWhaleAlert() {
  // Deep boom
  playTone(60, 'sine', 0.8, 0.5, true, 0)
  playTone(80, 'triangle', 0.6, 0.35, true, 0.05)
  // Impact noise
  playNoise(0.15, 0.3, 0)
  // Ascending chime
  const chime = [523, 659, 784, 1047, 1319, 1568]
  chime.forEach((f, i) => playTone(f, 'sine', 0.4, 0.2, true, 0.1 + i * 0.07))
  // Echo coins
  for (let i = 0; i < 12; i++) {
    playTone(1500 + Math.random() * 2000, 'sine', 0.2, 0.15, true, 0.3 + Math.random() * 0.8)
  }
}

/* ── Tier 3: Power-up + shockwave + fanfare ── */
export function playMegaWhale() {
  // Heavy bass punch
  playTone(40, 'sawtooth', 1.0, 0.6, true, 0)
  playTone(55, 'sine', 0.8, 0.5, true, 0)
  playNoise(0.25, 0.5, 0)
  // Power-up sweep
  const c = getCtx()
  const osc = c.createOscillator(); const g = c.createGain()
  osc.connect(g); g.connect(c.destination)
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(100, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(2000, c.currentTime + 0.8)
  g.gain.setValueAtTime(0.3, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.9)
  osc.start(c.currentTime); osc.stop(c.currentTime + 1)
  // Fanfare
  const fanfare = [392, 523, 659, 784, 1047, 784, 1047, 1319]
  fanfare.forEach((f, i) => playTone(f, 'square', 0.25, 0.18, true, 0.15 + i * 0.09))
  // Coin shower
  for (let i = 0; i < 20; i++) {
    playTone(1200 + Math.random() * 2500, 'sine', 0.18, 0.13, true, 0.2 + Math.random() * 1.5)
  }
}

/* ── Tier 4: LEGENDARY — full orchestral chaos ── */
export function playLegendary() {
  const c = getCtx()

  // MASSIVE sub bass
  playTone(30, 'sine', 1.5, 0.7, true, 0)
  playTone(40, 'sawtooth', 1.2, 0.55, true, 0)
  playNoise(0.4, 0.7, 0)

  // 3 explosion waves
  ;[0, 0.3, 0.6].forEach(delay => {
    playTone(50, 'sine', 0.8, 0.5, true, delay)
    playNoise(0.2, 0.45, delay)
  })

  // Dramatic sweep up
  ;[0, 0.05, 0.1].forEach(d => {
    const osc2 = c.createOscillator(); const g2 = c.createGain()
    osc2.connect(g2); g2.connect(c.destination)
    osc2.type = 'sawtooth'
    osc2.frequency.setValueAtTime(80 + d * 20, c.currentTime + d)
    osc2.frequency.exponentialRampToValueAtTime(3000, c.currentTime + d + 1.2)
    g2.gain.setValueAtTime(0.35, c.currentTime + d)
    g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d + 1.3)
    osc2.start(c.currentTime + d); osc2.stop(c.currentTime + d + 1.4)
  })

  // Epic fanfare
  const epic = [261, 329, 392, 523, 659, 784, 1047, 784, 659, 784, 1047, 1319, 1047, 1319, 1568]
  epic.forEach((f, i) => playTone(f, 'square', 0.3, 0.22, true, 0.1 + i * 0.07))

  // Coin storm
  for (let i = 0; i < 40; i++) {
    playTone(800 + Math.random() * 3000, 'sine', 0.2, 0.12, true, Math.random() * 3)
  }

  // Victory chord at end
  ;[523, 659, 784, 1047].forEach((f, i) => playTone(f, 'sine', 0.8, 0.25, true, 1.8 + i * 0.01))
}

export function playForAmount(amount: number) {
  const c = getCtx()
  const play = () => {
    try {
      if (amount >= 400_000) playLegendary()
      else if (amount >= 200_000) playMegaWhale()
      else if (amount >= 100_000) playWhaleAlert()
      else playCashRain()
    } catch (e) {
      console.warn('Sound playback failed', e)
    }
  }
  if (c.state === 'running') {
    play()
  } else {
    c.resume().then(play).catch(() => {})
  }
}
