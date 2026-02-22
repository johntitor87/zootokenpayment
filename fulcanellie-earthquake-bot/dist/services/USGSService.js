"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.USGSService = void 0;
const axios_1 = __importDefault(require("axios"));
class USGSService {
    constructor() {
        this.BASE_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary';
        this.MIN_MAGNITUDE = Number(process.env.MIN_MAGNITUDE) || 4.0;
    }
    async getRecentEarthquakes() {
        try {
            console.log('🌍 Fetching earthquake data from USGS...');
            console.log(`Minimum magnitude threshold: ${this.MIN_MAGNITUDE}`);
            const response = await axios_1.default.get(`${this.BASE_URL}/all_month.geojson`);
            console.log(`📊 Total earthquakes in feed: ${response.data.features.length}`);
            const earthquakes = response.data.features
                .filter((quake) => quake.properties.mag >= this.MIN_MAGNITUDE)
                .sort((a, b) => b.properties.time - a.properties.time);
            console.log(`🔍 Found ${earthquakes.length} earthquakes above magnitude ${this.MIN_MAGNITUDE} worldwide`);
            if (earthquakes.length > 0) {
                console.log('Latest earthquake:', {
                    magnitude: earthquakes[0].properties.mag,
                    location: earthquakes[0].properties.place,
                    time: new Date(earthquakes[0].properties.time).toISOString()
                });
            }
            return earthquakes;
        }
        catch (error) {
            console.error('❌ Error fetching earthquake data:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
            }
            return [];
        }
    }
    formatEarthquakeMessage(earthquake) {
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
exports.USGSService = USGSService;
