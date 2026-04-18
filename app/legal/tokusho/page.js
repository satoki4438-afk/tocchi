export const metadata = { title: '特定商取引法に基づく表記 | Tocchi' }

const ITEMS = [
  { label: '販売事業者名', value: 'TAS Studio' },
  { label: '所在地', value: '請求があれば速やかに開示します' },
  { label: '電話番号', value: '080-1130-0543' },
  { label: 'メールアドレス', value: 'satoki4438@gmail.com' },
  { label: 'サービス名', value: 'Tocchi（トッチー）' },
  {
    label: '販売価格',
    value: '都度プラン：¥200 / 回（税込）\nスタンダードプラン：¥980 / 月（税込）',
  },
  { label: '支払い方法', value: 'クレジットカード（Stripe）' },
  {
    label: '支払い時期',
    value: '都度プラン：サービス利用時に即時決済\nスタンダードプラン：加入時および毎月自動更新',
  },
  { label: 'サービス提供時期', value: '決済完了後、即時ご利用いただけます' },
  {
    label: '返品・返金',
    value: 'デジタルコンテンツの性質上、原則として返金は承っておりません。当社の過失によりサービスを提供できなかった場合はこの限りではありません。',
  },
  {
    label: '解約',
    value: 'スタンダードプランはマイページからいつでも解約できます。解約後は当月末まで引き続きご利用いただけます。',
  },
]

export default function TokushoPage() {
  return (
    <div className="min-h-screen bg-white" style={{ padding: '80px 32px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <h1 className="font-bold text-stone-800 mb-10" style={{ fontSize: '24px' }}>
          特定商取引法に基づく表記
        </h1>
        <div className="divide-y divide-stone-100">
          {ITEMS.map(({ label, value }) => (
            <div key={label} className="py-5 sm:flex sm:gap-8">
              <dt className="text-sm font-medium text-stone-500 sm:w-40 flex-shrink-0 mb-1 sm:mb-0">{label}</dt>
              <dd className="text-sm text-stone-800 whitespace-pre-line">{value}</dd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
