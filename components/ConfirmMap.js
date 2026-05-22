'use client'

import { useEffect, useRef } from 'react'
import 'mapbox-gl/dist/mapbox-gl.css'

export default function ConfirmMap({ lat, lng, onLocationChange }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) return

    import('mapbox-gl').then((mod) => {
      if (mapRef.current) return
      const mapboxgl = mod.default
      mapboxgl.accessToken = token

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [lng, lat],
        zoom: 16,
        preserveDrawingBuffer: true,
      })

      const marker = new mapboxgl.Marker({ draggable: true, color: '#1c1917' })
        .setLngLat([lng, lat])
        .addTo(map)

      marker.on('dragend', () => {
        const pos = marker.getLngLat()
        onLocationChange(pos.lat, pos.lng)
      })

      mapRef.current = map
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
