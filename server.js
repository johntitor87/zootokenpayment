const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Example endpoint: API health check
app.get('/', (req, res) => {
  res.send('ZOO Solana Checkout API is running!');
});

// Example endpoint: Fetch token config (adjust path as needed)
app.get('/token-config', (req, res) => {
  const configPath = path.join(__dirname, 'token-ZOO.json'); // your token config file
  if (fs.existsSync(configPath)) {
    const data = fs.readFileSync(configPath, 'utf8');
    res.json(JSON.parse(data));
  } else {
    res.status(404).json({ error: 'Token config not found' });
  }
});

// Add your other API routes here
// e.g., wallet creation, transaction endpoints, etc.

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});