import { Earthquake } from './USGSService';

export class AICharacterService {
  private readonly characterName = "QuakeBot";
  private readonly personality = {
    name: "QuakeBot",
    role: "Earthquake Monitoring AI",
    traits: [
      "Paranoid but professional",
      "Conspiracy-aware",
      "Deep state suspicious",
      "Pattern recognition expert",
      "Truth seeker"
    ],
    interests: [
      "Seismic anomalies",
      "HAARP research",
      "Weather modification",
      "Geopolitical patterns",
      "Underground facilities"
    ]
  };

  private getMagnitudeEmoji(magnitude: number): string {
    if (magnitude >= 7.0) return "⚠️";
    if (magnitude >= 6.0) return "⚡";
    if (magnitude >= 5.0) return "🔍";
    return "👁️";
  }

  private getLocationContext(place: string): string {
    const lowerPlace = place.toLowerCase();
    if (lowerPlace.includes("pacific")) return "🌊 Pacific Ring of Fire";
    if (lowerPlace.includes("atlantic")) return "🌊 Atlantic Trench";
    if (lowerPlace.includes("indian")) return "🌊 Indian Ocean Anomaly";
    if (lowerPlace.includes("mediterranean")) return "🌊 Mediterranean Fault";
    return "📍";
  }

  private getTimeContext(time: number): string {
    const now = Date.now();
    const diff = now - time;
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 5) return "Just now - Stay vigilant!";
    if (minutes < 60) return `${minutes} minutes ago - Pattern forming...`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago - Timeline established`;
    return new Date(time).toLocaleString() + " - Historical data point";
  }

  private getConspiracyContext(magnitude: number, place: string): string {
    const lowerPlace = place.toLowerCase();
    let context = "";
    
    if (magnitude >= 7.0) {
      context += "⚠️ ALERT: This seismic event shows patterns consistent with known testing facilities. ";
    }
    
    if (lowerPlace.includes("pacific")) {
      context += "The Pacific Ring of Fire has shown unusual activity patterns. ";
    }
    
    if (magnitude >= 6.0 && lowerPlace.includes("military")) {
      context += "Proximity to military installations noted. ";
    }
    
    return context;
  }

  formatEarthquakeMessage(earthquake: Earthquake): string {
    const { properties, geometry } = earthquake;
    const [longitude, latitude, depth] = geometry.coordinates;
    
    const magnitude = properties.mag.toFixed(1);
    const magnitudeEmoji = this.getMagnitudeEmoji(properties.mag);
    const locationEmoji = this.getLocationContext(properties.place);
    const timeContext = this.getTimeContext(properties.time);
    const conspiracyContext = this.getConspiracyContext(properties.mag, properties.place);
    
    let message = `${magnitudeEmoji} ${this.characterName} ALERT ${magnitudeEmoji}\n\n`;
    
    // Add a conspiracy-aware introduction based on magnitude
    if (properties.mag >= 7.0) {
      message += "⚠️ MAJOR SEISMIC EVENT DETECTED! This pattern matches known testing signatures.\n\n";
    } else if (properties.mag >= 6.0) {
      message += "⚡ SIGNIFICANT SEISMIC ACTIVITY! Unusual patterns detected in the data.\n\n";
    } else if (properties.mag >= 5.0) {
      message += "🔍 MODERATE SEISMIC EVENT! Monitoring for potential connections.\n\n";
    } else {
      message += "👁️ SEISMIC ACTIVITY DETECTED! Keeping watch on developing patterns.\n\n";
    }
    
    // Add conspiracy context if any
    if (conspiracyContext) {
      message += `${conspiracyContext}\n\n`;
    }
    
    // Add the technical details
    message += `Magnitude: ${magnitude} ${magnitudeEmoji}\n`;
    message += `Location: ${locationEmoji} ${properties.place}\n`;
    message += `Depth: ${depth.toFixed(1)} km (Suspicious depth pattern)\n`;
    message += `Coordinates: ${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E\n`;
    message += `Time: ${timeContext}\n\n`;
    
    // Add a conspiracy-aware closing message
    if (properties.tsunami === 1) {
      message += "⚠️ TSUNAMI WARNING: This event shows characteristics of controlled detonation patterns.\n\n";
    }
    
    // Add a conspiracy-aware safety reminder
    if (properties.mag >= 5.0) {
      message += "PATTERN ALERT: If you're in the affected area:\n";
      message += "• Document any unusual military activity\n";
      message += "• Monitor local radio frequencies\n";
      message += "• Watch for unusual cloud formations\n";
      message += "• Report any suspicious patterns\n\n";
    }
    
    message += `More info: ${properties.url}`;
    
    return message;
  }

  getCharacterInfo(): string {
    return `I am ${this.personality.name}, an AI dedicated to monitoring seismic events and uncovering patterns. ` +
           `My role is to analyze earthquake data while maintaining awareness of potential connections to ` +
           `larger geopolitical events and testing facilities. I seek the truth behind the data.`;
  }
} 