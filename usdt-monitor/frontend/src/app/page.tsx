'use client'

import { useState, useEffect, useCallback } from 'react'
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
  const [newTxCount, setNewTxCount] = useState(0)

  const fetchTransactions = useCallback(async (p = 0) => {
    try {
      const res = await fetch(
        `${API_URL}/api/transactions?page=${p}&size=${PAGE_SIZE}`
      )
      if (!res.ok) throw new Error('Fetch failed')
      const data = await res.json()
      setTransactions(data.content)
      setTotalPages(data.totalPages)
    } catch (e) {
      console.error('Fetch error:', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTransactions(0)
  }, [fetchTransactions])

  const handleNewTx = useCallback((tx: TxDTO) => {
    if (page === 0) {
      setTransactions((prev) => {
        if (prev.find((t) => t.txHash === tx.txHash)) return prev
        return [tx, ...prev].slice(0, PAGE_SIZE)
      })
    }
    setNewTxCount((n) => n + 1)
  }, [page])

  const { connected } = useTransferSocket(handleNewTx)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">USDT Transfer Monitor</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ethereum Mainnet · Contract{' '}
            <a
              href="https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-blue-600 hover:underline"
            >
              0xdAC17F...31ec7
            </a>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {newTxCount > 0 && (
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              +{newTxCount} new
            </span>
          )}
          <LiveBadge connected={connected} />
        </div>
      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <TxTable transactions={transactions} isLoading={isLoading} />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => { setPage(p => p - 1); fetchTransactions(page - 1) }}
            disabled={page === 0}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => { setPage(p => p + 1); fetchTransactions(page + 1) }}
            disabled={page >= totalPages - 1}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </main>
  )
}
