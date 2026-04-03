'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { TxTable } from '@/components/TxTable'
import { LiveBadge } from '@/components/LiveBadge'
import { useTransferSocket, TxDTO } from '@/hooks/useTransferSocket'

const PAGE_SIZE = 20
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export default function HomePage() {
  const [transactions, setTransactions] = useState<TxDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [newTxCount, setNewTxCount] = useState(0)
  const [newTxHashes, setNewTxHashes] = useState<Set<string>>(new Set())
  const flashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const fetchTransactions = useCallback(async (p = 0) => {
    try {
      const res = await fetch(`${API_URL}/api/transactions?page=${p}&size=${PAGE_SIZE}`)
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
      setTransactions((prev) => {
        if (prev.find((t) => t.txHash === tx.txHash)) return prev
        return [tx, ...prev].slice(0, PAGE_SIZE)
      })
      setNewTxHashes((prev) => new Set(prev).add(tx.txHash))
      const timer = setTimeout(() => {
        setNewTxHashes((prev) => { const s = new Set(prev); s.delete(tx.txHash); return s })
        flashTimers.current.delete(tx.txHash)
      }, 2200)
      flashTimers.current.set(tx.txHash, timer)
    }
    setNewTxCount((n) => {
      const next = n + 1
      if (next % 10 === 0) fetchTransactions(page)
      return next
    })
  }, [page, fetchTransactions])

  const { connected } = useTransferSocket(handleNewTx)

  const goToPage = (p: number) => {
    setPage(p)
    fetchTransactions(p)
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      {/* Top bar */}
      <header className="border-b border-zinc-800/60 bg-[#09090b]/95 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-lg font-bold tracking-tight">USDT</span>
              <span className="text-zinc-500 text-sm">Transfer Monitor</span>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] text-zinc-700 border border-zinc-800 rounded px-2 py-0.5">
              <span className="text-zinc-500">ETH Mainnet</span>
              <span>·</span>
              <a
                href="https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-blue-500 hover:text-blue-400"
              >
                0xdAC17F…31ec7
              </a>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {totalElements > 0 && (
              <span className="text-xs text-zinc-600 font-mono tabular-nums">
                {totalElements.toLocaleString()} txs
              </span>
            )}
            {newTxCount > 0 && (
              <span className="rounded-full bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-0.5 text-xs font-semibold text-yellow-400 font-mono">
                +{newTxCount} new
              </span>
            )}
            <LiveBadge connected={connected} />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-4 py-4">
        {/* Stats row */}
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'CONTRACTS', value: '4' },
            { label: 'TOTAL TXS', value: totalElements.toLocaleString() },
            { label: 'NEW (SESSION)', value: newTxCount.toLocaleString() },
            { label: 'STATUS', value: connected ? 'LIVE' : 'OFFLINE', color: connected ? 'text-green-400' : 'text-red-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
              <div className="text-[10px] text-zinc-600 tracking-widest mb-1">{label}</div>
              <div className={`font-mono text-sm font-semibold ${color || 'text-zinc-200'}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 overflow-hidden">
          <TxTable transactions={transactions} isLoading={isLoading} newTxHashes={newTxHashes} />
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 0}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-400 disabled:opacity-30 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
            >
              ← PREV
            </button>
            <span className="font-mono text-xs text-zinc-600 px-2">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages - 1}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-400 disabled:opacity-30 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
            >
              NEXT →
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
