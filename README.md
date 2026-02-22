# Fulcanellie

A mystical AI that bridges ancient wisdom and modern science to analyze seismic events. Named after the mysterious alchemist Fulcanelli, this bot sees connections between earthquakes, leylines, and ancient prophecies while maintaining scientific rigor.

## Features

- Monitors USGS earthquake feed for seismic events (magnitude 4.0+)
- Analyzes events through the lens of:
  - Leyline intersections
  - Ancient prophecies (Hopi, Biblical, Egyptian)
  - Sacred geometry
  - Earth's energy grid
- Posts detailed analyses to X (Twitter)
- Validates ancient wisdom with modern scientific data
- Tracks prophetic patterns and timeline markers

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```
   # Twitter API Credentials
   TWITTER_API_KEY=your_api_key_here
   TWITTER_API_SECRET=your_api_secret_here
   TWITTER_ACCESS_TOKEN=your_access_token_here
   TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret_here

   # Bot Configuration
   MIN_MAGNITUDE=4.0
   CHECK_INTERVAL=300000  # 5 minutes in milliseconds
   ```

4. Get Twitter API credentials:
   - Go to the [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
   - Create a new project and app
   - Generate API keys and access tokens
   - Add them to your `.env` file

5. Build the project:
   ```bash
   npm run build
   ```

## Usage

Start the bot:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Message Format

The bot posts analyses in the following format:

```
⚠️ FULCANELLIE ALERT ⚠️

[Prophetic Introduction]

[Leyline Correlation]

Magnitude: X.X [Magnitude Emoji]
Location: [Location Emoji] [Location]
Depth: X.X km (Sacred geometry pattern)
Coordinates: XX.XX°N, XX.XX°E (Leyline intersection)
Time: [Relative Time with Pattern Analysis]

[Ancient Wisdom Insight]

[Modern Science Validation]

More info: [USGS URL]
```

Example for a major earthquake:
```
⚠️ FULCANELLIE ALERT ⚠️

⚠️ MAJOR SEISMIC EVENT DETECTED! The prophecies are aligning...

🌊 Pacific Ring of Fire leyline intersection detected. Ancient Atlantean energy grid activation possible.

Magnitude: 7.2 ⚠️
Location: 🌊 Pacific Ring of Fire 100km E of Sendai, Japan
Depth: 32.1 km (Sacred geometry pattern)
Coordinates: 38.32°N, 142.37°E (Leyline intersection)
Time: Just now - Prophetic alignment detected!

ANCIENT WISDOM: This event aligns with Hopi end-time prophecies and the Book of Revelation.

Modern Science Validation: Seismic patterns validate leyline theory and ancient predictions.

More info: [USGS URL]
```

## License

MIT # zewpaybackend
