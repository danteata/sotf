'use client'

import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api'
import { Member } from '@/types/database'

const containerStyle = {
  width: '100%',
  height: '600px'
}

const center = {
  lat: 5.6037,
  lng: -0.1870
}

interface MapViewProps {
  members: Member[]
}

export default function MapView({ members }: MapViewProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
  })

  return isLoaded ? (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={10}
    >
      {members.map((member) => {
        if (member.latitude && member.longitude) {
          return (
            <Marker
              key={member.id}
              position={{ lat: member.latitude, lng: member.longitude }}
            />
          )
        }
        return null
      })}
    </GoogleMap>
  ) : <></>
}
