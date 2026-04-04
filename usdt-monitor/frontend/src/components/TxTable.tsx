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

type Tier = {
  bar: string
  barGlow: string
  amount: string
  rowBg: string
  rowPersist: string
  badge: string
  glow: string
  sizeClass: string
}

function getTier(v: number): Tier {
  if (v >= 400_000) return {
    bar:        'bg-red-500',
    barGlow:    'shadow-[0_0_8px_rgba(239,68,68,0.9)]',
    amount:     'text-red-400 font-extrabold',
    rowBg:      'bg-red-500/[0.07]',
    rowPersist: 'row-legendary',
    badge:      '💀',
    glow:       'amount-legendary',
    sizeClass:  'text-lg',
  }
  if (v >= 200_000) return {
    bar:        'bg-orange-500',
    barGlow:    'shadow-[0_0_8px_rgba(251,146,60,0.9)]',
    amount:     'text-orange-400 font-extrabold',
    rowBg:      'bg-orange-500/[0.07]',
    rowPersist: '',
    badge:      '🔥',
    glow:       'amount-mega',
    sizeClass:  'text-lg',
  }
  if (v >= 100_000) return {
    bar:        'bg-yellow-400',
    barGlow:    'shadow-[0_0_6px_rgba(253,224,71,0.8)]',
    amount:     'text-yellow-300 font-bold',
    rowBg:      'bg-yellow-500/[0.05]',
    rowPersist: '',
    badge:      '🐳',
    glow:       'amount-whale',
    sizeClass:  'text-base',
  }
  if (v >= 50_000) return {
    bar:        'bg-emerald-400',
    barGlow:    'shadow-[0_0_5px_rgba(52,211,153,0.7)]',
    amount:     'text-emerald-400 font-bold',
    rowBg:      'bg-emerald-500/[0.04]',
    rowPersist: '',
    badge:      '💰',
    glow:       'amount-cash',
    sizeClass:  'text-base',
  }
  if (v >= 10_000) return {
    bar: 'bg-cyan-600', barGlow: '',
    amount: 'text-cyan-300 font-semibold', rowBg: '',
    rowPersist: '', badge: '', glow: '', sizeClass: 'text-sm',
  }
  if (v >= 1_000) return {
    bar: 'bg-zinc-600', barGlow: '',
    amount: 'text-zinc-300', rowBg: '',
    rowPersist: '', badge: '', glow: '', sizeClass: 'text-sm',
  }
  return {
    bar: 'bg-zinc-800', barGlow: '',
    amount: 'text-zinc-500', rowBg: '',
    rowPersist: '', badge: '', glow: '', sizeClass: 'text-sm',
  }
}

function tokenBadge(name: string) {
  if (name === 'USDT')           return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
  if (name.includes('Wormhole')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  if (name.includes('Solana'))   return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  if (name.includes('cUSDT'))    return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  return 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30'
}

function fmtAmount(v: number) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M'
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function TxTable({ transactions, isLoading, newTxHashes }: Props) {
  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border border-cyan-500/20" />
        <div className="absolute inset-0 rounded-full border-t border-cyan-400 animate-spin" />
      </div>
      <span className="text-[10px] tracking-[0.3em] text-cyan-500/50">LOADING</span>
    </div>
  )

  if (transactions.length === 0) return (
    <div className="flex flex-col items-center justify-center py-32 gap-3">
      <div className="text-3xl opacity-40">📡</div>
      <div className="text-[11px] tracking-[0.25em] text-zinc-500">WAITING FOR TRANSFERS</div>
    </div>
  )

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr className="table-header-row" style={{ borderBottom: '1px solid rgba(6,182,212,0.08)' }}>
            <th className="w-[3px] p-0" />
            <th className="w-10 px-3 py-3" />
            {[
              { label: 'TX HASH', align: 'text-left',  hide: ''           },
              { label: 'FROM',    align: 'text-left',  hide: 'hidden md:table-cell' },
              { label: 'TO',      align: 'text-left',  hide: 'hidden md:table-cell' },
              { label: 'TOKEN',   align: 'text-left',  hide: 'hidden sm:table-cell' },
              { label: 'AMOUNT',  align: 'text-right', hide: ''           },
              { label: 'BLOCK',   align: 'text-left',  hide: 'hidden lg:table-cell' },
              { label: 'TIME',    align: 'text-left',  hide: 'hidden sm:table-cell' },
            ].map(({ label, align, hide }) => (
              <th key={label}
                className={`px-4 py-3 text-[9px] font-bold tracking-[0.28em] text-cyan-600/60 whitespace-nowrap ${align} ${hide}`}>
                {label}
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
                className={`tx-row ${tier.rowBg} ${tier.rowPersist} ${isNew ? 'row-flash-new' : ''}`}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.025)' }}
              >
                {/* tier bar */}
                <td className="p-0 w-[3px] relative">
                  <div className={`absolute inset-y-0 left-0 w-[3px] ${tier.bar} ${tier.barGlow} ${isNew ? 'bar-draw' : ''}`} />
                </td>

                {/* badge */}
                <td className="px-3 py-3 text-center w-10 leading-none">
                  {tier.badge
                    ? <span className={`text-base ${isNew ? 'amount-pop' : ''}`}>{tier.badge}</span>
                    : null
                  }
                </td>

                {/* tx hash */}
                <td className="px-3 py-3">
                  <a href={`https://etherscan.io/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer"
                    className="font-mono text-[11px] text-cyan-500/60 hover:text-cyan-300 transition-colors">
                    {shortHash(tx.txHash)}
                  </a>
                </td>

                {/* from — hidden on mobile */}
                <td className="hidden md:table-cell px-4 py-3">
                  <a href={`https://etherscan.io/address/${tx.fromAddress}`} target="_blank" rel="noopener noreferrer"
                    className="font-mono text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors">
                    {shortAddr(tx.fromAddress)}
                  </a>
                </td>

                {/* to — hidden on mobile */}
                <td className="hidden md:table-cell px-4 py-3">
                  <a href={`https://etherscan.io/address/${tx.toAddress}`} target="_blank" rel="noopener noreferrer"
                    className="font-mono text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors">
                    {shortAddr(tx.toAddress)}
                  </a>
                </td>

                {/* token — hidden on small mobile */}
                <td className="hidden sm:table-cell px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-[9px] font-bold tracking-widest border ${tokenBadge(tx.tokenName || 'USDT')}`}>
                    {tx.tokenName || 'USDT'}
                  </span>
                </td>

                {/* amount — hero, always visible */}
                <td className="px-3 py-3 text-right">
                  <span className={`font-mono tabular-nums ${tier.amount} ${tier.sizeClass} ${tier.glow} ${isNew ? 'amount-pop' : ''}`}>
                    {fmtAmount(amount)}
                  </span>
                </td>

                {/* block — desktop only */}
                <td className="hidden lg:table-cell px-4 py-3">
                  <span className="font-mono text-[10px] text-zinc-700">
                    #{tx.blockNumber.toLocaleString()}
                  </span>
                </td>

                {/* time — tablet+ */}
                <td className="hidden sm:table-cell px-3 py-3 whitespace-nowrap">
                  <span className="font-mono text-[10px] text-zinc-600">
                    {format(new Date(tx.blockTimestamp), 'HH:mm:ss')}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
