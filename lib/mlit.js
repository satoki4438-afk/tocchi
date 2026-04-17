/**
 * lat/lng → タイル座標(x, y) を計算
 */
export function latlngToTile(lat, lng, z) {
  const x = Math.floor(((lng + 180) / 360) * Math.pow(2, z))
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      Math.pow(2, z)
  )
  return { x, y }
}
