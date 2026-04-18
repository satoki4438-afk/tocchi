'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'

function SearchBox() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isFreeUsed, setIsFreeUsed] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef(null)
  const router = useRouter()
  const user = useAuth()

  useEffect(() => {
    setIsFreeUsed(localStorage.getItem('tocchi_free_used') === 'true')
  }, [])

  useEffect(() => {
    if (query.length < 3) { setSuggestions([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setSuggestions(data.results || [])
    }, 400)
  }, [query])

  const proceedFree = (item) => {
    localStorage.setItem('tocchi_free_used', 'true')
    router.push(`/dashboard?address=${encodeURIComponent(item.address)}&lat=${item.lat}&lng=${item.lng}&access=free`)
  }

  const proceedStripe = async (item, amount) => {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: item.address, lat: item.lat, lng: item.lng, amount }),
    })
    const data = await res.json()
    if (data.url) { window.location.href = data.url }
    else { setError('決済の開始に失敗しました') }
  }

  const proceed = async (item) => {
    if (item.addressCode?.length === 5) {
      setError('もう少し詳しい住所を入力してください（例：渋谷区神南一丁目）')
      return
    }

    // 未ログイン
    if (!user) {
      if (!isFreeUsed) {
        proceedFree(item)
      } else {
        router.push(`/login?redirect=${encodeURIComponent('/')}`)
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
        router.push(`/dashboard?address=${encodeURIComponent(item.address)}&lat=${item.lat}&lng=${item.lng}&access=auth`)
      } else if (data.status === 'need_payment_100') {
        await proceedStripe(item, 100)
      } else {
        await proceedStripe(item, 200)
      }
    } catch {
      setError('エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (item) => {
    setSelected(item)
    setQuery(item.address)
    setSuggestions([])
  }

  const handleEnter = async () => {
    if (selected) { proceed(selected); return }
    if (suggestions.length > 0) {
      const first = suggestions[0]
      setSelected(first)
      setQuery(first.address)
      setSuggestions([])
      proceed(first)
      return
    }
    if (query.length >= 3) {
      setLoading(true)
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        const first = data.results?.[0]
        if (first) { setSelected(first); setQuery(first.address); proceed(first) }
        else { setError('住所が見つかりませんでした') }
      } catch {
        setError('エラーが発生しました')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="w-full" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            autoComplete="off"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleEnter() }}
            placeholder="例：東京都渋谷区神南一丁目"
            className="w-full rounded-xl border border-stone-200 bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 shadow-sm"
            style={{ fontSize: '16px', height: '52px', padding: '0 20px' }}
            disabled={loading}
          />
          {suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden" style={{ zIndex: 100 }}>
              {suggestions.map((item, i) => (
                <li
                  key={i}
                  onClick={() => { handleSelect(item); proceed(item) }}
                  className="px-5 py-3 text-sm text-stone-700 hover:bg-stone-50 cursor-pointer border-b border-stone-100 last:border-0"
                >
                  {item.address}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          onClick={handleEnter}
          disabled={loading || query.length < 3}
          className="bg-stone-900 text-white rounded-xl font-semibold hover:bg-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap text-sm"
          style={{ height: '52px', padding: '0 24px' }}
        >
          {loading ? '検索中...' : user ? '検索する' : isFreeUsed ? 'ログインして検索' : '無料で試す'}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-500 text-center">{error}</p>}
    </div>
  )
}

const BENEFITS = [
  {
    title: '周辺相場がわかる',
    desc: '国土交通省の公示地価・実取引データから周辺の価格水準を即表示。根拠ある価格交渉が可能に。',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    title: '用途地域・法令がわかる',
    desc: '用途地域・建ぺい率・容積率・接道道路を自動取得。重要事項の確認作業が大幅に短縮される。',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    title: 'ハザードリスクがわかる',
    desc: '洪水・津波・土砂・高潮・災害危険区域の5種を一括判定。購入前のリスク確認をワンストップで。',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    title: '学区・周辺施設がわかる',
    desc: '小中学校の学区を公的データで表示。病院・スーパー・コンビニ・駅の距離も自動取得。',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
]

const USECASES = [
  {
    target: '不動産営業の方へ',
    title: '重説の下調べが30秒に',
    desc: '住所を入れるだけで、用途地域・ハザード・相場データが揃う。下調べにかかっていた時間を商談に回せる。',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7">
        <path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
        <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
      </svg>
    ),
  },
  {
    target: '家を買う方へ',
    title: '安全な土地か一発確認',
    desc: 'ハザードマップを自分で調べる必要なし。洪水・土砂・津波リスクを住所入力だけで確認できる。',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    target: '土地を売る方へ',
    title: '適正価格の根拠をすぐ出せる',
    desc: '公示地価・実取引価格を即表示。「この価格の根拠」を数字で示せるから交渉がスムーズになる。',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
]

const PLANS = [
  { name: 'お試し',       price: '無料',   unit: '1回限り',  note: 'ログイン不要' },
  { name: '都度プラン',   price: '¥200',   unit: '/ 回',    note: 'Stripeで即決済' },
  { name: 'スタンダード', price: '¥980',   unit: '/ 月',    note: '近日公開' },
  { name: 'プロ',         price: '¥2,980', unit: '/ 月',    note: '近日公開' },
]

const STEPS = [
  {
    num: '01',
    title: '住所を入力する',
    desc: '調べたい物件の住所を入力するだけ。サジェストから選ぶだけでOK。',
  },
  {
    num: '02',
    title: '情報が一画面に揃う',
    desc: '相場・用途地域・ハザード・周辺施設が自動で取得され、地図付きで表示される。',
  },
  {
    num: '03',
    title: '印刷・共有できる',
    desc: '調査結果をそのまま印刷。A4横レイアウトで地図もパネルも1枚に収まる。',
  },
]

const W = { maxWidth: '1100px', margin: '0 auto' }

function Header() {
  const user = useAuth()
  const router = useRouter()
  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e7e5e4' }}>
      <div style={{ ...W, padding: '0 32px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif", fontSize: '20px', fontWeight: 900, letterSpacing: '-0.5px', color: '#1c1917' }}>
          Tocchi
        </span>
        <div className="flex items-center gap-3">
          {user === undefined ? null : user ? (
            <>
              <button
                onClick={() => router.push('/mypage')}
                className="text-xs text-stone-500 border border-stone-200 rounded-lg px-3 py-1.5 hover:bg-stone-50"
              >
                マイページ
              </button>
            </>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="text-xs text-stone-700 font-semibold border border-stone-300 rounded-lg px-3 py-1.5 hover:bg-stone-50"
            >
              ログイン
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-stone-800">

      {/* 固定ヘッダー */}
      <Header />

      {/* ヘッダー分のスペース */}
      <div style={{ height: '56px' }} />

      {/* ヒーロー */}
      <section className="relative" style={{ background: 'linear-gradient(135deg, #1c1917 0%, #292524 40%, #1c3a4a 100%)' }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="absolute pointer-events-none" style={{ top: '0%', left: '60%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)', borderRadius: '50%' }} />

        <div className="relative flex flex-col items-center text-center px-6 py-20" style={{ zIndex: 10 }}>
          <h1 className="text-white font-bold leading-tight" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '-0.02em' }}>
            住所ひとつで、土地調査
          </h1>
          <p className="mt-4 text-stone-300" style={{ fontSize: '18px', maxWidth: '480px' }}>
            相場・法令・ハザード・周辺施設を一画面に
          </p>
          <div className="mt-10 w-full px-4">
            <SearchBox />
          </div>
          <p className="mt-4 text-stone-500 text-sm">初回無料 — クレジットカード不要</p>
        </div>
      </section>

      {/* 使い方3ステップ */}
      <section style={{ padding: '96px 32px', background: '#fafaf9' }}>
        <div style={{ ...W, maxWidth: '560px' }}>
          <h2 className="text-center font-bold text-stone-800 mb-16" style={{ fontSize: '26px' }}>3ステップで完結</h2>
          <div className="flex flex-col">
            {STEPS.map(({ num, title, desc }, i) => (
              <div key={num} className="flex gap-6">
                {/* 左：番号＋縦線 */}
                <div className="flex flex-col items-center" style={{ minWidth: '40px' }}>
                  <div className="flex items-center justify-center font-bold text-stone-800 bg-white border-2 border-stone-300 rounded-full flex-shrink-0" style={{ width: '40px', height: '40px', fontSize: '13px', fontFamily: "'Arial Black', sans-serif" }}>
                    {num}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: '2px', flex: 1, minHeight: '40px', background: '#e7e5e4', margin: '6px 0' }} />
                  )}
                </div>
                {/* 右：テキスト */}
                <div style={{ paddingBottom: i < STEPS.length - 1 ? '36px' : 0 }}>
                  <h3 className="font-bold text-stone-800" style={{ fontSize: '17px', marginBottom: '6px' }}>{title}</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ベネフィット4本柱 */}
      <section id="benefits" style={{ padding: '96px 32px', background: '#fff' }}>
        <div style={W}>
          <h2 className="text-center font-bold text-stone-800 mb-16" style={{ fontSize: '26px' }}>一画面で4つの情報が揃う</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {BENEFITS.map(({ title, desc, icon }) => (
              <div key={title} className="flex flex-col items-start gap-4">
                <div className="text-stone-700">{icon}</div>
                <h3 className="font-bold text-stone-800" style={{ fontSize: '16px' }}>{title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ height: '1px', background: '#f0efed', margin: '0 32px' }} />

      {/* ユースケース */}
      <section id="usecases" style={{ padding: '96px 32px', background: '#fff' }}>
        <div style={W}>
          <h2 className="text-center font-bold text-stone-800 mb-16" style={{ fontSize: '26px' }}>こんな方に使われています</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {USECASES.map(({ target, title, desc, icon }) => (
              <div key={target} className="rounded-2xl p-8 flex flex-col gap-4" style={{ background: '#fafaf9', border: '1px solid #e7e5e4' }}>
                <div className="text-stone-500">{icon}</div>
                <div>
                  <p className="font-semibold text-stone-400 mb-1" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{target}</p>
                  <h3 className="font-bold text-stone-800" style={{ fontSize: '16px' }}>{title}</h3>
                </div>
                <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 料金 */}
      <section id="pricing" style={{ padding: '96px 32px', background: '#fafaf9' }}>
        <div style={W}>
          <h2 className="text-center font-bold text-stone-800 mb-16" style={{ fontSize: '26px' }}>シンプルな料金体系</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS.map(({ name, price, unit, note }) => (
              <div key={name} className="rounded-2xl flex flex-col gap-2" style={{ padding: '28px 24px', background: '#fff', border: '1px solid #e7e5e4' }}>
                <p className="font-semibold text-stone-400" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{name}</p>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="font-bold text-stone-800" style={{ fontSize: '28px' }}>{price}</span>
                  <span className="text-stone-500 text-sm">{unit}</span>
                </div>
                <p className="text-stone-400 text-xs mt-1">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ダッシュボードイメージ */}
      <section style={{ padding: '96px 32px', background: '#fff' }}>
        <div style={W}>
          <h2 className="text-center font-bold text-stone-800 mb-4" style={{ fontSize: '26px' }}>実際の画面</h2>
          <p className="text-center text-stone-500 text-sm mb-12">住所を入力すると、このような画面が表示されます</p>

          {/* ブラウザ風モックアップ */}
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-stone-200">
            {/* ブラウザバー */}
            <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#f5f4f2', borderBottom: '1px solid #e7e5e4' }}>
              <div className="w-3 h-3 rounded-full" style={{ background: '#fca5a5' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#fcd34d' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#86efac' }} />
              <div className="ml-4 flex-1 rounded-md px-3 py-1 text-xs text-stone-400" style={{ background: '#ece9e4', maxWidth: '320px' }}>tocchi.vercel.app/dashboard</div>
            </div>
            {/* ダッシュボードスクリーンショット */}
            <img
              src="/dashboard-screenshot.png"
              alt="Tocchi ダッシュボード画面"
              style={{ width: '100%', display: 'block' }}
            />
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer style={{ borderTop: '1px solid #e7e5e4', padding: '32px' }}>
        <div className="flex items-center justify-between text-xs text-stone-400" style={W}>
          <span style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif", fontWeight: 900 }}>Tocchi</span>
          <span>© 2026 TAS Studio</span>
        </div>
      </footer>
    </main>
  )
}
