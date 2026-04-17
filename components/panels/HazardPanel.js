export default function HazardPanel({ hazard }) {
  const h = hazard?.hazard || {}

  const items = [
    { key: 'flood',      label: '洪水浸水想定区域' },
    { key: 'hightide',   label: '高潮浸水想定区域' },
    { key: 'tsunami',    label: '津波浸水想定区域' },
    { key: 'sediment',   label: '土砂災害警戒区域' },
    { key: 'danger',     label: '災害危険区域' },
    { key: 'steep',      label: '急傾斜地崩壊危険区域' },
    { key: 'landslide',  label: '地すべり防止区域' },
    { key: 'embankment', label: '大規模盛土造成地' },
  ]

  return (
    <div className="bg-white rounded-lg border border-stone-200 space-y-3" style={{ padding: '16px 20px' }}>
      <h2 className="font-semibold text-stone-800 flex items-center gap-2 text-base">
        <span>⚠️</span> ハザード情報
      </h2>

      <div className="space-y-2">
        {items.map(({ key, label }) => {
          const features = h[key] || []
          const safe = features.length === 0
          const props = features[0]?.properties

          return (
            <div key={key} className="flex items-center justify-between gap-2">
              <span className="text-sm text-stone-600">{label}</span>
              <div className="text-right">
                {safe ? (
                  <span className="text-sm text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                    区域外
                  </span>
                ) : (
                  <div>
                    <span className="text-sm text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full">
                      区域内
                    </span>
                    {props && (
                      <p className="text-xs text-stone-400 mt-0.5 max-w-[140px] text-right">
                        {props.A31b_201 || props.rank || props.name || ''}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-stone-400">
        ※国土交通省 不動産情報ライブラリ。詳細はハザードマップポータルで確認してください。
      </p>
    </div>
  )
}
