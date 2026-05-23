import { latlngToTile } from '@/lib/mlit'
import { BETA_CLOSED } from '@/lib/betaMode'

// XKT001: 用途地域 + XKT002: 都市計画区域 + XKT014: 防火・準防火地域 + XKT030: 都市計画道路（z=15）

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function pointToSegmentDist(pLat, pLng, aLat, aLng, bLat, bLng) {
  const dx = bLng - aLng, dy = bLat - aLat
  if (dx === 0 && dy === 0) return haversineMeters(pLat, pLng, aLat, aLng)
  const t = Math.max(0, Math.min(1, ((pLng - aLng) * dx + (pLat - aLat) * dy) / (dx * dx + dy * dy)))
  return haversineMeters(pLat, pLng, aLat + t * dy, aLng + t * dx)
}

function minDistToRoads(features, lat, lng) {
  let minDist = Infinity
  for (const f of features) {
    const geom = f.geometry
    if (!geom) continue
    const lines = geom.type === 'LineString' ? [geom.coordinates] : geom.coordinates
    for (const line of lines) {
      for (let i = 0; i < line.length - 1; i++) {
        const [aLng, aLat] = line[i]
        const [bLng, bLat] = line[i + 1]
        const d = pointToSegmentDist(lat, lng, aLat, aLng, bLat, bLng)
        if (d < minDist) minDist = d
      }
    }
  }
  return minDist === Infinity ? null : Math.round(minDist)
}

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
    return Response.json({ zoning: [], urban: [], firePrevention: [], cityPlanningRoad: { exists: false, minDistanceM: null, nearbyLevel: 'none', count: 0 } }, { status: 400 })
  }

  const key = process.env.MLIT_API_KEY
  const { x, y } = latlngToTile(lat, lng, 15)
  const tileParams = new URLSearchParams({ response_format: 'geojson', z: '15', x: String(x), y: String(y) })
  const qs = tileParams.toString()

  const [zoningRes, urbanRes, fpRes, cpRes] = await Promise.all([
    fetch(`https://www.reinfolib.mlit.go.jp/ex-api/external/XKT001?${qs}`, {
      headers: { 'Ocp-Apim-Subscription-Key': key },
    }),
    fetch(`https://www.reinfolib.mlit.go.jp/ex-api/external/XKT002?${qs}`, {
      headers: { 'Ocp-Apim-Subscription-Key': key },
    }),
    fetch(`https://www.reinfolib.mlit.go.jp/ex-api/external/XKT014?${qs}`, {
      headers: { 'Ocp-Apim-Subscription-Key': key },
    }),
    fetch(`https://www.reinfolib.mlit.go.jp/ex-api/external/XKT030?${qs}`, {
      headers: { 'Ocp-Apim-Subscription-Key': key },
    }),
  ])

  const [zoningData, urbanData, fpData, cpData] = await Promise.all([
    zoningRes.ok ? zoningRes.json() : { features: [] },
    urbanRes.ok ? urbanRes.json() : { features: [] },
    fpRes.ok ? fpRes.json() : { features: [] },
    cpRes.ok ? cpRes.json() : { features: [] },
  ])

  const fpMatch = findContainingFeature(fpData.features || [], lng, lat)

  const cpFeatures = cpData.features || []
  const minDistM = minDistToRoads(cpFeatures, lat, lng)
  const nearbyLevel = minDistM === null ? 'none' : minDistM <= 50 ? 'near' : minDistM <= 100 ? 'around' : 'none'

  return Response.json({
    zoning: (zoningData.features || []).slice(0, 5),
    urban: (urbanData.features || []).slice(0, 5),
    firePrevention: fpMatch ? [fpMatch] : [],
    cityPlanningRoad: {
      exists: nearbyLevel !== 'none',
      minDistanceM: minDistM,
      nearbyLevel,
      count: cpFeatures.length,
    },
  })
}
