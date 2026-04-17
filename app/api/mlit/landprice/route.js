import { latlngToTile } from '@/lib/mlit'

// XPT002: 地価公示・地価調査（z=13 + year）
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat'))
  const lng = parseFloat(searchParams.get('lng'))

  if (!lat || !lng) {
    return Response.json({ features: [] }, { status: 400 })
  }

  const key = process.env.MLIT_API_KEY
  const year = new Date().getFullYear()
  const { x, y } = latlngToTile(lat, lng, 13)

  const params = new URLSearchParams({ response_format: 'geojson', z: '13', x: String(x), y: String(y), year: String(year) })
  const url = `https://www.reinfolib.mlit.go.jp/ex-api/external/XPT002?${params}`
  const res = await fetch(url, { headers: { 'Ocp-Apim-Subscription-Key': key } })

  if (!res.ok) return Response.json({ features: [] })

  const data = await res.json()
  const features = (data.features || []).map((f) => {
    const [fLng, fLat] = f.geometry?.coordinates || []
    if (!fLat || !fLng) return { ...f, _dist: 9999999 }
    const dLat = (fLat - lat) * Math.PI / 180
    const dLng = (fLng - lng) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat*Math.PI/180) * Math.cos(fLat*Math.PI/180) * Math.sin(dLng/2)**2
    const dist = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return { ...f, _dist: dist }
  }).sort((a, b) => a._dist - b._dist)

  return Response.json({ features })
}
