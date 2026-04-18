'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'

export default function MyPage() {
  const user = useAuth()
  const router = useRouter()
  const [info, setInfo] = useState(null)
  const [canceling, setCanceling] = useState(false)
  const [canceled, setCanceled] = useState(false)

  useEffect(() => {
    if (user === undefined) return
    if (!user) { router.replace('/login'); return }

    user.getIdToken().then((token) => {
      fetch('/api/user/info', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then(setInfo)
    })
  }, [user, router])

  const handleCancel = async () => {
    if (!confirm('月額プランを解約しますか？')) return
    setCanceling(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) { setCanceled(true); setInfo((p) => ({ ...p, plan: 'none', isMonthlyActive: false })) }
    } finally {
      setCanceling(false)
    }
  }

  const planLabel = (info) => {
    if (info.isAdmin) return '管理者'
    if (info.isMonthlyActive) return 'スタンダード（月額）'
    if (!info.freeUsed) return 'お試し（無料）'
    return '都度プラン'
  }

  if (user === undefined || !info) {
    return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><p className="text-stone-400 text-sm">読み込み中...</p></div>
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full bg-white rounded-2xl border border-stone-200 shadow-sm" style={{ maxWidth: '420px', padding: '40px 36px' }}>
        <div className="text-center mb-8">
          <button onClick={() => router.push('/')} style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif", fontSize: '22px', fontWeight: 900, color: '#1c1917', letterSpacing: '-0.5px' }}>
            Tocchi
          </button>
          <p className="text-stone-500 text-sm mt-1">マイページ</p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-stone-100">
            <span className="text-sm text-stone-500">メールアドレス</span>
            <span className="text-sm font-medium text-stone-800">{info.email}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-stone-100">
            <span className="text-sm text-stone-500">現在のプラン</span>
            <span className="text-sm font-semibold text-stone-800">{planLabel(info)}</span>
          </div>
          {info.isMonthlyActive && (
            <div className="flex justify-between items-center py-3 border-b border-stone-100">
              <span className="text-sm text-stone-500">今月の使用回数</span>
              <span className="text-sm font-semibold text-stone-800">{info.usageCount} / {info.usageLimit} 回</span>
            </div>
          )}
          {info.planExpiry && info.isMonthlyActive && (
            <div className="flex justify-between items-center py-3 border-b border-stone-100">
              <span className="text-sm text-stone-500">次回更新日</span>
              <span className="text-sm font-medium text-stone-800">{new Date(info.planExpiry).toLocaleDateString('ja-JP')}</span>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={() => router.push('/')}
            className="w-full bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-700 transition-colors"
            style={{ height: '44px' }}
          >
            住所を検索する
          </button>

          {info.isMonthlyActive && !canceled && (
            <button
              onClick={handleCancel}
              disabled={canceling}
              className="w-full border border-red-200 text-red-500 rounded-xl text-sm hover:bg-red-50 transition-colors disabled:opacity-40"
              style={{ height: '44px' }}
            >
              {canceling ? '処理中...' : '月額プランを解約する'}
            </button>
          )}
          {canceled && <p className="text-center text-xs text-stone-400">解約しました</p>}

          <button
            onClick={() => signOut(auth).then(() => router.push('/'))}
            className="w-full border border-stone-200 text-stone-500 rounded-xl text-sm hover:bg-stone-50 transition-colors"
            style={{ height: '44px' }}
          >
            ログアウト
          </button>
        </div>
      </div>
    </div>
  )
}
