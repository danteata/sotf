'use client'

import React, { useState, useCallback, useRef } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import { Member } from '../src/types/database'
import { ExternalLink } from 'lucide-react'

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

    const [hoveredMember, setHoveredMember] = useState<Member | null>(null)
    const [selectedMember, setSelectedMember] = useState<Member | null>(null)
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

    const handleMarkerClick = useCallback((member: Member) => {
        // For mobile: toggle selection on click
        if (selectedMember?.id === member.id) {
            setSelectedMember(null)
        } else {
            setSelectedMember(member)
        }
        // Also set as hovered for consistency
        setHoveredMember(member)
    }, [selectedMember])

    const handleMapClick = useCallback(() => {
        // Close InfoWindow when clicking on map (mobile)
        setSelectedMember(null)
        setHoveredMember(null)
    }, [])

    const getMapsUrl = useCallback((lat: number, lng: number, name: string) => {
        // Google Maps URL that works on both iOS and Android
        return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(name)}`
    }, [])

    const handleOpenInMaps = useCallback((e: React.MouseEvent, member: Member) => {
        e.stopPropagation()
        if (member.latitude && member.longitude) {
            const url = getMapsUrl(member.latitude, member.longitude, member.name)
            window.open(url, '_blank', 'noopener,noreferrer')
        }
    }, [getMapsUrl])

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
            onClick={handleMapClick}
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

            {(() => {
                const displayMember = hoveredMember || selectedMember
                if (displayMember && displayMember.latitude && displayMember.longitude) {
                    return (
                        <InfoWindow
                            position={{ lat: displayMember.latitude, lng: displayMember.longitude }}
                            onCloseClick={() => {
                                setSelectedMember(null)
                                setHoveredMember(null)
                            }}
                        >
                            <div
                                className="p-3 min-w-[180px]"
                                onMouseOver={handleInfoWindowMouseOver}
                                onMouseOut={handleInfoWindowMouseOut}
                            >
                                <h4 className="font-semibold text-gray-900 mb-1">{displayMember.name}</h4>
                                {displayMember.phone && (
                                    <p className="text-sm text-gray-600 mb-2">{displayMember.phone}</p>
                                )}
                                <button
                                    onClick={(e) => handleOpenInMaps(e, displayMember)}
                                    className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 font-medium transition-colors"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Open in Maps
                                </button>
                            </div>
                        </InfoWindow>
                    )
                }
                return null
            })()}
        </GoogleMap>
    ) : <></>
}
