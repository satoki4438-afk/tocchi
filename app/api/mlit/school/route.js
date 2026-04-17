import { latlngToTile } from '@/lib/mlit'

// XKT004: 小学校区, XKT005: 中学校区（z=15）

// Ray casting: 点がポリゴン内にあるか判定
function pointInPolygon(lng, lat, polygon) {
  // polygon は GeoJSON Polygon: coordinates[0] がリング
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
  // 一致なし → 最近傍フォールバックとして先頭を返す
  return features[0] || null
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat'))
  const lng = parseFloat(searchParams.get('lng'))

  if (!lat || !lng) {
    return Response.json({ elementary: [], junior: [] }, { status: 400 })
  }

  const key = process.env.MLIT_API_KEY
  const { x, y } = latlngToTile(lat, lng, 15)
  const tileParams = new URLSearchParams({ response_format: 'geojson', z: '15', x: String(x), y: String(y) })
  const qs = tileParams.toString()

  const [elemRes, juniorRes] = await Promise.all([
    fetch(`https://www.reinfolib.mlit.go.jp/ex-api/external/XKT004?${qs}`, {
      headers: { 'Ocp-Apim-Subscription-Key': key },
    }),
    fetch(`https://www.reinfolib.mlit.go.jp/ex-api/external/XKT005?${qs}`, {
      headers: { 'Ocp-Apim-Subscription-Key': key },
    }),
  ])

  const [elemData, juniorData] = await Promise.all([
    elemRes.ok ? elemRes.json() : { features: [] },
    juniorRes.ok ? juniorRes.json() : { features: [] },
  ])

  const elemMatch = findContainingFeature(elemData.features || [], lng, lat)
  const juniorMatch = findContainingFeature(juniorData.features || [], lng, lat)

  return Response.json({
    elementary: elemMatch ? [elemMatch] : [],
    junior: juniorMatch ? [juniorMatch] : [],
  })
}
