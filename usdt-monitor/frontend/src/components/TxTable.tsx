import { format } from 'date-fns'
import { TxDTO } from '@/hooks/useTransferSocket'

type Props = {
  transactions: TxDTO[]
  isLoading: boolean
  newTxHashes: Set<string>
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function shortHash(hash: string) {
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`
}

export function TxTable({ transactions, isLoading, newTxHashes }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Loading transactions...
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        No transactions yet. Waiting for USDT transfers...
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {['Tx Hash', 'From', 'To', 'Token', 'Amount', 'Block', 'Time'].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {transactions.map((tx) => (
            <tr
              key={tx.txHash}
              className={`transition-colors ${newTxHashes.has(tx.txHash) ? 'row-flash-new' : 'hover:bg-gray-50'}`}
            >
              <td className="px-4 py-3 font-mono text-sm">
                <a
                  href={`https://etherscan.io/tx/${tx.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {shortHash(tx.txHash)}
                </a>
              </td>
              <td className="px-4 py-3 font-mono text-sm text-gray-600">
                <a
                  href={`https://etherscan.io/address/${tx.fromAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {shortAddr(tx.fromAddress)}
                </a>
              </td>
              <td className="px-4 py-3 font-mono text-sm text-gray-600">
                <a
                  href={`https://etherscan.io/address/${tx.toAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {shortAddr(tx.toAddress)}
                </a>
              </td>
              <td className="px-4 py-3 text-sm">
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
                  {tx.tokenName || 'USDT'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                {Number(tx.valueUsdt).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                #{tx.blockNumber.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {format(new Date(tx.blockTimestamp), 'dd/MM/yyyy HH:mm:ss')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
