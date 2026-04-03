type Props = { connected: boolean }

export function LiveBadge({ connected }: Props) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-widest border transition-all duration-300 ${
      connected
        ? 'bg-green-500/10 text-green-400 border-green-500/25 shadow-[0_0_14px_rgba(34,197,94,0.22)]'
        : 'bg-zinc-800/80 text-zinc-500 border-zinc-700/50'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-green-400 live-dot' : 'bg-zinc-600'}`} />
      {connected ? 'LIVE' : 'OFFLINE'}
    </span>
  )
}
