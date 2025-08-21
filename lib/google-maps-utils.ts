const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export async function convertPlusCodeToLatLng(plusCode: string): Promise<{ lat: number; lng: number } | null> {
  if (!API_KEY) {
    console.error('Google Maps API key is missing.');
    return null;
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    plusCode
  )}&key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    } else {
      console.error('Geocoding API error:', data.status, data.error_message);
      return null;
    }
  } catch (error) {
    console.error('Error fetching from Geocoding API:', error);
    return null;
  }
}
