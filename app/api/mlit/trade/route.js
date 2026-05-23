import { BETA_CLOSED } from '@/lib/betaMode'

// XIT001: 不動産取引価格情報
export async function GET(request) {
  if (BETA_CLOSED) return Response.json({ error: 'beta_closed' }, { status: 503 })
  const { searchParams } = new URL(request.url)
  const prefCd = searchParams.get('pref')
  const city = searchParams.get('city')

  if (!prefCd) {
    return Response.json({ error: '都道府県コードが必要です' }, { status: 400 })
  }

  const key = process.env.MLIT_API_KEY
  const now = new Date()
  const year = now.getFullYear()
  // 直近2年分を取得
  const years = [year, year - 1]

  let allItems = []

  for (const y of years) {
    for (let quarter = 1; quarter <= 4; quarter++) {
      const params = new URLSearchParams({
        year: String(y),
        area: prefCd,
        quarter: String(quarter),
        ...(city ? { city } : {}),
      })
      const url = `https://www.reinfolib.mlit.go.jp/ex-api/external/XIT001?${params}`
      const res = await fetch(url, {
        headers: { 'Ocp-Apim-Subscription-Key': key },
      })
      if (!res.ok) continue
      const data = await res.json()
      if (data.data && Array.isArray(data.data)) {
        allItems = allItems.concat(data.data)
      }
      if (allItems.length >= 20) break
    }
    if (allItems.length >= 20) break
  }

  // TODO: city フォールバック — city指定で0件の場合、prefCdのみで再取得する

  return Response.json({ items: allItems.slice(0, 30) })
}
