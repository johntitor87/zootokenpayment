"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const NOAAService_1 = require("./services/NOAAService");
const SimpleTwitterService_1 = require("./services/SimpleTwitterService");
// Load environment variables
dotenv_1.default.config();
async function testNOAAService() {
    console.log('==================================================');
    console.log('🧪 NOAA Magnetic Field Monitoring Service Test');
    console.log('==================================================');
    try {
        // Initialize Twitter service (optional - set to null to skip tweets)
        console.log('\n📱 Initializing Twitter service...');
        const twitterService = new SimpleTwitterService_1.SimpleTwitterService();
        // Initialize NOAA service
        console.log('\n🌍 Initializing NOAA service...');
        const noaaService = new NOAAService_1.NOAAService(twitterService);
        // Fetch magnetic field data
        console.log('\n🔍 Testing data fetching...');
        const readings = await noaaService.fetchNOAAMagneticData();
        if (!readings || readings.length === 0) {
            console.log('❌ No readings found. API may be unavailable or returned no data.');
            return;
        }
        console.log(`✅ Successfully fetched ${readings.length} readings from NOAA API.`);
        // Display sample reading
        console.log('\n📊 Sample Reading:');
        console.log(JSON.stringify(readings[0], null, 2));
        // Analyze readings
        console.log('\n🔬 Analyzing magnetic field readings...');
        const analyses = noaaService.analyzeMagneticFieldReadings(readings);
        console.log(`✅ Analyzed ${analyses.length} readings`);
        // Group analyses by status
        const statusCounts = analyses.reduce((acc, analysis) => {
            acc[analysis.status] = (acc[analysis.status] || 0) + 1;
            return acc;
        }, {});
        console.log('\n📈 Analysis Results:');
        for (const [status, count] of Object.entries(statusCounts)) {
            console.log(`- ${status}: ${count} readings`);
        }
        // Find any anomalies
        const anomalies = analyses.filter(a => a.status !== 'normal');
        if (anomalies.length > 0) {
            console.log(`\n⚠️ Found ${anomalies.length} anomalies!`);
            // Sort anomalies by severity
            anomalies.sort((a, b) => {
                const severityOrder = { superweak: 0, weak: 1, below_normal: 2 };
                return severityOrder[a.status] -
                    severityOrder[b.status];
            });
            // Display the most severe anomaly
            const primaryAnomaly = anomalies[0];
            console.log('\n🚨 Most severe anomaly:');
            console.log(`- Status: ${primaryAnomaly.status}`);
            console.log(`- Strength: ${primaryAnomaly.magneticStrength} nanoteslas`);
            console.log(`- Time Tag: ${primaryAnomaly.reading.time_tag}`);
            console.log(`- Time: ${primaryAnomaly.timestamp.toISOString()}`);
            // Generate alert message
            console.log('\n📝 Generated Alert Message:');
            const alertMessage = noaaService.formatMagneticFieldAlert(primaryAnomaly);
            console.log('--------------------------------------------------');
            console.log(alertMessage);
            console.log('--------------------------------------------------');
            // Ask user if they want to post to Twitter
            console.log('\n🐦 Would you like to post this alert to Twitter? (Not posting automatically in test mode)');
        }
        else {
            console.log('\n✅ No anomalies detected. All readings within normal range.');
        }
        // Test scheduled monitoring (briefly)
        console.log('\n⏱️ Testing monitoring for 5 seconds (will not post to Twitter)...');
        noaaService.startMonitoring();
        // Stop after 5 seconds
        setTimeout(() => {
            noaaService.stopMonitoring();
            console.log('\n✅ Test completed successfully!');
            console.log('==================================================');
        }, 5000);
    }
    catch (error) {
        console.error('\n❌ Test failed with error:', error);
        if (error instanceof Error) {
            console.error('Error details:', error.message);
            console.error('Stack trace:', error.stack);
        }
    }
}
// Run the test
testNOAAService().catch(error => {
    console.error('Unhandled error in test:', error);
    process.exit(1);
});
