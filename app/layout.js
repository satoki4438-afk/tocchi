import './globals.css'

export const metadata = {
  title: 'トッチー | 不動産情報を一画面に',
  description: '住所を入力するだけで、相場・法令・ハザード情報を一画面に集約。重要事項説明書のドラフトをAIで即生成。',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
