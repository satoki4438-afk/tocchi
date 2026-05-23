import { latlngToTile } from '@/lib/mlit'
import { BETA_CLOSED } from '@/lib/betaMode'

// XKT026: 洪水, XKT027: 高潮, XKT028: 津波, XKT029: 土砂災害, XKT016: 災害危険区域, XKT025: 液状化

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
    return Response.json({ hazard: {}, liquefaction: [] }, { status: 400 })
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

  const [results, lfRes] = await Promise.all([
    Promise.all(
      endpoints.map(async ({ id, code }) => {
        const res = await fetch(
          `https://www.reinfolib.mlit.go.jp/ex-api/external/${code}?${qs}`,
          { headers: { 'Ocp-Apim-Subscription-Key': key } }
        )
        if (!res.ok) return { id, features: [] }
        const data = await res.json()
        return { id, features: (data.features || []).slice(0, 3) }
      })
    ),
    fetch(`https://www.reinfolib.mlit.go.jp/ex-api/external/XKT025?${qs}`, {
      headers: { 'Ocp-Apim-Subscription-Key': key },
    }),
  ])

  const hazard = {}
  for (const { id, features } of results) {
    hazard[id] = features
  }

  const lfData = lfRes.ok ? await lfRes.json() : { features: [] }
  const lfMatch = findContainingFeature(lfData.features || [], lng, lat)

  return Response.json({ hazard, liquefaction: lfMatch ? [lfMatch] : [] })
}
