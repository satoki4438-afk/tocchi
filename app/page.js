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

  const proceed = (item) => {
    if (item.addressCode?.length === 5) {
      setError('もう少し詳しい住所を入力してください（例：渋谷区神南一丁目）')
      return
    }
    router.push(`/confirm?address=${encodeURIComponent(item.address)}&lat=${item.lat}&lng=${item.lng}`)
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
          {loading ? '検索中...' : user ? '検索する' : isFreeUsed ? '地点を確認する' : '無料で1件試す'}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-500 text-center">{error}</p>}
    </div>
  )
}

const BENEFITS = [
  {
    title: '相場・価格情報',
    desc: '国土交通省の公示地価・実取引データから周辺の価格水準を即表示。価格根拠を数字で示せる。',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    title: '用途地域・法令情報',
    desc: '用途地域・建ぺい率・容積率を自動取得。重要事項の確認作業を大幅に短縮できる。',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    title: 'ハザード情報',
    desc: '洪水・津波・土砂・高潮など8種を一括判定。国交省の公開データをもとに自動収集。',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    title: '周辺施設・学区',
    desc: '小中学校の学区を公的データで表示。病院・スーパー・コンビニ・駅の最寄り距離も自動取得。',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    title: '接道候補',
    desc: 'OpenStreetMapをもとに周辺道路の種別・幅員候補を表示。自治体資料・道路台帳との照合の出発点に。',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8">
        <path d="M8 3L6 21M16 21L18 3M6 21h12M8 3h8" />
        <line x1="7.5" y1="10" x2="16.5" y2="10" strokeDasharray="2 2" />
        <line x1="7" y1="15" x2="17" y2="15" strokeDasharray="2 2" />
      </svg>
    ),
  },
  {
    title: 'AI要点整理',
    desc: '収集したデータをもとにAIが重説前のチェックポイントを整理。コピペ用メモとして活用できる。',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    ),
  },
]

const USECASES = [
  {
    target: '1〜5人規模の売買仲介会社',
    title: '重説の下調べが30秒に',
    desc: '住所を入れるだけで用途地域・ハザード・相場データが揃う。外回りの合間にスマホでも確認できる。',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7">
        <path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
        <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
      </svg>
    ),
  },
  {
    target: '重説前の下調べを早くしたい宅建士',
    title: 'バラバラな確認作業を1画面に集約',
    desc: '国交省・ハザードマップ・Googleマップを個別に開く必要なし。1件あたりの調査時間を短縮できる。',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    ),
  },
  {
    target: '新人営業の調査メモを標準化したい会社',
    title: '調査の抜け漏れをAIが補助',
    desc: 'AI要点整理が重説前のチェックポイントを自動リストアップ。経験の浅いスタッフでも均一な調査品質を保てる。',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
]

const PLANS = [
  { name: 'お試し',   price: '無料',   unit: '1回お試し', note: 'ログイン不要' },
  { name: 'スポット', price: '¥300',   unit: '/ 件',     note: 'Stripeで即決済' },
  { name: 'ライト',   price: '¥2,980', unit: '/ 月',     note: '近日公開' },
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

      <Header />
      <div style={{ height: '56px' }} />

      {/* ヒーロー */}
      <section className="relative" style={{ background: 'linear-gradient(135deg, #1c1917 0%, #292524 40%, #1c3a4a 100%)' }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="absolute pointer-events-none" style={{ top: '0%', left: '60%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)', borderRadius: '50%' }} />

        <div className="relative flex flex-col items-center text-center px-6 py-24" style={{ zIndex: 10 }}>
          <h1 className="text-white font-bold leading-tight" style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)', letterSpacing: '-0.03em' }}>
            住所ひとつで、<br />物件調査メモを自動整理
          </h1>
          <p className="mt-6 text-stone-300" style={{ fontSize: '18px', maxWidth: '560px', lineHeight: '1.9' }}>
            用途地域・ハザード・地価・学区・周辺施設・接道候補を自動収集。<br />
            重説前の情報整理を、ひとつのツールで。
          </p>
          <div className="mt-10 w-full px-4">
            <SearchBox />
          </div>
          <p className="mt-4 text-stone-500 text-sm">初回無料 — クレジットカード不要</p>
        </div>
      </section>

      {/* 実際の画面 */}
      <section style={{ padding: '80px 32px', background: '#fafaf9' }}>
        <div style={W}>
          <h2 className="text-center font-bold text-stone-800 mb-3" style={{ fontSize: '26px' }}>実際の画面</h2>
          <p className="text-center text-stone-500 text-sm mb-12">住所を入力すると、このような画面が表示されます</p>
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-stone-200">
            <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#f5f4f2', borderBottom: '1px solid #e7e5e4' }}>
              <div className="w-3 h-3 rounded-full" style={{ background: '#fca5a5' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#fcd34d' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#86efac' }} />
              <div className="ml-4 flex-1 rounded-md px-3 py-1 text-xs text-stone-400" style={{ background: '#ece9e4', maxWidth: '320px' }}>tocchi.vercel.app/dashboard</div>
            </div>
            <img
              src="/dashboard-screenshot.png"
              alt="Tocchi ダッシュボード画面"
              style={{ width: '100%', display: 'block' }}
            />
          </div>
        </div>
      </section>

      {/* できること */}
      <section id="benefits" style={{ padding: '96px 32px', background: '#fff' }}>
        <div style={W}>
          <h2 className="text-center font-bold text-stone-800 mb-16" style={{ fontSize: '26px' }}>重説前に見るべき情報を、一画面に集約</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
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

      {/* こんな方に */}
      <section id="usecases" style={{ padding: '96px 32px', background: '#fff' }}>
        <div style={W}>
          <h2 className="text-center font-bold text-stone-800 mb-16" style={{ fontSize: '26px' }}>こんな方に使われています</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {USECASES.map(({ target, title, desc, icon }) => (
              <div key={target} className="rounded-2xl p-8 flex flex-col gap-4" style={{ background: '#fafaf9', border: '1px solid #e7e5e4' }}>
                <div className="text-stone-500">{icon}</div>
                <div>
                  <p className="font-semibold text-stone-400 mb-1" style={{ fontSize: '11px', letterSpacing: '0.06em' }}>{target}</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
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

      {/* フッター */}
      <footer style={{ borderTop: '1px solid #e7e5e4', padding: '32px' }}>
        <div style={W}>
          <div className="flex items-center justify-between text-xs text-stone-400 mb-4">
            <span style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif", fontWeight: 900 }}>Tocchi</span>
            <span>© 2026 TAS Studio</span>
          </div>
          <div className="flex gap-5 text-xs text-stone-400">
            <a href="/legal/tokusho" className="hover:text-stone-600">特定商取引法に基づく表記</a>
            <a href="/legal/privacy" className="hover:text-stone-600">プライバシーポリシー</a>
            <a href="/legal/terms" className="hover:text-stone-600">利用規約</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
