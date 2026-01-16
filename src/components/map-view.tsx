
import React, { useState, useCallback, useRef } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import { Member } from '@/types/database'
import { Button } from '@/components/ui/button'
import { MapPin, Navigation, Phone, Users, Building } from 'lucide-react'

const containerStyle = {
  width: '100%',
  height: '600px'
}

const center = {
  lat: 5.6037,
  lng: -0.1870
}

// Create a custom purple marker icon with human icon
const createCustomMarkerIcon = () => {
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#9333ea" stroke="white" stroke-width="2"/>
        <g transform="translate(12,12)">
          <circle cx="0" cy="-2" r="2" fill="white"/>
          <path d="M -3 0 Q 0 0 3 0 L 3 2 Q 0 2 -3 2 Z" fill="white"/>
          <path d="M -2 2 L -2 6 L 2 6 L 2 2 Z" fill="white"/>
          <path d="M -4 6 L 4 6 L 4 10 L -4 10 Z" fill="white"/>
        </g>
      </svg>
    `),
    scaledSize: new google.maps.Size(24, 24),
    anchor: new google.maps.Point(12, 24)
  }
}

interface MapViewProps {
  members: Member[]
}

export default function MapView({ members }: MapViewProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""
  })

  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [hoveredMember, setHoveredMember] = useState<Member | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [isInfoWindowHovered, setIsInfoWindowHovered] = useState(false)
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMapLoad = useCallback(() => {
    setIsMapLoaded(true)
  }, [])

  const handleMarkerMouseOver = useCallback((member: Member) => {
    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    setHoveredMember(member)
  }, [])

  const handleMarkerMouseOut = useCallback(() => {
    // Delay closing to allow moving to InfoWindow
    closeTimeoutRef.current = setTimeout(() => {
      if (!isInfoWindowHovered) {
        setHoveredMember(null)
      }
    }, 150) // 150ms delay
  }, [isInfoWindowHovered])

  const handleMarkerClick = useCallback((member: Member) => {
    // For mobile/touch devices, toggle the selected member
    if (selectedMember && selectedMember.id === member.id) {
      setSelectedMember(null)
    } else {
      setSelectedMember(member)
    }
  }, [selectedMember])

  const handleInfoWindowMouseOver = useCallback(() => {
    setIsInfoWindowHovered(true)
    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }, [])

  const handleInfoWindowMouseOut = useCallback(() => {
    setIsInfoWindowHovered(false)
    // Delay closing to allow moving back to marker
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredMember(null)
    }, 150) // 150ms delay
  }, [])

  const handleInfoWindowClose = useCallback(() => {
    setSelectedMember(null)
    setHoveredMember(null)
  }, [])

  const handleGetDirections = useCallback((member: Member) => {
    if (!member.latitude || !member.longitude) return

    const lat = member.latitude
    const lng = member.longitude
    const memberName = encodeURIComponent(member.name || 'Member Location')

    // Try to open in Google Maps first (works on most devices)
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${memberName}`

    // Fallback to geo: protocol for native map apps
    const geoUrl = `geo:${lat},${lng}?q=${lat},${lng}(${memberName})`

    // For iOS, try Apple Maps first
    if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
      const appleMapsUrl = `maps:///?daddr=${lat},${lng}&dirflg=d`
      window.open(appleMapsUrl, '_blank')

      // Fallback to Google Maps if Apple Maps fails
      setTimeout(() => {
        window.open(googleMapsUrl, '_blank')
      }, 500)
    } else {
      // For Android and desktop, use Google Maps
      window.open(googleMapsUrl, '_blank')
    }
  }, [])

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
      }
    }
  }, [])

  return isLoaded ? (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={10}
      onLoad={handleMapLoad}
    >
      {members.map((member) => {
        if (member.latitude && member.longitude) {
          return (
            <Marker
              key={member.id}
              position={{ lat: member.latitude, lng: member.longitude }}
              icon={isMapLoaded ? createCustomMarkerIcon() : undefined}
              onMouseOver={() => handleMarkerMouseOver(member)}
              onMouseOut={handleMarkerMouseOut}
              onClick={() => handleMarkerClick(member)}
            />
          )
        }
        return null
      })}

      {(selectedMember || hoveredMember) && (
        <InfoWindow
          position={{
            lat: (selectedMember?.latitude || hoveredMember?.latitude) || 0,
            lng: (selectedMember?.longitude || hoveredMember?.longitude) || 0
          }}
          onCloseClick={handleInfoWindowClose}
        >
          <div
            className="p-3 min-w-[200px] max-w-[280px]"
            onMouseOver={handleInfoWindowMouseOver}
            onMouseOut={handleInfoWindowMouseOut}
          >
            {(() => {
              const member = selectedMember || hoveredMember
              return member ? (
                <>
                  {/* Member Name */}
                  <h4 className="font-semibold text-gray-900 text-base mb-2">{member.name}</h4>

                  {/* Contact Info */}
                  <div className="space-y-1 mb-2">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Phone className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="truncate">{member.phone}</span>
                    </div>

                    {/* Region Info */}
                    {member.region && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="truncate">{member.region}</span>
                      </div>
                    )}

                    {/* Address Info */}
                    {(member.city || member.address) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="truncate">
                          {[member.address, member.city].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Ministries */}
                  {member.ministries && member.ministries.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Users className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <span className="font-medium">Ministries:</span>
                      </div>
                      <div className="flex flex-wrap gap-1 ml-6">
                        {member.ministries.slice(0, 2).map((ministry, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
                          >
                            {ministry}
                          </span>
                        ))}
                        {member.ministries.length > 2 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{member.ministries.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Get Directions Button */}
                  <div className="pt-2 border-t border-gray-200">
                    <Button
                      size="sm"
                      onClick={() => handleGetDirections(member)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Get Directions
                    </Button>
                  </div>
                </>
              ) : null
            })()}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  ) : <></>
}
