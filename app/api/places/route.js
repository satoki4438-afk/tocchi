// Google Places API (New) v1: 周辺施設（病院・スーパー・コンビニ・駅）

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat'))
  const lng = parseFloat(searchParams.get('lng'))

  if (!lat || !lng) {
    return Response.json({ categories: [] }, { status: 400 })
  }

  const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY

  const categories = [
    { type: 'hospital', label: '病院・クリニック' },
    { type: 'supermarket', label: 'スーパー' },
    { type: 'convenience_store', label: 'コンビニ' },
    { type: 'train_station', label: '駅' },
  ]

  const results = await Promise.all(
    categories.map(async ({ type, label }) => {
      // まず500mで検索、なければ3000mで再検索
      for (const radius of [500, 3000]) {
        const body = {
          includedTypes: [type],
          maxResultCount: 5,
          languageCode: 'ja',
          locationRestriction: {
            circle: { center: { latitude: lat, longitude: lng }, radius },
          },
        }

        const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': key,
            'X-Goog-FieldMask': 'places.displayName,places.location,places.rating',
          },
          body: JSON.stringify(body),
        })

        if (!res.ok) break

        const data = await res.json()
        const places = (data.places || []).map((p) => {
          const pLat = p.location?.latitude
          const pLng = p.location?.longitude
          const distance = pLat && pLng ? haversineMeters(lat, lng, pLat, pLng) : null
          return {
            name: p.displayName?.text || '',
            lat: pLat,
            lng: pLng,
            rating: p.rating,
            distance,
          }
        }).sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999))

        if (places.length > 0) return { type, label, places }
      }

      return { type, label, places: [] }
    })
  )

  return Response.json({ categories: results })
}
