import { latlngToTile } from '@/lib/mlit'
import { BETA_CLOSED } from '@/lib/betaMode'

// XKT001: 用途地域 + XKT002: 都市計画区域 + XKT014: 防火・準防火地域（z=15, z/x/y方式）

function pointInPolygon(lng, lat, polygon) {
  const ring = polygon.coordinates[0]
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function findContainingFeature(features, lng, lat) {
  for (const f of features) {
    const geom = f.geometry
    if (!geom) continue
    if (geom.type === 'Polygon') {
      if (pointInPolygon(lng, lat, geom)) return f
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) {
        if (pointInPolygon(lng, lat, { coordinates: poly })) return f
      }
    }
  }
  return null
}

export async function GET(request) {
  if (BETA_CLOSED) return Response.json({ error: 'beta_closed' }, { status: 503 })
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat'))
  const lng = parseFloat(searchParams.get('lng'))

  if (!lat || !lng) {
    return Response.json({ zoning: [], urban: [], firePrevention: [] }, { status: 400 })
  }

  const key = process.env.MLIT_API_KEY
  const { x, y } = latlngToTile(lat, lng, 15)
  const tileParams = new URLSearchParams({ response_format: 'geojson', z: '15', x: String(x), y: String(y) })
  const qs = tileParams.toString()

  const [zoningRes, urbanRes, fpRes] = await Promise.all([
    fetch(`https://www.reinfolib.mlit.go.jp/ex-api/external/XKT001?${qs}`, {
      headers: { 'Ocp-Apim-Subscription-Key': key },
    }),
    fetch(`https://www.reinfolib.mlit.go.jp/ex-api/external/XKT002?${qs}`, {
      headers: { 'Ocp-Apim-Subscription-Key': key },
    }),
    fetch(`https://www.reinfolib.mlit.go.jp/ex-api/external/XKT014?${qs}`, {
      headers: { 'Ocp-Apim-Subscription-Key': key },
    }),
  ])

  const [zoningData, urbanData, fpData] = await Promise.all([
    zoningRes.ok ? zoningRes.json() : { features: [] },
    urbanRes.ok ? urbanRes.json() : { features: [] },
    fpRes.ok ? fpRes.json() : { features: [] },
  ])

  const fpMatch = findContainingFeature(fpData.features || [], lng, lat)

  return Response.json({
    zoning: (zoningData.features || []).slice(0, 5),
    urban: (urbanData.features || []).slice(0, 5),
    firePrevention: fpMatch ? [fpMatch] : [],
  })
}
