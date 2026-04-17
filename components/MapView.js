'use client'

import { useEffect, useRef, useState } from 'react'
import 'mapbox-gl/dist/mapbox-gl.css'

const HIGHWAY_STYLE = {
  motorway:     { color: '#E05252', label: '高速道路' },
  trunk:        { color: '#E07820', label: '主要幹線' },
  primary:      { color: '#E0B020', label: '国道' },
  secondary:    { color: '#60A020', label: '県道' },
  tertiary:     { color: '#4090C0', label: '市道' },
  residential:  { color: '#808080', label: '住宅街道路' },
  service:      { color: '#AAAAAA', label: 'サービス道路' },
  unclassified: { color: '#999999', label: '一般道' },
}

const ZONING_COLORS = {
  '第１種低層住居専用地域':   '#B3FFB3',
  '第２種低層住居専用地域':   '#C8FFB3',
  '第１種中高層住居専用地域': '#FFFFA8',
  '第２種中高層住居専用地域': '#FFFFC3',
  '第１種住居地域':          '#FFFFD2',
  '第２種住居地域':          '#FFF1E2',
  '準住居地域':              '#FFE8C8',
  '近隣商業地域':            '#FFCCE8',
  '商業地域':                '#FFB3D2',
  '準工業地域':              '#E1B3FF',
  '工業地域':                '#F0FFFF',
  '工業専用地域':            '#D0E8FF',
}

// カテゴリ別カラー
const PLACE_COLORS = {
  hospital:          '#e53e3e',
  supermarket:       '#38a169',
  convenience_store: '#d97706',
  train_station:     '#7c3aed',
}

export default function MapView({ lat, lng, address = '', tradePoints = [], landPoints = [], zoningFeatures = [], roads = [], places = [], showLegend = true }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const mapLoadedRef = useRef(false)
  // 最新データをrefで保持（on('load')クロージャ問題を回避）
  const zoningRef = useRef(zoningFeatures)
  const roadsRef = useRef(roads)
  const landRef = useRef(landPoints)
  const placesRef = useRef(places)

  const [showZoning, setShowZoning] = useState(true)
  const [showRoads, setShowRoads] = useState(true)
  const [showPrice, setShowPrice] = useState(true)
  const [showPlaces, setShowPlaces] = useState(true)

  // 常に最新データをrefに同期
  useEffect(() => { zoningRef.current = zoningFeatures }, [zoningFeatures])
  useEffect(() => { roadsRef.current = roads }, [roads])
  useEffect(() => { landRef.current = landPoints }, [landPoints])
  useEffect(() => { placesRef.current = places }, [places])

  // 地図初期化（1回のみ）
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) return

    let map
    import('mapbox-gl').then((mod) => {
      if (mapRef.current) return // 二重初期化ガード
      const mapboxgl = mod.default
      mapboxgl.accessToken = token

      map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [lng, lat],
        zoom: 16,
        preserveDrawingBuffer: true,
      })
      mapRef.current = map

      new mapboxgl.Marker({ color: '#ef4444' })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup({ offset: 40 }).setHTML(`<div style="font-size:13px;font-weight:600;padding:2px 4px">${address}</div>`))
        .addTo(map)

      map.on('load', () => {
        // 日本語ラベル
        map.getStyle().layers.forEach((layer) => {
          if (layer.type === 'symbol' && layer.layout?.['text-field']) {
            map.setLayoutProperty(layer.id, 'text-field', [
              'coalesce', ['get', 'name_ja'], ['get', 'name'],
            ])
          }
        })

        // MapboxデフォルトのPOIアイコン（角丸四角）を非表示
        // icon-imageを持つsymbolレイヤーを全て非表示
        map.getStyle().layers.forEach((layer) => {
          if (layer.type === 'symbol' && layer.layout?.['icon-image']) {
            map.setLayoutProperty(layer.id, 'visibility', 'none')
          }
        })

        const before = map.getLayer('road-label') ? 'road-label' : undefined

        // 地価公示ポイント（「取引価格」チェックボックスで制御）
        map.addSource('land', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
        map.addLayer({ id: 'land-points', type: 'circle', source: 'land',
          layout: { visibility: 'visible' },
          paint: { 'circle-radius': 7, 'circle-color': '#0891b2', 'circle-opacity': 0.8 } })

        // 地価公示ポップアップ
        map.on('click', 'land-points', (e) => {
          const p = e.features[0].properties
          const price = p.u_current_years_price_ja || '不明'
          const location = p.location || ''
          const use = p.regulations_use_category_name_ja || ''
          const year = p.target_year_name_ja || ''
          new mapboxgl.Popup({ offset: 10 })
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-size:12px;line-height:1.6;min-width:160px">
                <div style="font-weight:700;font-size:14px;color:#0891b2;margin-bottom:4px">${price}</div>
                <div style="color:#555">${location}</div>
                <div style="color:#777;font-size:11px">${use}　${year}</div>
              </div>
            `)
            .addTo(map)
        })
        map.on('mouseenter', 'land-points', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'land-points', () => { map.getCanvas().style.cursor = '' })

        // 周辺施設ポイント
        map.addSource('places', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
        map.addLayer({ id: 'place-points', type: 'circle', source: 'places',
          layout: { visibility: 'visible' },
          paint: {
            'circle-radius': 7,
            'circle-color': ['match', ['get', 'type'],
              'hospital', '#e53e3e',
              'supermarket', '#38a169',
              'convenience_store', '#d97706',
              'train_station', '#7c3aed',
              '#888888',
            ],
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9,
          },
        })
        // 施設名ラベル（常時表示）
        map.addLayer({ id: 'place-labels', type: 'symbol', source: 'places',
          layout: {
            visibility: 'visible',
            'text-field': ['get', 'name'],
            'text-size': 11,
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
            'text-allow-overlap': false,
            'text-optional': true,
          },
          paint: { 'text-color': '#333333', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 },
        })

        map.on('click', 'place-points', (e) => {
          const p = e.features[0].properties
          const dist = p.distance == null ? ''
            : p.distance >= 1000
              ? `${(p.distance / 1000).toFixed(1)}km`
              : `${Math.round(p.distance)}m`
          new mapboxgl.Popup({ offset: 10 })
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-size:12px;color:#555;padding:2px 6px">${dist}</div>
            `)
            .addTo(map)
        })
        map.on('mouseenter', 'place-points', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'place-points', () => { map.getCanvas().style.cursor = '' })

        map.addSource('zoning', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
        map.addLayer({ id: 'zoning-fill', type: 'fill', source: 'zoning',
          layout: { visibility: 'visible' },
          paint: { 'fill-color': buildZoningColorExpression(), 'fill-opacity': 0.45 } }, before)
        map.addLayer({ id: 'zoning-outline', type: 'line', source: 'zoning',
          layout: { visibility: 'visible' },
          paint: { 'line-color': '#888888', 'line-width': 0.8, 'line-opacity': 0.6 } }, before)
        map.addLayer({ id: 'zoning-label', type: 'symbol', source: 'zoning',
          layout: { visibility: 'visible', 'text-field': ['get', 'use_area_ja'], 'text-size': 10, 'text-allow-overlap': false },
          paint: { 'text-color': '#444444', 'text-halo-color': '#ffffff', 'text-halo-width': 1 } })

        map.addSource('roads', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
        map.addLayer({ id: 'roads-line', type: 'line', source: 'roads',
          layout: { visibility: 'visible' },
          paint: { 'line-color': buildRoadColorExpression(), 'line-width': 3, 'line-opacity': 0.8 } })

        mapLoadedRef.current = true

        // ロード時点でrefの最新データを即セット
        const z = zoningRef.current
        const r = roadsRef.current
        const l = landRef.current
        const pl = placesRef.current

        if (z.length > 0) map.getSource('zoning').setData({ type: 'FeatureCollection', features: z })
        if (r.length > 0) map.getSource('roads').setData(roadsToGeoJSON(r))
        if (l.length > 0) map.getSource('land').setData({ type: 'FeatureCollection', features: l })
        if (pl.length > 0) map.getSource('places').setData(placesToGeoJSON(pl))
      })
    })

    return () => {
      mapLoadedRef.current = false
      if (map) { map.remove(); mapRef.current = null }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])

  // データ到着時の更新（map未ロードなら無視 → ロード時にrefから読むので問題なし）
  useEffect(() => {
    if (!mapLoadedRef.current || zoningFeatures.length === 0) return
    mapRef.current?.getSource('zoning')?.setData({ type: 'FeatureCollection', features: zoningFeatures })
  }, [zoningFeatures])

  useEffect(() => {
    if (!mapLoadedRef.current || roads.length === 0) return
    mapRef.current?.getSource('roads')?.setData(roadsToGeoJSON(roads))
  }, [roads])

  useEffect(() => {
    if (!mapLoadedRef.current || landPoints.length === 0) return
    mapRef.current?.getSource('land')?.setData({ type: 'FeatureCollection', features: landPoints })
  }, [landPoints])

  useEffect(() => {
    if (!mapLoadedRef.current || places.length === 0) return
    mapRef.current?.getSource('places')?.setData(placesToGeoJSON(places))
  }, [places])

  // ---- チェックボックス表示切替 ----
  // mapLoadedRef.currentがtrueの時だけ実行。初回はon('load')後にeffectが再実行される
  // ※ mapLoadedRef変更はstateではないが、チェックボックスはmap表示後に操作するため問題なし

  const toggleLayer = (ids, visible) => {
    const map = mapRef.current
    if (!map) return
    ids.forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')
    })
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden" style={{ minHeight: '400px' }} />
      <style>{`.mapboxgl-ctrl-group { display: none !important; }`}</style>

      {showLegend && <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-md px-4 py-3 space-y-2 z-10 max-h-[90%] overflow-y-auto" style={{ minWidth: '160px' }}>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={showZoning} onChange={(e) => {
            setShowZoning(e.target.checked)
            toggleLayer(['zoning-fill', 'zoning-outline', 'zoning-label'], e.target.checked)
          }} className="w-4 h-4 accent-stone-600" />
          <span className="text-stone-700 font-medium text-sm">用途地域</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={showPrice} onChange={(e) => {
            setShowPrice(e.target.checked)
            toggleLayer(['land-points'], e.target.checked)
          }} className="w-4 h-4 accent-stone-600" />
          <span className="text-stone-700 font-medium text-sm">取引価格</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={showRoads} onChange={(e) => {
            setShowRoads(e.target.checked)
            toggleLayer(['roads-line'], e.target.checked)
          }} className="w-4 h-4 accent-stone-600" />
          <span className="text-stone-700 font-medium text-sm">接道道路</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={showPlaces} onChange={(e) => {
            setShowPlaces(e.target.checked)
            toggleLayer(['place-points', 'place-labels'], e.target.checked)
          }} className="w-4 h-4 accent-stone-600" />
          <span className="text-stone-700 font-medium text-sm">周辺施設</span>
        </label>

        <div className="pt-2 border-t border-stone-200 space-y-1">
          <p className="text-xs text-stone-400 font-semibold">用途地域</p>
          {Object.entries(ZONING_COLORS).map(([name, color]) => (
            <div key={name} className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-sm border border-stone-300 flex-shrink-0" style={{ background: color }} />
              <span className="text-xs text-stone-600">{name}</span>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t border-stone-200 space-y-1">
          <p className="text-xs text-stone-400 font-semibold">接道道路</p>
          {Object.entries(HIGHWAY_STYLE).map(([type, { color, label }]) => (
            <div key={type} className="flex items-center gap-2">
              <span className="w-6 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-xs text-stone-600">{label}</span>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t border-stone-200 space-y-1">
          <p className="text-xs text-stone-400 font-semibold">周辺施設</p>
          {[
            { type: 'hospital', label: '病院' },
            { type: 'supermarket', label: 'スーパー' },
            { type: 'convenience_store', label: 'コンビニ' },
            { type: 'train_station', label: '駅' },
          ].map(({ type, label }) => (
            <div key={type} className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full flex-shrink-0 border-2 border-white shadow-sm" style={{ background: PLACE_COLORS[type] }} />
              <span className="text-xs text-stone-600">{label}</span>
            </div>
          ))}
        </div>
      </div>}
    </div>
  )
}

function placesToGeoJSON(categories) {
  const features = []
  for (const cat of categories) {
    for (const p of (cat.places || [])) {
      if (!p.lat || !p.lng) continue
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { name: p.name, type: cat.type, label: cat.label, distance: p.distance ?? null },
      })
    }
  }
  return { type: 'FeatureCollection', features }
}

function roadsToGeoJSON(roads) {
  return {
    type: 'FeatureCollection',
    features: roads.filter((r) => r.geometry).map((r) => ({
      type: 'Feature',
      geometry: r.geometry,
      properties: { highway: r.highway || 'unclassified', name: r.name, width: r.width, widthSource: r.widthSource, oneway: r.oneway },
    })),
  }
}

function buildZoningColorExpression() {
  const expr = ['match', ['get', 'use_area_ja']]
  Object.entries(ZONING_COLORS).forEach(([name, color]) => expr.push(name, color))
  expr.push('#E8E8E8')
  return expr
}

function buildRoadColorExpression() {
  const expr = ['match', ['get', 'highway']]
  Object.entries(HIGHWAY_STYLE).forEach(([type, { color }]) => expr.push(type, color))
  expr.push('#999999')
  return expr
}
