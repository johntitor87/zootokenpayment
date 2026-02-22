import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

/**
 * A simplified service for posting tweets using Twitter API v2
 */
export class SimpleTwitterService {
  private apiClient?: TwitterApi;
  private initialized: boolean = false;

  /**
   * Initialize the Twitter service with API credentials from environment variables
   */
  constructor() {
    this.initializeClient();
  }

  /**
   * Initialize the Twitter API client
   */
  private async initializeClient(): Promise<void> {
    try {
      console.log('🔍 Validating Twitter OAuth 1.0a credentials');
      
      const apiKey = process.env.TWITTER_API_KEY;
      const apiSecret = process.env.TWITTER_API_SECRET;
      const accessToken = process.env.TWITTER_ACCESS_TOKEN;
      const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
      
      // Check if all required credentials are available
      if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
        console.error('❌ Missing Twitter API credentials. Please check your .env file.');
        console.log(`  API Key: ${apiKey ? '✓' : '✗'}`);
        console.log(`  API Secret: ${apiSecret ? '✓' : '✗'}`);
        console.log(`  Access Token: ${accessToken ? '✓' : '✗'}`);
        console.log(`  Access Token Secret: ${accessSecret ? '✓' : '✗'}`);
        console.log('\n📝 To fix this:');
        console.log('1. Go to https://developer.twitter.com/en/portal/dashboard');
        console.log('2. Create a new app or update your existing app');
        console.log('3. Make sure it has READ AND WRITE permissions');
        console.log('4. Generate new API keys and tokens');
        console.log('5. Update your .env file with the new credentials');
        return;
      }

      // Initialize Twitter API client
      this.apiClient = new TwitterApi({
        appKey: apiKey,
        appSecret: apiSecret,
        accessToken: accessToken,
        accessSecret: accessSecret,
      });
      
      // Test the credentials
      try {
        const me = await this.apiClient.v2.me();
        console.log(`✅ Twitter client initialized successfully for @${me.data.username}`);
        this.initialized = true;
      } catch (testError) {
        console.error('❌ Twitter API credentials test failed:', testError);
        this.apiClient = undefined;
        this.initialized = false;
        
        if (testError && typeof testError === 'object' && 'code' in testError) {
          const err = testError as { code: number; message?: string };
          if (err.code === 403) {
            console.error('\n🚨 CREDENTIALS ISSUE DETECTED:');
            console.error('  - Your API keys may not have WRITE permissions');
            console.error('  - Your Twitter Developer account may be suspended');
            console.error('  - Your API keys may be invalid or expired');
            console.error('\n📝 To fix this:');
            console.error('1. Check https://developer.twitter.com/en/portal/dashboard');
            console.error('2. Verify your developer account is active');
            console.error('3. Ensure your app has READ AND WRITE permissions');
            console.error('4. Regenerate your API keys if needed');
          } else if (err.code === 401) {
            console.error('\n🚨 AUTHENTICATION FAILED:');
            console.error('  - Your API keys or tokens are invalid');
            console.error('  - Check that all 4 credentials are correctly set in .env');
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to initialize Twitter client:', error);
      this.apiClient = undefined;
      this.initialized = false;
    }
  }

  /**
   * Upload an image to Twitter
   * @param imagePath - Path to the image file to upload
   * @returns Media ID string if successful, null otherwise
   */
  private async uploadImage(imagePath: string): Promise<string | null> {
    if (!this.initialized || !this.apiClient) {
      console.error('❌ Twitter client not initialized. Cannot upload image.');
      return null;
    }

    try {
      console.log(`📤 Uploading image: ${imagePath}`);
      
      // Read image file
      const imageBuffer = fs.readFileSync(imagePath);
      
      // Upload media to Twitter
      const mediaId = await this.apiClient.v1.uploadMedia(imageBuffer, {
        mimeType: 'image/png'
      });
      
      console.log(`✅ Image uploaded successfully! Media ID: ${mediaId}`);
      return mediaId;
    } catch (error) {
      console.error('❌ Failed to upload image:', error);
      return null;
    }
  }

  /**
   * Post a tweet to Twitter (general purpose method)
   * @param message - The message to tweet
   * @param imagePath - Optional path to an image file to attach
   * @returns Promise that resolves to a boolean indicating success
   */
  public async postTweet(message: string, imagePath?: string): Promise<boolean> {
    // Check if client is initialized
    if (!this.initialized || !this.apiClient) {
      console.error('❌ Twitter client not initialized. Cannot post tweet.');
      return false;
    }

    try {
      console.log(`📝 Posting tweet: "${message.substring(0, 30)}${message.length > 30 ? '...' : ''}"`);
      
      // Upload image if provided
      let mediaIds: string[] | undefined;
      if (imagePath && fs.existsSync(imagePath)) {
        const mediaId = await this.uploadImage(imagePath);
        if (mediaId) {
          mediaIds = [mediaId];
          console.log('🖼️  Image attached to tweet');
        } else {
          console.warn('⚠️  Failed to upload image, posting without image');
        }
      }
      
      // Post the tweet with or without media
      const tweetOptions: any = { text: message };
      if (mediaIds && mediaIds.length > 0) {
        tweetOptions.media = { media_ids: mediaIds };
      }
      
      const result = await this.apiClient.v2.tweet(tweetOptions);
      
      console.log(`✅ Tweet posted successfully! ID: ${result.data.id}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to post tweet:', error);
      
      // Handle specific Twitter API errors
      if (error && typeof error === 'object' && 'code' in error) {
        const twitterError = error as { code: number; data?: any; message?: string };
        
        switch (twitterError.code) {
          case 403:
            console.error('\n🚨 PERMISSION DENIED (403):');
            console.error('  - Your Twitter API keys do not have WRITE permissions');
            console.error('  - Your Twitter Developer account may be suspended');
            console.error('  - The bot may be trying to post too frequently');
            console.error('\n📝 Solutions:');
            console.error('  1. Check https://developer.twitter.com/en/portal/dashboard');
            console.error('  2. Ensure your app has READ AND WRITE permissions');
            console.error('  3. Verify your developer account status');
            console.error('  4. Try regenerating your API keys');
            break;
            
          case 429:
            console.error('\n⏰ RATE LIMIT EXCEEDED (429):');
            console.error('  - The bot is posting too frequently');
            console.error('  - Twitter API has usage limits');
            console.error('\n📝 Solutions:');
            console.error('  1. Increase CHECK_INTERVAL in your .env file (currently every 5 minutes)');
            console.error('  2. Wait for rate limit to reset (usually 15 minutes)');
            console.error('  3. Consider upgrading to Twitter API Pro if you need higher limits');
            break;
            
          case 401:
            console.error('\n🔑 AUTHENTICATION FAILED (401):');
            console.error('  - Your API credentials are invalid or expired');
            console.error('\n📝 Solutions:');
            console.error('  1. Check all 4 credentials in your .env file');
            console.error('  2. Regenerate API keys from Twitter Developer portal');
            break;
            
          case 187:
            console.error('\n📝 DUPLICATE TWEET (187):');
            console.error('  - You cannot post the same content twice');
            console.error('  - This is normal - the earthquake was already reported');
            break;
            
          case 88:
            console.error('\n⏰ LEGACY RATE LIMIT (88):');
            console.error('  - Rate limit exceeded (older error code)');
            console.error('  - Wait 15 minutes before trying again');
            break;
            
          default:
            console.error(`\n❓ UNKNOWN TWITTER ERROR (${twitterError.code}):`);
            console.error(`  Message: ${twitterError.message || 'No message provided'}`);
            if (twitterError.data) {
              try {
                console.error(`  Details: ${JSON.stringify(twitterError.data, null, 2)}`);
              } catch {
                console.error(`  Details: ${twitterError.data}`);
              }
            }
        }
      } else {
        console.error('❌ Unexpected error type:', typeof error);
        console.error('❌ Error details:', error);
      }
      
      return false;
    }
  }

  /**
   * Post an earthquake report to Twitter (for actual earthquakes that have occurred)
   * @param message - The earthquake report message to tweet
   * @param imagePath - Optional path to an earthquake map image
   * @returns Promise that resolves to a boolean indicating success
   */
  public async postEarthquakeReport(message: string, imagePath?: string): Promise<boolean> {
    console.log('🌋 EARTHQUAKE REPORT: Preparing to post actual earthquake report');
    
    // Ensure the tweet is properly labeled as an earthquake report if not already
    if (!message.includes('EARTHQUAKE REPORT') && !message.includes('SEISMIC EVENT')) {
      message = `🌋 EARTHQUAKE REPORT 🌋\n\n${message}`;
    }
    
    // Add a timestamp to ensure uniqueness and avoid duplicate tweet errors
    const timestamp = new Date().toISOString();
    if (!message.includes(timestamp.substring(0, 10))) {
      message = `${message}\n\nReported: ${timestamp}`;
    }
    
    console.log('🌋 EARTHQUAKE REPORT: Sending to Twitter...');
    return await this.postTweet(message, imagePath);
  }

  /**
   * Post an earthquake prediction to Twitter (for predicted earthquakes)
   * @param message - The earthquake prediction message to tweet
   * @returns Promise that resolves to a boolean indicating success
   */
  public async postPredictionTweet(message: string): Promise<boolean> {
    console.log('🔮 EARTHQUAKE PREDICTION: Preparing to post earthquake prediction');
    
    // Ensure the tweet is properly labeled as a prediction if not already
    if (!message.includes('EARTHQUAKE PREDICTION') && !message.includes('SEISMIC PREDICTION')) {
      message = `🔮 EARTHQUAKE PREDICTION 🔮\n\n${message}`;
    }
    
    // Add a timestamp to ensure uniqueness and avoid duplicate tweet errors
    const timestamp = new Date().toISOString();
    if (!message.includes(timestamp.substring(0, 10))) {
      message = `${message}\n\nPrediction made: ${timestamp}`;
    }
    
    console.log('🔮 EARTHQUAKE PREDICTION: Sending to Twitter...');
    return await this.postTweet(message);
  }
}

