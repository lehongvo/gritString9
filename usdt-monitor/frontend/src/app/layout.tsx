import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'USDT Transfer Monitor',
  description: 'Realtime USDT transfer tracker on Ethereum Mainnet',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#09090b] text-zinc-100 antialiased">{children}</body>
    </html>
  )
}
