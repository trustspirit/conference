import { useEffect, useRef } from 'react'
import { PlaceCoord } from '../types'

interface Props {
  departure?: PlaceCoord
  destination?: PlaceCoord
  routePath?: number[]
  ref?: React.Ref<HTMLDivElement>
}

export default function MiniMap({ departure, destination, routePath, ref }: Props) {
  const internalRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const markersRef = useRef<kakao.maps.Marker[]>([])
  const polylineRef = useRef<kakao.maps.Polyline | null>(null)

  // Merge refs: internal + external
  const setRefs = (el: HTMLDivElement | null) => {
    ;(internalRef as React.MutableRefObject<HTMLDivElement | null>).current = el
    if (typeof ref === 'function') ref(el)
    else if (ref && typeof ref === 'object')
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = el
  }

  // Initialize map
  useEffect(() => {
    if (!internalRef.current || !window.kakao?.maps) return

    const center = departure
      ? new kakao.maps.LatLng(departure.lat, departure.lng)
      : destination
        ? new kakao.maps.LatLng(destination.lat, destination.lng)
        : new kakao.maps.LatLng(37.5665, 126.978)

    mapRef.current = new kakao.maps.Map(internalRef.current, {
      center,
      level: 7
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers, polyline, and bounds
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    // Clear old polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null)
      polylineRef.current = null
    }

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

    // Draw polyline if route path exists
    if (routePath && routePath.length >= 4) {
      const path: kakao.maps.LatLng[] = []
      for (let i = 0; i < routePath.length; i += 2) {
        // routePath is [lng, lat, lng, lat, ...]
        path.push(new kakao.maps.LatLng(routePath[i + 1], routePath[i]))
      }
      polylineRef.current = new kakao.maps.Polyline({
        map,
        path,
        strokeWeight: 4,
        strokeColor: '#3B82F6',
        strokeOpacity: 0.8,
        strokeStyle: 'solid'
      })

      // Use polyline path for bounds
      const bounds = new kakao.maps.LatLngBounds()
      path.forEach((p) => bounds.extend(p))
      map.setBounds(bounds, 50, 50, 50, 50)
    } else if (points.length === 2) {
      const bounds = new kakao.maps.LatLngBounds()
      points.forEach((p) => bounds.extend(p))
      map.setBounds(bounds, 50, 50, 50, 50)
    } else if (points.length === 1) {
      map.setCenter(points[0])
      map.setLevel(5)
    }
  }, [departure, destination, routePath])

  const hasRoute = routePath && routePath.length >= 4

  return (
    <div
      ref={setRefs}
      className={`w-full rounded-lg border border-[#D8DDE5] overflow-hidden ${hasRoute ? 'h-[200px]' : 'h-[150px]'}`}
    />
  )
}
