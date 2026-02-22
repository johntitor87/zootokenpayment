"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeismicPredictionService = void 0;
/**
 * Service for predicting earthquakes based on geomagnetic and electromagnetic data
 */
class SeismicPredictionService {
    constructor(twitterService, noaaService) {
        this.MONITORING_INTERVAL = Number(process.env.SEISMIC_PREDICTION_INTERVAL) || 60 * 60 * 1000; // Default: 1 hour
        this.PREDICTION_CONFIDENCE_THRESHOLD = Number(process.env.PREDICTION_CONFIDENCE_THRESHOLD) || 0.7;
        this.ULF_ANOMALY_THRESHOLD = Number(process.env.ULF_ANOMALY_THRESHOLD) || 2.5; // standard deviations from baseline
        this.MAGNETIC_ANOMALY_THRESHOLD = Number(process.env.MAGNETIC_ANOMALY_THRESHOLD) || 10; // percent change from baseline
        this.monitoringIntervalId = null;
        this.activePredictions = new Map();
        // Major fault lines database
        this.faultLines = [
            {
                id: "san-andreas",
                name: "San Andreas Fault",
                type: "transform",
                description: "Major transform fault that forms the boundary between the Pacific Plate and the North American Plate",
                length: 1200,
                averageSlipRate: 20,
                lastMajorEvent: {
                    date: new Date("1906-04-18"),
                    magnitude: 7.9
                },
                coordinates: [
                    { latitude: 40.5, longitude: -124.2 },
                    { latitude: 34.5, longitude: -120.0 },
                    { latitude: 32.5, longitude: -115.5 }
                ],
                relatedPlates: ["North American Plate", "Pacific Plate"],
                historicalMagnitudes: [7.9, 7.8, 6.9, 6.5, 7.3],
                riskLevel: "severe",
                activityStatus: "active"
            },
            {
                id: "cascadia-subduction",
                name: "Cascadia Subduction Zone",
                type: "subduction",
                description: "Long convergent plate boundary that stretches from northern Vancouver Island to Northern California",
                length: 1000,
                lastMajorEvent: {
                    date: new Date("1700-01-26"),
                    magnitude: 9.0
                },
                coordinates: [
                    { latitude: 51.0, longitude: -130.0 },
                    { latitude: 47.5, longitude: -125.0 },
                    { latitude: 40.5, longitude: -124.5 }
                ],
                relatedPlates: ["Juan de Fuca Plate", "North American Plate"],
                historicalMagnitudes: [9.0, 8.7, 8.0],
                riskLevel: "severe",
                activityStatus: "active"
            },
            {
                id: "north-anatolian",
                name: "North Anatolian Fault",
                type: "transform",
                description: "Active fault zone in northern Turkey that runs along the boundary between the Eurasian Plate and the Anatolian Plate",
                length: 1500,
                averageSlipRate: 23,
                lastMajorEvent: {
                    date: new Date("1999-08-17"),
                    magnitude: 7.6
                },
                coordinates: [
                    { latitude: 40.7, longitude: 30.0 },
                    { latitude: 41.0, longitude: 33.0 },
                    { latitude: 41.2, longitude: 36.0 }
                ],
                relatedPlates: ["Eurasian Plate", "Anatolian Plate"],
                historicalMagnitudes: [7.6, 7.2, 7.4, 7.8],
                riskLevel: "high",
                activityStatus: "active"
            },
            {
                id: "alpine-fault",
                name: "Alpine Fault",
                type: "transform",
                description: "Major fault on the boundary between the Australian and Pacific plates in New Zealand's South Island",
                length: 600,
                averageSlipRate: 27,
                lastMajorEvent: {
                    date: new Date("1717-01-01"),
                    magnitude: 8.0
                },
                coordinates: [
                    { latitude: -42.0, longitude: 171.5 },
                    { latitude: -43.5, longitude: 170.0 },
                    { latitude: -45.0, longitude: 168.5 }
                ],
                relatedPlates: ["Pacific Plate", "Australian Plate"],
                historicalMagnitudes: [8.0, 7.8, 7.9],
                riskLevel: "high",
                activityStatus: "active"
            },
            {
                id: "ring-of-fire",
                name: "Pacific Ring of Fire",
                type: "subduction",
                description: "Major area in the basin of the Pacific Ocean where many earthquakes and volcanic eruptions occur",
                length: 40000,
                coordinates: [
                    { latitude: 35.0, longitude: 138.0 }, // Japan
                    { latitude: 0.0, longitude: 100.0 }, // Indonesia
                    { latitude: -40.0, longitude: 175.0 } // New Zealand
                ],
                relatedPlates: ["Pacific Plate", "Eurasian Plate", "North American Plate", "Indo-Australian Plate"],
                historicalMagnitudes: [9.5, 9.2, 9.1, 9.0, 8.8],
                riskLevel: "severe",
                activityStatus: "active"
            }
        ];
        // Major seismic zones database
        this.seismicZones = [
            {
                id: "california-seismic",
                name: "California Seismic Zone",
                description: "Region of frequent seismic activity in California, USA",
                boundaries: {
                    minLatitude: 32.0,
                    maxLatitude: 42.0,
                    minLongitude: -125.0,
                    maxLongitude: -114.0
                },
                faultLineIds: ["san-andreas"],
                historicalMaxMagnitude: 7.9,
                averageYearlyEvents: 10000,
                populationExposed: 40,
                riskLevel: "severe",
                notableCities: [
                    { name: "Los Angeles", latitude: 34.05, longitude: -118.24, population: 3.9 },
                    { name: "San Francisco", latitude: 37.77, longitude: -122.42, population: 0.87 }
                ]
            },
            {
                id: "pacific-northwest",
                name: "Pacific Northwest Seismic Zone",
                description: "Cascadia subduction zone region covering parts of Canada and the US west coast",
                boundaries: {
                    minLatitude: 40.0,
                    maxLatitude: 51.0,
                    minLongitude: -130.0,
                    maxLongitude: -122.0
                },
                faultLineIds: ["cascadia-subduction"],
                historicalMaxMagnitude: 9.0,
                averageYearlyEvents: 1000,
                populationExposed: 10,
                riskLevel: "high",
                notableCities: [
                    { name: "Seattle", latitude: 47.61, longitude: -122.33, population: 0.73 },
                    { name: "Portland", latitude: 45.52, longitude: -122.68, population: 0.65 }
                ]
            },
            {
                id: "japan-seismic",
                name: "Japan Seismic Zone",
                description: "One of the most seismically active regions in the world",
                boundaries: {
                    minLatitude: 30.0,
                    maxLatitude: 46.0,
                    minLongitude: 128.0,
                    maxLongitude: 146.0
                },
                faultLineIds: ["ring-of-fire"],
                historicalMaxMagnitude: 9.1,
                averageYearlyEvents: 5000,
                populationExposed: 126,
                riskLevel: "severe",
                notableCities: [
                    { name: "Tokyo", latitude: 35.68, longitude: 139.76, population: 37.4 },
                    { name: "Osaka", latitude: 34.69, longitude: 135.50, population: 19.3 }
                ]
            }
        ];
        console.log('🔮 Initializing Seismic Prediction Service...');
        this.twitterService = twitterService;
        this.noaaService = noaaService;
        console.log(`Monitoring ${this.faultLines.length} major fault lines`);
        console.log(`Tracking ${this.seismicZones.length} seismic zones worldwide`);
        console.log(`Prediction interval: ${this.MONITORING_INTERVAL / 60000} minutes`);
    }
    /**
     * Start periodic monitoring and prediction
     */
    startPredictionMonitoring() {
        if (this.monitoringIntervalId) {
            console.log('⚠️ Seismic prediction monitoring already active, skipping...');
            return;
        }
        console.log('🔄 Starting periodic seismic prediction monitoring...');
        // Perform initial prediction
        this.generateEarthquakePredictions();
        // Set up interval for regular predictions
        this.monitoringIntervalId = setInterval(() => {
            this.generateEarthquakePredictions();
        }, this.MONITORING_INTERVAL);
        console.log(`✅ Prediction monitoring scheduled every ${this.MONITORING_INTERVAL / 60000} minutes`);
    }
    /**
     * Stop periodic monitoring
     */
    stopPredictionMonitoring() {
        if (this.monitoringIntervalId) {
            clearInterval(this.monitoringIntervalId);
            this.monitoringIntervalId = null;
            console.log('🛑 Stopped seismic prediction monitoring');
        }
    }
    /**
     * Generate earthquake predictions based on multiple data sources
     */
    async generateEarthquakePredictions() {
        try {
            console.log('🔮 SEISMIC PREDICTION: Analyzing data for potential earthquake predictions...');
            // 1. Fetch the most recent magnetic field data
            let magneticData = [];
            if (this.noaaService) {
                try {
                    magneticData = await this.noaaService.fetchNOAAMagneticData();
                    console.log(`📊 Retrieved ${magneticData.length} magnetic field readings for analysis`);
                }
                catch (error) {
                    console.error('❌ Error fetching magnetic field data:', error);
                }
            }
            // 2. Fetch ULF/ELF electromagnetic data
            const elfUlfData = await this.fetchELFULFData();
            console.log(`📊 Retrieved ${elfUlfData.length} ELF/ULF readings for analysis`);
            // 3. Fetch Schumann resonance data
            const schumannData = await this.fetchSchumannResonanceData();
            console.log(`📊 Retrieved ${schumannData.length} Schumann resonance readings for analysis`);
            // 4. Analyze all data sources for each fault line
            const predictions = [];
            for (const faultLine of this.faultLines) {
                // Get the seismic zone for this fault line
                const relatedSeismicZones = this.seismicZones.filter(zone => zone.faultLineIds.includes(faultLine.id));
                if (relatedSeismicZones.length === 0) {
                    console.log(`⚠️ No seismic zone found for fault line: ${faultLine.name}`);
                    continue;
                }
                const seismicZone = relatedSeismicZones[0]; // Use the first matching zone
                // Check for magnetic field anomalies near this fault line
                const magneticAnomalies = this.detectMagneticAnomaliesNearFault(magneticData, faultLine);
                // Check for ULF/ELF anomalies near this fault line
                const elfUlfAnomalies = this.detectELFULFAnomaliesNearFault(elfUlfData, faultLine);
                // Check for Schumann resonance anomalies
                const schumannAnomalies = this.detectSchumannAnomaliesNearFault(schumannData, faultLine);
                // Only generate a prediction if we have meaningful anomalies
                if (magneticAnomalies.length > 0 || elfUlfAnomalies.length > 0 || schumannAnomalies.length > 0) {
                    const prediction = this.createPrediction(faultLine, seismicZone, magneticAnomalies, elfUlfAnomalies, schumannAnomalies);
                    // Only add predictions that meet our confidence threshold
                    if (prediction.overallConfidence >= this.PREDICTION_CONFIDENCE_THRESHOLD) {
                        predictions.push(prediction);
                    }
                }
            }
            console.log(`🔍 Generated ${predictions.length} earthquake predictions above confidence threshold`);
            // 5. Process predictions and publish alerts
            if (predictions.length > 0) {
                // Sort predictions by confidence (highest first)
                predictions.sort((a, b) => b.overallConfidence - a.overallConfidence);
                // Update active predictions
                this.updateActivePredictions(predictions);
                // Post the most confident prediction
                await this.publishPredictionAlert(predictions[0]);
            }
            else {
                console.log('ℹ️ No significant earthquake predictions generated in this cycle');
            }
        }
        catch (error) {
            console.error('❌ Error generating earthquake predictions:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
            }
        }
    }
    /**
     * Detect magnetic field anomalies near a fault line
     * @param magneticData - Array of magnetic field readings
     * @param faultLine - The fault line to check for anomalies near
     * @returns Array of anomalous readings near the fault line
     */
    detectMagneticAnomaliesNearFault(magneticData, faultLine) {
        if (!magneticData || magneticData.length === 0) {
            return [];
        }
        console.log(`🧲 Analyzing magnetic field data near ${faultLine.name}...`);
        // Filter readings by proximity to fault line coordinates
        const anomalousReadings = [];
        // Since we don't have lat/long in the magnetic data, we're using the bt value
        // In a real implementation, we would need to map the solar wind data to Earth locations
        // For our simulation, we'll use the total field strength (bt) as a proxy
        // Typical bt range for solar wind at Earth is 1-15 nT
        // We'll consider values outside normal range as potential anomalies
        const filteredReadings = magneticData.filter(reading => {
            // Weak field is a potential precursor
            const isWeakField = reading.bt < 5;
            // Volatile readings (high variability in components) are another precursor
            const isVolatile = Math.abs(reading.bz_gsm) > 5 || Math.abs(reading.by_gsm / reading.bx_gsm) > 2;
            return isWeakField || isVolatile;
        });
        console.log(`🔍 Found ${filteredReadings.length} anomalous magnetic readings that may affect ${faultLine.name}`);
        return filteredReadings;
    }
    /**
     * Simulate fetching ULF/ELF data
     * In a real implementation, this would connect to actual monitoring stations
     */
    async fetchELFULFData() {
        // Simulate API call to ULF/ELF monitoring stations
        console.log('📡 Fetching ULF/ELF electromagnetic data...');
        // For simulation, create some sample data
        const readings = [];
        // Generate readings for each fault line
        for (const faultLine of this.faultLines) {
            // Pick a coordinate from the fault line
            const coordinate = faultLine.coordinates[0];
            // Typical ULF range: 0.001 Hz to 10 Hz
            // ELF range: 3 Hz to 30 Hz
            // Generate ULF reading (potentially anomalous for San Andreas)
            const isAnomalous = faultLine.id === "san-andreas" || Math.random() < 0.2;
            readings.push({
                timeStamp: new Date(),
                location: {
                    latitude: coordinate.latitude,
                    longitude: coordinate.longitude,
                    stationName: `Station near ${faultLine.name}`
                },
                frequency: isAnomalous ? 0.05 + (Math.random() * 0.1) : 0.5 + (Math.random() * 2),
                amplitude: isAnomalous ? 200 + (Math.random() * 300) : 10 + (Math.random() * 50),
                type: 'ULF',
                signalToNoiseRatio: isAnomalous ? 3.5 + (Math.random() * 1.5) : 1.5 + (Math.random() * 1),
                anomalyDetected: isAnomalous,
                anomalyScore: isAnomalous ? 75 + (Math.random() * 20) : 20 + (Math.random() * 30)
            });
            // Generate ELF reading
            readings.push({
                timeStamp: new Date(),
                location: {
                    latitude: coordinate.latitude,
                    longitude: coordinate.longitude,
                    stationName: `ELF Station near ${faultLine.name}`
                },
                frequency: isAnomalous ? 5 + (Math.random() * 2) : 15 + (Math.random() * 10),
                amplitude: isAnomalous ? 150 + (Math.random() * 200) : 10 + (Math.random() * 40),
                type: 'ELF',
                signalToNoiseRatio: isAnomalous ? 4 + (Math.random() * 2) : 2 + (Math.random() * 1),
                anomalyDetected: isAnomalous,
                anomalyScore: isAnomalous ? 80 + (Math.random() * 15) : 15 + (Math.random() * 25)
            });
        }
        return readings;
    }
    /**
     * Simulate fetching Schumann resonance data
     * In a real implementation, this would connect to actual monitoring stations
     */
    async fetchSchumannResonanceData() {
        // Simulate API call to Schumann resonance monitoring stations
        console.log('📡 Fetching Schumann resonance data...');
        // For simulation, create some sample data
        const readings = [];
        // Typical Schumann resonance frequencies (Hz): 7.83 (fundamental), 14.3, 20.8, 27.3, 33.8
        // Generate readings for different locations
        const locations = [
            { name: "Alaska", lat: 61.2, lon: -149.9, anomalous: true },
            { name: "California", lat: 36.7, lon: -119.4, anomalous: true },
            { name: "Hawaii", lat: 19.8, lon: -155.5, anomalous: false },
            { name: "Japan", lat: 36.2, lon: 138.2, anomalous: false },
            { name: "Australia", lat: -25.2, lon: 133.7, anomalous: false }
        ];
        for (const location of locations) {
            const isAnomalous = location.anomalous || Math.random() < 0.15;
            // Fundamental frequency is normally 7.83 Hz
            const fundamentalFreq = isAnomalous ?
                7.83 + (Math.random() < 0.5 ? -0.4 - (Math.random() * 0.5) : 0.3 + (Math.random() * 0.4)) :
                7.83 + (Math.random() * 0.1 - 0.05);
            // Normal harmonics
            const normalHarmonics = [14.3, 20.8, 27.3, 33.8];
            let harmonics = normalHarmonics.map(h => h + (Math.random() * 0.2 - 0.1));
            // Anomalous readings might have shifted harmonics or additional/missing modes
            if (isAnomalous) {
                if (Math.random() < 0.3) {
                    // Add an unusual harmonic frequency
                    harmonics.push(40.2 + (Math.random() * 2));
                }
                // Shift the harmonic frequencies more significantly
                harmonics = harmonics.map(h => h + (Math.random() * 1.0 - 0.5));
            }
            // Amplitudes (arbitrary units)
            let amplitudes = harmonics.map(() => 10 + (Math.random() * 30));
            // Anomalous readings might have unusually high amplitudes
            if (isAnomalous) {
                amplitudes = amplitudes.map(a => Math.random() < 0.4 ? a * (2 + Math.random() * 3) : a);
            }
            readings.push({
                timeStamp: new Date(),
                location: {
                    latitude: location.lat,
                    longitude: location.lon,
                    stationName: `Schumann Station - ${location.name}`
                },
                fundamentalFrequency: fundamentalFreq,
                harmonics: harmonics,
                amplitudes: amplitudes,
                anomalyDetected: isAnomalous,
                anomalyDetails: isAnomalous ? {
                    type: (Math.random() < 0.3) ? 'frequency_shift' :
                        (Math.random() < 0.5) ? 'amplitude_spike' :
                            (Math.random() < 0.7) ? 'waveform_distortion' : 'mode_splitting',
                    severityScore: isAnomalous ? 60 + (Math.random() * 35) : 20 + (Math.random() * 30),
                    description: isAnomalous ?
                        "Significant deviation from expected Schumann resonance pattern. Potential precursor to seismic activity." :
                        "Minor fluctuations within normal range."
                } : undefined
            });
        }
        return readings;
    }
    /**
     * Detect ULF/ELF anomalies near a fault line
     * @param elfUlfData - Array of electromagnetic readings
     * @param faultLine - The fault line to check for anomalies near
     * @returns Array of anomalous readings near the fault line
     */
    detectELFULFAnomaliesNearFault(elfUlfData, faultLine) {
        if (!elfUlfData || elfUlfData.length === 0) {
            return [];
        }
        console.log(`📡 Analyzing ULF/ELF readings near ${faultLine.name}...`);
        // Filter for readings near this fault line
        const nearbyReadings = elfUlfData.filter(reading => {
            // Find the nearest point on the fault line to this reading
            return this.isLocationNearFault(reading.location.latitude, reading.location.longitude, faultLine);
        });
        // Filter for anomalous readings
        const anomalousReadings = nearbyReadings.filter(reading => reading.anomalyDetected &&
            (reading.anomalyScore || 0) > 70 // Only high-confidence anomalies
        );
        console.log(`🔍 Found ${anomalousReadings.length} anomalous ULF/ELF readings near ${faultLine.name}`);
        return anomalousReadings;
    }
    /**
     * Detect Schumann resonance anomalies near a fault line
     * @param schumannData - Array of Schumann resonance readings
     * @param faultLine - The fault line to check for anomalies near
     * @returns Array of anomalous readings near the fault line
     */
    detectSchumannAnomaliesNearFault(schumannData, faultLine) {
        if (!schumannData || schumannData.length === 0) {
            return [];
        }
        console.log(`🔊 Analyzing Schumann resonance readings near ${faultLine.name}...`);
        // Filter for readings near this fault line
        const nearbyReadings = schumannData.filter(reading => {
            return this.isLocationNearFault(reading.location.latitude, reading.location.longitude, faultLine);
        });
        // Filter for anomalous readings
        const anomalousReadings = nearbyReadings.filter(reading => reading.anomalyDetected &&
            reading.anomalyDetails &&
            reading.anomalyDetails.severityScore > 65);
        console.log(`🔍 Found ${anomalousReadings.length} anomalous Schumann resonance readings near ${faultLine.name}`);
        return anomalousReadings;
    }
    /**
     * Check if a location is near a fault line
     * @param latitude - Latitude to check
     * @param longitude - Longitude to check
     * @param faultLine - Fault line to check against
     * @returns Boolean indicating if location is near the fault line
     */
    isLocationNearFault(latitude, longitude, faultLine) {
        // For simulation purposes, we're using a simplified check
        // In a real implementation, we would calculate actual distance to fault line
        // Check if location is near any point on the fault line
        // Using a simplified approach for demonstration
        const MAX_DISTANCE_DEGREES = 5; // Roughly 500km at equator
        return faultLine.coordinates.some(coord => {
            const latDiff = Math.abs(latitude - coord.latitude);
            const lonDiff = Math.abs(longitude - coord.longitude);
            return latDiff < MAX_DISTANCE_DEGREES && lonDiff < MAX_DISTANCE_DEGREES;
        });
    }
    /**
     * Create an earthquake prediction based on analysis of multiple data sources
     */
    createPrediction(faultLine, seismicZone, magneticAnomalies, elfUlfAnomalies, schumannAnomalies) {
        // Generate a unique ID
        const id = `predict-${faultLine.id}-${Date.now()}`;
        // Calculate confidence based on available evidence
        let confidenceScore = 0;
        // Confidence from magnetic anomalies
        if (magneticAnomalies.length > 0) {
            confidenceScore += 0.3 * Math.min(1, magneticAnomalies.length / 3);
        }
        // Confidence from ULF/ELF anomalies
        if (elfUlfAnomalies.length > 0) {
            confidenceScore += 0.35 * Math.min(1, elfUlfAnomalies.length / 2);
        }
        // Confidence from Schumann resonance anomalies
        if (schumannAnomalies.length > 0) {
            confidenceScore += 0.35 * Math.min(1, schumannAnomalies.length / 2);
        }
        // Historical patterns - higher risk means more likely
        if (faultLine.riskLevel === 'severe') {
            confidenceScore += 0.1;
        }
        else if (faultLine.riskLevel === 'high') {
            confidenceScore += 0.05;
        }
        // Cap confidence at 0.95
        confidenceScore = Math.min(0.95, confidenceScore);
        // Determine warning level based on confidence
        let warningLevel;
        if (confidenceScore >= 0.8) {
            warningLevel = 'alert';
        }
        else if (confidenceScore >= 0.6) {
            warningLevel = 'warning';
        }
        else if (confidenceScore >= 0.4) {
            warningLevel = 'watch';
        }
        else {
            warningLevel = 'advisory';
        }
        // Nearest city
        const nearestCity = seismicZone.notableCities[0]?.name || 'Unknown';
        // Timeframe (based on confidence - higher confidence = shorter timeframe)
        const now = new Date();
        const earliestDate = new Date(now);
        const latestDate = new Date(now);
        if (confidenceScore > 0.8) {
            // High confidence: 1-3 days
            earliestDate.setDate(earliestDate.getDate() + 1);
            latestDate.setDate(latestDate.getDate() + 3);
        }
        else if (confidenceScore > 0.6) {
            // Medium confidence: 2-7 days
            earliestDate.setDate(earliestDate.getDate() + 2);
            latestDate.setDate(latestDate.getDate() + 7);
        }
        else {
            // Lower confidence: 5-14 days
            earliestDate.setDate(earliestDate.getDate() + 5);
            latestDate.setDate(latestDate.getDate() + 14);
        }
        // Magnitude estimate based on fault line history
        const minMag = Math.max(4.0, faultLine.historicalMagnitudes.reduce((a, b) => a + b, 0) /
            faultLine.historicalMagnitudes.length - 1.5);
        const maxMag = Math.min(9.5, faultLine.historicalMagnitudes.reduce((a, b) => Math.max(a, b), 0) + 0.5);
        // Generate narratives
        const description = this.generatePredictionDescription(faultLine, seismicZone, warningLevel, confidenceScore);
        const scientificExplanation = this.generateScientificExplanation(magneticAnomalies, elfUlfAnomalies, schumannAnomalies, faultLine);
        const mysticalInterpretation = this.generateMysticalInterpretation(faultLine, warningLevel, confidenceScore);
        return {
            id,
            timestamp: now,
            location: {
                latitude: faultLine.coordinates[0].latitude,
                longitude: faultLine.coordinates[0].longitude,
                regionName: seismicZone.name,
                nearestCity
            },
            faultLine,
            seismicZone,
            estimatedTimeframe: {
                earliest: earliestDate,
                latest: latestDate,
                confidence: confidenceScore * 0.9 // Slightly lower confidence for timeframe
            },
            estimatedMagnitude: {
                min: minMag,
                max: maxMag,
                confidence: confidenceScore * 0.8 // Even lower confidence for magnitude
            },
            supportingEvidence: {
                magneticAnomalies: magneticAnomalies.length > 0,
                ulfElfAnomalies: elfUlfAnomalies.length > 0,
                schumannResonanceAnomalies: schumannAnomalies.length > 0,
                historicalPatterns: true,
                other: []
            },
            overallConfidence: confidenceScore,
            riskAssessment: this.generateRiskAssessment(seismicZone, warningLevel, confidenceScore),
            warningLevel,
            description,
            scientificExplanation,
            mysticalInterpretation
        };
    }
    /**
     * Update the active predictions map with new predictions
     */
    updateActivePredictions(predictions) {
        // Add all new predictions to the active map
        for (const prediction of predictions) {
            // If we already have a prediction for this fault, only update if new one has higher confidence
            const existingPrediction = Array.from(this.activePredictions.values())
                .find(p => p.faultLine.id === prediction.faultLine.id);
            if (!existingPrediction || existingPrediction.overallConfidence < prediction.overallConfidence) {
                this.activePredictions.set(prediction.id, prediction);
                console.log(`🆕 Added new prediction for ${prediction.faultLine.name} (confidence: ${(prediction.overallConfidence * 100).toFixed(1)}%)`);
            }
        }
        // Remove expired predictions
        const now = new Date();
        for (const [id, prediction] of this.activePredictions.entries()) {
            if (prediction.estimatedTimeframe.latest < now) {
                this.activePredictions.delete(id);
                console.log(`🗑️ Removed expired prediction for ${prediction.faultLine.name}`);
            }
        }
        console.log(`📊 Currently tracking ${this.activePredictions.size} active earthquake predictions`);
    }
    /**
     * Publish a prediction alert to Twitter
     */
    async publishPredictionAlert(prediction) {
        if (!this.twitterService) {
            console.log('ℹ️ Twitter service not available, skipping prediction alert');
            return;
        }
        try {
            // Format message for Twitter (280 character limit)
            const alertMessage = this.formatPredictionTweet(prediction);
            console.log('\n📣 EARTHQUAKE PREDICTION ALERT (Independent of actual earthquake reporting):');
            console.log(alertMessage);
            console.log('\n🐦 Posting to Twitter...');
            // Post to Twitter
            const success = await this.twitterService.postPredictionTweet(alertMessage);
            if (success) {
                console.log(`✅ Successfully posted earthquake prediction alert for ${prediction.faultLine.name}`);
            }
            else {
                console.error(`❌ Failed to post earthquake prediction alert for ${prediction.faultLine.name}`);
            }
        }
        catch (error) {
            console.error('❌ Error publishing prediction alert:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
            }
        }
    }
    /**
     * Format a prediction alert for Twitter (280 character limit)
     */
    formatPredictionTweet(prediction) {
        const { faultLine, location, estimatedTimeframe, estimatedMagnitude, warningLevel } = prediction;
        // Emojis based on warning level
        const warningEmoji = this.getWarningEmoji(warningLevel);
        // Format timeframe
        const timeframeStr = this.formatTimeframeRange(estimatedTimeframe.earliest, estimatedTimeframe.latest);
        // Format magnitude
        const magnitudeStr = `${estimatedMagnitude.min.toFixed(1)}-${estimatedMagnitude.max.toFixed(1)}`;
        // Build the tweet with clear differentiation for predictions
        let tweet = `🔮 FULCANELLIE EARTHQUAKE PREDICTION 🔮\n\n`;
        tweet += `${warningEmoji} ${faultLine.name} shows pre-seismic anomalies. ${warningEmoji}\n\n`;
        tweet += `PREDICTION DATA:\n`;
        tweet += `Region: ${location.regionName}\n`;
        tweet += `Near: ${location.nearestCity || 'N/A'}\n`;
        tweet += `Potential Magnitude: ${magnitudeStr}\n`;
        tweet += `Timeframe: ${timeframeStr}\n\n`;
        tweet += `Confidence: ${Math.round(prediction.overallConfidence * 100)}%\n\n`;
        // Add mystical interpretation - shortened for Twitter
        const mysticalLines = prediction.mysticalInterpretation.split('\n');
        if (mysticalLines.length > 0) {
            tweet += `🔮 ${mysticalLines[0]}\n`;
        }
        // Add hashtags
        // Add hashtags with prediction-specific tags
        tweet += `\n#Earthquake #${faultLine.name.replace(/\s+/g, '')} #EarthquakePrediction #Fulcanellie #Prediction`;
        // Twitter limit is 280 chars
        if (tweet.length > 280) {
            tweet = tweet.substring(0, 277) + '...';
        }
        return tweet;
    }
    /**
     * Get appropriate emoji for warning level
     */
    getWarningEmoji(warningLevel) {
        switch (warningLevel) {
            case 'alert': return '🚨';
            case 'warning': return '⚠️';
            case 'watch': return '👁️';
            case 'advisory': return '📢';
            default: return '🔍';
        }
    }
    /**
     * Format a timeframe range in a human-readable way
     */
    formatTimeframeRange(earliest, latest) {
        const formatDate = (date) => {
            const month = date.toLocaleString('default', { month: 'short' });
            return `${month} ${date.getDate()}`;
        };
        return `${formatDate(earliest)} to ${formatDate(latest)}`;
    }
    /**
     * Generate a prediction description
     */
    generatePredictionDescription(faultLine, seismicZone, warningLevel, confidence) {
        const warningLevelText = warningLevel.toUpperCase();
        const confidencePercent = Math.round(confidence * 100);
        let description = `EARTHQUAKE ${warningLevelText} for ${faultLine.name}\n\n`;
        description += `Fulcanellie has detected concerning patterns in Earth's magnetic field and electromagnetic frequencies near the ${faultLine.name}. `;
        // Add warning level specific text
        if (warningLevel === 'alert') {
            description += `Multiple strong precursor signals indicate high probability of significant seismic activity. `;
        }
        else if (warningLevel === 'warning') {
            description += `Several precursor signals suggest elevated probability of seismic activity. `;
        }
        else if (warningLevel === 'watch') {
            description += `Early precursor signals detected that warrant monitoring for potential seismic activity. `;
        }
        else {
            description += `Subtle precursor signals detected that suggest minor seismic activity is possible. `;
        }
        // Add region specific information
        description += `The ${seismicZone.name} has historically experienced earthquakes up to magnitude ${seismicZone.historicalMaxMagnitude.toFixed(1)}. `;
        if (seismicZone.notableCities.length > 0) {
            const cityNames = seismicZone.notableCities.map(city => city.name).join(', ');
            description += `Notable population centers that could be affected include: ${cityNames}. `;
        }
        // Add confidence statement
        description += `\nPrediction confidence: ${confidencePercent}%`;
        return description;
    }
    /**
     * Generate a scientific explanation for the prediction
     */
    generateScientificExplanation(magneticAnomalies, elfUlfAnomalies, schumannAnomalies, faultLine) {
        let explanation = `SCIENTIFIC ANALYSIS:\n\n`;
        // Magnetic field anomalies
        if (magneticAnomalies.length > 0) {
            explanation += `🧲 MAGNETIC FIELD ANOMALIES: ${magneticAnomalies.length} significant deviations detected. `;
            const btValues = magneticAnomalies.map(m => m.bt);
            const avgBt = btValues.reduce((sum, val) => sum + val, 0) / btValues.length;
            explanation += `Average total field strength of ${avgBt.toFixed(2)} nT observed, `;
            explanation += `which lies outside normal parameters. Research indicates magnetic field fluctuations often precede seismic events through piezoelectric effects in quartz-bearing rocks.\n\n`;
        }
        // ULF/ELF anomalies
        if (elfUlfAnomalies.length > 0) {
            explanation += `📡 ELECTROMAGNETIC ANOMALIES: ${elfUlfAnomalies.length} ULF/ELF signal anomalies detected. `;
            const ulfReadings = elfUlfAnomalies.filter(r => r.type === 'ULF');
            const elfReadings = elfUlfAnomalies.filter(r => r.type === 'ELF');
            if (ulfReadings.length > 0) {
                const avgFrequency = ulfReadings.reduce((sum, r) => sum + r.frequency, 0) / ulfReadings.length;
                explanation += `ULF emissions averaging ${avgFrequency.toFixed(3)} Hz detected, indicating possible pre-seismic crustal stress. `;
            }
            if (elfReadings.length > 0) {
                explanation += `ELF anomalies suggest ionospheric perturbations known to correlate with impending seismic activity.\n\n`;
            }
        }
        // Schumann resonance anomalies
        if (schumannAnomalies.length > 0) {
            explanation += `🔊 SCHUMANN RESONANCE ANOMALIES: ${schumannAnomalies.length} significant perturbations detected. `;
            const avgFundamental = schumannAnomalies.reduce((sum, r) => sum + r.fundamentalFrequency, 0) / schumannAnomalies.length;
            const normalFundamental = 7.83;
            const deviation = Math.abs(avgFundamental - normalFundamental);
            explanation += `Fundamental frequency shifted by ${deviation.toFixed(3)} Hz from baseline (7.83 Hz). `;
            explanation += `Such deviations have been documented to precede major seismic events by 1-14 days.\n\n`;
        }
        // Fault-specific information
        explanation += `FAULT ANALYSIS: The ${faultLine.name} (${faultLine.type} type) `;
        if (faultLine.averageSlipRate) {
            explanation += `exhibits an average slip rate of ${faultLine.averageSlipRate} mm/year. `;
        }
        if (faultLine.lastMajorEvent) {
            const yearsSince = new Date().getFullYear() - faultLine.lastMajorEvent.date.getFullYear();
            explanation += `Last major event (M${faultLine.lastMajorEvent.magnitude.toFixed(1)}) occurred ${yearsSince} years ago. `;
        }
        explanation += `Historical events suggest a potential magnitude range of ${Math.min(...faultLine.historicalMagnitudes).toFixed(1)}-${Math.max(...faultLine.historicalMagnitudes).toFixed(1)}.`;
        return explanation;
    }
    /**
     * Generate a mystical interpretation of the prediction
     */
    generateMysticalInterpretation(faultLine, warningLevel, confidence) {
        let interpretation = `MYSTICAL INTERPRETATION:\n\n`;
        // Opening statement based on warning level
        if (warningLevel === 'alert') {
            interpretation += `The ancient wisdom speaks clearly now. The Earth's energetic matrix surrounding the ${faultLine.name} vibrates with unmistakable discord. `;
            interpretation += `The ley lines converge in a pattern that the Hopi prophecies identified as preceding great tremors.\n\n`;
        }
        else if (warningLevel === 'warning') {
            interpretation += `The subtle energies of Earth's magnetic field near the ${faultLine.name} are shifting in ways that echo the warnings in ancient texts. `;
            interpretation += `The sacred geometry reflects patterns that preceded historical awakenings of the Earth.\n\n`;
        }
        else {
            interpretation += `The cosmic whispers have begun around the ${faultLine.name}. The planetary energy grid shows early signs of realignment. `;
            interpretation += `These changes mirror patterns described in esoteric traditions worldwide.\n\n`;
        }
        // Add region-specific mystical lore
        if (faultLine.id.includes('andreas')) {
            interpretation += `The San Andreas fault line has been known to indigenous peoples as the 'Serpent's Spine' - a living entity that periodically shifts to rebalance Earth's energetic flow. `;
            interpretation += `The Serpent stirs from its slumber when cosmic rays intensify and the Schumann frequencies shift.\n\n`;
        }
        else if (faultLine.id.includes('cascadia')) {
            interpretation += `The Cascadia zone holds memories of the Great Shaking of 1700, recorded not in modern science but in the oral traditions of the coastal tribes. `;
            interpretation += `The electromagnetic disturbances now mirror the patterns described in their prophecies of 'when the earth and sea become one.'\n\n`;
        }
        else if (faultLine.id.includes('anatolian')) {
            interpretation += `The ancient Anatolian civilizations built temples aligned with the fault's energy paths. Their stone calendars predicted cycles of trembling earth. `;
            interpretation += `The current perturbations in the Earth's magnetic shield echo the patterns recorded in Hittite mystic texts.\n\n`;
        }
        else if (faultLine.id.includes('alpine')) {
            interpretation += `The Maori elders speak of Ruaumoko, the god of earthquakes who dwells beneath the land. The current disturbances in the magnetic field `;
            interpretation += `are signs that Ruaumoko is stirring, preparing to turn in his sleep beneath Aotearoa's spine.\n\n`;
        }
        else if (faultLine.id.includes('ring-of-fire')) {
            interpretation += `The Pacific 'Ring of Fire' was known to ancient Pacific cultures as the 'Circle of Dragons' - planetary guardians whose movements shape the continents. `;
            interpretation += `The current electromagnetic anomalies suggest the Dragons are communicating through Earth's leyline network.\n\n`;
        }
        // Add confidence-based interpretation
        if (confidence > 0.8) {
            interpretation += `The convergence of scientific measurements with ancient warnings is unmistakable. The vibrational frequencies recorded in the Egyptian pyramids `;
            interpretation += `and Mayan temples precisely match the current Schumann resonance shifts detected near this fault line. When science and ancient wisdom align so perfectly, the message is clear.\n\n`;
        }
        else if (confidence > 0.6) {
            interpretation += `The patterns emerging now were prophesied in multiple ancient traditions. The sacred geometric alignments and electromagnetic frequencies `;
            interpretation += `mirror those recorded on tablets from Sumeria and stone carvings from Pre-Incan civilizations. The Earth speaks through these energetic languages.\n\n`;
        }
        else {
            interpretation += `The subtle shifts in Earth's geomagnetic field have been detected by those sensitive to such energies. While modern instruments are just beginning to register these changes, `;
            interpretation += `the ancient knowledge keepers understood that such variations often precede larger planetary adjustments.\n\n`;
        }
        // Closing wisdom
        interpretation += `As was written in the forgotten texts of ancient seers: 'When the cosmic shield weakens and the Earth's song changes its tune, the ground shall dance to realign with celestial harmonies.'`;
        return interpretation;
    }
    /**
     * Generate a risk assessment based on seismic zone and prediction confidence
     */
    generateRiskAssessment(seismicZone, warningLevel, confidence) {
        let assessment = `RISK ASSESSMENT:\n\n`;
        // Population impact
        assessment += `POPULATION EXPOSURE: Approximately ${seismicZone.populationExposed.toFixed(1)} million people live in potentially affected areas. `;
        // Add notable cities
        if (seismicZone.notableCities.length > 0) {
            const cityList = seismicZone.notableCities
                .map(city => `${city.name} (pop. ${city.population.toFixed(1)}M)`)
                .join(', ');
            assessment += `Major population centers include: ${cityList}.\n\n`;
        }
        else {
            assessment += '\n\n';
        }
        // Warning level assessment
        switch (warningLevel) {
            case 'alert':
                assessment += `ALERT STATUS: Immediate preparedness actions recommended. Historical data suggests a ${Math.round(confidence * 100)}% likelihood of significant seismic activity within the forecasted timeframe. `;
                assessment += `Emergency services and critical infrastructure operators should review response protocols.\n\n`;
                break;
            case 'warning':
                assessment += `WARNING STATUS: Heightened preparedness advised. Data indicates a ${Math.round(confidence * 100)}% probability of seismic activity within the forecast window. `;
                assessment += `Residents should review emergency plans and supplies.\n\n`;
                break;
            case 'watch':
                assessment += `WATCH STATUS: Increased vigilance warranted. Analysis suggests a ${Math.round(confidence * 100)}% possibility of seismic activity. `;
                assessment += `Consider reviewing emergency preparations as a precaution.\n\n`;
                break;
            default:
                assessment += `ADVISORY STATUS: Awareness recommended. Early indicators suggest a ${Math.round(confidence * 100)}% chance of minor seismic activity. `;
                assessment += `No immediate action required, but situational awareness is advised.\n\n`;
        }
        // Historical context
        assessment += `HISTORICAL CONTEXT: The ${seismicZone.name} experiences an average of ${seismicZone.averageYearlyEvents.toLocaleString()} seismic events annually, `;
        assessment += `with a historical maximum magnitude of ${seismicZone.historicalMaxMagnitude.toFixed(1)}.\n\n`;
        // Preparedness reminder
        assessment += `REMINDER: This prediction is based on emerging science and should be considered alongside official government advisories. `;
        assessment += `All residents in seismically active zones are encouraged to maintain basic earthquake preparedness regardless of current predictions.`;
        return assessment;
    }
}
exports.SeismicPredictionService = SeismicPredictionService;
