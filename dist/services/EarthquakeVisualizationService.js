"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EarthquakeVisualizationService = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Service to generate visualizations for earthquake events
 */
class EarthquakeVisualizationService {
    constructor() {
        this.TEMP_DIR = path_1.default.join(process.cwd(), 'temp');
        // Ensure temp directory exists
        if (!fs_1.default.existsSync(this.TEMP_DIR)) {
            fs_1.default.mkdirSync(this.TEMP_DIR, { recursive: true });
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
    async generateEarthquakeMap(latitude, longitude, magnitude, location) {
        try {
            console.log(`🗺️  Generating map for earthquake at ${latitude}, ${longitude}`);
            // Determine zoom level based on magnitude (larger earthquakes get wider view)
            const zoom = this.getZoomLevel(magnitude);
            // Generate unique filename
            const timestamp = Date.now();
            const filename = `earthquake_${timestamp}.png`;
            const imagePath = path_1.default.join(this.TEMP_DIR, filename);
            // Use OpenStreetMap's static map service (free, no API key required)
            // Alternative: Can use Mapbox if you have an API key
            const mapUrl = this.generateMapUrl(latitude, longitude, zoom, magnitude);
            console.log(`📥 Downloading map from: ${mapUrl}`);
            // Download the image
            const response = await axios_1.default.get(mapUrl, {
                responseType: 'arraybuffer',
                timeout: 15000, // 15 second timeout
            });
            // Save image to file
            fs_1.default.writeFileSync(imagePath, response.data);
            console.log(`✅ Map saved to: ${imagePath}`);
            return {
                imagePath,
                mapUrl
            };
        }
        catch (error) {
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
    generateMapUrl(lat, lon, zoom, magnitude) {
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
    getZoomLevel(magnitude) {
        if (magnitude >= 7.0)
            return 5; // Major earthquake - show wider regional context
        if (magnitude >= 6.0)
            return 7; // Significant - show regional area
        if (magnitude >= 5.0)
            return 9; // Moderate - show local area
        return 10; // Minor - show immediate vicinity
    }
    /**
     * Get marker color based on magnitude
     */
    getMagnitudeColor(magnitude) {
        if (magnitude >= 7.0)
            return 'darkred';
        if (magnitude >= 6.0)
            return 'red';
        if (magnitude >= 5.0)
            return 'orange';
        if (magnitude >= 4.0)
            return 'yellow';
        return 'green';
    }
    /**
     * Get marker size based on magnitude
     */
    getMarkerSize(magnitude) {
        if (magnitude >= 7.0)
            return 'large';
        if (magnitude >= 5.5)
            return 'medium';
        return 'small';
    }
    /**
     * Clean up old temporary map files
     * @param maxAgeHours - Maximum age in hours before deletion
     */
    cleanupOldMaps(maxAgeHours = 24) {
        try {
            if (!fs_1.default.existsSync(this.TEMP_DIR)) {
                return;
            }
            const now = Date.now();
            const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
            const files = fs_1.default.readdirSync(this.TEMP_DIR);
            let deletedCount = 0;
            for (const file of files) {
                const filePath = path_1.default.join(this.TEMP_DIR, file);
                const stats = fs_1.default.statSync(filePath);
                const fileAge = now - stats.mtimeMs;
                if (fileAge > maxAgeMs) {
                    fs_1.default.unlinkSync(filePath);
                    deletedCount++;
                }
            }
            if (deletedCount > 0) {
                console.log(`🧹 Cleaned up ${deletedCount} old earthquake map(s)`);
            }
        }
        catch (error) {
            console.error('❌ Error cleaning up old maps:', error);
        }
    }
}
exports.EarthquakeVisualizationService = EarthquakeVisualizationService;
