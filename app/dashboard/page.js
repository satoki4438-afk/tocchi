'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import dynamic from 'next/dynamic'
import PricePanel from '@/components/panels/PricePanel'
import ZoningPanel from '@/components/panels/ZoningPanel'
import HazardPanel from '@/components/panels/HazardPanel'
import NearbyPanel from '@/components/panels/NearbyPanel'
import { getMunicipalityLinks } from '@/lib/municipalityLinks'
import { BETA_CLOSED } from '@/lib/betaMode'

const LINK_KEYS = ['roadMap', 'cityPlanMap', 'hazardMap', 'firePrevention', 'waterSewer', 'culturalAssets']

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

function buildSummaryData(data) {
  const u = data.zoning?.urban?.[0]?.properties
  const z = data.zoning?.zoning?.[0]?.properties
  const fp = data.zoning?.firePrevention?.[0]?.properties
  const cp = data.zoning?.cityPlanningRoad
  const zoning = {
    useArea: u?.use_area_ja || z?.area_classification_ja || null,
    buildingCoverageRatio: u?.u_building_coverage_ratio_ja || null,
    floorAreaRatio: u?.u_floor_area_ratio_ja || null,
    firePrevention: fp?.fire_prevention_ja || null,
    cityPlanningRoad: cp || null,
  }

  const HAZARD_LABELS = {
    flood: '洪水浸水想定区域', hightide: '高潮浸水想定区域',
    tsunami: '津波浸水想定区域', sediment: '土砂災害警戒区域',
    danger: '災害危険区域', steep: '急傾斜地崩壊危険区域',
    landslide: '地すべり防止区域', embankment: '大規模盛土造成地',
  }
  const h = data.hazard?.hazard || {}
  const hazard = {}
  for (const [key, label] of Object.entries(HAZARD_LABELS)) {
    const features = h[key] || []
    hazard[key] = {
      label,
      hit: features.length > 0,
      detail: features[0]?.properties?.A31b_201 || features[0]?.properties?.rank || features[0]?.properties?.name || null,
    }
  }

  const HIGHWAY_LABEL = {
    trunk: '主要幹線道路', primary: '国道', secondary: '県道',
    tertiary: '市道', residential: '住宅街道路',
    service: 'サービス道路', unclassified: '一般道',
  }
  const roads = (data.road?.roads || []).slice(0, 2).map(r => ({
    name: r.name || HIGHWAY_LABEL[r.highway] || r.highway || '不明',
    width: r.width,
    widthSource: r.widthSource,
    oneway: r.oneway,
  }))

  const lf = data.landprice?.features?.[0]
  const landprice = lf ? {
    location: lf.properties?.location || lf.properties?.standard_lot_number_ja || '最近接地点',
    price: lf.properties?.u_current_years_price_ja || null,
  } : null

  const fmtPrice = (val) => {
    const n = parseInt(val, 10)
    if (isNaN(n)) return '—'
    return n >= 10000 ? `${(n / 10000).toFixed(0)}万円` : `${n.toLocaleString()}円`
  }
  const tradeItems = (data.trade?.items || []).slice(0, 5).map(t => ({
    type: t.Type || '—',
    year: t.Year || '—',
    price: fmtPrice(t.TradePrice),
  }))

  const ep = data.school?.elementary?.[0]?.properties
  const jp = data.school?.junior?.[0]?.properties
  const school = {
    elementary: ep?.A27_004_ja || ep?.name || null,
    junior: jp?.A32_004_ja || jp?.name || null,
  }

  const nearby = (data.places?.categories || []).map(cat => {
    const first = cat.places?.[0]
    if (!first) return null
    return { label: cat.label, name: first.name, distance: first.distance }
  }).filter(Boolean)

  return { zoning, hazard, roads, landprice, tradeItems, school, nearby }
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const address = searchParams.get('address')
  const lat = parseFloat(searchParams.get('lat'))
  const lng = parseFloat(searchParams.get('lng'))
  const sessionId = searchParams.get('session_id')
  const access = searchParams.get('access')
  const user = useAuth()

  const [verified, setVerified] = useState(false)
  const [verifyError, setVerifyError] = useState(false)
  const [showLegend, setShowLegend] = useState(true)
  const [printModal, setPrintModal] = useState(false)
  const [printOpts, setPrintOpts] = useState({ map: true, legend: true, panels: true })
  const [data, setData] = useState({
    trade: null, landprice: null, zoning: null,
    hazard: null, school: null, places: null, road: null,
  })
  const [loadingState, setLoadingState] = useState({
    trade: true, landprice: true, zoning: true,
    hazard: true, school: true, places: true, road: true,
  })
  const fetchedRef = useRef(false)
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState('')
  const [summaryGenerated, setSummaryGenerated] = useState(false)
  const [muniCd, setMuniCd] = useState('')
  const [copied, setCopied] = useState(false)

  const doFetch = () => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const setOne = (key, val) => {
      setData((prev) => ({ ...prev, [key]: val }))
      setLoadingState((prev) => ({ ...prev, [key]: false }))
    }

    fetch(`/api/geocode?q=${encodeURIComponent(address)}`)
      .then((r) => r.json())
      .then((d) => {
        const match = d.results?.[0]
        const prefCd = match?.prefCd || ''
        const city = match?.muniCd || ''
        setMuniCd(match?.muniCd || '')
        fetch(`/api/mlit/trade?pref=${prefCd}&city=${city}`)
          .then((r) => r.json())
          .then((v) => setOne('trade', v))
          .catch(() => setOne('trade', { items: [] }))
      })
      .catch(() => setOne('trade', { items: [] }))

    const spatialApis = [
      { key: 'landprice', path: `/api/mlit/landprice?lat=${lat}&lng=${lng}` },
      { key: 'zoning',    path: `/api/mlit/zoning?lat=${lat}&lng=${lng}` },
      { key: 'hazard',    path: `/api/mlit/hazard?lat=${lat}&lng=${lng}` },
      { key: 'school',    path: `/api/mlit/school?lat=${lat}&lng=${lng}` },
      { key: 'places',    path: `/api/places?lat=${lat}&lng=${lng}` },
      { key: 'road',      path: `/api/road?lat=${lat}&lng=${lng}` },
    ]
    for (const { key, path } of spatialApis) {
      fetch(path)
        .then((r) => r.json())
        .then((v) => setOne(key, v))
        .catch(() => setOne(key, null))
    }
  }

  // 認証チェック＋データ取得を同時起動
  useEffect(() => {
    if (BETA_CLOSED) return
    if (!address || !lat || !lng) { router.replace('/'); return }
    if (user === undefined) return // Firebase auth 読み込み中

    if (sessionId) {
      fetch(`/api/stripe/verify?session_id=${sessionId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.valid) { setVerified(true); doFetch() }
          else setVerifyError(true)
        })
        .catch(() => setVerifyError(true))
    } else if (access === 'free') {
      if (localStorage.getItem('tocchi_free_used') === 'true') {
        setVerified(true); doFetch()
      } else {
        router.replace('/')
      }
    } else if (access === 'auth') {
      if (user) {
        setVerified(true); doFetch()
      } else {
        router.replace('/login')
      }
    } else {
      router.replace('/')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const execPrint = () => {
    setPrintModal(false)
    const { map, legend, panels } = printOpts
    document.body.setAttribute('data-print-map',    map    ? '1' : '0')
    document.body.setAttribute('data-print-legend', legend ? '1' : '0')
    document.body.setAttribute('data-print-panels', panels ? '1' : '0')
    setTimeout(() => {
      window.print()
      setTimeout(() => {
        document.body.removeAttribute('data-print-map')
        document.body.removeAttribute('data-print-legend')
        document.body.removeAttribute('data-print-panels')
      }, 500)
    }, 100)
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const mLinks = getMunicipalityLinks(muniCd)

  const generateSummary = async () => {
    setSummaryLoading(true)
    setSummaryError('')
    try {
      const summaryData = buildSummaryData(data)
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, summaryData }),
      })
      const json = await res.json()
      if (json.error) { setSummaryError(json.error); return }
      setSummary(json.summary)
      setSummaryGenerated(true)
    } catch {
      setSummaryError('AI要点整理の生成に失敗しました。')
    } finally {
      setSummaryLoading(false)
    }
  }

  if (BETA_CLOSED) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-stone-600">現在ベータ調整中です。</p>
          <button onClick={() => router.push('/')} className="px-6 py-2 bg-stone-800 text-white rounded-lg text-sm">
            トップへ戻る
          </button>
        </div>
      </div>
    )
  }

  if (verifyError) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-stone-600">支払いが確認できませんでした。</p>
          <button onClick={() => router.push('/')} className="px-6 py-2 bg-stone-800 text-white rounded-lg text-sm">
            トップに戻る
          </button>
        </div>
      </div>
    )
  }

  if (!verified) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-500 text-sm">確認中...</p>
      </div>
    )
  }

  const allLoaded = Object.values(loadingState).every((v) => !v)

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 px-6 py-3 flex items-center print-hidden" style={{ position: 'relative' }}>
        <button onClick={() => router.push('/')} className="hover:opacity-70 flex-shrink-0" style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif", fontSize: '20px', fontWeight: 900, color: '#1c1917', letterSpacing: '-0.5px' }}>
          Tocchi
        </button>
        <div className="truncate" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: '16px', fontWeight: 600, color: '#1c1917', maxWidth: '40%', textAlign: 'center' }}>{address}</div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          <button onClick={() => setPrintModal(true)} className="text-xs text-stone-500 border border-stone-200 px-3 py-1 rounded-md hover:bg-stone-50">
            印刷する
          </button>
          <button onClick={() => router.push('/mypage')} className="text-xs text-stone-500 border border-stone-200 px-3 py-1 rounded-md hover:bg-stone-50">
            マイページ
          </button>
          <button onClick={() => router.push('/')} className="text-xs text-stone-500 border border-stone-200 px-3 py-1 rounded-md hover:bg-stone-50">
            別の住所
          </button>
        </div>
      </header>

      <div className="w-full px-6 py-3">
        {!allLoaded && (
          <div className="mb-3 text-xs text-stone-400 text-center print-hidden">
            情報を取得しています...
          </div>
        )}

        {/* 地図：全幅 */}
        <div className="bg-white rounded-lg border border-stone-200 overflow-hidden mb-3 print-map" style={{ height: 'min(48vh, 460px)', minHeight: '300px' }}>
          {lat && lng && (
            <MapView
              lat={lat} lng={lng} address={address}
              tradePoints={data.trade?.items || []}
              landPoints={data.landprice?.features || []}
              zoningFeatures={data.zoning?.urban || []}
              roads={data.road?.roads || []}
              places={data.places?.categories || []}
              showLegend={showLegend}
            />
          )}
        </div>

        {/* パネル：2×2グリッド */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 print-panels" style={{ gap: '10px' }}>
          <PricePanel trade={data.trade} landprice={data.landprice} />
          <ZoningPanel zoning={data.zoning} road={data.road} />
          <HazardPanel hazard={data.hazard} />
          <NearbyPanel places={data.places} school={data.school} />
        </div>

        {/* AI要点整理 */}
        <div style={{ marginTop: '10px' }}>
          <div className="print-hidden flex flex-col items-center">
            <button
              onClick={generateSummary}
              disabled={!allLoaded || summaryLoading || summaryGenerated}
              className="rounded-lg border border-stone-300 font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ padding: '7px 20px', fontSize: '13px', color: summaryGenerated ? '#a8a29e' : '#1c1917', background: summaryGenerated ? '#fafaf9' : '#fff' }}
            >
              {summaryLoading ? 'AI要点整理を作成中...' : summaryGenerated ? '生成済み' : 'AI要点整理を生成'}
            </button>
            {summaryError && (
              <p className="mt-2 text-sm text-red-500 text-center">{summaryError}</p>
            )}
          </div>
          {summary && (
            <div className="bg-white rounded-xl border border-stone-200" style={{ marginTop: '12px', padding: '20px 24px' }}>
              <h3 className="font-semibold text-stone-800" style={{ fontSize: '14px', marginBottom: '12px' }}>AI要点整理</h3>
              <p className="text-stone-700 leading-relaxed" style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>{summary}</p>
              <p className="text-stone-400" style={{ fontSize: '11px', marginTop: '12px' }}>
                このAI要点整理は参考情報です。法的判断・専門的助言を含みません。転記前に宅地建物取引士による確認が必要です。
              </p>
            </div>
          )}
        </div>

        {/* 公式確認リンク */}
        <div className="print-hidden" style={{ marginTop: '10px' }}>
          <div className="bg-white rounded-xl border border-stone-200" style={{ padding: '12px 16px' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-stone-800" style={{ fontSize: '14px' }}>🏛️ 公式確認リンク</h3>
              {mLinks && (
                <span className="text-xs text-stone-400">{mLinks.pref} {mLinks.city}</span>
              )}
            </div>

            {/* 住所コピー */}
            <button
              onClick={copyAddress}
              className="w-full text-left rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors"
              style={{ padding: '8px 12px', marginBottom: '8px', fontSize: '13px', color: copied ? '#059669' : '#1c1917' }}
            >
              {copied ? '✓ コピーしました' : '📋 住所をコピー'}
            </button>

            {mLinks ? (
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '2px' }}>
                {LINK_KEYS.map(key => {
                  const link = mLinks.links[key]
                  if (!link) return null
                  const href = link.url
                    ? (link.supportsLatLng ? link.url.replace('{lat}', lat).replace('{lng}', lng) : link.url)
                    : mLinks.officialSite
                  return (
                    <a
                      key={key}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg hover:bg-stone-50 transition-colors min-w-0"
                      style={{ padding: '6px 10px', fontSize: '12px', color: '#1c1917', textDecoration: 'none' }}
                    >
                      <span className="truncate mr-2">{link.label}</span>
                      <span className="text-stone-400 flex-shrink-0" style={{ fontSize: '11px' }}>
                        {link.url ? '開く →' : '確認 →'}
                      </span>
                    </a>
                  )
                })}
                <a
                  href={mLinks.officialSite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg hover:bg-stone-50 transition-colors min-w-0"
                  style={{ padding: '6px 10px', fontSize: '12px', color: '#1c1917', textDecoration: 'none' }}
                >
                  <span className="truncate mr-2">自治体公式サイト</span>
                  <span className="text-stone-400 flex-shrink-0" style={{ fontSize: '11px' }}>開く →</span>
                </a>
              </div>
            ) : (
              <div>
                <p className="text-stone-400" style={{ fontSize: '11px', padding: '0 4px 6px' }}>
                  この自治体は未対応です。住所をコピーして各窓口にお問い合わせください。
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '2px' }}>
                  {[
                    { label: '指定道路図を検索', q: ' 指定道路図' },
                    { label: '都市計画図を検索', q: ' 都市計画図' },
                    { label: 'ハザードマップを検索', q: ' ハザードマップ' },
                  ].map(({ label, q }) => (
                    <a
                      key={q}
                      href={`https://www.google.com/search?q=${encodeURIComponent((address || '') + q)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg hover:bg-stone-50 transition-colors min-w-0"
                      style={{ padding: '6px 10px', fontSize: '12px', color: '#1c1917', textDecoration: 'none' }}
                    >
                      <span className="truncate mr-2">{label}</span>
                      <span className="text-stone-400 flex-shrink-0" style={{ fontSize: '11px' }}>検索 →</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-xs text-stone-400 leading-relaxed text-center" style={{ maxWidth: '720px', margin: '16px auto 0' }}>
          本サービスの情報は公開データおよび外部APIをもとにした参考情報です。重要事項説明書への転記前に、必ず原典資料・自治体資料・現地確認を行ってください。
        </p>
      </div>

      {/* 印刷モーダル */}
      {printModal && (
        <div className="fixed inset-0 flex items-center justify-center print-hidden" style={{ zIndex: 200, background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-80 flex flex-col gap-5">
            <h2 className="font-bold text-stone-800 text-lg">印刷オプション</h2>
            <div className="flex flex-col gap-3">
              {[
                { key: 'map',    label: '地図を含む' },
                { key: 'legend', label: '凡例を含む' },
                { key: 'panels', label: 'データパネルを含む' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={printOpts[key]}
                    onChange={(e) => setPrintOpts((p) => ({ ...p, [key]: e.target.checked }))}
                    className="w-4 h-4 accent-stone-700"
                  />
                  <span className="text-sm text-stone-700">{label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setPrintModal(false)}
                className="flex-1 py-2 text-sm text-stone-500 border border-stone-200 rounded-lg hover:bg-stone-50"
              >
                キャンセル
              </button>
              <button
                onClick={execPrint}
                className="flex-1 py-2 text-sm font-semibold text-white bg-stone-800 rounded-lg hover:bg-stone-700"
              >
                印刷実行
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

          .print-hidden { display: none !important; }

          .mapboxgl-canvas-container,
          .mapboxgl-canvas { display: block !important; opacity: 1 !important; visibility: visible !important; }
          .mapboxgl-map { overflow: visible !important; }

          /* 地図非表示 */
          body[data-print-map="0"] .print-map { display: none !important; }
          body[data-print-map="1"] .print-map { height: 110mm !important; break-inside: avoid; }
          /* 凡例非表示 */
          body[data-print-legend="0"] .mapboxgl-ctrl-top-right { display: none !important; }
          /* パネル非表示 */
          body[data-print-panels="0"] .print-panels { display: none !important; }
          body[data-print-panels="1"] .print-panels {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 6px !important;
            break-inside: avoid;
          }
          body[data-print-panels="1"] .print-panels * { font-size: 9px !important; }
          body[data-print-panels="1"] .print-panels h2 { font-size: 10px !important; }
          /* 地図のみ（パネルなし）の場合は地図を拡大 */
          body[data-print-map="1"][data-print-panels="0"] .print-map { height: 200mm !important; }
          .nearby-panel { max-height: none !important; overflow: visible !important; }
        }
      `}</style>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-500 text-sm">読み込み中...</p>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
