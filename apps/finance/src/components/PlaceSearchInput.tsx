import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { TextField } from 'trust-ui-react'
import { PlaceCoord } from '../types'
import { loadKakaoSDK } from '../lib/kakaoLoader'

interface Props {
  label: string
  value: string
  coord?: PlaceCoord
  onChange: (text: string, coord?: PlaceCoord) => void
  placeholder?: string
}

interface SearchResult {
  placeName: string
  addressName: string
  lat: number
  lng: number
}

export default function PlaceSearchInput({ label, value, coord, onChange, placeholder }: Props) {
  const { t } = useTranslation()
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<SearchResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isManual, setIsManual] = useState(false)
  const [sdkReady, setSdkReady] = useState(false)
  const placesRef = useRef<kakao.maps.services.Places | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load SDK
  useEffect(() => {
    loadKakaoSDK()
      .then(() => {
        placesRef.current = new kakao.maps.services.Places()
        setSdkReady(true)
      })
      .catch(() => {
        setIsManual(true) // fallback to manual
      })
  }, [])

  // Sync external value changes
  useEffect(() => {
    setQuery(value)
  }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const search = useCallback((keyword: string) => {
    if (!placesRef.current || keyword.trim().length < 2) {
      setResults([])
      return
    }
    placesRef.current.keywordSearch(
      keyword,
      (data, status) => {
        if (status === 'OK') {
          setResults(
            data.slice(0, 5).map((item) => ({
              placeName: item.place_name,
              addressName: item.road_address_name || item.address_name,
              lat: parseFloat(item.y),
              lng: parseFloat(item.x)
            }))
          )
          setShowDropdown(true)
        } else {
          setResults([])
        }
      },
      { size: 5 }
    )
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)

    if (isManual || !sdkReady) {
      onChange(val, undefined)
      return
    }

    // Always propagate text to parent; clear coord when typing new text
    onChange(val, undefined)

    // Debounced search
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(val), 300)
  }

  const handleSelect = (result: SearchResult) => {
    const newCoord: PlaceCoord = {
      lat: result.lat,
      lng: result.lng,
      placeName: result.placeName,
      addressName: result.addressName
    }
    setQuery(result.placeName)
    setShowDropdown(false)
    setResults([])
    onChange(result.placeName, newCoord)
  }

  const handleManualInput = () => {
    setIsManual(true)
    setShowDropdown(false)
    setResults([])
    onChange(query, undefined)
  }

  // If SDK not ready, render plain input
  if (isManual || !sdkReady) {
    return (
      <div>
        <TextField
          label={label}
          placeholder={placeholder || t('field.departure')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            onChange(e.target.value, undefined)
          }}
          fullWidth
        />
        {sdkReady && isManual && (
          <button
            type="button"
            className="text-xs text-blue-500 hover:underline mt-1"
            onClick={() => setIsManual(false)}
          >
            {t('field.placeSearchPlaceholder')}
          </button>
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <TextField
        label={label}
        placeholder={placeholder || t('field.placeSearchPlaceholder')}
        value={query}
        onChange={handleInputChange}
        onFocus={() => {
          if (results.length > 0) setShowDropdown(true)
        }}
        fullWidth
      />
      {coord && <p className="text-xs text-gray-400 mt-0.5 truncate">{coord.addressName}</p>}
      {showDropdown && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
              onClick={() => handleSelect(r)}
            >
              <span className="text-sm font-medium text-gray-800">{r.placeName}</span>
              <span className="block text-xs text-gray-400 truncate">{r.addressName}</span>
            </button>
          ))}
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 border-t border-gray-200"
            onClick={handleManualInput}
          >
            {t('field.manualInput')}
          </button>
        </div>
      )}
    </div>
  )
}
