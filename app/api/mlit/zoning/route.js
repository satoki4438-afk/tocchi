import { latlngToTile } from '@/lib/mlit'

// XKT001: 用途地域 + XKT002: 都市計画区域（z=15, z/x/y方式）
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat'))
  const lng = parseFloat(searchParams.get('lng'))

  if (!lat || !lng) {
    return Response.json({ zoning: [], urban: [] }, { status: 400 })
  }

  const key = process.env.MLIT_API_KEY
  const { x, y } = latlngToTile(lat, lng, 15)
  const tileParams = new URLSearchParams({ response_format: 'geojson', z: '15', x: String(x), y: String(y) })
  const qs = tileParams.toString()

  const [zoningRes, urbanRes] = await Promise.all([
    fetch(`https://www.reinfolib.mlit.go.jp/ex-api/external/XKT001?${qs}`, {
      headers: { 'Ocp-Apim-Subscription-Key': key },
    }),
    fetch(`https://www.reinfolib.mlit.go.jp/ex-api/external/XKT002?${qs}`, {
      headers: { 'Ocp-Apim-Subscription-Key': key },
    }),
  ])

  const [zoningData, urbanData] = await Promise.all([
    zoningRes.ok ? zoningRes.json() : { features: [] },
    urbanRes.ok ? urbanRes.json() : { features: [] },
  ])

  return Response.json({
    zoning: (zoningData.features || []).slice(0, 5),
    urban: (urbanData.features || []).slice(0, 5),
  })
}
