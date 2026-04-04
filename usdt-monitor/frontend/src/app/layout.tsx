import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'USDT Transfer Monitor',
  description: 'Realtime USDT transfer tracker on Ethereum Mainnet',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#04080f] text-zinc-100 antialiased">{children}</body>
    </html>
  )
}
