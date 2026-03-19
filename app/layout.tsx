import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '早稲田AI研究会 スライド作成ツール',
  description: 'AIを使って講義スライドを自動生成・編集・エクスポートできるツール',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className="h-full">
      <body className="bg-white text-gray-900 antialiased min-h-full">
        {children}
      </body>
    </html>
  )
}
