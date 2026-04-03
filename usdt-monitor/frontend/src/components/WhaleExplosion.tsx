'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type Props = {
  amount: number
  onDone: () => void
}

const DURATION_MS = 4500
const SUPER_DURATION_MS = 5500

export function WhaleExplosion({ amount, onDone }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const isSuper = amount >= 100_000
  const duration = isSuper ? SUPER_DURATION_MS : DURATION_MS
  const count = isSuper ? 320 : 200

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.shadowMap.enabled = true
    el.appendChild(renderer.domElement)

    /* ── Scene / Camera ── */
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200)
    camera.position.set(0, 2, 20)
    camera.lookAt(0, 0, 0)

    /* ── Lights ── */
    scene.add(new THREE.AmbientLight(0xffffff, 0.5))

    const keyLight = new THREE.PointLight(isSuper ? 0xff3300 : 0xffd700, 6, 60)
    keyLight.position.set(0, 8, 10)
    scene.add(keyLight)

    const fillLight = new THREE.PointLight(0xffffff, 2, 40)
    fillLight.position.set(-8, -4, 12)
    scene.add(fillLight)

    const rimLight = new THREE.PointLight(isSuper ? 0xff8800 : 0x00ffaa, 3, 50)
    rimLight.position.set(8, 10, -5)
    scene.add(rimLight)

    /* ── Coin geometry (shared) ── */
    const coinGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.09, 20)
    const edgeGeo  = new THREE.CylinderGeometry(0.40, 0.40, 0.09, 20, 1, true)

    const goldPalette  = [0xffd700, 0xffa500, 0xffe566, 0xffb800, 0xffcc00]
    const superPalette = [0xff2200, 0xff6600, 0xffd700, 0xff4400, 0xffaa00]
    const palette = isSuper ? superPalette : goldPalette

    /* ── Spawn coins ── */
    type Coin = {
      group: THREE.Group
      vel: THREE.Vector3
      spin: THREE.Vector3
      phase: number
    }

    const coins: Coin[] = []

    for (let i = 0; i < count; i++) {
      const col = palette[Math.floor(Math.random() * palette.length)]
      const dark = new THREE.Color(col).multiplyScalar(0.55)

      const faceMat = new THREE.MeshStandardMaterial({
        color: col, emissive: col, emissiveIntensity: 0.35,
        metalness: 0.95, roughness: 0.12,
      })
      const edgeMat = new THREE.MeshStandardMaterial({
        color: dark.getHex(), metalness: 0.9, roughness: 0.2,
      })

      const face = new THREE.Mesh(coinGeo, faceMat)
      const edge = new THREE.Mesh(edgeGeo, edgeMat)

      const group = new THREE.Group()
      group.add(face, edge)

      /* start near origin with tiny scatter */
      group.position.set(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 2,
      )
      group.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      )

      /* velocity: fan upward + outward */
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.random() * Math.PI * 0.45  // upper hemisphere
      const spd   = 12 + Math.random() * 16
      const vel = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * spd,
        Math.cos(phi) * spd * (0.6 + Math.random() * 0.8),
        Math.sin(phi) * Math.sin(theta) * spd * 0.5,
      )

      const spin = new THREE.Vector3(
        (Math.random() - 0.5) * 0.28,
        (Math.random() - 0.5) * 0.45,
        (Math.random() - 0.5) * 0.28,
      )

      scene.add(group)
      coins.push({ group, vel, spin, phase: Math.random() * Math.PI * 2 })
    }

    /* ── Stars / sparkles ── */
    const starGeo = new THREE.BufferGeometry()
    const starPositions = new Float32Array(600 * 3)
    for (let i = 0; i < 600; i++) {
      starPositions[i * 3]     = (Math.random() - 0.5) * 60
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 60
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 30
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    const starMat = new THREE.PointsMaterial({
      color: isSuper ? 0xff8800 : 0xffd700,
      size: 0.12, transparent: true, opacity: 0.7,
    })
    const stars = new THREE.Points(starGeo, starMat)
    scene.add(stars)

    /* ── Animation loop ── */
    const gravity = new THREE.Vector3(0, -22, 0)
    const startMs = performance.now()
    let rafId: number

    const tick = () => {
      rafId = requestAnimationFrame(tick)
      const elapsed = performance.now() - startMs
      const t = elapsed / duration            // 0 → 1
      const dt = 0.016

      coins.forEach(({ group, vel, spin, phase }) => {
        vel.addScaledVector(gravity, dt)
        group.position.addScaledVector(vel, dt)
        group.rotation.x += spin.x
        group.rotation.y += spin.y + Math.sin(elapsed * 0.003 + phase) * 0.012
        group.rotation.z += spin.z

        /* wobble scale */
        const wobble = 1 + Math.sin(elapsed * 0.008 + phase) * 0.04
        group.scale.setScalar(wobble)

        /* fade out last 35% */
        if (t > 0.65) {
          const fade = 1 - (t - 0.65) / 0.35
          group.children.forEach(child => {
            const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
            mat.transparent = true
            mat.opacity = fade
          })
        }
      })

      /* pulsing key light */
      keyLight.intensity = 5 + Math.sin(elapsed * 0.015) * 2.5
      rimLight.intensity = 2.5 + Math.cos(elapsed * 0.009) * 1.5

      /* rotate stars */
      stars.rotation.z += 0.003
      stars.rotation.y += 0.001

      renderer.render(scene, camera)

      if (elapsed >= duration) {
        cancelAnimationFrame(rafId)
        dispose()
        onDone()
      }
    }

    tick()

    const dispose = () => {
      cancelAnimationFrame(rafId)
      coins.forEach(({ group }) => {
        group.children.forEach(child => {
          (child as THREE.Mesh).geometry.dispose()
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
          mat.dispose()
        })
        scene.remove(group)
      })
      starGeo.dispose()
      starMat.dispose()
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }

    return dispose
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fmt = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const label = isSuper ? '🔴 SUPER WHALE 🔴' : '🐳 WHALE ALERT 🐳'
  const glow  = isSuper ? 'rgba(255,50,0,0.95)' : 'rgba(255,215,0,0.95)'
  const glow2 = isSuper ? 'rgba(255,100,0,0.5)' : 'rgba(255,165,0,0.5)'

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Three.js canvas */}
      <div ref={mountRef} className="absolute inset-0" />

      {/* Text overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div
          className="whale-label"
          style={{
            fontSize: 'clamp(2rem, 6vw, 4rem)',
            fontWeight: 900,
            letterSpacing: '0.08em',
            fontFamily: 'JetBrains Mono, monospace',
            color: glow,
            textShadow: `0 0 24px ${glow}, 0 0 60px ${glow2}, 0 0 100px ${glow2}`,
          }}
        >
          {label}
        </div>
        <div
          className="whale-amount"
          style={{
            fontSize: 'clamp(1.5rem, 4vw, 2.8rem)',
            fontWeight: 700,
            fontFamily: 'JetBrains Mono, monospace',
            color: '#ffffff',
            textShadow: '0 0 20px rgba(255,255,255,0.9), 0 0 40px rgba(255,255,255,0.4)',
          }}
        >
          ${fmt} USDT
        </div>
      </div>
    </div>
  )
}
