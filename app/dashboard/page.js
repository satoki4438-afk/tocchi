'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import dynamic from 'next/dynamic'
import PricePanel from '@/components/panels/PricePanel'
import ZoningPanel from '@/components/panels/ZoningPanel'
import HazardPanel from '@/components/panels/HazardPanel'
import NearbyPanel from '@/components/panels/NearbyPanel'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

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

      <div className="w-full px-6 py-4">
        {!allLoaded && (
          <div className="mb-3 text-xs text-stone-400 text-center print-hidden">
            情報を取得しています...
          </div>
        )}

        {/* 地図：全幅 */}
        <div className="bg-white rounded-lg border border-stone-200 overflow-hidden mb-4 print-map" style={{ height: '60vh' }}>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 print-panels" style={{ gap: '16px' }}>
          <PricePanel trade={data.trade} landprice={data.landprice} />
          <ZoningPanel zoning={data.zoning} road={data.road} />
          <HazardPanel hazard={data.hazard} />
          <NearbyPanel places={data.places} school={data.school} />
        </div>
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
