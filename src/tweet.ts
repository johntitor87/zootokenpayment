import { SimpleTwitterService } from './services/SimpleTwitterService';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function postWakeupTweet() {
    try {
        console.log('🚀 Initializing Twitter Service...');
        const twitterService = new SimpleTwitterService();
        
        const message = "Fulcanellie has awakened. Monitoring seismic patterns and ancient wisdom... 🌍✨";
        console.log(`📝 Preparing to post tweet: "${message}"`);
        
        const result = await twitterService.postTweet(message);
        
        if (result) {
            console.log('✅ Tweet posted successfully!');
        } else {
            console.error('❌ Failed to post tweet.');
        }
    } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
    }
}

// Execute the function
postWakeupTweet().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

