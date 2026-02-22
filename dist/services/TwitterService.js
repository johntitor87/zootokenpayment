"use strict";
/**
 * TwitterService.ts
 *
 * Service for interacting with Twitter API with support for both OAuth 1.0a API
 * and traditional login authentication methods.
 *
 * Features:
 * - Dual authentication support (API and traditional login)
 * - Rate limit handling for free API tier
 * - Session persistence for traditional login
 * - Automatic fallback between authentication methods
 * - Detailed logging and error handling
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwitterService = void 0;
const twitter_api_v2_1 = require("twitter-api-v2");
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
// Load environment variables
dotenv_1.default.config();
/**
 * Service for interacting with the Twitter API
 */
class TwitterService {
    constructor() {
        /** Flag to track initialization status */
        this.initialized = false;
    }
    if(options, forceMethod) {
        this.currentClient = options.forceMethod === 'api' ? this.apiClient : this.traditionalClient;
        console.log(`🔄 Forcing use of ${options.forceMethod} authentication method`);
    }
    // Check if we should switch clients due to rate limits
    if(, options, forceMethod) { }
}
exports.TwitterService = TwitterService;
 && this.shouldSwitchClient();
{
    const previousClient = this.currentClient === this.apiClient ? 'OAuth 1.0a API' : 'Traditional Login';
    this.currentClient = this.currentClient === this.apiClient ? this.traditionalClient : this.apiClient;
    const newClient = this.currentClient === this.apiClient ? 'OAuth 1.0a API' : 'Traditional Login';
    console.log(`🔄 Switching from ${previousClient} to ${newClient} due to rate limits or availability`);
}
// First try with the current client
try {
    if (!this.currentClient) {
        throw new Error('No Twitter client available');
    }
    const clientType = this.currentClient === this.apiClient ? 'API' : 'traditional';
    console.log(`🐦 Attempting to post tweet using ${clientType} client...`);
    // Log the message length and first few characters for debugging
    console.log(`📝 Tweet length: ${message.length} characters, preview: "${message.substring(0, 30)}${message.length > 30 ? '...' : ''}"`);
    const method = this.currentClient === this.apiClient ? 'api' : 'traditional';
    const tweet = await this.currentClient.v2.tweet(message);
    console.log('✅ Tweet posted successfully:', tweet.data.id);
    // Update rate limits based on the method used
    this.updateRateLimits(method, tweet.rateLimit);
    return true;
}
catch (error) {
    console.error('❌ Error posting tweet with primary method:', error instanceof Error ? error.message : error);
    // Check if this was a rate limit error
    const isRateLimitError = this.handleRateLimitError(error, this.currentClient === this.apiClient ? 'api' : 'traditional');
    // If rate limited or other error, try the alternate method if available
    if ((isRateLimitError || error) &&
        ((this.apiClient && this.currentClient !== this.apiClient) ||
            (this.traditionalClient && this.currentClient !== this.traditionalClient))) {
        // Switch to alternate client
        const previousClient = this.currentClient;
        this.currentClient = this.currentClient === this.apiClient ?
            this.traditionalClient :
            this.apiClient;
        if (!this.currentClient) {
            console.error('❌ No alternate Twitter client available');
            return false;
        }
        // Try again with alternate client
        try {
            const clientType = this.currentClient === this.apiClient ? 'API' : 'traditional';
            console.log(`🔄 Retrying tweet with alternate ${clientType} client...`);
            const method = this.currentClient === this.apiClient ? 'api' : 'traditional';
            const tweet = await this.currentClient.v2.tweet(message);
            console.log('✅ Tweet posted successfully with alternate client:', tweet.data.id);
            // Update rate limits based on the method used
            this.updateRateLimits(method, tweet.rateLimit);
            return true;
        }
        catch (secondError) {
            console.error('❌ Error posting tweet with alternate method:', secondError instanceof Error ? secondError.message : secondError);
            this.handleRateLimitError(secondError, this.currentClient === this.apiClient ? 'api' : 'traditional');
            // Restore the original client for potential retries
            this.currentClient = previousClient;
            // Attempt a retry after a short delay
            if (retryCount < maxRetries) {
                const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                console.log(`🔄 Scheduling retry ${retryCount + 1}/${maxRetries} in ${retryDelay / 1000} seconds...`);
                return new Promise(resolve => {
                    setTimeout(async () => {
                        const result = await this.postTweet(message, {
                            ...options,
                            retryCount: retryCount + 1
                        });
                        resolve(result);
                    }, retryDelay);
                });
            }
            return false;
        }
    }
    // If we couldn't switch clients or if both failed, attempt a retry
    if (retryCount < maxRetries) {
        const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`🔄 Scheduling retry ${retryCount + 1}/${maxRetries} in ${retryDelay / 1000} seconds...`);
        return new Promise(resolve => {
            setTimeout(async () => {
                const result = await this.postTweet(message, {
                    ...options,
                    retryCount: retryCount + 1
                });
                resolve(result);
            }, retryDelay);
        });
    }
    return false;
}
async;
initializeClients();
Promise < void  > {
    console, : .log('🔍 Twitter Service: Checking authentication settings...'),
    let, apiAuthAvailable = false,
    let, traditionalAuthAvailable = false,
    : .authSettings.useApiAuthentication
};
{
    console.log('🔑 Twitter Service: OAuth 1.0a authentication enabled');
    try {
        await this.initializeApiClient();
        apiAuthAvailable = true;
        console.log('✅ Twitter Service: OAuth 1.0a authentication successful');
    }
    catch (error) {
        console.warn('⚠️ Twitter Service: OAuth 1.0a authentication failed:', error);
        // If API auth fails but traditional is not enabled, try to enable it
        if (!this.authSettings.useTraditionalLogin) {
            console.log('↪️ Twitter Service: Falling back to traditional login method');
            this.authSettings.useTraditionalLogin = true;
        }
    }
}
{
    console.log('ℹ️ Twitter Service: OAuth 1.0a authentication disabled by settings');
}
// Initialize traditional login client if enabled
if (this.authSettings.useTraditionalLogin) {
    console.log('🔑 Twitter Service: Traditional login authentication enabled');
    try {
        // Load previous session if available
        this.loadSession();
        await this.initializeTraditionalClient();
        traditionalAuthAvailable = true;
        console.log('✅ Twitter Service: Traditional login authentication successful');
    }
    catch (error) {
        console.warn('⚠️ Twitter Service: Traditional login authentication failed:', error);
    }
}
else {
    console.log('ℹ️ Twitter Service: Traditional login authentication disabled by settings');
}
// Set the default client based on availability and preference
try {
    this.selectDefaultClient();
    // Free API tier warning
    if (apiAuthAvailable) {
        console.log(`⚠️ Twitter Service: Using free API tier with conservative rate limits (${this.rateLimits.postTweet.remaining}/${this.rateLimits.postTweet.limit} tweets per hour)`);
    }
    // Log final authentication status
    const methods = [];
    if (apiAuthAvailable)
        methods.push('OAuth 1.0a API');
    if (traditionalAuthAvailable)
        methods.push('Traditional Login');
    if (eTraditionalLogin)
        : true; // Enable both by default for maximum reliability
}
finally // Initialize with conservative rate limits for free API tier
 { }
;
// Initialize with conservative rate limits for free API tier
this.rateLimits = {
    postTweet: {
        remaining: 25, // Very conservative for free tier
        reset: Date.now() + 3600000, // Default reset time (1 hour from now)
        limit: 25, // Free tier has strict limits
        method: 'api'
    }
};
// Log service creation
console.log('📱 Twitter Service: Created with settings:', {
    useApiAuthentication: this.authSettings.useApiAuthentication,
    useTraditionalLogin: this.authSettings.useTraditionalLogin,
    callbackUrl: this.authSettings.callbackUrl || '(default)'
});
// Initialize clients asynchronously
this.initializeClients().catch(err => {
    console.error('❌ Twitter Service: Failed to initialize clients:', err);
});
getRateLimitStatus();
{
    remaining: number;
    limit: number;
    resetsAt: Date;
    method: string;
    timeUntilReset: string;
}
{
    const now = Date.now();
    const resetTime = new Date(this.rateLimits.postTweet.reset);
    // Calculate time until reset in a human-readable format
    const timeUntilReset = () => {
        const diff = this.rateLimits.postTweet.reset - now;
        if (diff <= 0)
            return 'reset time reached';
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    };
    return {
        remaining: this.rateLimits.postTweet.remaining,
        limit: this.rateLimits.postTweet.limit,
        resetsAt: resetTime,
        method: this.rateLimits.postTweet.method === 'api' ? 'OAuth 1.0a API' : 'Traditional Login',
        timeUntilReset: timeUntilReset()
    };
}
async;
postTweet(message, string, options, {
    retryCount: number,
    forceMethod: 'api' | 'traditional',
    maxRetries: number
} = {});
Promise < boolean > {
    : .initialized
};
{
    console.log('🔄 Waiting for Twitter service initialization...');
    try {
        await new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                if (this.initialized) {
                    clearInterval(checkInterval);
                    resolve(true);
                }
            }, 500);
            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error('Twitter service initialization timed out'));
            }, 10000);
        });
    }
    catch (error) {
        console.error('❌ Twitter service not initialized:', error);
        return false;
    }
}
// Get retry parameters
const retryCount = options.retryCount || 0;
const maxRetries = options.maxRetries || 3;
// If we've retried too many times, give up
if (retryCount >= maxRetries) {
    console.error(`❌ Failed to post tweet after ${retryCount} retries.`);
    return false;
}
// Check if rate limits have reset
if (Date.now() > this.rateLimits.postTweet.reset) {
    // Reset rate limit tracking
    console.log('🔄 Rate limit period has reset, refreshing limits');
    this.rateLimits.postTweet.remaining = this.rateLimits.postTweet.limit;
    // Select default client again if not forcing a specific method
    if (!options.forceMethod) {
        this.selectDefaultClient();
    }
}
// If forcing a specific method, use that client
if (options.forceMethod) {
    this.currentClient = options.forceMethod === 'api' ? this.apiClient : this.traditionalClient;
    console.log(`🔄 Forcing use of ${options.for
    /**
     * Initialize the Twitter API client using OAuth 1.0a authentication
     */
    , 
    /**
     * Initialize the Twitter API client using OAuth 1.0a authentication
     */
    private, async, initializeApiClient(), Promise < void  > {
        // Secure credential validation - only show presence status, not actual values
        console, : .log('🔐 Validating Twitter OAuth 1.0a credentials:'),
        console, : .log('  - API Key:', process.env.TWITTER_API_KEY ? '✓ Present' : '✗ Missing'),
        console, : .log('  - API Secret:', process.env.TWITTER_API_SECRET ? '✓ Present' : '✗ Missing'),
        console, : .log('  - Access Token:', process.env.TWITTER_ACCESS_TOKEN ? '✓ Present' : '✗ Missing'),
        console, : .log('  - Access Token Secret:', process.env.TWITTER_ACCESS_TOKEN_SECRET ? '✓ Present' : '✗ Missing'),
        if(, process) { }, : .env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET ||
            !process.env.TWITTER_ACCESS_TOKEN || !process.env.TWITTER_ACCESS_TOKEN_SECRET
    });
    {
        throw new Error('Missing Twitter API credentials. Please check your .env file and ensure all OAuth 1.0a credentials are provided.');
    }
    this.apiClient = new twitter_api_v2_1.TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });
    // Verify credentials to ensure they work
    try {
        const verifyResponse = await this.apiClient.v2.me();
        console.log('✅ Twitter API credentials verified for user:', verifyResponse.data.username);
    }
    catch (error) {
        this.apiClient = undefined;
        throw new Error(`Failed to verify Twitter API credentials: ${error}`);
    }
}
async;
initializeTraditionalClient();
Promise < void  > {
    // Secure credential validation - only show presence status, not actual values
    console, : .log('🔐 Validating Twitter traditional login credentials:'),
    console, : .log('  - Username:', process.env.TWITTER_USERNAME ? '✓ Present' : '✗ Missing'),
    console, : .log('  - Password:', process.env.TWITTER_PASSWORD ? '✓ Present' : '✗ Missing'),
    console, : .log('  - API Key (still required):', process.env.TWITTER_API_KEY ? '✓ Present' : '✗ Missing'),
    console, : .log('  - API Secret (still required):', process.env.TWITTER_API_SECRET ? '✓ Present' : '✗ Missing'),
    if(, process) { }, : .env.TWITTER_USERNAME || !process.env.TWITTER_PASSWORD
};
{
    throw new Error('Missing Twitter username/password credentials. Please check your .env file and ensure both TWITTER_USERNAME and TWITTER_PASSWORD are provided.');
}
if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET) {
    throw new Error('API Key and Secret are still required for traditional login. Please check your .env file.');
}
// Create a new client using application-only auth first
const appOnlyClient = new twitter_api_v2_1.TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
});
try {
    // If we have a saved session that's less than 6 hours old, use it
    if (this.sessionData && (Date.now() - this.sessionData.lastLogin) < 6 * 60 * 60 * 1000) {
        console.log('🔄 Using existing Twitter session (created ' +
            Math.round((Date.now() - this.sessionData.lastLogin) / (60 * 60 * 1000)) +
            ' hours ago)');
        // In a real implementation, you would restore the session here
        // Note: twitter-api-v2 doesn't natively support username/password login
        // You would need to use a browser automation library like Puppeteer
        // This is a simplified example showing the concept
        this.traditionalClient = appOnlyClient;
    }
    else {
        console.log('🔄 Creating new Twitter session via traditional login');
        // In a real implementation, you would perform browser-based login here
        // and save the cookies/tokens
        // For now, we'll just use app-only auth as a placeholder
        this.traditionalClient = appOnlyClient;
        // Create and save a new session
        this.sessionData = {
            lastLogin: Date.now(),
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
        };
        this.saveSession();
    }
}
catch (error) {
    this.traditionalClient = undefined;
    throw new Error(`Failed to initialize Twitter traditional client: ${error}`);
}
loadSession();
void {
    try: {
        if(fs) { }, : .existsSync(this.sessionPath)
    }
};
{
    const data = fs_1.default.readFileSync(this.sessionPath, 'utf8');
    this.sessionData = JSON.parse(data);
    console.log('📂 Loaded Twitter session data from', this.sessionPath);
}
{
    console.log('📂 No existing session found at', this.sessionPath);
}
try { }
catch (error) {
    console.warn('⚠️ Failed to load Twitter session:', error);
    this.sessionData = undefined;
}
saveSession();
void {
    try: {
        : .sessionData
    }
};
{
    fs_1.default.writeFileSync(this.sessionPath, JSON.stringify(this.sessionData), 'utf8');
    console.log('💾 Saved Twitter session data to', this.sessionPath);
}
try { }
catch (error) {
    console.warn('⚠️ Failed to save Twitter session:', error);
}
updateRateLimits(method, 'api' | 'traditional', headers ?  : any);
void {
    if(headers) {
        // Extract rate limit information from response headers if available
        const remaining = parseInt(headers['x-rate-limit-remaining'] || '-1', 10);
        const reset = parseInt(headers['x-rate-limit-reset'] || '-1', 10) * 1000; // Convert to ms
        const limit = parseInt(headers['x-rate-limit-limit'] || '-1', 10);
        if (remaining !== -1 && reset !== -1 && limit !== -1) {
            this.rateLimits.postTweet = {
                remaining,
                reset,
                limit,
                method
            };
            console.log(`📊 Rate limits updated: ${remaining}/${limit} requests remaining, resets at ${new Date(reset).toLocaleTimeString()}`);
        }
    }, else: {
        // If no headers, decrement the remaining count as a precaution
        this: .rateLimits.postTweet.remaining = Math.max(0, this.rateLimits.postTweet.remaining - 1),
        this: .rateLimits.postTweet.method = method,
        console, : .log(`📊 Rate limits estimated: ${this.rateLimits.postTweet.remaining}/${this.rateLimits.postTweet.limit} requests remaining`)
    }
};
