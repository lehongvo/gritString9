type Props = { connected: boolean }

export function LiveBadge({ connected }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        connected
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-gray-100 text-gray-500'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          connected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
        }`}
      />
      {connected ? 'LIVE' : 'Connecting...'}
    </span>
  )
}
