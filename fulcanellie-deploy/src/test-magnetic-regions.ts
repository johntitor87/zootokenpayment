import dotenv from 'dotenv';
import { NOAAService, MagneticFieldReading, MagneticRegion } from './services/NOAAService';

// Load environment variables
dotenv.config();

/**
 * Display a formatted region analysis table
 */
function displayRegionTable(regions: MagneticRegion[], title: string) {
  console.log(`\n${title}`);
  console.log('='.repeat(100));
  console.log('| REGION                    | LATITUDE | LONGITUDE | STRENGTH (nT) | RISK LEVEL |');
  console.log('|'.padEnd(102, '-'));
  
  regions.forEach(region => {
    console.log(
      `| ${region.name.padEnd(25)} | ` +
      `${region.centralLatitude.toString().padStart(8)} | ` +
      `${region.centralLongitude.toString().padStart(9)} | ` +
      `${region.approximateStrength.toString().padStart(12)} | ` +
      `${region.riskLevel.toUpperCase().padEnd(10)} |`
    );
  });
  
  console.log('='.repeat(100));
}

/**
 * Display solar wind impact analysis
 */
function displaySolarWindAnalysis(reading: MagneticFieldReading) {
  console.log('\nSOLAR WIND MAGNETIC FIELD COMPONENTS');
  console.log('='.repeat(100));
  console.log(`Time: ${reading.time_tag}`);
  console.log(`Total Field (Bt): ${reading.bt.toFixed(2)} nT`);
  console.log(`Bx (GSM): ${reading.bx_gsm.toFixed(2)} nT`);
  console.log(`By (GSM): ${reading.by_gsm.toFixed(2)} nT`);
  console.log(`Bz (GSM): ${reading.bz_gsm.toFixed(2)} nT`);
  console.log(`GSM Longitude: ${reading.lon_gsm.toFixed(2)}°`);
  console.log(`GSM Latitude: ${reading.lat_gsm.toFixed(2)}°`);
  console.log('='.repeat(100));
  
  // Special emphasis on Bz component
  if (reading.bz_gsm < -5) {
    console.log('\n⚠️ ALERT: Strongly southward Bz component detected!');
    console.log('This configuration significantly increases the risk of geomagnetic disturbances.');
    console.log('Polar regions are particularly vulnerable during this condition.');
  } else if (reading.bz_gsm < -3) {
    console.log('\n⚠️ WARNING: Moderately southward Bz component detected.');
    console.log('This may lead to minor geomagnetic activity, especially at higher latitudes.');
  } else if (reading.bz_gsm > 3) {
    console.log('\n✅ STABLE: Strongly northward Bz component detected.');
    console.log('This configuration typically results in a stable geomagnetic environment.');
  }
}

/**
 * Display geographic impact details
 */
function displayGeographicImpact(noaaService: NOAAService, reading: MagneticFieldReading) {
  const impact = noaaService.assessGeographicImpact(reading);
  
  console.log('\nGEOGRAPHIC IMPACT ASSESSMENT');
  console.log('='.repeat(100));
  console.log(`Global Impact: ${impact.globalImpact.toUpperCase()}`);
  console.log(`Primary Affected Region: ${impact.primaryRegion.name}`);
  console.log('='.repeat(100));
  
  console.log('\nREGIONAL INTERPRETATIONS');
  console.log('='.repeat(100));
  console.log('Bz Component Effect:');
  console.log(impact.bz_impact);
  console.log('\nPolar Regions Effect:');
  console.log(impact.polarEffect);
  console.log('\nEquatorial Regions Effect:');
  console.log(impact.equatorialEffect || 'Data not available');
  console.log('='.repeat(100));
  
  // Sort affected regions by risk considering current conditions
  const sortedRegions = [...impact.affectedRegions].sort((a, b) => {
    // Create a risk score based on region's base risk and current conditions
    const getAdjustedScore = (region: MagneticRegion) => {
      const riskMap = { 'severe': 100, 'high': 75, 'moderate': 50, 'low': 25 };
      const baseScore = riskMap[region.riskLevel as keyof typeof riskMap] || 0;
      
      // Adjust score based on Bz and region location
      let adjustedScore = baseScore;
      
      // Polar regions get higher score when Bz is negative (southward)
      if (reading.bz_gsm < 0 && Math.abs(region.centralLatitude) > 60) {
        adjustedScore += -reading.bz_gsm * 10; // More negative Bz, higher score
      }
      
      // Equatorial regions get higher score when total field is weak
      if (Math.abs(region.centralLatitude) < 30 && reading.bt < 5) {
        adjustedScore += (5 - reading.bt) * 10;
      }
      
      // SAA gets higher score when total field is weak
      if (region.name.includes('Atlantic Anomaly') && reading.bt < 5) {
        adjustedScore += (5 - reading.bt) * 15;
      }
      
      return adjustedScore;
    };
    
    return getAdjustedScore(b) - getAdjustedScore(a);
  });
  
  console.log('\nREGIONS RANKED BY CURRENT VULNERABILITY');
  displayRegionTable(sortedRegions, 'Most vulnerable regions under current conditions');
}

/**
 * Main function to analyze magnetic field regions
 */
async function analyzeWeakMagneticRegions() {
  console.log('==================================================');
  console.log('🧪 EARTH\'S MAGNETIC FIELD REGIONS ANALYSIS');
  console.log('==================================================');

  try {
    // Initialize NOAA service (without Twitter)
    console.log('\n🌍 Initializing NOAA service...');
    const noaaService = new NOAAService();
    
    // Display all known weak field regions
    displayRegionTable(noaaService['knownWeakRegions'], 'KNOWN WEAK MAGNETIC FIELD REGIONS');
    
    // Fetch current magnetic field data
    console.log('\n🔍 Fetching current magnetic field data...');
    const readings = await noaaService.fetchNOAAMagneticData();
    
    if (!readings || readings.length === 0) {
      console.log('❌ No magnetic field readings available. Cannot proceed with analysis.');
      return;
    }
    
    console.log(`✅ Successfully fetched ${readings.length} readings from NOAA API.`);
    
    // Get the latest reading
    const latestReading = readings[0];
    
    // Display solar wind analysis
    displaySolarWindAnalysis(latestReading);
    
    // Display geographic impact assessment
    displayGeographicImpact(noaaService, latestReading);
    
    console.log('\n✅ Analysis completed successfully!');
    console.log('==================================================');
    
  } catch (error) {
    console.error('\n❌ Analysis failed with error:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  }
}

// Run the analysis
analyzeWeakMagneticRegions().catch(error => {
  console.error('Unhandled error in analysis:', error);
  process.exit(1);
});

