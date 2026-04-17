export default function NearbyPanel({ places, school }) {
  const categories = places?.categories || []
  const elementary = school?.elementary?.[0]?.properties
  const junior = school?.junior?.[0]?.properties

  const fmtDistance = (m) => {
    if (!m) return ''
    if (m <= 500) return ''
    if (m < 1000) return `${Math.round(m)}m`
    return `${(m / 1000).toFixed(1)}km`
  }

  return (
    <div className="bg-white rounded-lg border border-stone-200 nearby-panel" style={{ maxHeight: '320px', overflowY: 'auto', fontSize: '14px', padding: '16px 20px' }}>
      <h2 className="font-semibold text-stone-800 flex items-center gap-2 text-base mb-4">
        <span>📍</span> 周辺施設
      </h2>

      {/* 学区 */}
      <div>
        <p className="font-bold text-stone-700">学区</p>
        <div className="mt-1">
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-stone-500">小学校区</span>
            <span className="font-semibold text-stone-800 text-right">
              {elementary?.A27_004_ja || elementary?.name || 'データなし'}
            </span>
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-stone-500">中学校区</span>
            <span className="font-semibold text-stone-800 text-right">
              {junior?.A32_004_ja || junior?.name || 'データなし'}
            </span>
          </div>
        </div>
      </div>

      {/* 周辺施設 */}
      {categories.map(({ type, label, places: ps }) => {
        const hasNearby = ps.some((p) => p.distance != null && p.distance <= 500)
        const sublabel = ps.length === 0 ? null : hasNearby ? '500m以内' : '最寄り'

        return (
          <div key={type} style={{ marginTop: '16px' }}>
            <p className="font-bold text-stone-700">
              {label}
              {sublabel && (
                <span className="ml-1.5 font-normal text-stone-400" style={{ fontSize: '12px' }}>（{sublabel}）</span>
              )}
            </p>
            {ps.length === 0 ? (
              <p className="text-stone-400 mt-1">なし</p>
            ) : (
              <div className="mt-1">
                {ps.slice(0, 3).map((p, i) => {
                  const dist = fmtDistance(p.distance)
                  return (
                    <div key={i} className="flex justify-between items-baseline gap-2">
                      <span className="text-stone-700 truncate">{p.name}</span>
                      {dist && <span className="text-stone-500 whitespace-nowrap">{dist}</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
