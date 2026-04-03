'use client'

import { format } from 'date-fns'
import { TxDTO } from '@/hooks/useTransferSocket'

type Props = {
  transactions: TxDTO[]
  isLoading: boolean
  newTxHashes: Set<string>
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function shortHash(hash: string) {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`
}

function amountColor(value: number): string {
  if (value >= 100000) return 'text-red-400 font-bold'
  if (value >= 10000)  return 'text-orange-400 font-bold'
  if (value >= 1000)   return 'text-yellow-300 font-semibold'
  if (value >= 100)    return 'text-green-400 font-semibold'
  return 'text-zinc-300'
}

function tokenBadgeStyle(name: string): string {
  if (name === 'USDT') return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
  if (name.includes('Wormhole')) return 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
  if (name.includes('Solana')) return 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
  if (name.includes('cUSDT')) return 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
  return 'bg-zinc-700/50 text-zinc-400 border border-zinc-600'
}

export function TxTable({ transactions, isLoading, newTxHashes }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-600 text-sm tracking-widest">
        LOADING...
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-2">
        <div className="text-zinc-500 text-sm tracking-widest">WAITING FOR TRANSFERS</div>
        <div className="text-zinc-700 text-xs">Monitoring 4 USDT contracts on Ethereum</div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            {['TX HASH', 'FROM', 'TO', 'TOKEN', 'AMOUNT', 'BLOCK', 'TIME'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-zinc-600">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, i) => {
            const isNew = newTxHashes.has(tx.txHash)
            const amount = Number(tx.valueUsdt)
            return (
              <tr
                key={tx.txHash}
                className={`border-b border-zinc-900 transition-colors ${
                  isNew ? 'row-flash-new' : 'hover:bg-zinc-900/60'
                }`}
              >
                <td className="px-4 py-2.5">
                  <a
                    href={`https://etherscan.io/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                  >
                    {shortHash(tx.txHash)}
                  </a>
                </td>
                <td className="px-4 py-2.5">
                  <a
                    href={`https://etherscan.io/address/${tx.fromAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    {shortAddr(tx.fromAddress)}
                  </a>
                </td>
                <td className="px-4 py-2.5">
                  <a
                    href={`https://etherscan.io/address/${tx.toAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    {shortAddr(tx.toAddress)}
                  </a>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${tokenBadgeStyle(tx.tokenName || 'USDT')}`}>
                    {tx.tokenName || 'USDT'}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`font-mono text-sm tabular-nums ${amountColor(amount)}`}>
                    {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-zinc-600">
                  #{tx.blockNumber.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-zinc-600 whitespace-nowrap">
                  {format(new Date(tx.blockTimestamp), 'HH:mm:ss')}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
