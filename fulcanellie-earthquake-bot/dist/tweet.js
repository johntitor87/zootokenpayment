"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const SimpleTwitterService_1 = require("./services/SimpleTwitterService");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
async function postWakeupTweet() {
    try {
        console.log('🚀 Initializing Twitter Service...');
        const twitterService = new SimpleTwitterService_1.SimpleTwitterService();
        const message = "Fulcanellie has awakened. Monitoring seismic patterns and ancient wisdom... 🌍✨";
        console.log(`📝 Preparing to post tweet: "${message}"`);
        const result = await twitterService.postTweet(message);
        if (result) {
            console.log('✅ Tweet posted successfully!');
        }
        else {
            console.error('❌ Failed to post tweet.');
        }
    }
    catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
    }
}
// Execute the function
postWakeupTweet().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
