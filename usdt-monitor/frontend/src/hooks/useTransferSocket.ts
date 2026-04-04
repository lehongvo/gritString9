import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

export type TxDTO = {
  id: number
  txHash: string
  fromAddress: string
  toAddress: string
  valueUsdt: number
  tokenName: string
  blockNumber: number
  blockTimestamp: string
  createdAt: string
}

type UseTransferSocketReturn = {
  connected: boolean
  latestTx: TxDTO | null
}

export function useTransferSocket(
  onNewTx: (tx: TxDTO) => void
): UseTransferSocketReturn {
  const [connected, setConnected] = useState(false)
  const [latestTx, setLatestTx] = useState<TxDTO | null>(null)
  const clientRef = useRef<Client | null>(null)

  useEffect(() => {
    // Use current hostname so mobile/remote devices work (not hardcoded localhost)
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
    const wsUrl = `http://${host}:8080/ws`

    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true)
        client.subscribe('/topic/transfers', (message) => {
          try {
            const tx: TxDTO = JSON.parse(message.body)
            setLatestTx(tx)
            onNewTx(tx)
          } catch (e) {
            console.error('Parse WS message error', e)
          }
        })
      },
      onDisconnect: () => setConnected(false),
      onStompError: (frame) => {
        console.error('STOMP error', frame)
        setConnected(false)
      },
    })

    client.activate()
    clientRef.current = client

    return () => {
      client.deactivate()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { connected, latestTx }
}
