import { Router, type Request, type Response } from 'express'

const router = Router()

// Google Distance Matrix API endpoint
router.post('/distance', async (req: Request, res: Response): Promise<void> => {
  const { origins, destinations } = req.body

  if (!origins || !destinations || !Array.isArray(origins) || !Array.isArray(destinations)) {
    res.status(400).json({ success: false, error: 'origins ve destinations gerekli' })
    return
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    res.status(500).json({ success: false, error: 'Google Maps API key yapılandırılmamış' })
    return
  }

  try {
    // Format origins and destinations
    const originsStr = origins.map((o: any) => `${o.lat},${o.lng}`).join('|')
    const destinationsStr = destinations.map((d: any) => `${d.lat},${d.lng}`).join('|')

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originsStr)}&destinations=${encodeURIComponent(destinationsStr)}&mode=driving&language=tr&units=metric&departure_time=now&traffic_model=best_guess&key=${apiKey}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK') {
      console.error('Distance Matrix API error:', data.status, data.error_message)
      res.status(400).json({ success: false, error: data.error_message || data.status })
      return
    }

    // Parse results
    const results: any[] = []
    for (let i = 0; i < data.origin_addresses.length; i++) {
      for (let j = 0; j < data.destination_addresses.length; j++) {
        const element = data.rows[i].elements[j]
        if (element.status === 'OK') {
          results.push({
            originAddress: data.origin_addresses[i],
            destinationAddress: data.destination_addresses[j],
            distance: {
              value: element.distance.value, // meters
              text: element.distance.text,
            },
            duration: {
              value: element.duration.value, // seconds
              text: element.duration.text,
            },
            durationInTraffic: element.duration_in_traffic ? {
              value: element.duration_in_traffic.value,
              text: element.duration_in_traffic.text,
            } : null,
          })
        }
      }
    }

    res.json({ success: true, data: results })
  } catch (error: any) {
    console.error('Distance Matrix error:', error)
    res.status(500).json({ success: false, error: error.message || 'Mesafe hesaplama hatası' })
  }
})

// Google Directions API endpoint - Get route with polyline
router.post('/directions', async (req: Request, res: Response): Promise<void> => {
  const { origin, destination, waypoints } = req.body

  if (!origin || !destination) {
    res.status(400).json({ success: false, error: 'origin ve destination gerekli' })
    return
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    res.status(500).json({ success: false, error: 'Google Maps API key yapılandırılmamış' })
    return
  }

  try {
    let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(`${origin.lat},${origin.lng}`)}&destination=${encodeURIComponent(`${destination.lat},${destination.lng}`)}&mode=driving&language=tr&units=metric&departure_time=now&traffic_model=best_guess&key=${apiKey}`

    if (waypoints && Array.isArray(waypoints) && waypoints.length > 0) {
      const waypointsStr = waypoints.map((w: any) => `${w.lat},${w.lng}`).join('|')
      url += `&waypoints=${encodeURIComponent(waypointsStr)}`
    }

    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK') {
      console.error('Directions API error:', data.status, data.error_message)
      res.status(400).json({ success: false, error: data.error_message || data.status })
      return
    }

    const route = data.routes[0]
    const leg = route.legs[0]

    // Decode polyline for frontend
    const decodePolyline = (encoded: string): { lat: number; lng: number }[] => {
      const points: { lat: number; lng: number }[] = []
      let index = 0
      let lat = 0
      let lng = 0

      while (index < encoded.length) {
        let shift = 0
        let result = 0
        let byte: number

        do {
          byte = encoded.charCodeAt(index++) - 63
          result |= (byte & 0x1f) << shift
          shift += 5
        } while (byte >= 0x20)

        lat += result & 1 ? ~(result >> 1) : result >> 1

        shift = 0
        result = 0

        do {
          byte = encoded.charCodeAt(index++) - 63
          result |= (byte & 0x1f) << shift
          shift += 5
        } while (byte >= 0x20)

        lng += result & 1 ? ~(result >> 1) : result >> 1

        points.push({ lat: lat / 1e5, lng: lng / 1e5 })
      }

      return points
    }

    const result = {
      distance: {
        value: leg.distance.value,
        text: leg.distance.text,
      },
      duration: {
        value: leg.duration.value,
        text: leg.duration.text,
      },
      durationInTraffic: leg.duration_in_traffic ? {
        value: leg.duration_in_traffic.value,
        text: leg.duration_in_traffic.text,
      } : null,
      startAddress: leg.start_address,
      endAddress: leg.end_address,
      polyline: decodePolyline(route.overview_polyline.points),
      bounds: route.bounds,
    }

    res.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Directions error:', error)
    res.status(500).json({ success: false, error: error.message || 'Rota hesaplama hatası' })
  }
})

// Geocoding - Address to coordinates
router.get('/geocode', async (req: Request, res: Response): Promise<void> => {
  const { address } = req.query

  if (!address) {
    res.status(400).json({ success: false, error: 'address gerekli' })
    return
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    res.status(500).json({ success: false, error: 'Google Maps API key yapılandırılmamış' })
    return
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address as string)}&language=tr&key=${apiKey}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK') {
      res.status(400).json({ success: false, error: data.error_message || data.status })
      return
    }

    const results = data.results.map((r: any) => ({
      address: r.formatted_address,
      location: r.geometry.location,
      placeId: r.place_id,
      types: r.types,
    }))

    res.json({ success: true, data: results })
  } catch (error: any) {
    console.error('Geocoding error:', error)
    res.status(500).json({ success: false, error: error.message || 'Adres çözümleme hatası' })
  }
})

// OSRM Route API - Ücretsiz, API key gerektirmez
router.get('/route', async (req: Request, res: Response): Promise<void> => {
  const { startLat, startLng, endLat, endLng } = req.query

  if (!startLat || !startLng || !endLat || !endLng) {
    res.status(400).json({ success: false, error: 'Koordinatlar gerekli' })
    return
  }

  try {
    // OSRM Demo Server - Ücretsiz
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&alternatives=false&steps=true`

    const response = await fetch(url)
    const data = await response.json()

    if (data.code !== 'Ok') {
      res.status(400).json({ success: false, error: 'Rota bulunamadı' })
      return
    }

    const route = data.routes[0]
    
    // GeoJSON coordinates [lng, lat] -> {lat, lng}
    const coordinates = route.geometry.coordinates.map((c: number[]) => ({
      lng: c[0],
      lat: c[1]
    }))

    // Manevra adımları
    const steps = route.legs[0].steps.map((step: any) => ({
      distance: step.distance,
      duration: step.duration,
      instruction: step.maneuver?.type || '',
      name: step.name || '',
      location: step.maneuver?.location ? {
        lng: step.maneuver.location[0],
        lat: step.maneuver.location[1]
      } : null
    }))

    res.json({ 
      success: true, 
      data: {
        distance: route.distance,
        duration: route.duration,
        geometry: coordinates,
        steps
      }
    })
  } catch (error: any) {
    console.error('OSRM route error:', error)
    res.status(500).json({ success: false, error: error.message || 'Rota hesaplama hatası' })
  }
})

// Reverse Geocoding - Coordinates to address
router.get('/reverse-geocode', async (req: Request, res: Response): Promise<void> => {
  const { lat, lng } = req.query

  if (!lat || !lng) {
    res.status(400).json({ success: false, error: 'lat ve lng gerekli' })
    return
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    res.status(500).json({ success: false, error: 'Google Maps API key yapılandırılmamış' })
    return
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=tr&key=${apiKey}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK') {
      res.status(400).json({ success: false, error: data.error_message || data.status })
      return
    }

    const results = data.results.map((r: any) => ({
      address: r.formatted_address,
      location: r.geometry.location,
      placeId: r.place_id,
      types: r.types,
    }))

    res.json({ success: true, data: results })
  } catch (error: any) {
    console.error('Reverse geocoding error:', error)
    res.status(500).json({ success: false, error: error.message || 'Adres çözümleme hatası' })
  }
})

export default router
