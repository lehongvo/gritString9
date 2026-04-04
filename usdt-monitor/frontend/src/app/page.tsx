'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { TxTable } from '@/components/TxTable'
import { LiveBadge } from '@/components/LiveBadge'
import { WhaleExplosion } from '@/components/WhaleExplosion'
import { useTransferSocket, TxDTO } from '@/hooks/useTransferSocket'
import { playForAmount, isAudioUnlocked } from '@/lib/SoundManager'

const PAGE_SIZE = 20
// Use relative URL so Next.js rewrite proxy handles it — works from any device
const API_URL = ''

/* 3D card tilt on mouse move */
function useTilt() {
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const r  = el.getBoundingClientRect()
    const x  = (e.clientX - r.left) / r.width
    const y  = (e.clientY - r.top)  / r.height
    const rx = (y - 0.5) * -18
    const ry = (x - 0.5) * 18
    el.style.transform = `perspective(600px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(10px) scale(1.02)`
    el.style.transition = 'transform 0.08s ease'
  }
  const onLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = ''
    e.currentTarget.style.transition = 'transform 0.4s ease'
  }
  return { onMouseMove: onMove, onMouseLeave: onLeave }
}

export default function HomePage() {
  const [transactions, setTransactions]   = useState<TxDTO[]>([])
  const [isLoading, setIsLoading]         = useState(true)
  const [page, setPage]                   = useState(0)
  const [totalPages, setTotalPages]       = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [newTxCount, setNewTxCount]       = useState(0)
  const [newTxHashes, setNewTxHashes]     = useState<Set<string>>(new Set())
  const [whaleAmount, setWhaleAmount]     = useState<number | null>(null)
  const [audioReady, setAudioReady]       = useState(false)
  const flashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const tilt = useTilt()

  // Check audio unlock state
  useEffect(() => {
    if (isAudioUnlocked()) { setAudioReady(true); return }
    const check = () => { if (isAudioUnlocked()) setAudioReady(true) }
    window.addEventListener('touchstart', check, { once: true, passive: true })
    window.addEventListener('click',      check, { once: true })
    return () => {
      window.removeEventListener('touchstart', check)
      window.removeEventListener('click', check)
    }
  }, [])

  const fetchTransactions = useCallback(async (p = 0) => {
    try {
      const res  = await fetch(`${API_URL}/api/transactions?page=${p}&size=${PAGE_SIZE}`)
      if (!res.ok) throw new Error('Fetch failed')
      const data = await res.json()
      setTransactions(data.content)
      setTotalPages(data.totalPages)
      setTotalElements(data.totalElements)
    } catch (e) { console.error('Fetch error:', e) }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => { fetchTransactions(0) }, [fetchTransactions])

  const handleNewTx = useCallback((tx: TxDTO) => {
    if (page === 0) {
      setTransactions(prev => {
        if (prev.find(t => t.txHash === tx.txHash)) return prev
        return [tx, ...prev].slice(0, PAGE_SIZE)
      })
      setNewTxHashes(prev => new Set(prev).add(tx.txHash))
      const t = setTimeout(() => {
        setNewTxHashes(prev => { const s = new Set(prev); s.delete(tx.txHash); return s })
        flashTimers.current.delete(tx.txHash)
      }, 2800)
      flashTimers.current.set(tx.txHash, t)
    }
    playForAmount(Number(tx.valueUsdt))
    if (Number(tx.valueUsdt) >= 50_000) setWhaleAmount(Number(tx.valueUsdt))
    setNewTxCount(n => {
      const next = n + 1
      if (next % 10 === 0) fetchTransactions(page)
      return next
    })
  }, [page, fetchTransactions])

  const { connected } = useTransferSocket(handleNewTx)
  const goToPage = (p: number) => { setPage(p); fetchTransactions(p) }

  const stats = [
    { label: 'CONTRACTS',   value: '4',                            icon: '📋', accent: 'rgba(6,182,212,0.7)',   sub: 'monitoring' },
    { label: 'TOTAL TXS',   value: totalElements.toLocaleString(), icon: '⛓',  accent: 'rgba(99,102,241,0.7)',  sub: 'all time'   },
    { label: 'NEW SESSION', value: `+${newTxCount.toLocaleString()}`, icon: '⚡', accent: 'rgba(234,179,8,0.7)', sub: 'since open' },
    { label: 'STREAM',      value: connected ? 'LIVE' : 'OFFLINE', icon: connected ? '🟢' : '🔴',
      accent: connected ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)', sub: 'websocket' },
  ]

  const tiers = [
    { dot: 'bg-red-500',     label: '≥ 400K', icon: '💀', text: 'text-red-400'     },
    { dot: 'bg-orange-500',  label: '≥ 200K', icon: '🔥', text: 'text-orange-400'  },
    { dot: 'bg-yellow-400',  label: '≥ 100K', icon: '🐳', text: 'text-yellow-300'  },
    { dot: 'bg-emerald-400', label: '≥ 50K',  icon: '💰', text: 'text-emerald-400' },
  ]

  return (
    <div className="relative min-h-screen" style={{ zIndex: 1 }}>

      {/* ── Background layers ── */}
      <div className="orb orb-cyan"   aria-hidden />
      <div className="orb orb-purple" aria-hidden />
      <div className="orb orb-green"  aria-hidden />
      <div className="perspective-floor" aria-hidden />

      {/* ── Top border glow ── */}
      <div className="fixed top-0 left-0 right-0 h-px z-50"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.8) 30%, rgba(139,92,246,0.7) 60%, transparent)' }} />

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-white/[0.04]"
        style={{ background: 'rgba(4,8,15,0.88)', backdropFilter: 'blur(24px)' }}>
        <div className="mx-auto max-w-7xl px-3 sm:px-6 py-3 flex items-center justify-between gap-2 sm:gap-4">

          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="relative h-8 w-8 rounded-xl flex items-center justify-center text-sm font-black"
                style={{
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(6,182,212,0.05))',
                  border: '1px solid rgba(6,182,212,0.3)',
                  boxShadow: '0 0 20px rgba(6,182,212,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                  color: '#22d3ee',
                }}>
                ₮
              </div>
              <span className="shimmer-text text-sm font-black tracking-wide">USDT Monitor</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] tracking-[0.15em]"
              style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.12)' }}>
              <span className="h-1 w-1 rounded-full bg-cyan-400/70" />
              <span className="text-cyan-600">ETH MAINNET</span>
              <span className="text-zinc-700 mx-1">·</span>
              <a href="https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7"
                target="_blank" rel="noopener noreferrer"
                className="text-cyan-500/70 hover:text-cyan-300 transition-colors">
                4 CONTRACTS
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {totalElements > 0 && (
              <span className="hidden sm:block text-[10px] text-zinc-600 tabular-nums">
                {totalElements.toLocaleString()} <span className="text-zinc-700">total</span>
              </span>
            )}
            {newTxCount > 0 && (
              <span className="px-3 py-1 rounded-full text-[10px] font-bold tabular-nums"
                style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)', color: '#fbbf24', boxShadow: '0 0 16px rgba(234,179,8,0.15)' }}>
                +{newTxCount.toLocaleString()}
              </span>
            )}
            <LiveBadge connected={connected} />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-6">

        {/* ── Stats cards — 3D tilt ── */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(({ label, value, icon, accent, sub }) => (
            <div key={label}
              {...tilt}
              className="stat-card rounded-2xl p-4 cursor-default select-none"
              style={{
                '--accent': accent,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
              } as React.CSSProperties}>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] tracking-[0.28em] text-zinc-600 font-bold">{label}</span>
                  <span className="text-lg leading-none">{icon}</span>
                </div>
                <div className="font-mono text-2xl font-black tabular-nums text-white"
                  style={{ textShadow: `0 0 30px ${accent}` }}>
                  {value}
                </div>
                <div className="mt-1.5 text-[9px] text-zinc-700 tracking-widest uppercase">{sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tier legend ── */}
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-5 flex-wrap">
            {tiers.map(({ dot, label, icon, text }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} style={{ boxShadow: `0 0 6px currentColor` }} />
                <span className={`text-[9px] font-mono tracking-wider ${text} opacity-80`}>{icon} {label}</span>
              </div>
            ))}
          </div>
          <span className="text-[9px] text-zinc-700 tracking-widest">USDT</span>
        </div>

        {/* ── Table — rotating border ── */}
        <div className="border-glow-rotate rounded-2xl overflow-hidden"
          style={{ boxShadow: '0 0 60px rgba(0,0,0,0.6), 0 0 30px rgba(6,182,212,0.05)' }}>
          <div style={{ background: 'rgba(4,8,15,0.92)', borderRadius: 'inherit' }}>
            <TxTable transactions={transactions} isLoading={isLoading} newTxHashes={newTxHashes} />
          </div>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button onClick={() => goToPage(page - 1)} disabled={page === 0}
              className="px-5 py-2 rounded-xl text-[10px] font-bold tracking-[0.2em] transition-all duration-200 disabled:opacity-20 hover:scale-105 active:scale-95"
              style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', color: '#67e8f9', boxShadow: '0 0 20px rgba(6,182,212,0.1)' }}>
              ← PREV
            </button>
            <div className="px-4 py-2 rounded-xl text-xs"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="font-mono font-bold text-zinc-300">{page + 1}</span>
              <span className="text-zinc-700 mx-1.5">/</span>
              <span className="font-mono text-zinc-600">{totalPages}</span>
            </div>
            <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages - 1}
              className="px-5 py-2 rounded-xl text-[10px] font-bold tracking-[0.2em] transition-all duration-200 disabled:opacity-20 hover:scale-105 active:scale-95"
              style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', color: '#67e8f9', boxShadow: '0 0 20px rgba(6,182,212,0.1)' }}>
              NEXT →
            </button>
          </div>
        )}
      </main>

      {/* Sound unlock prompt — mobile only */}
      {!audioReady && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full text-[11px] font-bold tracking-widest animate-bounce"
            style={{
              background: 'rgba(6,182,212,0.12)',
              border: '1px solid rgba(6,182,212,0.3)',
              color: '#67e8f9',
              boxShadow: '0 0 20px rgba(6,182,212,0.2)',
              backdropFilter: 'blur(12px)',
            }}>
            <span>🔊</span>
            <span>TAP TO ENABLE SOUND</span>
          </div>
        </div>
      )}

      {whaleAmount !== null && (
        <WhaleExplosion amount={whaleAmount} onDone={() => setWhaleAmount(null)} />
      )}
    </div>
  )
}
