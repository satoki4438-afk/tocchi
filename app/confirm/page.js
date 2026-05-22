'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import dynamic from 'next/dynamic'
import { BETA_CLOSED } from '@/lib/betaMode'

const ConfirmMap = dynamic(() => import('@/components/ConfirmMap'), { ssr: false })

function ConfirmContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const user = useAuth()

  const address = searchParams.get('address')
  const initLat = parseFloat(searchParams.get('lat'))
  const initLng = parseFloat(searchParams.get('lng'))

  const [currentLat, setCurrentLat] = useState(initLat)
  const [currentLng, setCurrentLng] = useState(initLng)
  const [mapKey, setMapKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isFreeUsed, setIsFreeUsed] = useState(false)

  useEffect(() => {
    if (!address || isNaN(initLat) || isNaN(initLng)) {
      router.replace('/')
      return
    }
    setIsFreeUsed(localStorage.getItem('tocchi_free_used') === 'true')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const resetPin = () => {
    setCurrentLat(initLat)
    setCurrentLng(initLng)
    setMapKey((k) => k + 1)
  }

  const proceedStripe = async (amount) => {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, lat: currentLat, lng: currentLng, amount }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setError('決済の開始に失敗しました')
  }

  const handleConfirm = async () => {
    if (!address || !currentLat || !currentLng) return

    // 未ログイン
    if (!user) {
      if (!isFreeUsed) {
        localStorage.setItem('tocchi_free_used', 'true')
        router.push(`/dashboard?address=${encodeURIComponent(address)}&lat=${currentLat}&lng=${currentLng}&access=free`)
      } else {
        const confirmUrl = `/confirm?address=${encodeURIComponent(address)}&lat=${initLat}&lng=${initLng}`
        router.push(`/login?redirect=${encodeURIComponent(confirmUrl)}`)
      }
      return
    }

    // ログイン済み
    setLoading(true)
    setError('')
    try {
      const idToken = await user.getIdToken()
      const res = await fetch('/api/user/check-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      const data = await res.json()

      if (data.status === 'free' || data.status === 'monthly') {
        router.push(`/dashboard?address=${encodeURIComponent(address)}&lat=${currentLat}&lng=${currentLng}&access=auth`)
      } else if (data.status === 'need_payment_100') {
        await proceedStripe(100)
      } else {
        // TODO: Stripe側の商品名・領収書表示は管理画面で要更新（旧¥200→新¥300）
        await proceedStripe(300)
      }
    } catch {
      setError('エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const btnLabel = () => {
    if (loading) return '確認中...'
    if (!user) return isFreeUsed ? 'ログインして調査する' : '無料でこの地点を調査する（1回）'
    return 'この地点で調査する'
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

  if (!address || isNaN(initLat) || isNaN(initLng)) return null

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 px-6 py-3">
        <button
          onClick={() => router.push('/')}
          style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif", fontSize: '20px', fontWeight: 900, color: '#1c1917', letterSpacing: '-0.5px' }}
        >
          Tocchi
        </button>
      </header>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px' }}>
        <h1 className="font-bold text-stone-800 mb-1" style={{ fontSize: '20px' }}>調査地点を確認</h1>
        <p className="text-stone-600 text-sm mb-1">{address}</p>
        <p className="text-stone-400 text-xs mb-4">ピンを動かして、実際に調査したい位置に合わせてください。</p>

        <div className="rounded-xl overflow-hidden border border-stone-200 mb-3" style={{ height: 'min(52vh, 460px)', minHeight: '280px' }}>
          <ConfirmMap
            key={mapKey}
            lat={initLat}
            lng={initLng}
            onLocationChange={(lat, lng) => { setCurrentLat(lat); setCurrentLng(lng) }}
          />
        </div>

        <p className="text-xs text-stone-400 text-center mb-4">
          調整後の地点：{currentLat.toFixed(6)}, {currentLng.toFixed(6)}
        </p>

        <div className="flex flex-col gap-2" style={{ maxWidth: '480px', margin: '0 auto' }}>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#1c1917', fontSize: '15px' }}
          >
            {btnLabel()}
          </button>

          <button
            onClick={resetPin}
            className="w-full py-2 rounded-lg border border-stone-300 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
          >
            元の検索地点に戻す
          </button>

          <p className="text-xs text-stone-400 text-center">
            ピン位置確定後に調査メモを作成します。
          </p>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        </div>
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-500 text-sm">読み込み中...</p>
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  )
}
