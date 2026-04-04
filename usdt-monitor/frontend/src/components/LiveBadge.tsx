type Props = { connected: boolean }

export function LiveBadge({ connected }: Props) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] border transition-all duration-300 ${
      connected
        ? 'bg-emerald-500/8 text-emerald-400 border-emerald-500/20 shadow-[0_0_16px_rgba(16,185,129,0.18)]'
        : 'bg-zinc-800/60 text-zinc-500 border-zinc-700/40'
    }`}>
      <span className="relative flex h-1.5 w-1.5">
        {connected && <span className="live-ring" />}
        <span className={`relative h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400 live-dot' : 'bg-zinc-600'}`} />
      </span>
      {connected ? 'LIVE' : 'OFFLINE'}
    </span>
  )
}
