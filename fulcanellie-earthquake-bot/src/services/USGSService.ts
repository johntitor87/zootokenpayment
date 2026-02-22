import axios from 'axios';

export interface Earthquake {
  id: string;
  properties: {
    mag: number;
    place: string;
    time: number;
    url: string;
    title: string;
    tsunami: number;
  };
  geometry: {
    coordinates: [number, number, number]; // [longitude, latitude, depth]
  };
}

export class USGSService {
  private readonly BASE_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary';
  private readonly MIN_MAGNITUDE = Number(process.env.MIN_MAGNITUDE) || 4.0;

  async getRecentEarthquakes(): Promise<Earthquake[]> {
    try {
      console.log('🌍 Fetching earthquake data from USGS...');
      console.log(`Minimum magnitude threshold: ${this.MIN_MAGNITUDE}`);
      
      const response = await axios.get(`${this.BASE_URL}/all_month.geojson`);
      console.log(`📊 Total earthquakes in feed: ${response.data.features.length}`);
      
      const earthquakes = response.data.features
        .filter((quake: Earthquake) => quake.properties.mag >= this.MIN_MAGNITUDE)
        .sort((a: Earthquake, b: Earthquake) => b.properties.time - a.properties.time);
      
      console.log(`🔍 Found ${earthquakes.length} earthquakes above magnitude ${this.MIN_MAGNITUDE} worldwide`);
      
      if (earthquakes.length > 0) {
        console.log('Latest earthquake:', {
          magnitude: earthquakes[0].properties.mag,
          location: earthquakes[0].properties.place,
          time: new Date(earthquakes[0].properties.time).toISOString()
        });
      }
      
      return earthquakes;
    } catch (error) {
      console.error('❌ Error fetching earthquake data:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      return [];
    }
  }

  formatEarthquakeMessage(earthquake: Earthquake): string {
    const { properties, geometry } = earthquake;
    const [longitude, latitude, depth] = geometry.coordinates;
    
    const magnitude = properties.mag.toFixed(1);
    const location = properties.place;
    const time = new Date(properties.time).toISOString();
    
    let message = `🌍 Earthquake Alert!\n\n`;
    message += `Magnitude: ${magnitude}\n`;
    message += `Location: ${location}\n`;
    message += `Depth: ${depth.toFixed(1)} km\n`;
    message += `Coordinates: ${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E\n`;
    message += `Time: ${time}\n\n`;
    message += `More info: ${properties.url}`;
    
    return message;
  }
} 