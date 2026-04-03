'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { TxTable } from '@/components/TxTable'
import { LiveBadge } from '@/components/LiveBadge'
import { WhaleExplosion } from '@/components/WhaleExplosion'
import { useTransferSocket, TxDTO } from '@/hooks/useTransferSocket'

const PAGE_SIZE = 20
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

const STATS = (total: number, newCount: number, connected: boolean) => [
  { label: 'CONTRACTS',    value: '4',                    icon: '📋', color: 'text-zinc-200' },
  { label: 'TOTAL TXS',   value: total.toLocaleString(),  icon: '⛓',  color: 'text-blue-400' },
  { label: 'NEW SESSION',  value: `+${newCount.toLocaleString()}`, icon: '⚡', color: 'text-yellow-400' },
  { label: 'STATUS',       value: connected ? 'LIVE' : 'OFFLINE',  icon: connected ? '🟢' : '🔴',
    color: connected ? 'text-green-400' : 'text-red-400' },
]

export default function HomePage() {
  const [transactions, setTransactions] = useState<TxDTO[]>([])
  const [isLoading, setIsLoading]       = useState(true)
  const [page, setPage]                 = useState(0)
  const [totalPages, setTotalPages]     = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [newTxCount, setNewTxCount]     = useState(0)
  const [newTxHashes, setNewTxHashes]   = useState<Set<string>>(new Set())
  const [whaleAmount, setWhaleAmount]   = useState<number | null>(null)
  const flashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const fetchTransactions = useCallback(async (p = 0) => {
    try {
      const res  = await fetch(`${API_URL}/api/transactions?page=${p}&size=${PAGE_SIZE}`)
      if (!res.ok) throw new Error('Fetch failed')
      const data = await res.json()
      setTransactions(data.content)
      setTotalPages(data.totalPages)
      setTotalElements(data.totalElements)
    } catch (e) {
      console.error('Fetch error:', e)
    } finally {
      setIsLoading(false)
    }
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
      }, 2400)
      flashTimers.current.set(tx.txHash, t)
    }
    if (Number(tx.valueUsdt) >= 5_000) setWhaleAmount(Number(tx.valueUsdt))
    setNewTxCount(n => {
      const next = n + 1
      if (next % 10 === 0) fetchTransactions(page)
      return next
    })
  }, [page, fetchTransactions])

  const { connected } = useTransferSocket(handleNewTx)

  const goToPage = (p: number) => { setPage(p); fetchTransactions(p) }

  return (
    <div className="relative min-h-screen text-zinc-100" style={{ position: 'relative', zIndex: 1 }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-white/[0.06] backdrop-blur-xl"
        style={{ background: 'rgba(5,5,8,0.88)' }}>
        <div className="mx-auto max-w-7xl px-5 py-3.5 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-green-500/15 border border-green-500/25 flex items-center justify-center text-sm shadow-[0_0_12px_rgba(34,197,94,0.2)]">
                ₮
              </div>
              <span className="shimmer-text text-base font-bold tracking-tight">USDT Monitor</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-[10px] border border-white/[0.07] rounded-full px-3 py-1 bg-white/[0.02]">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400/60" />
              <span className="text-zinc-500">ETH Mainnet</span>
              <span className="text-zinc-700 mx-0.5">·</span>
              <a href="https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7"
                target="_blank" rel="noopener noreferrer"
                className="font-mono text-blue-500/80 hover:text-blue-400 transition-colors">
                4 contracts
              </a>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            {totalElements > 0 && (
              <span className="hidden sm:block text-[11px] text-zinc-600 font-mono tabular-nums">
                {totalElements.toLocaleString()} total
              </span>
            )}
            {newTxCount > 0 && (
              <span className="rounded-full bg-yellow-400/10 border border-yellow-400/20 px-3 py-1 text-[11px] font-bold text-yellow-400 tracking-wide shadow-[0_0_10px_rgba(234,179,8,0.15)]">
                +{newTxCount}
              </span>
            )}
            <LiveBadge connected={connected} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-5 relative z-10">

        {/* ── Stats ── */}
        <div className="mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATS(totalElements, newTxCount, connected).map(({ label, value, icon, color }) => (
            <div key={label}
              className="stat-card gradient-border rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5 cursor-default">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-zinc-600 tracking-[0.2em] font-semibold">{label}</span>
                <span className="text-base leading-none">{icon}</span>
              </div>
              <div className={`font-mono text-lg font-bold tabular-nums ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* ── Tier legend ── */}
        <div className="mb-3 flex items-center gap-4 px-1 flex-wrap">
          {[
            { color: 'bg-red-500',    label: '≥ 100K 💀', text: 'text-red-400'    },
            { color: 'bg-orange-500', label: '≥ 50K 🔥', text: 'text-orange-400' },
            { color: 'bg-yellow-500', label: '≥ 10K 🐳', text: 'text-yellow-400' },
            { color: 'bg-green-500',  label: '≥ 5K 💰',  text: 'text-green-400'  },
          ].map(({ color, label, text }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${color}`} />
              <span className={`text-[10px] font-mono ${text}`}>{label}</span>
            </div>
          ))}
          <span className="text-zinc-700 text-[10px] ml-auto">USDT</span>
        </div>

        {/* ── Table ── */}
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5)]"
          style={{ background: 'rgba(8,8,11,0.9)' }}>
          <TxTable transactions={transactions} isLoading={isLoading} newTxHashes={newTxHashes} />
        </div>

        {/* ── Pagination ── */}
        {totalPages > 0 && (
          <div className="mt-5 flex items-center justify-center gap-3">
            <button onClick={() => goToPage(page - 1)} disabled={page === 0}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-2 text-[11px] font-bold tracking-widest text-zinc-400 disabled:opacity-25 hover:border-green-500/30 hover:text-green-400 hover:bg-green-500/5 transition-all duration-200">
              ← PREV
            </button>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.05] bg-white/[0.02]">
              <span className="font-mono text-xs text-zinc-400 font-semibold">{page + 1}</span>
              <span className="text-zinc-700">/</span>
              <span className="font-mono text-xs text-zinc-600">{totalPages}</span>
            </div>
            <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages - 1}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-2 text-[11px] font-bold tracking-widest text-zinc-400 disabled:opacity-25 hover:border-green-500/30 hover:text-green-400 hover:bg-green-500/5 transition-all duration-200">
              NEXT →
            </button>
          </div>
        )}
      </main>

      {whaleAmount !== null && (
        <WhaleExplosion amount={whaleAmount} onDone={() => setWhaleAmount(null)} />
      )}
    </div>
  )
}
