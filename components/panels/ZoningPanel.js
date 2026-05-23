export default function ZoningPanel({ zoning, road }) {
  const zoningFeatures = zoning?.zoning || []
  const urbanFeatures = zoning?.urban || []
  const fpFeatures = zoning?.firePrevention || []
  const roads = road?.roads || []

  const z = zoningFeatures[0]?.properties
  const u = urbanFeatures[0]?.properties
  const fp = fpFeatures[0]?.properties
  const cp = zoning?.cityPlanningRoad

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

      <div className="border-t border-stone-100 pt-4">
        <p className="text-sm text-stone-500 mb-2 font-medium">防火・準防火地域</p>
        {!fp ? (
          <p className="text-sm text-stone-400">データなし（都市計画課確認推奨）</p>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-sm text-stone-500">区分</span>
              <span className="text-sm font-semibold text-stone-800 text-right">
                {fp.fire_prevention_ja || '要確認'}
              </span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              該当する場合、防火仕様により建築費へ影響する可能性があります。準耐火建築物・防火設備等の要否は建築士または自治体窓口で確認してください。
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-stone-100 pt-4">
        <p className="text-sm text-stone-500 mb-2 font-medium">都市計画道路</p>
        {!cp || cp.nearbyLevel === 'none' ? (
          <p className="text-sm text-stone-400">このタイル範囲では都市計画道路のデータなし（都市計画課確認推奨）</p>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-sm text-stone-500">計画線との距離</span>
              <span className="text-sm font-semibold text-stone-800 text-right">
                約{cp.minDistanceM}m
              </span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              {cp.nearbyLevel === 'near'
                ? '対象地またはその直近に都市計画道路の計画線がある可能性があります。'
                : '周辺約100m以内に都市計画道路の計画線がある可能性があります。'
              }
              計画線の位置・事業化状況・建築制限の有無は、自治体の都市計画課で確認してください。
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-stone-100 pt-4">
        <p className="text-sm text-stone-500 mb-2 font-medium">
          接道候補
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

      <p className="text-xs text-stone-400 leading-relaxed">
        OSM / Overpass API をもとに周辺道路を表示しています。建築基準法上の道路種別、幅員、接道義務の充足は、自治体資料・道路台帳・現地確認が必要です。
      </p>

      <div className="border-t border-stone-100 pt-3 space-y-0.5">
        <p className="text-xs text-stone-400">出典：国土交通省 不動産情報ライブラリ / OpenStreetMap</p>
        <p className="text-xs text-stone-400">取得日：{new Date().toLocaleDateString('ja-JP')}</p>
        <p className="text-xs text-stone-400">ステータス：参考情報・要確認</p>
      </div>
    </div>
  )
}
