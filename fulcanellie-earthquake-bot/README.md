# Fulcanellie Earthquake Bot

A mystical AI that bridges ancient wisdom and modern science to analyze seismic events. Named after the mysterious alchemist Fulcanelli, this bot monitors earthquakes, NOAA magnetic data, and posts analyses to X (Twitter).

## Features

- Monitors USGS earthquake feed (configurable magnitude thresholds by region)
- NOAA magnetic field monitoring and alerts
- Earthquake prediction monitoring (solar/magnetic correlation)
- Leyline / ancient-prophecy style analyses
- Map visualizations with earthquake reports (see VISUALIZATION.md)
- Posts to X (Twitter) with image attachments

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set:
   - Twitter API credentials (required for posting)
   - Optional: NOAA and character settings

3. Build and run:
   ```bash
   npm run build
   npm start
   ```

## Scripts

- `npm start` – run the bot (built)
- `npm run dev` – run with ts-node
- `npm run tweet` – run tweet script
- `npm run test-noaa` – test NOAA service
- `npm run test-magnetic` – test magnetic regions

## License

MIT
