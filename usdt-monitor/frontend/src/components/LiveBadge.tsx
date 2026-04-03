type Props = { connected: boolean }

export function LiveBadge({ connected }: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
      connected
        ? 'bg-green-500/10 text-green-400 border-green-500/30'
        : 'bg-zinc-800 text-zinc-500 border-zinc-700'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-green-400 live-dot' : 'bg-zinc-500'}`} />
      {connected ? 'LIVE' : 'CONNECTING'}
    </span>
  )
}
