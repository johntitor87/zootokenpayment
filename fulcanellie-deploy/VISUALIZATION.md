# Earthquake Visualization Feature

## Overview
The @fulcanellie bot now automatically generates and posts map visualizations with every earthquake report on X/Twitter.

## How It Works

### Automatic Map Generation
When the bot detects a significant earthquake:
1. **Fetches earthquake data** from USGS (location, magnitude, depth)
2. **Generates a static map image** showing the earthquake location
3. **Downloads the map** to a temporary directory
4. **Uploads the image to Twitter** along with the earthquake report
5. **Posts the tweet** with both text and visual map

### Map Features
- **Location marker**: Red dot marking the exact earthquake epicenter
- **Zoom level**: Automatically adjusted based on magnitude
  - Magnitude 7.0+: Zoom level 5 (regional view)
  - Magnitude 6.0-6.9: Zoom level 7 (wider area)
  - Magnitude 5.0-5.9: Zoom level 9 (local area)
  - Magnitude <5.0: Zoom level 10 (immediate vicinity)
- **Map size**: 800x600 pixels (optimized for Twitter)
- **Map source**: OpenStreetMap tiles

### Map Service
Currently using: `staticmap.openstreetmap.de` (free, no API key required)

#### Alternative Map Services (can be configured)
You can update the map service in `src/services/EarthquakeVisualizationService.ts`:

1. **Mapbox** (requires API key)
   - Sign up at https://www.mapbox.com/
   - Add `MAPBOX_API_KEY` to `.env`
   - Offers high-quality custom maps

2. **Google Maps Static API** (requires API key)
   - Enable at https://console.cloud.google.com/
   - Add `GOOGLE_MAPS_API_KEY` to `.env`
   - Provides satellite imagery options

3. **MapQuest** (free tier available)
   - Register at https://developer.mapquest.com/
   - Add `MAPQUEST_API_KEY` to `.env`

## File Storage

### Temporary Files
- **Location**: `/Users/hendrix/eliza-starter/fulcanellie/temp/`
- **Format**: PNG images named `earthquake_<timestamp>.png`
- **Cleanup**: Automatically deleted after 24 hours
- **Cleanup frequency**: Every 10 earthquake reports

### Automatic Cleanup
The bot automatically removes map images older than 24 hours to prevent disk space issues.

## Configuration

### Environment Variables (optional)
Add to `.env` file if using premium map services:

```bash
# Mapbox (optional - for better quality maps)
MAPBOX_API_KEY=your_mapbox_token_here

# Google Maps (optional)
GOOGLE_MAPS_API_KEY=your_google_maps_key_here
```

### Disable Visualizations
To disable map generation (text-only tweets), edit `src/index.ts`:

```typescript
// Comment out the visualization code:
// const visual = await this.visualizationService.generateEarthquakeMap(...);

// Post without image:
const success = await this.twitterService.postEarthquakeReport(message);
```

## Twitter API Requirements

The bot uses Twitter API v1.1 for media uploads and v2 for posting tweets. Ensure your Twitter API app has:
- ✅ **Read and Write permissions** (required)
- ✅ **OAuth 1.0a credentials** (already configured in `.env`)
- ✅ **Media upload enabled** (default for all apps)

## Troubleshooting

### Maps Not Showing
1. **Check logs**: Look for "Failed to generate earthquake map" errors
2. **Network issues**: Ensure internet connectivity for map downloads
3. **Twitter API**: Verify media upload permissions in developer portal

### Disk Space Issues
- The bot auto-cleans files older than 24 hours
- Manual cleanup: `rm /Users/hendrix/eliza-starter/fulcanellie/temp/*.png`
- Check disk space: `df -h`

### Map Service Errors
If the free OpenStreetMap service is unavailable:
1. Consider using a paid service (Mapbox/Google Maps)
2. The bot will still post text-only tweets if map generation fails
3. Check service status at https://www.openstreetmap.org/

## Example Tweet Format

```
🌋 EARTHQUAKE REPORT 🌋

🚨 CONFIRMED SEISMIC EVENT 🚨

Magnitude 5.2 earthquake 15km SW of Los Angeles, CA
Time: 2025-12-01 04:30:15 (5 minutes ago)
Severity: MODERATE (regional significance)

[MAP IMAGE ATTACHED]

#Earthquake #Magnitude5 #California #Report #ActualEvent
```

## Future Enhancements
Potential improvements you can add:
- Custom map styles with mystical/leyline overlays
- Multiple images (before/after, different zoom levels)
- Animated GIFs showing shake intensity
- Depth visualization with 3D terrain
- Historical earthquake overlay on maps
