import { useEffect, useRef } from 'react'
import { PlaceCoord } from '../types'

interface Props {
  departure?: PlaceCoord
  destination?: PlaceCoord
}

export default function MiniMap({ departure, destination }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const markersRef = useRef<kakao.maps.Marker[]>([])

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || !window.kakao?.maps) return

    const center = departure
      ? new kakao.maps.LatLng(departure.lat, departure.lng)
      : destination
        ? new kakao.maps.LatLng(destination.lat, destination.lng)
        : new kakao.maps.LatLng(37.5665, 126.978) // Seoul default

    mapRef.current = new kakao.maps.Map(containerRef.current, {
      center,
      level: 7,
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers and bounds
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    const points: kakao.maps.LatLng[] = []

    if (departure) {
      const pos = new kakao.maps.LatLng(departure.lat, departure.lng)
      points.push(pos)
      const marker = new kakao.maps.Marker({ position: pos, map })
      markersRef.current.push(marker)
    }

    if (destination) {
      const pos = new kakao.maps.LatLng(destination.lat, destination.lng)
      points.push(pos)
      const marker = new kakao.maps.Marker({ position: pos, map })
      markersRef.current.push(marker)
    }

    if (points.length === 2) {
      const bounds = new kakao.maps.LatLngBounds()
      points.forEach((p) => bounds.extend(p))
      map.setBounds(bounds, 50, 50, 50, 50)
    } else if (points.length === 1) {
      map.setCenter(points[0])
      map.setLevel(5)
    }
  }, [departure, destination])

  return (
    <div
      ref={containerRef}
      className="w-full h-[150px] rounded-lg border border-gray-200 overflow-hidden"
    />
  )
}
