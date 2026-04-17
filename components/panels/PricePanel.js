export default function PricePanel({ trade, landprice }) {
  const tradeItems = trade?.items || []
  const landFeatures = landprice?.features || []

  const formatPrice = (val) => {
    if (!val) return '—'
    const n = parseInt(val, 10)
    if (isNaN(n)) return val
    if (n >= 10000) return `${(n / 10000).toFixed(0)}万円`
    return `${n.toLocaleString()}円`
  }

  return (
    <div className="bg-white rounded-lg border border-stone-200 space-y-4" style={{ padding: '16px 20px' }}>
      <h2 className="font-semibold text-stone-800 flex items-center gap-2 text-base">
        <span>📊</span> 相場情報
      </h2>

      <div>
        <p className="text-sm text-stone-500 mb-2 font-medium">地価公示・地価調査</p>
        {landFeatures.length === 0 ? (
          <p className="text-sm text-stone-400">周辺エリアにデータなし</p>
        ) : (
          <div className="space-y-2">
            {landFeatures.slice(0, 3).map((f, i) => (
              <div key={i} className="flex justify-between items-baseline gap-2">
                <span className="text-sm text-stone-500 truncate">
                  {f.properties?.location || f.properties?.standard_lot_number_ja || `地点 ${i + 1}`}
                </span>
                <span className="text-sm font-semibold text-stone-800 whitespace-nowrap">
                  {f.properties?.u_current_years_price_ja || '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-sm text-stone-500 mb-1 font-medium">周辺の実取引価格（直近）</p>
        <p className="text-xs text-stone-400 mb-2">※国交省データ。公開まで約3ヶ月のタイムラグあり</p>
        {tradeItems.length === 0 ? (
          <p className="text-sm text-stone-400">周辺エリアにデータなし</p>
        ) : (
          <div className="space-y-2">
            {tradeItems.slice(0, 5).map((item, i) => (
              <div key={i} className="flex justify-between items-baseline gap-2">
                <span className="text-sm text-stone-500">
                  {item.Type || '—'}{item.Year && ` (${item.Year}年)`}
                </span>
                <span className="text-sm font-semibold text-stone-800 whitespace-nowrap">
                  {formatPrice(item.TradePrice)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
