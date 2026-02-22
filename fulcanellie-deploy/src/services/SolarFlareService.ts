import axios from 'axios';

export interface SolarFlare {
  classType: string;
  sourceLocation: string;
  activeRegionNum: number;
  beginTime: string;
  maxTime: string;
  endTime: string;
  intensity: number;
}

/**
 * Service to monitor X-class solar flares from NOAA
 */
export class SolarFlareService {
  private readonly NOAA_DONKI_API = 'https://api.nasa.gov/DONKI/FLR';
  private readonly NASA_API_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';
  private lastCheckedFlares: Set<string>;

  constructor() {
    this.lastCheckedFlares = new Set();
    console.log('☀️ Solar Flare Service initialized');
  }

  /**
   * Fetch recent X-class solar flares from NOAA/NASA DONKI
   */
  async getRecentXClassFlares(): Promise<SolarFlare[]> {
    try {
      console.log('☀️ Checking for X-class solar flares...');
      
      // Get flares from the last 7 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const url = `${this.NOAA_DONKI_API}?startDate=${startDateStr}&endDate=${endDateStr}&api_key=${this.NASA_API_KEY}`;
      
      console.log(`📡 Fetching solar flare data from NASA DONKI...`);
      const response = await axios.get(url, { timeout: 15000 });
      
      // Filter for X-class flares only
      const xClassFlares = response.data
        .filter((flare: any) => flare.classType && flare.classType.startsWith('X'))
        .map((flare: any) => ({
          classType: flare.classType,
          sourceLocation: flare.sourceLocation || 'Unknown',
          activeRegionNum: flare.activeRegionNum || 0,
          beginTime: flare.beginTime,
          maxTime: flare.peakTime || flare.beginTime,
          endTime: flare.endTime,
          intensity: this.parseFlareIntensity(flare.classType)
        }));
      
      console.log(`☀️ Found ${xClassFlares.length} X-class solar flare(s)`);
      
      return xClassFlares;
    } catch (error) {
      console.error('❌ Error fetching solar flare data:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      return [];
    }
  }

  /**
   * Parse flare intensity from class type (e.g., "X2.5" -> 2.5)
   */
  private parseFlareIntensity(classType: string): number {
    const match = classType.match(/X(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Check if a flare has already been processed
   */
  isFlareProcessed(flare: SolarFlare): boolean {
    const flareId = `${flare.maxTime}_${flare.classType}`;
    return this.lastCheckedFlares.has(flareId);
  }

  /**
   * Mark a flare as processed
   */
  markFlareAsProcessed(flare: SolarFlare): void {
    const flareId = `${flare.maxTime}_${flare.classType}`;
    this.lastCheckedFlares.add(flareId);
    
    // Keep set size manageable
    if (this.lastCheckedFlares.size > 100) {
      const oldestId = Array.from(this.lastCheckedFlares)[0];
      this.lastCheckedFlares.delete(oldestId);
    }
  }

  /**
   * Format solar flare alert message for Twitter
   */
  formatFlareMessage(flare: SolarFlare): string {
    const flareTime = new Date(flare.maxTime);
    const now = new Date();
    const hoursDiff = Math.floor((now.getTime() - flareTime.getTime()) / (1000 * 60 * 60));
    const timeAgo = hoursDiff < 1 ? 'Just detected' : 
                   hoursDiff < 24 ? `${hoursDiff} hours ago` : 
                   `${Math.floor(hoursDiff / 24)} days ago`;
    
    let severityEmoji = '🔥';
    let severityText = 'EXTREME';
    
    if (flare.intensity >= 10) {
      severityEmoji = '🚨';
      severityText = 'CATASTROPHIC';
    } else if (flare.intensity >= 5) {
      severityEmoji = '⚠️';
      severityText = 'SEVERE';
    } else if (flare.intensity >= 2) {
      severityEmoji = '🔥';
      severityText = 'EXTREME';
    }

    let message = `☀️ SOLAR FLARE ALERT ☀️\n\n`;
    message += `${severityEmoji} ${severityText} X-CLASS SOLAR FLARE DETECTED ${severityEmoji}\n\n`;
    message += `Class: ${flare.classType} (${flare.intensity} intensity)\n`;
    message += `Region: AR ${flare.activeRegionNum}\n`;
    message += `Location: ${flare.sourceLocation}\n`;
    message += `Peak Time: ${flareTime.toUTCString()}\n`;
    message += `Status: ${timeAgo}\n\n`;
    
    // Add mystical interpretation
    message += this.getMysticalInterpretation(flare.intensity);
    message += `\n\n#SolarFlare #XClass #SpaceWeather #SolarActivity`;
    
    // Ensure within Twitter's character limit
    if (message.length > 280) {
      message = message.substring(0, 277) + '...';
    }
    
    return message;
  }

  /**
   * Get mystical interpretation based on flare intensity
   */
  private getMysticalInterpretation(intensity: number): string {
    if (intensity >= 10) {
      return '⚡ ANCIENT PROPHECY ALERT! The Sun awakens with unprecedented fury. Earth\'s magnetic field will tremble. Monitor for seismic responses.';
    } else if (intensity >= 5) {
      return '🌊 MAJOR ENERGY SURGE! Ancient texts speak of such solar events triggering Earth changes. Leyline activation probable.';
    } else if (intensity >= 2) {
      return '👁️ SOLAR-TERRESTRIAL CONNECTION ACTIVE! The cosmic dance between Sun and Earth intensifies. Watch for magnetic anomalies.';
    } else {
      return '⚠️ Solar energy pulse detected. Ancient wisdom teaches: As above, so below. Earth may respond.';
    }
  }
}
