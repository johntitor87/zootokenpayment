require('dotenv').config();
console.log("Starting ZOO Solana Checkout API...");
console.log("Current working directory:", process.cwd());
console.log("PORT:", process.env.PORT);

const express = require('express');
const cors = require('cors');
const { Connection, clusterApiUrl } = require('@solana/web3.js');

// token-ZOO.json: at project root (same folder as server.js). Load with require('./token-ZOO.json') or path.join(process.cwd(), 'token-ZOO.json') if needed.
// Env: only PORT is used (default 10000). Add others to .env and .env.example if you use them.

const app = express();
app.use(cors());
app.use(express.json());

const connection = new Connection(clusterApiUrl('mainnet-beta'));

app.get('/', (req, res) => {
  res.send('ZOO Solana Checkout API Running');
});

app.post('/verify', async (req, res) => {
  try {
    const { signature } = req.body;

    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0
    });

    if (!tx) {
      return res.status(400).json({ success: false });
    }

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

const PORT = Number(process.env.PORT) || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
