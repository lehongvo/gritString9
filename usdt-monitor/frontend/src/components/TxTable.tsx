'use client'

import { format } from 'date-fns'
import { TxDTO } from '@/hooks/useTransferSocket'

type Props = {
  transactions: TxDTO[]
  isLoading: boolean
  newTxHashes: Set<string>
}

function shortAddr(addr: string) { return `${addr.slice(0,6)}…${addr.slice(-4)}` }
function shortHash(hash: string) { return `${hash.slice(0,8)}…${hash.slice(-6)}` }

type Tier = { border: string; amountClass: string; rowBg: string; badge: string }

function getTier(v: number): Tier {
  if (v >= 100_000) return {
    border:      'border-l-2 border-l-red-500',
    amountClass: 'text-red-400 font-bold text-base amount-whale',
    rowBg:       'bg-red-500/[0.04]',
    badge:       '🔴',
  }
  if (v >= 10_000) return {
    border:      'border-l-2 border-l-orange-500',
    amountClass: 'text-orange-400 font-bold text-base amount-large',
    rowBg:       'bg-orange-500/[0.04]',
    badge:       '🟠',
  }
  if (v >= 1_000) return {
    border:      'border-l-2 border-l-yellow-500',
    amountClass: 'text-yellow-300 font-semibold amount-mid',
    rowBg:       'bg-yellow-500/[0.03]',
    badge:       '🟡',
  }
  if (v >= 100) return {
    border:      'border-l-2 border-l-green-600',
    amountClass: 'text-green-400 font-semibold amount-green',
    rowBg:       '',
    badge:       '',
  }
  return { border: 'border-l-2 border-l-zinc-800', amountClass: 'text-zinc-400', rowBg: '', badge: '' }
}

function tokenBadge(name: string) {
  if (name === 'USDT')             return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
  if (name.includes('Wormhole'))   return 'bg-purple-500/10  text-purple-400  border-purple-500/25'
  if (name.includes('Solana'))     return 'bg-blue-500/10    text-blue-400    border-blue-500/25'
  if (name.includes('cUSDT'))      return 'bg-orange-500/10  text-orange-400  border-orange-500/25'
  return 'bg-zinc-700/40 text-zinc-400 border-zinc-600/40'
}

export function TxTable({ transactions, isLoading, newTxHashes }: Props) {
  if (isLoading) return (
    <div className="flex items-center justify-center py-28">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-green-500/30 border-t-green-400 animate-spin" />
        <span className="text-zinc-600 text-[11px] tracking-widest">LOADING</span>
      </div>
    </div>
  )

  if (transactions.length === 0) return (
    <div className="flex flex-col items-center justify-center py-28 gap-2">
      <div className="text-2xl mb-1">📡</div>
      <div className="text-zinc-400 text-sm tracking-widest font-semibold">WAITING FOR TRANSFERS</div>
      <div className="text-zinc-700 text-xs">Monitoring 4 USDT contracts · Ethereum Mainnet</div>
    </div>
  )

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr className="border-b border-white/[0.05]">
            <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-[0.2em] text-zinc-600 w-8" />
            {['TX HASH','FROM','TO','TOKEN','AMOUNT','BLOCK','TIME'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold tracking-[0.18em] text-zinc-600">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => {
            const amount = Number(tx.valueUsdt)
            const tier   = getTier(amount)
            const isNew  = newTxHashes.has(tx.txHash)
            return (
              <tr
                key={tx.txHash}
                className={`tx-row border-b border-white/[0.03] ${tier.border} ${tier.rowBg} ${isNew ? 'row-flash-new' : ''}`}
              >
                {/* tier badge */}
                <td className="pl-1 pr-2 py-2.5 text-center text-xs">
                  {tier.badge}
                </td>
                <td className="px-4 py-2.5">
                  <a href={`https://etherscan.io/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer"
                    className="font-mono text-xs text-blue-400/80 hover:text-blue-300 transition-colors">
                    {shortHash(tx.txHash)}
                  </a>
                </td>
                <td className="px-4 py-2.5">
                  <a href={`https://etherscan.io/address/${tx.fromAddress}`} target="_blank" rel="noopener noreferrer"
                    className="font-mono text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
                    {shortAddr(tx.fromAddress)}
                  </a>
                </td>
                <td className="px-4 py-2.5">
                  <a href={`https://etherscan.io/address/${tx.toAddress}`} target="_blank" rel="noopener noreferrer"
                    className="font-mono text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
                    {shortAddr(tx.toAddress)}
                  </a>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide border ${tokenBadge(tx.tokenName || 'USDT')}`}>
                    {tx.tokenName || 'USDT'}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`font-mono tabular-nums ${tier.amountClass}`}>
                    {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-zinc-700">
                  <span className="text-zinc-600">#</span>{tx.blockNumber.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-zinc-600 whitespace-nowrap">
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
