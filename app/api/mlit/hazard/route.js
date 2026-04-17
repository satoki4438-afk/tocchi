import { latlngToTile } from '@/lib/mlit'

// XKT026: 洪水, XKT027: 高潮, XKT028: 津波, XKT029: 土砂災害, XKT016: 災害危険区域
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat'))
  const lng = parseFloat(searchParams.get('lng'))

  if (!lat || !lng) {
    return Response.json({ hazard: {} }, { status: 400 })
  }

  const key = process.env.MLIT_API_KEY
  const { x, y } = latlngToTile(lat, lng, 15)
  const tileParams = new URLSearchParams({ response_format: 'geojson', z: '15', x: String(x), y: String(y) })
  const qs = tileParams.toString()

  const endpoints = [
    { id: 'flood',       code: 'XKT026' },
    { id: 'hightide',    code: 'XKT027' },
    { id: 'tsunami',     code: 'XKT028' },
    { id: 'sediment',    code: 'XKT029' },
    { id: 'danger',      code: 'XKT016' },
    { id: 'steep',       code: 'XKT022' },
    { id: 'landslide',   code: 'XKT021' },
    { id: 'embankment',  code: 'XKT020' },
  ]

  const results = await Promise.all(
    endpoints.map(async ({ id, code }) => {
      const res = await fetch(
        `https://www.reinfolib.mlit.go.jp/ex-api/external/${code}?${qs}`,
        { headers: { 'Ocp-Apim-Subscription-Key': key } }
      )
      if (!res.ok) return { id, features: [] }
      const data = await res.json()
      return { id, features: (data.features || []).slice(0, 3) }
    })
  )

  const hazard = {}
  for (const { id, features } of results) {
    hazard[id] = features
  }

  return Response.json({ hazard })
}
