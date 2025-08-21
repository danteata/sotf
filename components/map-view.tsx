'use client'

import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import { Member } from '@/types/database'
import { useState } from 'react'

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
  console.log('Members in MapView:', members);
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
  })

  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

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
              onMouseOver={() => setSelectedMember(member)}
              onMouseOut={() => setSelectedMember(null)}
            />
          )
        }
        return null
      })}

      {selectedMember && selectedMember.latitude && selectedMember.longitude && (
        <InfoWindow
          position={{ lat: selectedMember.latitude, lng: selectedMember.longitude }}
          onCloseClick={() => setSelectedMember(null)}
        >
          <div>
            <h4>{selectedMember.name}</h4>
            <p>{selectedMember.phone}</p>
            <p>{selectedMember.ministry_names?.join(', ')}</p>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  ) : <></>
}
