export default function ZoningPanel({ zoning, road }) {
  const zoningFeatures = zoning?.zoning || []
  const urbanFeatures = zoning?.urban || []
  const roads = road?.roads || []

  const z = zoningFeatures[0]?.properties
  const u = urbanFeatures[0]?.properties

  const roadLabel = (highway) => {
    const map = {
      trunk: '主要幹線道路', primary: '国道', secondary: '県道',
      tertiary: '市道', residential: '住宅街道路',
      service: 'サービス道路', unclassified: '一般道',
    }
    return map[highway] || highway || '不明'
  }

  return (
    <div className="bg-white rounded-lg border border-stone-200 space-y-4" style={{ padding: '16px 20px' }}>
      <h2 className="font-semibold text-stone-800 flex items-center gap-2 text-base">
        <span>🏛️</span> 法令情報
      </h2>

      <div>
        <p className="text-sm text-stone-500 mb-2 font-medium">用途地域</p>
        {!u && !z ? (
          <p className="text-sm text-stone-400">データなし（要確認）</p>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-sm text-stone-500">用途地域</span>
              <span className="text-sm font-semibold text-stone-800 text-right">
                {u?.use_area_ja || z?.area_classification_ja || '要確認'}
              </span>
            </div>
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-sm text-stone-500">建ぺい率</span>
              <span className="text-sm font-semibold text-stone-800">
                {u?.u_building_coverage_ratio_ja || '要確認'}
              </span>
            </div>
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-sm text-stone-500">容積率</span>
              <span className="text-sm font-semibold text-stone-800">
                {u?.u_floor_area_ratio_ja || '要確認'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div>
        <p className="text-sm text-stone-500 mb-2 font-medium">
          接道道路
          {roads.length > 0 && (
            <span className="ml-1 text-xs bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">自動取得・参考値</span>
          )}
        </p>
        {roads.length === 0 ? (
          <p className="text-sm text-stone-400">データなし（要手動確認）</p>
        ) : (
          <div className="space-y-2">
            {roads.slice(0, 3).map((r, i) => (
              <div key={i} className="flex justify-between items-baseline gap-2">
                <span className="text-sm text-stone-700 font-medium truncate">
                  {r.name || roadLabel(r.highway)}
                </span>
                <span className="text-sm text-stone-500 whitespace-nowrap">
                  {r.width ? `${r.width}m${r.widthSource === 'estimated' ? '（推定）' : ''}` : '幅員不明'}
                  {r.oneway && ' 一方通行'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
