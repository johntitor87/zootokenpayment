import dotenv from 'dotenv';
import { SimpleTwitterService } from './services/SimpleTwitterService';
import { USGSService, Earthquake } from './services/USGSService';
import { NOAAService } from './services/NOAAService';
import { SeismicPredictionService } from './services/SeismicPredictionService';
import { EarthquakeVisualizationService } from './services/EarthquakeVisualizationService';
import { fulcanellie } from './characters/fulcanellie';
import fs from 'fs';

// Load environment variables
dotenv.config();

class FulcanellieBot {
  private usgsService: USGSService;
  private twitterService: SimpleTwitterService;
  private lastProcessedIds: Set<string>;
  private readonly CHECK_INTERVAL = Number(process.env.CHECK_INTERVAL) || 5 * 60 * 1000; // 5 minutes
  
  // Worldwide magnitude threshold (for earthquake reporting)
  private readonly WORLDWIDE_MAGNITUDE_THRESHOLD = 5.0;
  
  // Regional magnitude thresholds for areas of particular interest
  private readonly REGIONAL_THRESHOLDS: Record<string, number> = {
    'Ring of Fire': 5.0,
    'Mediterranean': 5.0,
    'California': 3.8,
    'Japan': 5.0,
    'Indonesia': 5.0,
    'Chile': 5.0,
    'Turkey': 5.0,
    'Italy': 5.0,
    'Greece': 5.0,
    'Iran': 5.0,
    'Philippines': 5.0,
    'New Zealand': 5.0,
    'Alaska': 3.8,
    'United States': 3.8,
    'USA': 3.8,
    'US': 3.8,
    'America': 3.8,
    'North America': 3.8,
    'Canada': 3.8,
    'Mexico': 3.8
  };

  // NOAA service for magnetic field monitoring
  private noaaService: NOAAService;
  // Seismic prediction service for earthquake forecasting
  private predictionService: SeismicPredictionService;
  // Visualization service for generating earthquake maps
  private visualizationService: EarthquakeVisualizationService;

  constructor() {
    console.log('🧙 Initializing Fulcanellie Bot...');
    this.savePid();
    
    this.usgsService = new USGSService();
    this.twitterService = new SimpleTwitterService();
    this.visualizationService = new EarthquakeVisualizationService();
    this.lastProcessedIds = new Set();
    this.noaaService = new NOAAService(this.twitterService);
    this.predictionService = new SeismicPredictionService(this.twitterService, this.noaaService);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('🛑 Received SIGINT signal. Shutting down gracefully...');
      // Stop all monitoring services before exit
      this.noaaService.stopMonitoring();
      this.predictionService.stopPredictionMonitoring();
      console.log('🧲 Magnetic field monitoring stopped.');
      console.log('🔮 Earthquake prediction monitoring stopped.');
      process.exit(0);
    });
  }

  // Function to save process ID for monitoring
  private savePid(): void {
    const pid = process.pid.toString();
    console.log(`Current process ID: ${pid}`);
    fs.writeFileSync('.pid', pid);
  }

  private async testTwitterConnection(): Promise<boolean> {
    try {
      console.log('🐦 Testing Twitter connection...');
      // Placeholder for Twitter connection test
      return true;
    } catch (error) {
      console.error('❌ Error testing Twitter connection:', error);
      return false;
    }
  }

  async start() {
    console.log('🌍 Starting Fulcanellie...');
    console.log(fulcanellie.description);
    console.log('\nPersonality Traits:', fulcanellie.personality.traits.join(', '));
    console.log('\nAreas of Expertise:', fulcanellie.knowledge.expertise.join(', '));
    
    try {
      // Initialize USGS earthquake monitoring service
      console.log('🌍 Initializing worldwide earthquake monitoring service...');
      console.log(`- Worldwide magnitude threshold: ${this.WORLDWIDE_MAGNITUDE_THRESHOLD}`);
      console.log(`- Regional thresholds:`);
      Object.entries(this.REGIONAL_THRESHOLDS).forEach(([region, threshold]) => {
        console.log(`  - ${region}: ${threshold}+`);
      });
      // Initialize NOAA magnetic field monitoring service
      console.log('🧲 Initializing magnetic field monitoring service...');
      
      // Initialize earthquake prediction service
      console.log('🔮 Initializing earthquake prediction service...');
      
      // Start magnetic field monitoring
      console.log('🔄 Starting magnetic field monitoring...');
      this.noaaService.startMonitoring();
      console.log('✅ Magnetic field monitoring is now active');
      
      // Start earthquake prediction monitoring
      console.log('🔄 Starting earthquake prediction monitoring...');
      this.predictionService.startPredictionMonitoring();
      console.log('✅ Earthquake prediction monitoring is now active');
      console.log('✅ Magnetic field monitoring is now active');
      
      // Log separation of prediction and reporting systems
      console.log('\n📋 SYSTEM CONFIGURATION:');
      console.log('🌋 Earthquake Reporting: Active - Will report earthquakes of magnitude:');
      console.log(`   - Worldwide baseline: ${this.WORLDWIDE_MAGNITUDE_THRESHOLD}+ magnitude`);
      console.log('   - Regional thresholds for areas of special interest');
      console.log('🔮 Earthquake Prediction: Active - Will predict earthquakes based on:');
      console.log('   - USGS seismic data (worldwide)');
      console.log('   - NOAA solar flare data');
      console.log('   - NOAA magnetic field readings');
      console.log('   - ELF/ULF electromagnetic readings');
      console.log('   - Schumann resonance anomalies');
      console.log('   - Correlation analysis between solar activity and weak magnetic field regions');
      console.log('⚠️ NOTE: Both systems operate independently and may sometimes contradict each other');
      
      console.log(`\n⏰ Check interval set to ${this.CHECK_INTERVAL / 1000} seconds`);
      console.log('🔄 Starting main loop...\n');
    
      // Main monitoring loop
      while (true) {
        try {
          // Log monitoring status
          // Log monitoring status
          console.log('\n=== FULCANELLIE MONITORING STATUS ===');
          console.log('🌋 Earthquake monitoring: Active');
          console.log(`🧲 Magnetic field monitoring: ${this.noaaService['monitoringIntervalId'] ? 'Active' : 'Inactive'}`);
          console.log(`🔮 Earthquake prediction: ${this.predictionService['monitoringIntervalId'] ? 'Active' : 'Inactive'}`);
          console.log('=======================================\n');
          // Check for earthquakes
          console.log('🔍 EARTHQUAKE MONITOR: Checking for seismic events...');
          await this.checkForEarthquakes();
          
          // Verify magnetic field monitoring is still active
          try {
            // Check magnetic field monitoring status
            if (!this.noaaService['monitoringIntervalId']) {
              console.log('⚠️ MAGNETIC FIELD MONITOR: Service stopped unexpectedly. Restarting...');
              this.noaaService.startMonitoring();
              console.log('✅ MAGNETIC FIELD MONITOR: Successfully restarted');
            } else {
              console.log('✅ MAGNETIC FIELD MONITOR: Running in background');
            }
            
            // Check prediction service status
            if (!this.predictionService['monitoringIntervalId']) {
              console.log('⚠️ EARTHQUAKE PREDICTION: Service stopped unexpectedly. Restarting...');
              this.predictionService.startPredictionMonitoring();
              console.log('✅ EARTHQUAKE PREDICTION: Successfully restarted');
            } else {
              console.log('✅ EARTHQUAKE PREDICTION: Running in background');
            }
          } catch (monitorError) {
            console.error('❌ MAGNETIC FIELD MONITOR: Error checking status:', monitorError);
            console.log('🔄 MAGNETIC FIELD MONITOR: Attempting to restart service...');
            try {
              // Restart magnetic monitoring
              this.noaaService.startMonitoring();
              console.log('✅ MAGNETIC FIELD MONITOR: Successfully restarted');
              
              // Restart prediction service
              this.predictionService.startPredictionMonitoring();
              console.log('✅ EARTHQUAKE PREDICTION: Successfully restarted');
            } catch (restartError) {
              console.error('❌ MAGNETIC FIELD MONITOR: Failed to restart:', restartError);
            }
          }
          
          // Wait until next check
          console.log(`\n⏳ Waiting ${this.CHECK_INTERVAL / 1000} seconds until next monitoring cycle...\n`);
          await new Promise(resolve => setTimeout(resolve, this.CHECK_INTERVAL));
        } catch (error) {
          console.error('❌ Error in main monitoring loop:', error);
          console.error('Detailed error:', error instanceof Error ? error.message : String(error));
          console.log('🔄 Continuing operation despite error...');
          await new Promise(resolve => setTimeout(resolve, this.CHECK_INTERVAL));
        }
      }
    } catch (startupError) {
      console.error('❌ Error during startup:', startupError);
      throw startupError; // Rethrow to be caught by the main error handler
    }
  }

  private async checkForEarthquakes(): Promise<void> {
    console.log('🔍 EARTHQUAKE MONITOR: Checking for new seismic events (independent of prediction system)...');
    
    try {
      // Get recent earthquakes from USGS
      const earthquakes = await this.usgsService.getRecentEarthquakes();
      
      if (earthquakes.length === 0) {
        console.log('ℹ️ EARTHQUAKE MONITOR: No seismic events found in this period.');
        return;
      }
      
      console.log(`📝 EARTHQUAKE MONITOR: Processing ${earthquakes.length} earthquakes...`);
      
      // Process each earthquake
      for (const earthquake of earthquakes) {
        const magnitude = earthquake.properties.mag;
        const location = earthquake.properties.place;
        const earthquakeTime = earthquake.properties.time;
        const currentTime = Date.now();
        const timeDifferenceHours = (currentTime - earthquakeTime) / (1000 * 60 * 60);
      
        // Check if earthquake is more than 24 hours old
        if (timeDifferenceHours > 24) {
          console.log(`⏭️  EARTHQUAKE MONITOR: Skipping earthquake (${location}, magnitude ${magnitude}) - too old (${timeDifferenceHours.toFixed(1)} hours)`);
          continue;
        }
      
        // Determine appropriate threshold based on location
        const threshold = this.getRegionalThreshold(location);
      
        if (magnitude < threshold) {
          console.log(`⏭️  EARTHQUAKE MONITOR: Skipping earthquake (magnitude ${magnitude} in ${location}, threshold: ${threshold})`);
          continue;
        }

      if (!this.lastProcessedIds.has(earthquake.id)) {
        console.log(`\n⚡ EARTHQUAKE MONITOR: New significant seismic event detected: ${earthquake.properties.title}`);
        console.log(`Magnitude: ${earthquake.properties.mag}`);
        console.log(`Location: ${earthquake.properties.place}`);
        console.log(`Time: ${new Date(earthquake.properties.time).toLocaleString()} (${(timeDifferenceHours).toFixed(1)} hours ago)`);
        
        const message = this.formatEarthquakeMessage(earthquake);
        console.log('\n📝 EARTHQUAKE ALERT: Formatted message:');
        console.log(message);
        
        // Generate earthquake map visualization
        const [longitude, latitude, depth] = earthquake.geometry.coordinates;
        console.log('\n🗺️  EARTHQUAKE ALERT: Generating map visualization...');
        const visual = await this.visualizationService.generateEarthquakeMap(
          latitude,
          longitude,
          earthquake.properties.mag,
          earthquake.properties.place
        );
        
        console.log('\n🐦 EARTHQUAKE ALERT: Attempting to post to Twitter...');
        const success = await this.twitterService.postEarthquakeReport(
          message,
          visual?.imagePath
        );
        
        // Clean up old maps periodically
        if (this.lastProcessedIds.size % 10 === 0) {
          this.visualizationService.cleanupOldMaps(24);
        }
        if (success) {
          this.lastProcessedIds.add(earthquake.id);
          console.log(`✅ EARTHQUAKE ALERT: Successfully posted analysis for seismic event: ${earthquake.id}`);
        } else {
          console.error(`❌ EARTHQUAKE ALERT: Failed to post analysis for seismic event: ${earthquake.id}`);
        }
        
        // Keep the set of processed IDs manageable
        if (this.lastProcessedIds.size > 100) {
          const oldestId = Array.from(this.lastProcessedIds)[0];
          this.lastProcessedIds.delete(oldestId);
          console.log(`🧹 EARTHQUAKE MONITOR: Removed oldest processed ID from memory: ${oldestId}`);
        }
      } else {
        console.log(`⏭️  EARTHQUAKE MONITOR: Skipping already processed earthquake: ${earthquake.id}`);
      }
    }
    } catch (error) {
      console.error('❌ EARTHQUAKE MONITOR: Error fetching or processing earthquakes:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
    }
  }
  /**
   * Format an earthquake message for Twitter
   * @param earthquake - The earthquake to format
   * @returns Formatted message
   */
  private formatEarthquakeMessage(earthquake: any): string {
    const { properties } = earthquake;
    const { mag, place, time, url } = properties;
    
    // Format time
    const eventTime = new Date(time);
    const formattedTime = eventTime.toLocaleString();
    
    // Calculate time difference
    const now = Date.now();
    const timeDiff = now - time;
    const minutesAgo = Math.floor(timeDiff / (1000 * 60));
    const hoursAgo = Math.floor(minutesAgo / 60);
    const timeAgoStr = hoursAgo > 0 ? `${hoursAgo} hours ago` : `${minutesAgo} minutes ago`;
    
    // Determine region and threshold used
    const threshold = this.getRegionalThreshold(place);
    const isRegionalEvent = threshold < this.WORLDWIDE_MAGNITUDE_THRESHOLD;
    const locationInfo = isRegionalEvent ? 'regional significance' : 'worldwide significance';
    
    // Determine severity level
    let severityLevel = 'moderate';
    let emoji = '⚠️';
    
    if (mag >= 7.0) {
      severityLevel = 'MAJOR';
      emoji = '🚨';
    } else if (mag >= 6.0) {
      severityLevel = 'significant';
      emoji = '⚠️';
    }

    // Build message with clear REPORT labeling to distinguish from predictions
    let message = `🌋 EARTHQUAKE REPORT 🌋\n\n`;
    message += `${emoji} CONFIRMED SEISMIC EVENT ${emoji}\n\n`;
    message += `Magnitude ${mag} earthquake ${place}\n`;
    message += `Time: ${formattedTime} (${timeAgoStr})\n`;
    message += `Severity: ${severityLevel.toUpperCase()} (${locationInfo})\n\n`;
    
    // Add mystical interpretation
    message += `${this.generateMysticalInterpretation(mag, isRegionalEvent, properties)}\n\n`;
    
    // Add relevant hashtags
    message += `#Earthquake #Magnitude${Math.floor(mag)} #${this.getLocationHashtag(place)} #Report #ActualEvent`;
    
    // Ensure message stays within Twitter's character limit
    if (message.length > 280) {
      message = message.substring(0, 277) + '...';
    }
    
    return message;
  }

  private generateMysticalInterpretation(magnitude: number, isRegional: boolean, properties: any): string {
    const intro = this.getIntroduction(magnitude);
    const leylineInfo = this.getLeylineCorrelation(properties.place);
    const ancientWisdom = this.getAncientWisdomInsight(magnitude);
    
    return `${intro}\n\n${leylineInfo}\n\n${ancientWisdom}`;
  }

  private getLocationHashtag(place: string): string {
    const lowerPlace = place.toLowerCase();
    if (lowerPlace.includes('california')) return 'California';
    if (lowerPlace.includes('japan')) return 'Japan';
    if (lowerPlace.includes('indonesia')) return 'Indonesia';
    if (lowerPlace.includes('chile')) return 'Chile';
    if (lowerPlace.includes('turkey')) return 'Turkey';
    if (lowerPlace.includes('pacific')) return 'PacificRingOfFire';
    if (lowerPlace.includes('mediterranean')) return 'Mediterranean';
    return 'Worldwide';
  }

  private getMagnitudeEmoji(magnitude: number): string {
    if (magnitude >= fulcanellie.behaviors.pattern_recognition.magnitude_thresholds.major) return '⚠️';
    if (magnitude >= fulcanellie.behaviors.pattern_recognition.magnitude_thresholds.significant) return '⚡';
    if (magnitude >= fulcanellie.behaviors.pattern_recognition.magnitude_thresholds.moderate) return '🔍';
    return '👁️';
  }

  private getLocationEmoji(place: string): string {
    const lowerPlace = place.toLowerCase();
    if (lowerPlace.includes('pacific')) return '🌊';
    if (lowerPlace.includes('atlantic')) return '🌊';
    if (lowerPlace.includes('indian')) return '🌊';
    if (lowerPlace.includes('mediterranean')) return '🌊';
    return '📍';
  }

  /**
   * Creates a mystical time context description based on when the earthquake occurred
   * @param time - The earthquake timestamp in milliseconds
   * @returns A formatted time description with mystical interpretation
   */
  private getTimeContext(time: number): string {
    const now = Date.now();
    const diff = now - time;
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 5) return 'Just now - Prophetic alignment detected!';
    if (minutes < 60) return `${minutes} minutes ago - Timeline convergence in progress...`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago - Ancient predictions unfolding...`;
    // Note: Earthquakes older than 24 hours should be filtered out before this function is called
    return `${hours} hours ago - Historical pattern established`;
  }
  private getIntroduction(magnitude: number): string {
    if (magnitude >= fulcanellie.behaviors.pattern_recognition.magnitude_thresholds.major) {
      return '⚠️ MAJOR SEISMIC EVENT DETECTED! The prophecies are aligning...';
    } else if (magnitude >= fulcanellie.behaviors.pattern_recognition.magnitude_thresholds.significant) {
      return '⚡ SIGNIFICANT SEISMIC ACTIVITY! Leyline convergence detected...';
    } else if (magnitude >= fulcanellie.behaviors.pattern_recognition.magnitude_thresholds.moderate) {
      return '🔍 MODERATE SEISMIC EVENT! Sacred geometry patterns emerging...';
    }
    return '👁️ SEISMIC ACTIVITY DETECTED! Energy grid fluctuations observed...';
  }

  private getLeylineCorrelation(place: string): string {
    const lowerPlace = place.toLowerCase();
    if (lowerPlace.includes('pacific')) {
      return '🌊 Pacific Ring of Fire leyline intersection detected. Ancient Atlantean energy grid activation possible.';
    }
    return '📍 Leyline intersection point identified. Sacred geometry patterns forming...';
  }

  private getAncientWisdomInsight(magnitude: number): string {
    if (magnitude >= fulcanellie.behaviors.pattern_recognition.magnitude_thresholds.major) {
      return 'ANCIENT WISDOM: This event aligns with Hopi end-time prophecies and the Book of Revelation.';
    }
    return 'ANCIENT WISDOM: The patterns match Lemurian predictions of Earth\'s energy grid activation.';
  }
  
  /**
   * Determines the appropriate magnitude threshold for a given location
   * @param place - The place description of the earthquake
   * @returns The minimum magnitude threshold for reporting this earthquake
   */
  private getRegionalThreshold(place: string): number {
    if (!place) return this.WORLDWIDE_MAGNITUDE_THRESHOLD;
    
    const lowerPlace = place.toLowerCase();
    
    // Check for specific regional keywords and return appropriate threshold
    for (const [region, threshold] of Object.entries(this.REGIONAL_THRESHOLDS)) {
      const regionKeywords = this.getRegionKeywords(region);
      if (regionKeywords.some(keyword => lowerPlace.includes(keyword))) {
        console.log(`📍 Regional threshold applied: ${region} (${threshold})`);
        return threshold;
      }
    }
    
    // Default to worldwide threshold
    return this.WORLDWIDE_MAGNITUDE_THRESHOLD;
  }

  /**
   * Get keywords for a specific region to identify earthquakes in that area
   * @param region - The region name
   * @returns Array of keywords to match against earthquake locations
   */
  private getRegionKeywords(region: string): string[] {
    const regionKeywords: Record<string, string[]> = {
      'Ring of Fire': ['pacific', 'ring of fire', 'aleutian', 'kamchatka'],
      'Mediterranean': ['mediterranean', 'aegean', 'tyrrhenian', 'adriatic'],
      'California': ['california', 'ca', 'san francisco', 'los angeles', 'san diego'],
      'Japan': ['japan', 'honshu', 'kyushu', 'shikoku', 'hokkaido', 'japanese'],
      'Indonesia': ['indonesia', 'sumatra', 'java', 'sulawesi', 'molucca', 'banda'],
      'Chile': ['chile', 'chilean', 'atacama', 'valparaiso', 'santiago'],
      'Turkey': ['turkey', 'turkish', 'anatolia', 'istanbul', 'ankara'],
      'Italy': ['italy', 'italian', 'sicily', 'calabria', 'umbria', 'abruzzo'],
      'Greece': ['greece', 'greek', 'crete', 'peloponnese', 'aegean'],
      'Iran': ['iran', 'iranian', 'persia', 'tehran', 'isfahan'],
      'Philippines': ['philippines', 'philippine', 'luzon', 'mindanao', 'visayas'],
      'New Zealand': ['new zealand', 'zealand', 'north island', 'south island'],
      'Alaska': ['alaska', 'alaskan', 'aleutian', 'anchorage', 'fairbanks']
    };
    
    return regionKeywords[region] || [];
  }
}

// Start the bot
const bot = new FulcanellieBot();
bot.start().catch(error => {
  console.error('❌ Fatal error:', error);
  console.error('Error details:', error instanceof Error ? error.message : String(error));
  console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
  process.exit(1);
}); 

// Add error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  console.error('Error details:', error instanceof Error ? error.message : String(error));
  console.log('📝 Bot will continue running despite error');
});

// Add unhandled rejection handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  console.log('📝 Bot will continue running despite error');
});
