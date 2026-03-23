'use client'

import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface LocationData {
  lat: number
  lng: number
  address: string
}

interface StepLocationProps {
  location: LocationData | null
  onLocationChange: (loc: LocationData) => void
  onNext: () => void
  onBack: () => void
}

// Moscow as default center
const DEFAULT_LAT = 55.7558
const DEFAULT_LNG = 37.6173

export function StepLocation({
  location,
  onLocationChange,
  onNext,
  onBack,
}: StepLocationProps) {
  const [address, setAddress] = useState(location?.address ?? '')
  const [lat, setLat] = useState(location?.lat?.toString() ?? '')
  const [lng, setLng] = useState(location?.lng?.toString() ?? '')
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleUseCurrentLocation() {
    setLocating(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setLat(latitude.toFixed(6))
        setLng(longitude.toFixed(6))
        setAddress('Текущее местоположение')
        onLocationChange({
          lat: latitude,
          lng: longitude,
          address: 'Текущее местоположение',
        })
        setLocating(false)
      },
      () => {
        setError('Не удалось определить местоположение')
        setLocating(false)
      }
    )
  }

  function handleManualSubmit() {
    const parsedLat = parseFloat(lat)
    const parsedLng = parseFloat(lng)

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      setError('Введите корректные координаты')
      return
    }

    onLocationChange({
      lat: parsedLat,
      lng: parsedLng,
      address: address || `${parsedLat.toFixed(4)}, ${parsedLng.toFixed(4)}`,
    })
  }

  const canProceed =
    location !== null ||
    (lat.length > 0 && lng.length > 0 && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng)))

  function handleNext() {
    if (!location && lat && lng) {
      const parsedLat = parseFloat(lat)
      const parsedLng = parseFloat(lng)
      onLocationChange({
        lat: parsedLat,
        lng: parsedLng,
        address: address || `${parsedLat.toFixed(4)}, ${parsedLng.toFixed(4)}`,
      })
    }
    onNext()
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-medium text-foreground mb-3">Где прошла эта поездка?</p>

        {/* Current location button */}
        <Button
          variant="outline"
          className="w-full mb-4"
          onClick={handleUseCurrentLocation}
          disabled={locating}
        >
          <MapPin className="w-4 h-4 text-primary" />
          {locating ? 'Определяем...' : 'Использовать текущее место'}
        </Button>

        <div className="relative flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">или введите вручную</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="flex flex-col gap-3">
          <Input
            label="Название места"
            placeholder="Горный Алтай, Россия"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Широта"
              placeholder="55.7558"
              value={lat}
              type="number"
              step="0.000001"
              onChange={(e) => setLat(e.target.value)}
            />
            <Input
              label="Долгота"
              placeholder="37.6173"
              value={lng}
              type="number"
              step="0.000001"
              onChange={(e) => setLng(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-xs text-destructive mt-2">{error}</p>}

        {/* Location preview */}
        {location && (
          <div className="mt-3 flex items-center gap-2 p-3 bg-primary/5 rounded-xl">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium text-primary truncate">{location.address}</span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Назад
        </Button>
        <Button onClick={handleNext} disabled={!canProceed} className="flex-[2]" size="lg">
          Далее — пригласить
        </Button>
      </div>
    </div>
  )
}
