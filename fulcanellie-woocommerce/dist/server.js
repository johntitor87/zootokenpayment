"use strict";
/**
 * Fulcanellie Staking API – backend only (no Rust in this repo).
 * Entry: server.js (or run via ts-node server.ts)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const routes_1 = __importDefault(require("./routes"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.get('/', (_req, res) => {
    res.json({ ok: true, service: 'fulcanellie-staking-api' });
});
app.use('/api', routes_1.default);
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Staking API server running on port ${PORT}`);
    console.log(`  GET  /api/staking/status?user_address=<address>`);
    console.log(`  GET  /api/staking/visibility?user_address=<address>`);
    console.log(`  GET  /api/staking/checkout?user_address=<address>`);
    console.log(`  GET  /api/staking/discount?user_address=<address>&cart_total=<amount>`);
    console.log(`  GET  /api/staking/exclusive?user_address=<address>`);
    console.log(`  POST /api/staking/stake`);
    console.log(`  POST /api/staking/request-unstake`);
    console.log(`  POST /api/staking/complete-unstake`);
    console.log(`  POST /api/zoo/verify-payment`);
});
