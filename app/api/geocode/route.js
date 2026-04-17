export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')

  if (!q) {
    return Response.json({ error: '住所が指定されていません' }, { status: 400 })
  }

  const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(q)}`
  const res = await fetch(url)

  if (!res.ok) {
    return Response.json({ error: '住所検索に失敗しました' }, { status: 502 })
  }

  const features = await res.json()

  if (!features || features.length === 0) {
    return Response.json({ results: [] })
  }

  const results = features.slice(0, 5).map((f) => ({
    address: f.properties.title,
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    muniCd: f.properties.addressCode?.slice(0, 5) || '',
    prefCd: f.properties.addressCode?.slice(0, 2) || '',
    addressCode: f.properties.addressCode || '',
  }))

  return Response.json({ results })
}
