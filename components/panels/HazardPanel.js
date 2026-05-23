export default function HazardPanel({ hazard }) {
  const h = hazard?.hazard || {}
  const lf = hazard?.liquefaction?.[0]?.properties

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

      <div className="border-t border-stone-100 pt-3">
        <p className="text-sm text-stone-500 mb-2 font-medium">液状化しやすさ</p>
        {!lf ? (
          <p className="text-sm text-stone-400">データなし（地盤調査推奨）</p>
        ) : (
          <div className="space-y-1">
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-sm text-stone-500">判定</span>
              <span className="text-sm font-semibold text-stone-800 text-right">
                {lf.note || '要確認'}（レベル{lf.liquefaction_tendency_level}）
              </span>
            </div>
            {lf.topographic_classification_name_ja && (
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-sm text-stone-500">地形</span>
                <span className="text-sm text-stone-600 text-right" style={{ maxWidth: '160px' }}>
                  {lf.topographic_classification_name_ja}
                </span>
              </div>
            )}
            <p className="text-xs text-stone-400 leading-relaxed pt-1">
              この地点の液状化傾向は参考情報です。地盤状況・造成履歴・地盤改良の要否は、地盤調査会社・建築士・自治体資料で確認してください。
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-stone-400">
        ※国土交通省 不動産情報ライブラリ。詳細はハザードマップポータルで確認してください。
      </p>

      <div className="border-t border-stone-100 pt-3 space-y-0.5">
        <p className="text-xs text-stone-400">出典：国土交通省 不動産情報ライブラリ</p>
        <p className="text-xs text-stone-400">取得日：{new Date().toLocaleDateString('ja-JP')}</p>
        <p className="text-xs text-stone-400">ステータス：参考情報・要確認</p>
      </div>
    </div>
  )
}
