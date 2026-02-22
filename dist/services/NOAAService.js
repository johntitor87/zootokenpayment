"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOAAService = void 0;
const axios_1 = __importDefault(require("axios"));
class NOAAService {
    /**
     * Initialize the NOAA service
     * @param twitterService - Optional Twitter service for posting alerts
     */
    constructor(twitterService) {
        this.NOAA_URL = 'https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json';
        this.SOLAR_FLARE_URL = 'https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json';
        this.GEOMAGNETIC_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
        this.KP_INDEX_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json';
        // Adjusted thresholds for solar wind measurements (in nanoteslas)
        this.NORMAL_MIN = Number(process.env.MAGNETIC_FIELD_NORMAL_MIN) || 5;
        this.NORMAL_MAX = Number(process.env.MAGNETIC_FIELD_NORMAL_MAX) || 15;
        this.WEAK_THRESHOLD = Number(process.env.MAGNETIC_FIELD_WEAK_THRESHOLD) || 3;
        this.SUPERWEAK_THRESHOLD = Number(process.env.MAGNETIC_FIELD_SUPERWEAK_THRESHOLD) || 1;
        // Known weak magnetic field regions worldwide
        this.knownWeakRegions = [
            {
                name: 'South Atlantic Anomaly',
                description: 'A region where Earth\'s magnetic field is significantly weaker than expected',
                centralLatitude: -30,
                centralLongitude: -40,
                approximateStrength: 22000, // ~22,000 nT compared to typical 30,000-60,000 nT
                riskLevel: 'severe'
            },
            {
                name: 'Equatorial Region',
                description: 'Areas near the Earth\'s equator where magnetic field is naturally weaker',
                centralLatitude: 0,
                centralLongitude: 0,
                approximateStrength: 25000, // ~25,000 nT compared to typical 30,000-60,000 nT at mid-latitudes
                riskLevel: 'moderate'
            },
            {
                name: 'Brazilian Magnetic Anomaly',
                description: 'Extension of the South Atlantic Anomaly over Brazil',
                centralLatitude: -20,
                centralLongitude: -50,
                approximateStrength: 23000,
                riskLevel: 'high'
            },
            {
                name: 'North Polar Region',
                description: 'Region around the North Pole with intense but potentially unstable field',
                centralLatitude: 80,
                centralLongitude: 0,
                approximateStrength: 60000, // Strong but vulnerable to solar wind disturbances
                riskLevel: 'moderate'
            },
            {
                name: 'South Polar Region',
                description: 'Region around the South Pole with intense but potentially unstable field',
                centralLatitude: -80,
                centralLongitude: 0,
                approximateStrength: 60000, // Strong but vulnerable to solar wind disturbances
                riskLevel: 'moderate'
            },
            {
                name: 'Japan Magnetic Anomaly',
                description: 'Ring of Fire region with complex magnetic interactions',
                centralLatitude: 36,
                centralLongitude: 138,
                approximateStrength: 45000,
                riskLevel: 'high'
            },
            {
                name: 'Mediterranean Convergence Zone',
                description: 'Intersection of African and European plates with magnetic complexity',
                centralLatitude: 36,
                centralLongitude: 15,
                approximateStrength: 40000,
                riskLevel: 'moderate'
            },
            {
                name: 'Indonesia Arc System',
                description: 'High seismic activity region with magnetic field variations',
                centralLatitude: -5,
                centralLongitude: 120,
                approximateStrength: 35000,
                riskLevel: 'high'
            },
            {
                name: 'Chilean Subduction Zone',
                description: 'Active tectonic boundary with magnetic field disturbances',
                centralLatitude: -30,
                centralLongitude: -71,
                approximateStrength: 28000,
                riskLevel: 'high'
            },
            {
                name: 'Alaska-Aleutian Arc',
                description: 'Northern Pacific Ring of Fire with magnetic anomalies',
                centralLatitude: 60,
                centralLongitude: -153,
                approximateStrength: 55000,
                riskLevel: 'moderate'
            },
            {
                name: 'New Zealand Magnetic Zone',
                description: 'Complex tectonic setting with magnetic field variations',
                centralLatitude: -41,
                centralLongitude: 174,
                approximateStrength: 50000,
                riskLevel: 'moderate'
            },
            {
                name: 'Turkey-Iran Plateau',
                description: 'Seismically active region with complex magnetic structure',
                centralLatitude: 38,
                centralLongitude: 35,
                approximateStrength: 42000,
                riskLevel: 'moderate'
            },
            {
                name: 'Himalayan Front',
                description: 'Major collision zone affecting local magnetic fields',
                centralLatitude: 28,
                centralLongitude: 84,
                approximateStrength: 43000,
                riskLevel: 'moderate'
            },
            {
                name: 'Philippines Archipelago',
                description: 'Complex island arc system with magnetic variations',
                centralLatitude: 13,
                centralLongitude: 122,
                approximateStrength: 38000,
                riskLevel: 'high'
            },
            {
                name: 'California Fault Systems',
                description: 'San Andreas and associated fault systems with magnetic anomalies',
                centralLatitude: 36,
                centralLongitude: -119,
                approximateStrength: 48000,
                riskLevel: 'high'
            },
            {
                name: 'Central Asian Seismic Belt',
                description: 'Eurasian collision zone with magnetic field perturbations',
                centralLatitude: 40,
                centralLongitude: 75,
                approximateStrength: 44000,
                riskLevel: 'moderate'
            },
            {
                name: 'Caribbean Arc System',
                description: 'Lesser Antilles arc with magnetic field variations',
                centralLatitude: 15,
                centralLongitude: -62,
                approximateStrength: 32000,
                riskLevel: 'moderate'
            }
        ];
        this.MONITORING_INTERVAL = Number(process.env.NOAA_MONITORING_INTERVAL) || 30 * 60 * 1000; // Default: 30 minutes
        this.monitoringIntervalId = null;
        console.log('🌍 Initializing NOAA Magnetic Field Monitoring Service...');
        console.log(`Magnetic field thresholds:`);
        console.log(`- Normal range: ${this.NORMAL_MIN} to ${this.NORMAL_MAX} nanoteslas`);
        console.log(`- Weak threshold: ${this.WEAK_THRESHOLD} nanoteslas`);
        console.log(`- Superweak threshold: ${this.SUPERWEAK_THRESHOLD} nanoteslas`);
        console.log(`Monitoring interval: ${this.MONITORING_INTERVAL / 60000} minutes`);
        this.twitterService = twitterService;
    }
    /**
     * Start periodic monitoring of NOAA magnetic field data
     */
    startMonitoring() {
        if (this.monitoringIntervalId) {
            console.log('⚠️ Monitoring already active, skipping...');
            return;
        }
        console.log('🔄 Starting periodic monitoring of Earth\'s magnetic field...');
        // Perform initial check
        this.checkMagneticFieldStatus();
        // Set up interval for regular checks
        this.monitoringIntervalId = setInterval(() => {
            this.checkMagneticFieldStatus();
        }, this.MONITORING_INTERVAL);
        console.log(`✅ Monitoring scheduled every ${this.MONITORING_INTERVAL / 60000} minutes`);
    }
    /**
     * Stop periodic monitoring
     */
    stopMonitoring() {
        if (this.monitoringIntervalId) {
            clearInterval(this.monitoringIntervalId);
            this.monitoringIntervalId = null;
            console.log('🛑 Stopped magnetic field monitoring');
        }
    }
    /**
     * Perform a check of current magnetic field status (legacy method - replaced by comprehensive analysis)
     */
    async checkMagneticFieldStatus() {
        console.log('🔄 Running comprehensive solar-magnetic-seismic analysis...');
        await this.performComprehensiveAnalysis();
    }
    /**
     * Fetch magnetic field data from NOAA API
     * @returns Promise that resolves to an array of MagneticFieldReading objects
     */
    async fetchNOAAMagneticData() {
        try {
            console.log(`🔍 Fetching magnetic field data from NOAA Solar Wind...`);
            const response = await axios_1.default.get(this.NOAA_URL);
            if (!response.data || !Array.isArray(response.data) || response.data.length < 2) {
                console.error('❌ Invalid response format from NOAA API');
                return [];
            }
            // First row contains headers, subsequent rows contain data
            const headers = response.data[0];
            const dataRows = response.data.slice(1);
            // Map data rows to properly structured objects
            const magneticReadings = dataRows.map((row) => {
                // Create object by mapping header names to values
                const reading = {};
                // Ensure the row has the expected format
                if (row.length !== headers.length) {
                    console.warn('⚠️ Inconsistent data format in row:', row);
                    return null;
                }
                // Map each column to its header
                headers.forEach((header, index) => {
                    // Convert numeric values to numbers
                    if (header !== 'time_tag') {
                        reading[header] = parseFloat(row[index]);
                    }
                    else {
                        reading[header] = row[index];
                    }
                });
                return reading;
            }).filter(reading => reading !== null);
            console.log(`📊 Found ${magneticReadings.length} magnetic field readings`);
            return magneticReadings;
        }
        catch (error) {
            console.error('❌ Error fetching magnetic field data:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
            }
            return [];
        }
    }
    /**
     * Analyze magnetic field readings for anomalies
     * @param readings - Array of magnetic field readings from NOAA
     * @returns Array of magnetic field analyses
     */
    analyzeMagneticFieldReadings(readings) {
        return readings.map(reading => {
            // Extract the total magnetic field strength (bt) from the reading
            const magneticStrength = reading.bt;
            // Log warning if magnetic field strength is not valid
            if (magneticStrength === undefined || isNaN(magneticStrength)) {
                console.log('⚠️ Warning: No valid magnetic field strength found in reading:', reading);
            }
            // Determine status based on thresholds
            let status = 'normal';
            if (magneticStrength <= this.SUPERWEAK_THRESHOLD) {
                status = 'superweak';
            }
            else if (magneticStrength <= this.WEAK_THRESHOLD) {
                status = 'weak';
            }
            else if (magneticStrength < this.NORMAL_MIN) {
                status = 'below_normal';
            }
            // Add geographical impact assessment
            const geographicImpact = this.assessGeographicImpact(reading);
            return {
                reading,
                magneticStrength,
                status,
                timestamp: new Date(reading.time_tag),
                geographicImpact
            };
        });
    }
    /**
     * Assess the geographic impact of a magnetic field reading
     * @param reading - The magnetic field reading to assess
     * @returns Geographic impact assessment
     */
    assessGeographicImpact(reading) {
        // Determine affected regions based on current magnetic field components
        const { bx_gsm, by_gsm, bz_gsm, bt } = reading;
        // The southward Bz component (negative values) is most important for geomagnetic effects
        const bz_severity = bz_gsm < -5 ? 'severe' :
            bz_gsm < -3 ? 'significant' :
                bz_gsm < 0 ? 'moderate' : 'minimal';
        // Determine global impact based on Bz and total field
        const globalImpact = (bz_gsm < -5 && bt > 10) ? 'severe' :
            (bz_gsm < -3 || bt < this.WEAK_THRESHOLD) ? 'significant' :
                (bz_gsm < 0 || bt < this.NORMAL_MIN) ? 'moderate' : 'minimal';
        // Filter and sort regions by risk level based on current conditions
        let affectedRegions = [...this.knownWeakRegions];
        // Sort by risk (severe first)
        const riskOrder = { 'severe': 0, 'high': 1, 'moderate': 2, 'low': 3 };
        affectedRegions.sort((a, b) => {
            return (riskOrder[a.riskLevel] || 3) -
                (riskOrder[b.riskLevel] || 3);
        });
        // Determine primary affected region based on current conditions
        // Negative Bz especially affects polar regions, weak Bt affects SAA more
        let primaryRegion = affectedRegions[0]; // Default to highest risk
        if (bz_gsm < -3) {
            // During strong southward Bz, polar regions are most affected
            primaryRegion = affectedRegions.find(r => r.name.includes('Polar') || Math.abs(r.centralLatitude) > 60) || primaryRegion;
        }
        else if (bt < this.WEAK_THRESHOLD) {
            // During weak total field, SAA is most affected
            primaryRegion = affectedRegions.find(r => r.name.includes('Atlantic Anomaly')) || primaryRegion;
        }
        // Generate interpretations based on the components
        const bz_impact = this.interpretBzComponent(bz_gsm);
        const polarEffect = this.interpretPolarEffect(bz_gsm, bt);
        const equatorialEffect = this.interpretEquatorialEffect(bt);
        return {
            affectedRegions,
            primaryRegion,
            globalImpact,
            bz_impact,
            polarEffect,
            equatorialEffect
        };
    }
    /**
     * Interpret the impact of the Bz component
     * @param bz_gsm - The Bz component in GSM coordinates
     * @returns String interpretation of Bz impact
     */
    interpretBzComponent(bz_gsm) {
        if (bz_gsm < -5) {
            return "Strongly southward Bz indicates high probability of geomagnetic storms and auroral activity. The ancient texts speak of 'celestial curtains' during such alignments.";
        }
        else if (bz_gsm < -3) {
            return "Moderately southward Bz suggests potential for minor geomagnetic disturbances. The leylines are becoming more active as cosmic energies increase.";
        }
        else if (bz_gsm < 0) {
            return "Slightly southward Bz may cause subtle energetic shifts in Earth's magnetic shield. The sensitive may feel these vibrations in sacred sites.";
        }
        else if (bz_gsm > 3) {
            return "Northward Bz indicates stable conditions, as the cosmic shield holds firm. The ancient wisdom teaches these are times of magnetic harmony.";
        }
        else {
            return "Neutral Bz suggests relatively stable conditions, though the subtle energetic balance may shift at any moment as prophesied.";
        }
    }
    /**
     * Interpret effects on polar regions
     * @param bz_gsm - The Bz component
     * @param bt - Total field strength
     * @returns String interpretation of polar effects
     */
    interpretPolarEffect(bz_gsm, bt) {
        if (bz_gsm < -3 && bt > 10) {
            return "Polar regions are experiencing significant magnetic flux. Ancient indigenous wisdom from these regions forewarned of times when 'the sky dances with spirit light.'";
        }
        else if (bz_gsm < 0) {
            return "Subtle magnetic shifts in polar regions may be occurring. The magnetic poles are the sacred gateway points in many esoteric traditions.";
        }
        else {
            return "Polar magnetic fields remain stable. The ancient ones recognized these poles as cosmic anchors that ground celestial energies.";
        }
    }
    /**
     * Interpret effects on equatorial regions
     * @param bt - Total field strength
     * @returns String interpretation of equatorial effects
     */
    interpretEquatorialEffect(bt) {
        if (bt < this.SUPERWEAK_THRESHOLD) {
            return "Equatorial regions are experiencing critically weak magnetic protection. The Aztec and Mayan temples along these lines were built precisely to channel these intensified cosmic energies during such alignments.";
        }
        else if (bt < this.WEAK_THRESHOLD) {
            return "Weakened magnetic field at the equator may be allowing increased cosmic ray penetration. Ancient equatorial civilizations constructed monuments to harness these enhanced energies.";
        }
        else if (bt < this.NORMAL_MIN) {
            return "Subtle shifts in the equatorial magnetic field are detectable. The sacred sites along the equator may be experiencing enhanced energetic states.";
        }
        else {
            return "Equatorial magnetic fields are within normal parameters. The balance of forces between north and south maintains the cosmic equilibrium referenced in ancient texts.";
        }
    }
    /**
     * Fetch solar flare data from NOAA
     * @returns Promise that resolves to an array of SolarFlareData objects
     */
    async fetchSolarFlareData() {
        try {
            console.log('☀️ Fetching solar flare data from NOAA...');
            const response = await axios_1.default.get(this.SOLAR_FLARE_URL);
            if (!response.data || !Array.isArray(response.data) || response.data.length < 2) {
                console.error('❌ Invalid response format from NOAA Solar Flare API');
                return [];
            }
            // First row contains headers, subsequent rows contain data
            const headers = response.data[0];
            const dataRows = response.data.slice(1);
            const solarFlareData = dataRows.map((row) => {
                const reading = {};
                if (row.length !== headers.length) {
                    console.warn('⚠️ Inconsistent solar flare data format in row:', row);
                    return null;
                }
                headers.forEach((header, index) => {
                    if (header !== 'time_tag' && header !== 'electron_contamination') {
                        reading[header] = parseFloat(row[index]);
                    }
                    else {
                        reading[header] = row[index];
                    }
                });
                return reading;
            }).filter(reading => reading !== null);
            console.log(`☀️ Found ${solarFlareData.length} solar flare readings`);
            return solarFlareData;
        }
        catch (error) {
            console.error('❌ Error fetching solar flare data:', error);
            return [];
        }
    }
    /**
     * Analyze solar flare data for potential earthquake triggers
     * @param flareData - Array of solar flare readings
     * @returns Array of solar flare events with earthquake predictions
     */
    analyzeSolarFlareEvents(flareData) {
        const events = [];
        // Group data by time periods to identify flare events
        const groupedData = this.groupFlareDataByEvents(flareData);
        groupedData.forEach(eventData => {
            const peakFlux = Math.max(...eventData.map(d => d.flux));
            const classification = this.classifySolarFlare(peakFlux);
            if (classification !== 'A' && classification !== 'B') { // Only analyze significant flares
                const event = {
                    timestamp: new Date(eventData[0].time_tag),
                    classification,
                    intensity: this.calculateFlareIntensity(peakFlux),
                    peakFlux,
                    duration: this.calculateFlareDuration(eventData),
                    impactLevel: this.assessFlareImpact(classification, peakFlux),
                    affectedRegions: this.identifyAffectedRegions(classification, peakFlux),
                    earthquakePrediction: this.predictEarthquakeFromFlare(classification, peakFlux)
                };
                events.push(event);
            }
        });
        return events;
    }
    /**
     * Group solar flare data into distinct events
     * @param flareData - Raw flare data
     * @returns Grouped data representing individual flare events
     */
    groupFlareDataByEvents(flareData) {
        // Simple grouping logic - group readings within 6 hours as same event
        const groups = [];
        let currentGroup = [];
        flareData.forEach((reading, index) => {
            if (currentGroup.length === 0) {
                currentGroup.push(reading);
            }
            else {
                const lastReading = currentGroup[currentGroup.length - 1];
                const timeDiff = new Date(reading.time_tag).getTime() - new Date(lastReading.time_tag).getTime();
                if (timeDiff <= 6 * 60 * 60 * 1000) { // 6 hours
                    currentGroup.push(reading);
                }
                else {
                    groups.push([...currentGroup]);
                    currentGroup = [reading];
                }
            }
        });
        if (currentGroup.length > 0) {
            groups.push(currentGroup);
        }
        return groups;
    }
    /**
     * Classify solar flare based on peak flux
     * @param peakFlux - Peak X-ray flux
     * @returns Solar flare classification
     */
    classifySolarFlare(peakFlux) {
        if (peakFlux >= 1e-3)
            return 'X'; // X-class
        if (peakFlux >= 1e-4)
            return 'M'; // M-class
        if (peakFlux >= 1e-5)
            return 'C'; // C-class
        if (peakFlux >= 1e-6)
            return 'B'; // B-class
        return 'A'; // A-class
    }
    /**
     * Calculate flare intensity based on classification and flux
     * @param peakFlux - Peak flux value
     * @returns Intensity score
     */
    calculateFlareIntensity(peakFlux) {
        return Math.log10(peakFlux * 1e9); // Normalized intensity score
    }
    /**
     * Calculate flare duration
     * @param eventData - Array of readings for the event
     * @returns Duration in minutes
     */
    calculateFlareDuration(eventData) {
        if (eventData.length <= 1)
            return 0;
        const start = new Date(eventData[0].time_tag).getTime();
        const end = new Date(eventData[eventData.length - 1].time_tag).getTime();
        return (end - start) / (1000 * 60); // Convert to minutes
    }
    /**
     * Assess the impact level of a solar flare
     * @param classification - Flare classification
     * @param peakFlux - Peak flux value
     * @returns Impact level
     */
    assessFlareImpact(classification, peakFlux) {
        switch (classification) {
            case 'X':
                return peakFlux >= 1e-2 ? 'severe' : 'strong';
            case 'M':
                return peakFlux >= 5e-4 ? 'strong' : 'moderate';
            case 'C':
                return 'minor';
            default:
                return 'minimal';
        }
    }
    /**
     * Identify regions most affected by the solar flare
     * @param classification - Flare classification
     * @param peakFlux - Peak flux value
     * @returns Array of affected magnetic regions
     */
    identifyAffectedRegions(classification, peakFlux) {
        let affectedRegions = [...this.knownWeakRegions];
        // Filter regions based on flare intensity
        if (classification === 'X' || (classification === 'M' && peakFlux >= 5e-4)) {
            // Severe flares affect all regions
            return affectedRegions;
        }
        else if (classification === 'M' || classification === 'C') {
            // Moderate flares primarily affect high-risk regions
            return affectedRegions.filter(r => r.riskLevel === 'severe' || r.riskLevel === 'high');
        }
        else {
            // Minor flares mainly affect the most vulnerable regions
            return affectedRegions.filter(r => r.riskLevel === 'severe');
        }
    }
    /**
     * Predict potential earthquake activity from solar flare data
     * @param classification - Flare classification
     * @param peakFlux - Peak flux value
     * @returns Earthquake prediction object
     */
    predictEarthquakeFromFlare(classification, peakFlux) {
        // Only make predictions for significant flares (M-class and above)
        if (classification !== 'M' && classification !== 'X') {
            return undefined;
        }
        const affectedRegions = this.identifyAffectedRegions(classification, peakFlux);
        const likelyRegions = affectedRegions
            .filter(r => r.riskLevel === 'severe' || r.riskLevel === 'high')
            .map(r => r.name);
        let timeframe;
        let confidence;
        if (classification === 'X') {
            timeframe = '24-72 hours';
            confidence = peakFlux >= 1e-2 ? 0.8 : 0.7;
        }
        else { // M-class
            timeframe = '3-7 days';
            confidence = peakFlux >= 5e-4 ? 0.6 : 0.5;
        }
        return {
            likelyRegions,
            timeframe,
            confidence
        };
    }
    /**
     * Generate a comprehensive solar flare and earthquake prediction report
     * @param flareEvents - Array of solar flare events
     * @returns Formatted prediction message
     */
    formatSolarFlareEarthquakePrediction(flareEvents) {
        if (flareEvents.length === 0) {
            return '';
        }
        const significantEvents = flareEvents.filter(e => e.classification === 'M' || e.classification === 'X');
        if (significantEvents.length === 0) {
            return '';
        }
        const primaryEvent = significantEvents[0]; // Most recent significant event
        let message = `🌞 FULCANELLIE SOLAR-SEISMIC ALERT 🌞\n\n`;
        message += `⚡ ${primaryEvent.classification}-CLASS SOLAR FLARE DETECTED ⚡\n\n`;
        message += `The cosmic fires burn bright as solar winds disturb Earth's magnetic shield...\n\n`;
        message += `Flare Classification: ${primaryEvent.classification}${primaryEvent.intensity.toFixed(1)}\n`;
        message += `Peak Flux: ${primaryEvent.peakFlux.toExponential(2)} W/m²\n`;
        message += `Impact Level: ${primaryEvent.impactLevel.toUpperCase()}\n`;
        message += `Duration: ${primaryEvent.duration.toFixed(1)} minutes\n\n`;
        if (primaryEvent.earthquakePrediction) {
            const pred = primaryEvent.earthquakePrediction;
            message += `🔮 EARTHQUAKE PREDICTION 🔮\n\n`;
            message += `The ancient texts speak of times when solar storms pierce the veil, weakening Earth's magnetic protection and triggering seismic awakening...\n\n`;
            message += `Expected timeframe: ${pred.timeframe}\n`;
            message += `Confidence level: ${(pred.confidence * 100).toFixed(0)}%\n`;
            message += `Most vulnerable regions:\n`;
            pred.likelyRegions.slice(0, 5).forEach(region => {
                message += `• ${region}\n`;
            });
            message += `\n🌍 The correlation between solar activity and seismic events has been observed by indigenous wisdom keepers for millennia. Modern magnetometer data confirms what the ancients knew - we are interconnected with cosmic forces.\n\n`;
            if (primaryEvent.classification === 'X') {
                message += `⚠️ X-CLASS FLARE IMPACT: This level of solar activity represents a significant disturbance to Earth's magnetosphere. Historical patterns suggest heightened seismic activity typically follows such events.`;
            }
            else {
                message += `⚠️ M-CLASS FLARE IMPACT: Moderate solar activity detected. While less intense than X-class events, M-class flares can still trigger responses in magnetically sensitive regions.`;
            }
        }
        return message;
    }
    /**
     * Comprehensive monitoring that includes both magnetic field and solar flare analysis
     */
    async performComprehensiveAnalysis() {
        try {
            console.log('🔍 Performing comprehensive solar-magnetic-seismic analysis...');
            // Fetch all data sources
            const [magneticData, solarFlareData] = await Promise.all([
                this.fetchNOAAMagneticData(),
                this.fetchSolarFlareData()
            ]);
            // Analyze magnetic field data
            if (magneticData.length > 0) {
                const magneticAnalyses = this.analyzeMagneticFieldReadings(magneticData);
                const magneticAnomalies = magneticAnalyses.filter(a => a.status !== 'normal');
                if (magneticAnomalies.length > 0) {
                    console.log(`🧲 Found ${magneticAnomalies.length} magnetic field anomalies`);
                    const primaryAnomaly = magneticAnomalies[0];
                    const magneticAlert = this.formatMagneticFieldAlert(primaryAnomaly);
                    if (this.twitterService) {
                        await this.twitterService.postPredictionTweet(magneticAlert);
                    }
                }
            }
            // Analyze solar flare data
            if (solarFlareData.length > 0) {
                const flareEvents = this.analyzeSolarFlareEvents(solarFlareData);
                const significantFlares = flareEvents.filter(e => e.classification === 'M' || e.classification === 'X');
                if (significantFlares.length > 0) {
                    console.log(`☀️ Found ${significantFlares.length} significant solar flare events`);
                    const flareAlert = this.formatSolarFlareEarthquakePrediction(significantFlares);
                    if (flareAlert && this.twitterService) {
                        await this.twitterService.postPredictionTweet(flareAlert);
                    }
                }
            }
        }
        catch (error) {
            console.error('❌ Error in comprehensive analysis:', error);
        }
    }
    /**
     * Format a magnetic field alert message in Fulcanellie's style
     * @param analysis - The magnetic field analysis to format
     * @returns Formatted alert message
     */
    formatMagneticFieldAlert(analysis) {
        const { reading, magneticStrength, status, timestamp } = analysis;
        // Status-specific emojis and descriptions
        const statusInfo = {
            normal: {
                emoji: '✅',
                description: 'Normal magnetic field',
                mystical: 'The Earth\'s magnetic shield remains balanced, the cosmic energies flow as intended...'
            },
            below_normal: {
                emoji: '⚠️',
                description: 'Below normal range',
                mystical: 'The Earth\'s magnetic shield weakens, as foretold in the ancient texts...'
            },
            weak: {
                emoji: '🚨',
                description: 'Weak magnetic field',
                mystical: 'The sacred geometries of protection dissolve, leaving us vulnerable to cosmic forces...'
            },
            superweak: {
                emoji: '☠️',
                description: 'CRITICALLY WEAK magnetic field',
                mystical: 'The prophetic warnings manifest as our planetary shield falters...'
            }
        };
        // Select appropriate status information
        const info = statusInfo[status] || statusInfo.below_normal;
        // Format the message
        let message = `⚠️ FULCANELLIE MAGNETIC ALERT ⚠️\n\n`;
        message += `${info.emoji} ${info.description} ${info.emoji}\n\n`;
        message += `${info.mystical}\n\n`;
        message += `Magnetic Field Strength: ${magneticStrength.toFixed(2)} nanoteslas\n`;
        message += `Status: ${status.replace('_', ' ').toUpperCase()}\n`;
        message += `Time: ${timestamp.toISOString()}\n`;
        message += `Components: Bx=${reading.bx_gsm.toFixed(2)}, By=${reading.by_gsm.toFixed(2)}, Bz=${reading.bz_gsm.toFixed(2)}\n`;
        message += `Source: NOAA Solar Wind Monitoring\n\n`;
        // Add mystical interpretation based on status
        if (status === 'superweak') {
            message += `🔮 The ancient Atlantean records speak of times when the Earth's magnetic shield falters, ushering in great transformation. The leyline energies seek balance as cosmic rays penetrate our world.\n\n`;
        }
        else if (status === 'weak') {
            message += `🔮 The sacred texts of Egypt forewarned of periods when the magnetic veil thins, allowing ancient energies to flow more freely between dimensions.\n\n`;
        }
        else {
            message += `🔮 The Hopi elders understood the cyclical nature of Earth's magnetic fluctuations, seeing them as times of potential awakening and recalibration.\n\n`;
        }
        // Add geographic impact if available
        if (analysis.geographicImpact) {
            const impact = analysis.geographicImpact;
            message += `Most affected region: ${impact.primaryRegion.name}\n`;
            message += `Global impact: ${impact.globalImpact.toUpperCase()}\n\n`;
            message += `${impact.bz_impact}\n\n`;
        }
        message += `The scientific measurement confirms what the ancient wisdom has always known - we are in a period of magnetic reconfiguration that aligns with prophetic timelines.`;
        return message;
    }
}
exports.NOAAService = NOAAService;
