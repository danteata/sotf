'use client'

import React, { useState, useCallback, useRef } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import { Member } from '../src/types/database'

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
    console.log('Members in MapView:', members);
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""
    })

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
                        />
                    )
                }
                return null
            })}

            {hoveredMember && hoveredMember.latitude && hoveredMember.longitude && (
                <InfoWindow
                    position={{ lat: hoveredMember.latitude, lng: hoveredMember.longitude }}
                >
                    <div
                        className="p-2"
                        onMouseOver={handleInfoWindowMouseOver}
                        onMouseOut={handleInfoWindowMouseOut}
                    >
                        <h4 className="font-semibold text-gray-900">{hoveredMember.name}</h4>
                        <p className="text-sm text-gray-600">{hoveredMember.phone}</p>
                    </div>
                </InfoWindow>
            )}
        </GoogleMap>
    ) : <></>
}
