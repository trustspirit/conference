declare namespace kakao.maps {
  class LatLng {
    constructor(lat: number, lng: number)
    getLat(): number
    getLng(): number
  }
  class LatLngBounds {
    constructor()
    extend(latlng: LatLng): void
  }
  class Map {
    constructor(container: HTMLElement, options: { center: LatLng; level: number })
    setBounds(bounds: LatLngBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number): void
    setCenter(latlng: LatLng): void
    setLevel(level: number): void
  }
  class Marker {
    constructor(options: { position: LatLng; map?: Map })
    setMap(map: Map | null): void
    setPosition(position: LatLng): void
  }
  function load(callback: () => void): void

  namespace services {
    type Status = 'OK' | 'ZERO_RESULT' | 'ERROR'
    interface PlaceSearchResult {
      place_name: string
      road_address_name: string
      address_name: string
      x: string // longitude
      y: string // latitude
    }
    class Places {
      keywordSearch(
        keyword: string,
        callback: (result: PlaceSearchResult[], status: Status) => void,
        options?: { size?: number }
      ): void
    }
  }
}

interface Window {
  kakao: typeof kakao
}
