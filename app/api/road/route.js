// OpenStreetMap Overpass API: 接道道路情報（キー不要・無料）

// 道路種別 → 推定幅員（m）マッピング（日本標準）
const HIGHWAY_PRIORITY = {
  motorway: 0, trunk: 1, primary: 2, secondary: 3, tertiary: 4,
  residential: 5, service: 6, unclassified: 7, living_street: 8,
  pedestrian: 99, footway: 99, path: 99, steps: 99, cycleway: 99,
}

const HIGHWAY_WIDTH = {
  motorway: 22,
  trunk: 14,
  primary: 12,
  secondary: 9,
  tertiary: 6,
  residential: 4,
  service: 3,
  unclassified: 5,
  living_street: 3,
  pedestrian: 2,
  footway: 2,
  path: 1.5,
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat'))
  const lng = parseFloat(searchParams.get('lng'))

  if (!lat || !lng) {
    return Response.json({ roads: [] }, { status: 400 })
  }

  const delta = 0.003 // 約300m
  const bbox = `${lat - delta},${lng - delta},${lat + delta},${lng + delta}`
  // out body geom; でタグ＋ジオメトリを取得
  const query = `[out:json][timeout:15];way["highway"](${bbox});out body geom;`

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!res.ok) {
    return Response.json({ roads: [] })
  }

  const data = await res.json()

  const roads = (data.elements || [])
    .filter((el) => el.type === 'way' && el.geometry)
    .map((el) => {
      const highway = el.tags?.highway
      const rawWidth = el.tags?.width ? parseFloat(el.tags.width) : null
      const estimatedWidth = HIGHWAY_WIDTH[highway] || null
      const width = rawWidth || estimatedWidth
      const widthSource = rawWidth ? 'actual' : estimatedWidth ? 'estimated' : null

      return {
        id: el.id,
        highway,
        name: el.tags?.name || null,
        width,
        widthSource,
        oneway: el.tags?.oneway === 'yes',
        lanes: el.tags?.lanes ? parseInt(el.tags.lanes) : null,
        // GeoJSON LineString 形式でジオメトリを返す
        geometry: {
          type: 'LineString',
          coordinates: el.geometry.map((node) => [node.lon, node.lat]),
        },
      }
    })

  const sorted = roads
    .filter((r) => (HIGHWAY_PRIORITY[r.highway] ?? 50) < 99)
    .sort((a, b) => (HIGHWAY_PRIORITY[a.highway] ?? 50) - (HIGHWAY_PRIORITY[b.highway] ?? 50))

  return Response.json({ roads: sorted })
}
