'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type Props = { amount: number; onDone: () => void }

/* ── Tier config ── */
type Tier = {
  level: 1 | 2 | 3 | 4
  label: string
  sub: string
  color: string
  glow: string
  duration: number
  count: number
}

function getTier(amount: number): Tier {
  if (amount >= 100_000) return {
    level: 4, label: '💀 LEGENDARY', sub: 'MEGA WHALE',
    color: '#ff2200', glow: 'rgba(255,34,0,0.95)',
    duration: 6000, count: 400,
  }
  if (amount >= 50_000) return {
    level: 3, label: '🔥 MEGA WHALE', sub: 'INSANE TX',
    color: '#ff8800', glow: 'rgba(255,136,0,0.95)',
    duration: 5000, count: 260,
  }
  if (amount >= 10_000) return {
    level: 2, label: '🐳 WHALE ALERT', sub: 'BIG MOVE',
    color: '#ffd700', glow: 'rgba(255,215,0,0.95)',
    duration: 4500, count: 180,
  }
  return {
    level: 1, label: '💰 CASH RAIN', sub: 'NICE TX',
    color: '#22c55e', glow: 'rgba(34,197,94,0.9)',
    duration: 3500, count: 100,
  }
}

/* ── Shared coin mesh builder ── */
function makeCoin(colors: number[], withEdge = true) {
  const col = colors[Math.floor(Math.random() * colors.length)]
  const dark = new THREE.Color(col).multiplyScalar(0.5).getHex()
  const group = new THREE.Group()

  const face = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.38, 0.09, 20),
    new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.4, metalness: 0.95, roughness: 0.1 })
  )
  group.add(face)

  if (withEdge) {
    const edge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.40, 0.40, 0.09, 20, 1, true),
      new THREE.MeshStandardMaterial({ color: dark, metalness: 0.9, roughness: 0.2 })
    )
    group.add(edge)
  }
  return group
}

/* ── Dispose helpers ── */
function disposeMesh(obj: THREE.Object3D) {
  obj.traverse(child => {
    const mesh = child as THREE.Mesh
    if (mesh.isMesh) {
      mesh.geometry?.dispose()
      if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose())
      else (mesh.material as THREE.Material)?.dispose()
    }
  })
}

/* ────────────────────────────────────────────
   TIER 1 — Cash Rain (coins fall from top)
──────────────────────────────────────────── */
function animateTier1(scene: THREE.Scene, renderer: THREE.WebGLRenderer,
  camera: THREE.Camera, duration: number, count: number, onDone: () => void) {

  const palette = [0x22c55e, 0x4ade80, 0x86efac, 0x16a34a]
  const coins: { group: THREE.Group; vel: THREE.Vector3; spin: THREE.Vector3}[] = []

  for (let i = 0; i < count; i++) {
    const g = makeCoin(palette)
    g.position.set((Math.random() - 0.5) * 30, 14 + Math.random() * 12, (Math.random() - 0.5) * 8)
    g.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)
    scene.add(g)
    coins.push({
      group: g,
      vel: new THREE.Vector3((Math.random() - 0.5) * 2, -(4 + Math.random() * 8), 0),
      spin: new THREE.Vector3((Math.random() - 0.5) * 0.2, Math.random() * 0.4, (Math.random() - 0.5) * 0.15),
    })
  }

  const gravity = new THREE.Vector3(0, -6, 0)
  const start = performance.now()
  let raf: number

  const tick = () => {
    raf = requestAnimationFrame(tick)
    const elapsed = performance.now() - start
    const t = elapsed / duration
    const dt = 0.016

    coins.forEach(({ group, vel, spin }) => {
      vel.addScaledVector(gravity, dt)
      group.position.addScaledVector(vel, dt)
      group.rotation.x += spin.x
      group.rotation.y += spin.y
      group.rotation.z += spin.z
      if (t > 0.65) {
        const fade = Math.max(0, 1 - (t - 0.65) / 0.35)
        group.children.forEach(c => {
          const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial
          m.transparent = true; m.opacity = fade
        })
      }
    })
    renderer.render(scene, camera)
    if (elapsed >= duration) { cancelAnimationFrame(raf); coins.forEach(c => disposeMesh(c.group)); onDone() }
  }
  tick()
  return () => cancelAnimationFrame(raf)
}

/* ────────────────────────────────────────────
   TIER 2 — Whale Explosion (center burst)
──────────────────────────────────────────── */
function animateTier2(scene: THREE.Scene, renderer: THREE.WebGLRenderer,
  camera: THREE.Camera, duration: number, count: number, onDone: () => void) {

  const palette = [0xffd700, 0xffa500, 0xffe566, 0xffb800]
  const coins: { group: THREE.Group; vel: THREE.Vector3; spin: THREE.Vector3; phase: number }[] = []

  for (let i = 0; i < count; i++) {
    const g = makeCoin(palette)
    g.position.set((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2)
    g.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI * 0.45
    const spd = 12 + Math.random() * 16
    scene.add(g)
    coins.push({
      group: g,
      vel: new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * spd,
        Math.cos(phi) * spd * (0.6 + Math.random() * 0.8),
        Math.sin(phi) * Math.sin(theta) * spd * 0.5,
      ),
      spin: new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.3),
      phase: Math.random() * Math.PI * 2,
    })
  }

  // Sparkle points
  const pts = new Float32Array(500 * 3)
  for (let i = 0; i < 500; i++) {
    pts[i*3] = (Math.random()-0.5)*60; pts[i*3+1] = (Math.random()-0.5)*60; pts[i*3+2] = (Math.random()-0.5)*30
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pts, 3))
  const sm = new THREE.PointsMaterial({ color: 0xffd700, size: 0.12, transparent: true, opacity: 0.7 })
  const stars = new THREE.Points(sg, sm); scene.add(stars)

  const gravity = new THREE.Vector3(0, -20, 0)
  const start = performance.now(); let raf: number

  const tick = () => {
    raf = requestAnimationFrame(tick)
    const elapsed = performance.now() - start
    const t = elapsed / duration; const dt = 0.016
    coins.forEach(({ group, vel, spin, phase }) => {
      vel.addScaledVector(gravity, dt)
      group.position.addScaledVector(vel, dt)
      group.rotation.x += spin.x; group.rotation.y += spin.y + Math.sin(elapsed*0.003+phase)*0.01; group.rotation.z += spin.z
      if (t > 0.6) {
        const fade = Math.max(0, 1-(t-0.6)/0.4)
        group.children.forEach(c => { const m=(c as THREE.Mesh).material as THREE.MeshStandardMaterial; m.transparent=true; m.opacity=fade })
      }
    })
    stars.rotation.z += 0.003; stars.rotation.y += 0.001
    renderer.render(scene, camera)
    if (elapsed >= duration) { cancelAnimationFrame(raf); coins.forEach(c => disposeMesh(c.group)); sg.dispose(); sm.dispose(); onDone() }
  }
  tick()
  return () => cancelAnimationFrame(raf)
}

/* ────────────────────────────────────────────
   TIER 3 — Vortex + Shockwave Rings
──────────────────────────────────────────── */
function animateTier3(scene: THREE.Scene, renderer: THREE.WebGLRenderer,
  camera: THREE.Camera, duration: number, count: number, onDone: () => void) {

  const palette = [0xff8800, 0xff4400, 0xffd700, 0xff6600]

  // Spiral coins
  const coins: { group: THREE.Group; angle: number; radius: number; height: number; speed: number; fallSpd: number }[] = []
  for (let i = 0; i < count; i++) {
    const g = makeCoin(palette)
    const angle = (i / count) * Math.PI * 2 * 6 + Math.random() * 0.5
    const radius = 0.5 + Math.random() * 3
    g.position.set(Math.cos(angle)*radius, -8 + Math.random()*2, Math.sin(angle)*radius*0.4)
    g.rotation.set(Math.random()*Math.PI*2, Math.random()*Math.PI*2, Math.random()*Math.PI*2)
    scene.add(g)
    coins.push({ group: g, angle, radius, height: -8+Math.random()*2, speed: 2+Math.random()*3, fallSpd: 0 })
  }

  // Expanding rings
  const rings: { mesh: THREE.Mesh; scale: number; speed: number; mat: THREE.MeshBasicMaterial }[] = []
  for (let i = 0; i < 5; i++) {
    const rg = new THREE.TorusGeometry(1, 0.05, 8, 64)
    const rm = new THREE.MeshBasicMaterial({ color: i%2===0 ? 0xff8800 : 0xffd700, transparent: true, opacity: 0.8 })
    const mesh = new THREE.Mesh(rg, rm)
    mesh.rotation.x = Math.PI / 2
    mesh.position.y = -2
    const delay = i * 0.4
    mesh.userData.delay = delay
    scene.add(mesh)
    rings.push({ mesh, scale: 0, speed: 3+i*0.5, mat: rm })
  }

  const gravity = new THREE.Vector3(0, -18, 0)
  const start = performance.now(); let raf: number; let unleashed = false
  const vels: THREE.Vector3[] = coins.map(() => new THREE.Vector3())

  const tick = () => {
    raf = requestAnimationFrame(tick)
    const elapsed = performance.now() - start
    const t = elapsed / duration; const dt = 0.016

    // Phase 1: spiral up
    if (t < 0.35) {
      coins.forEach(({ group, angle, radius, speed }, i) => {
        coins[i].angle += dt * speed
        coins[i].height += dt * 12
        group.position.x = Math.cos(coins[i].angle) * radius
        group.position.z = Math.sin(coins[i].angle) * radius * 0.4
        group.position.y = coins[i].height
        group.rotation.y += 0.15
      })
    } else {
      // Phase 2: explode outward
      if (!unleashed) {
        unleashed = true
        coins.forEach(({ group }, i) => {
          const theta = Math.random() * Math.PI * 2
          const phi = Math.random() * Math.PI * 0.5
          const spd = 14 + Math.random() * 14
          vels[i].set(Math.sin(phi)*Math.cos(theta)*spd, Math.cos(phi)*spd, Math.sin(phi)*Math.sin(theta)*spd*0.5)
        })
      }
      coins.forEach(({ group }, i) => {
        vels[i].addScaledVector(gravity, dt)
        group.position.addScaledVector(vels[i], dt)
        group.rotation.y += 0.2; group.rotation.x += 0.1
      })
    }

    // Rings expand
    rings.forEach(({ mesh, mat, speed }, i) => {
      const delay = mesh.userData.delay as number
      const ringT = Math.max(0, (t * duration/1000 - delay) / (duration/1000))
      if (ringT > 0) {
        const s = 1 + ringT * speed * 8
        mesh.scale.setScalar(s)
        mat.opacity = Math.max(0, 0.8 - ringT * 1.2)
      }
    })

    if (t > 0.65) {
      const fade = Math.max(0, 1-(t-0.65)/0.35)
      coins.forEach(({ group }) => {
        group.children.forEach(c => { const m=(c as THREE.Mesh).material as THREE.MeshStandardMaterial; m.transparent=true; m.opacity=fade })
      })
    }

    renderer.render(scene, camera)
    if (elapsed >= duration) {
      cancelAnimationFrame(raf)
      coins.forEach(c => disposeMesh(c.group))
      rings.forEach(({ mesh, mat }) => { mesh.geometry.dispose(); mat.dispose() })
      onDone()
    }
  }
  tick()
  return () => cancelAnimationFrame(raf)
}

/* ────────────────────────────────────────────
   TIER 4 — Legendary Multi-Wave Chaos
──────────────────────────────────────────── */
function animateTier4(scene: THREE.Scene, renderer: THREE.WebGLRenderer,
  camera: THREE.Camera, duration: number, count: number, onDone: () => void) {

  const palette = [0xff2200, 0xff6600, 0xffd700, 0xff4400, 0xffaa00, 0xffffff]

  type CoinData = { group: THREE.Group; vel: THREE.Vector3; spin: THREE.Vector3; wave: number }
  const coins: CoinData[] = []

  // 3 waves at different times
  for (let w = 0; w < 3; w++) {
    const wCount = Math.floor(count / 3)
    for (let i = 0; i < wCount; i++) {
      const g = makeCoin(palette)
      g.position.set((Math.random()-0.5)*4, (Math.random()-0.5)*4, (Math.random()-0.5)*4)
      g.rotation.set(Math.random()*Math.PI*2, Math.random()*Math.PI*2, Math.random()*Math.PI*2)
      g.visible = false
      scene.add(g)
      const theta = Math.random()*Math.PI*2
      const phi = (Math.random()-0.5)*Math.PI
      const spd = 14+Math.random()*18
      coins.push({
        group: g,
        vel: new THREE.Vector3(Math.cos(theta)*Math.cos(phi)*spd, Math.sin(phi)*spd, Math.sin(theta)*Math.cos(phi)*spd),
        spin: new THREE.Vector3((Math.random()-0.5)*0.4, (Math.random()-0.5)*0.5, (Math.random()-0.5)*0.4),
        wave: w,
      })
    }
  }

  // Expanding sphere shockwaves
  const waves: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; triggerT: number }[] = []
  for (let i = 0; i < 6; i++) {
    const sg = new THREE.SphereGeometry(1, 16, 12)
    const sm = new THREE.MeshBasicMaterial({
      color: i%3===0 ? 0xff2200 : i%3===1 ? 0xffd700 : 0xff6600,
      wireframe: true, transparent: true, opacity: 0.6,
    })
    const m = new THREE.Mesh(sg, sm); scene.add(m)
    waves.push({ mesh: m, mat: sm, triggerT: i * 0.12 })
  }

  // Big sparkles
  const pts = new Float32Array(800*3)
  for (let i = 0; i < 800; i++) {
    pts[i*3]=(Math.random()-0.5)*80; pts[i*3+1]=(Math.random()-0.5)*80; pts[i*3+2]=(Math.random()-0.5)*40
  }
  const sg2 = new THREE.BufferGeometry(); sg2.setAttribute('position', new THREE.BufferAttribute(pts, 3))
  const sm2 = new THREE.PointsMaterial({ color: 0xffd700, size: 0.18, transparent: true, opacity: 0.8 })
  const stars = new THREE.Points(sg2, sm2); scene.add(stars)

  const gravity = new THREE.Vector3(0, -22, 0)
  const waveTriggers = [0, 0.18, 0.36]
  const waveActive = [false, false, false]
  const start = performance.now(); let raf: number

  const tick = () => {
    raf = requestAnimationFrame(tick)
    const elapsed = performance.now() - start
    const t = elapsed / duration; const dt = 0.016

    // Trigger waves
    waveTriggers.forEach((wt, wi) => {
      if (t >= wt && !waveActive[wi]) {
        waveActive[wi] = true
        coins.filter(c => c.wave === wi).forEach(c => { c.group.visible = true })
      }
    })

    coins.forEach(({ group, vel, spin, wave }) => {
      if (!group.visible) return
      vel.addScaledVector(gravity, dt)
      group.position.addScaledVector(vel, dt)
      group.rotation.x += spin.x; group.rotation.y += spin.y; group.rotation.z += spin.z
    })

    waves.forEach(({ mesh, mat, triggerT }) => {
      if (t >= triggerT) {
        const wt = (t - triggerT) / (1 - triggerT)
        mesh.scale.setScalar(1 + wt * 25)
        mat.opacity = Math.max(0, 0.6 - wt * 0.65)
      }
    })

    if (t > 0.6) {
      const fade = Math.max(0, 1-(t-0.6)/0.4)
      coins.forEach(({ group }) => {
        group.children.forEach(c => { const m=(c as THREE.Mesh).material as THREE.MeshStandardMaterial; m.transparent=true; m.opacity=fade })
      })
    }

    stars.rotation.z += 0.005; stars.rotation.x += 0.002
    renderer.render(scene, camera)

    if (elapsed >= duration) {
      cancelAnimationFrame(raf)
      coins.forEach(c => disposeMesh(c.group))
      waves.forEach(({ mesh, mat }) => { mesh.geometry.dispose(); mat.dispose() })
      sg2.dispose(); sm2.dispose()
      onDone()
    }
  }
  tick()
  return () => cancelAnimationFrame(raf)
}

/* ────────────────────────────────────────────
   Main component
──────────────────────────────────────────── */
export function WhaleExplosion({ amount, onDone }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const tier = getTier(amount)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200)
    camera.position.set(0, 2, 20); camera.lookAt(0, 0, 0)

    // Lights (all tiers)
    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const key = new THREE.PointLight(new THREE.Color(tier.color).getHex(), 6, 70)
    key.position.set(0, 8, 10); scene.add(key)
    scene.add(new THREE.PointLight(0xffffff, 2, 40).position.set(-8,-4,12) && new THREE.PointLight(0xffffff, 2, 40))
    const rim = new THREE.PointLight(new THREE.Color(tier.color).getHex(), 3, 50)
    rim.position.set(8, 10, -5); scene.add(rim)

    let stop: () => void

    if (tier.level === 1) stop = animateTier1(scene, renderer, camera, tier.duration, tier.count, onDone)
    else if (tier.level === 2) stop = animateTier2(scene, renderer, camera, tier.duration, tier.count, onDone)
    else if (tier.level === 3) stop = animateTier3(scene, renderer, camera, tier.duration, tier.count, onDone)
    else stop = animateTier4(scene, renderer, camera, tier.duration, tier.count, onDone)

    return () => {
      stop?.()
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fmt = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div ref={mountRef} className="absolute inset-0" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="whale-label" style={{
          fontSize: 'clamp(2rem, 7vw, 4.5rem)',
          fontWeight: 900, letterSpacing: '0.06em',
          fontFamily: 'JetBrains Mono, monospace',
          color: tier.glow,
          textShadow: `0 0 20px ${tier.glow}, 0 0 50px ${tier.color}88, 0 0 90px ${tier.color}44`,
        }}>
          {tier.label}
        </div>
        <div className="whale-amount" style={{
          fontSize: 'clamp(1.4rem, 4vw, 2.8rem)',
          fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
          color: '#ffffff',
          textShadow: '0 0 16px rgba(255,255,255,0.9), 0 0 35px rgba(255,255,255,0.4)',
        }}>
          ${fmt} USDT
        </div>
        <div style={{
          fontSize: '0.9rem', letterSpacing: '0.3em',
          color: tier.glow, opacity: 0.7,
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
        }}>
          {tier.sub}
        </div>
      </div>
    </div>
  )
}
