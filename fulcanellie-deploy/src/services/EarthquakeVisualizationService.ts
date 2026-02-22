import axios from 'axios';
import fs from 'fs';
import path from 'path';

export interface EarthquakeVisual {
  imagePath: string;
  mapUrl: string;
}

/**
 * Service to generate visualizations for earthquake events
 */
export class EarthquakeVisualizationService {
  private readonly TEMP_DIR = path.join(process.cwd(), 'temp');
  
  constructor() {
    // Ensure temp directory exists
    if (!fs.existsSync(this.TEMP_DIR)) {
      fs.mkdirSync(this.TEMP_DIR, { recursive: true });
      console.log('📁 Created temp directory for earthquake visualizations');
    }
  }

  /**
   * Generate a static map image for an earthquake
   * Uses Mapbox Static Images API or OpenStreetMap-based service
   * @param latitude - Earthquake latitude
   * @param longitude - Earthquake longitude
   * @param magnitude - Earthquake magnitude
   * @param location - Earthquake location description
   * @returns Path to the generated image file
   */
  async generateEarthquakeMap(
    latitude: number,
    longitude: number,
    magnitude: number,
    location: string
  ): Promise<EarthquakeVisual | null> {
    try {
      console.log(`🗺️  Generating map for earthquake at ${latitude}, ${longitude}`);
      
      // Determine zoom level based on magnitude (larger earthquakes get wider view)
      const zoom = this.getZoomLevel(magnitude);
      
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `earthquake_${timestamp}.png`;
      const imagePath = path.join(this.TEMP_DIR, filename);
      
      // Use OpenStreetMap's static map service (free, no API key required)
      // Alternative: Can use Mapbox if you have an API key
      const mapUrl = this.generateMapUrl(latitude, longitude, zoom, magnitude);
      
      console.log(`📥 Downloading map from: ${mapUrl}`);
      
      // Download the image
      const response = await axios.get(mapUrl, {
        responseType: 'arraybuffer',
        timeout: 15000, // 15 second timeout
      });
      
      // Save image to file
      fs.writeFileSync(imagePath, response.data);
      console.log(`✅ Map saved to: ${imagePath}`);
      
      return {
        imagePath,
        mapUrl
      };
      
    } catch (error) {
      console.error('❌ Failed to generate earthquake map:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      return null;
    }
  }
  
  /**
   * Generate map URL using StaticMap service
   * Uses a combination of OpenStreetMap tiles
   */
  private generateMapUrl(lat: number, lon: number, zoom: number, magnitude: number): string {
    // Using MapQuest Open Static Map API (free tier available)
    // Alternatively, you can use:
    // - Mapbox: https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/...
    // - Google Maps: https://maps.googleapis.com/maps/api/staticmap?...
    // - OpenStreetMap via external services
    
    const width = 800;
    const height = 600;
    
    // Using a free static map service (geoapify or similar)
    // Note: For production, consider getting API keys for better reliability
    const markerColor = this.getMagnitudeColor(magnitude);
    const markerSize = this.getMarkerSize(magnitude);
    
    // Using OpenStreetMap via staticmap.openstreetmap.de (free service)
    const baseUrl = 'https://staticmap.openstreetmap.de/staticmap.php';
    const params = new URLSearchParams({
      center: `${lat},${lon}`,
      zoom: zoom.toString(),
      size: `${width}x${height}`,
      maptype: 'mapnik',
      markers: `${lat},${lon},red-dot`
    });
    
    return `${baseUrl}?${params.toString()}`;
  }
  
  /**
   * Determine appropriate zoom level based on magnitude
   */
  private getZoomLevel(magnitude: number): number {
    if (magnitude >= 7.0) return 5;  // Major earthquake - show wider regional context
    if (magnitude >= 6.0) return 7;  // Significant - show regional area
    if (magnitude >= 5.0) return 9;  // Moderate - show local area
    return 10; // Minor - show immediate vicinity
  }
  
  /**
   * Get marker color based on magnitude
   */
  private getMagnitudeColor(magnitude: number): string {
    if (magnitude >= 7.0) return 'darkred';
    if (magnitude >= 6.0) return 'red';
    if (magnitude >= 5.0) return 'orange';
    if (magnitude >= 4.0) return 'yellow';
    return 'green';
  }
  
  /**
   * Get marker size based on magnitude
   */
  private getMarkerSize(magnitude: number): string {
    if (magnitude >= 7.0) return 'large';
    if (magnitude >= 5.5) return 'medium';
    return 'small';
  }
  
  /**
   * Clean up old temporary map files
   * @param maxAgeHours - Maximum age in hours before deletion
   */
  cleanupOldMaps(maxAgeHours: number = 24): void {
    try {
      if (!fs.existsSync(this.TEMP_DIR)) {
        return;
      }
      
      const now = Date.now();
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
      
      const files = fs.readdirSync(this.TEMP_DIR);
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(this.TEMP_DIR, file);
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtimeMs;
        
        if (fileAge > maxAgeMs) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
      
      if (deletedCount > 0) {
        console.log(`🧹 Cleaned up ${deletedCount} old earthquake map(s)`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up old maps:', error);
    }
  }
}
