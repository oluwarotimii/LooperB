export class GeoLocationService {
  private readonly EARTH_RADIUS_KM = 6371;
  
  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.EARTH_RADIUS_KM * c;
  }

  /**
   * Find points within a certain radius
   */
  getPointsWithinRadius(
    centerLat: number,
    centerLon: number,
    radius: number,
    points: Array<{ lat: number; lon: number; id: string; [key: string]: any }>
  ): Array<{ distance: number; point: any }> {
    return points
      .map(point => ({
        distance: this.calculateDistance(centerLat, centerLon, point.lat, point.lon),
        point
      }))
      .filter(item => item.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }

  /**
   * Get bounding box for a given center point and radius
   */
  getBoundingBox(
    centerLat: number,
    centerLon: number,
    radiusKm: number
  ): {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  } {
    const latChange = radiusKm / this.EARTH_RADIUS_KM * (180 / Math.PI);
    const lonChange = radiusKm / this.EARTH_RADIUS_KM * (180 / Math.PI) / Math.cos(centerLat * Math.PI / 180);

    return {
      minLat: centerLat - latChange,
      maxLat: centerLat + latChange,
      minLon: centerLon - lonChange,
      maxLon: centerLon + lonChange,
    };
  }

  /**
   * Validate coordinates
   */
  validateCoordinates(lat: number, lon: number): boolean {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  }

  /**
   * Get approximate delivery zones for Lagos
   */
  getLagosDeliveryZones(): Array<{
    name: string;
    polygon: Array<{ lat: number; lon: number }>;
    deliveryFee: number;
    estimatedTime: string;
  }> {
    return [
      {
        name: "Lagos Island",
        polygon: [
          { lat: 6.4474, lon: 3.3903 },
          { lat: 6.4474, lon: 3.4340 },
          { lat: 6.4281, lon: 3.4340 },
          { lat: 6.4281, lon: 3.3903 },
        ],
        deliveryFee: 500,
        estimatedTime: "30-45 mins",
      },
      {
        name: "Victoria Island",
        polygon: [
          { lat: 6.4281, lon: 3.4100 },
          { lat: 6.4281, lon: 3.4500 },
          { lat: 6.4174, lon: 3.4500 },
          { lat: 6.4174, lon: 3.4100 },
        ],
        deliveryFee: 600,
        estimatedTime: "35-50 mins",
      },
      {
        name: "Ikoyi",
        polygon: [
          { lat: 6.4595, lon: 3.4205 },
          { lat: 6.4595, lon: 3.4446 },
          { lat: 6.4474, lon: 3.4446 },
          { lat: 6.4474, lon: 3.4205 },
        ],
        deliveryFee: 600,
        estimatedTime: "30-40 mins",
      },
      {
        name: "Ikeja",
        polygon: [
          { lat: 6.5948, lon: 3.3393 },
          { lat: 6.5948, lon: 3.3667 },
          { lat: 6.5776, lon: 3.3667 },
          { lat: 6.5776, lon: 3.3393 },
        ],
        deliveryFee: 800,
        estimatedTime: "45-60 mins",
      },
      {
        name: "Surulere",
        polygon: [
          { lat: 6.4969, lon: 3.3393 },
          { lat: 6.4969, lon: 3.3667 },
          { lat: 6.4850, lon: 3.3667 },
          { lat: 6.4850, lon: 3.3393 },
        ],
        deliveryFee: 700,
        estimatedTime: "40-55 mins",
      },
    ];
  }

  /**
   * Determine which delivery zone a point belongs to
   */
  getDeliveryZone(lat: number, lon: number): {
    zone: string;
    deliveryFee: number;
    estimatedTime: string;
  } | null {
    const zones = this.getLagosDeliveryZones();
    
    for (const zone of zones) {
      if (this.isPointInPolygon(lat, lon, zone.polygon)) {
        return {
          zone: zone.name,
          deliveryFee: zone.deliveryFee,
          estimatedTime: zone.estimatedTime,
        };
      }
    }
    
    // Default zone for areas outside defined zones
    return {
      zone: "Extended Lagos",
      deliveryFee: 1200,
      estimatedTime: "60-90 mins",
    };
  }

  /**
   * Check if a point is inside a polygon using ray casting algorithm
   */
  private isPointInPolygon(
    lat: number,
    lon: number,
    polygon: Array<{ lat: number; lon: number }>
  ): boolean {
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (
        ((polygon[i].lat > lat) !== (polygon[j].lat > lat)) &&
        (lon < (polygon[j].lon - polygon[i].lon) * (lat - polygon[i].lat) / (polygon[j].lat - polygon[i].lat) + polygon[i].lon)
      ) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  /**
   * Get popular Lagos locations for autocomplete
   */
  getPopularLagosLocations(): Array<{
    name: string;
    area: string;
    lat: number;
    lon: number;
    type: "landmark" | "area" | "business_district";
  }> {
    return [
      { name: "Tafawa Balewa Square", area: "Lagos Island", lat: 6.4508, lon: 3.3956, type: "landmark" },
      { name: "National Theatre", area: "Surulere", lat: 6.4969, lon: 3.3667, type: "landmark" },
      { name: "Murtala Muhammed Airport", area: "Ikeja", lat: 6.5776, lon: 3.3211, type: "landmark" },
      { name: "Eko Hotel", area: "Victoria Island", lat: 6.4281, lon: 3.4340, type: "landmark" },
      { name: "Computer Village", area: "Ikeja", lat: 6.5948, lon: 3.3393, type: "business_district" },
      { name: "Alaba Market", area: "Alaba", lat: 6.4595, lon: 3.2206, type: "business_district" },
      { name: "Balogun Market", area: "Lagos Island", lat: 6.4520, lon: 3.3898, type: "business_district" },
      { name: "Lekki Phase 1", area: "Lekki", lat: 6.4308, lon: 3.5056, type: "area" },
      { name: "Ajah", area: "Ajah", lat: 6.4667, lon: 3.5667, type: "area" },
      { name: "Maryland", area: "Maryland", lat: 6.5629, lon: 3.3667, type: "area" },
    ];
  }

  /**
   * Geocode address using a simple lookup (in production, use Google Maps API)
   */
  async geocodeAddress(address: string): Promise<{
    lat: number;
    lon: number;
    formattedAddress: string;
  } | null> {
    // Simple geocoding for Lagos landmarks
    const locations = this.getPopularLagosLocations();
    const normalizedAddress = address.toLowerCase();
    
    const match = locations.find(loc => 
      normalizedAddress.includes(loc.name.toLowerCase()) ||
      normalizedAddress.includes(loc.area.toLowerCase())
    );
    
    if (match) {
      return {
        lat: match.lat,
        lon: match.lon,
        formattedAddress: `${match.name}, ${match.area}, Lagos, Nigeria`,
      };
    }
    
    return null;
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(lat: number, lon: number): Promise<{
    address: string;
    area: string;
    city: string;
    state: string;
  } | null> {
    // Simple reverse geocoding for Lagos
    const zone = this.getDeliveryZone(lat, lon);
    
    if (zone) {
      return {
        address: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
        area: zone.zone,
        city: "Lagos",
        state: "Lagos State",
      };
    }
    
    return null;
  }

  /**
   * Get estimated travel time between two points
   */
  getEstimatedTravelTime(
    fromLat: number,
    fromLon: number,
    toLat: number,
    toLon: number,
    mode: "walking" | "driving" | "bike" = "driving"
  ): { distance: number; estimatedTime: string } {
    const distance = this.calculateDistance(fromLat, fromLon, toLat, toLon);
    
    // Average speeds in km/h for Lagos traffic
    const speeds = {
      walking: 4,
      bike: 15,
      driving: 20, // Accounting for Lagos traffic
    };
    
    const timeInHours = distance / speeds[mode];
    const timeInMinutes = Math.ceil(timeInHours * 60);
    
    return {
      distance: parseFloat(distance.toFixed(2)),
      estimatedTime: timeInMinutes < 60 
        ? `${timeInMinutes} mins`
        : `${Math.floor(timeInMinutes / 60)}h ${timeInMinutes % 60}m`,
    };
  }

  /**
   * Find nearest businesses to a location
   */
  findNearestBusinesses(
    userLat: number,
    userLon: number,
    businesses: Array<{
      id: string;
      name: string;
      lat: number;
      lon: number;
      [key: string]: any;
    }>,
    maxResults: number = 10,
    maxDistance: number = 15
  ): Array<{
    business: any;
    distance: number;
    estimatedTime: string;
  }> {
    return businesses
      .map(business => {
        const distance = this.calculateDistance(userLat, userLon, business.lat, business.lon);
        const travelInfo = this.getEstimatedTravelTime(userLat, userLon, business.lat, business.lon);
        
        return {
          business,
          distance,
          estimatedTime: travelInfo.estimatedTime,
        };
      })
      .filter(item => item.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxResults);
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Get coordinates for major Nigerian cities
   */
  getMajorNigerianCities(): Array<{
    name: string;
    state: string;
    lat: number;
    lon: number;
    population: number;
  }> {
    return [
      { name: "Lagos", state: "Lagos", lat: 6.5244, lon: 3.3792, population: 15000000 },
      { name: "Abuja", state: "FCT", lat: 9.0765, lon: 7.3986, population: 3000000 },
      { name: "Kano", state: "Kano", lat: 12.0022, lon: 8.5920, population: 4000000 },
      { name: "Ibadan", state: "Oyo", lat: 7.3775, lon: 3.9470, population: 3500000 },
      { name: "Port Harcourt", state: "Rivers", lat: 4.8156, lon: 7.0498, population: 2000000 },
      { name: "Benin City", state: "Edo", lat: 6.3350, lon: 5.6037, population: 1500000 },
      { name: "Kaduna", state: "Kaduna", lat: 10.5105, lon: 7.4165, population: 1800000 },
      { name: "Enugu", state: "Enugu", lat: 6.5244, lon: 7.5086, population: 1200000 },
    ];
  }
}

export const geoLocationService = new GeoLocationService();
