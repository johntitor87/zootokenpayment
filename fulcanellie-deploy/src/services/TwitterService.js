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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwitterService = void 0;
var twitter_api_v2_1 = require("twitter-api-v2");
var dotenv_1 = __importDefault(require("dotenv"));
var fs_1 = __importDefault(require("fs"));
// Load environment variables
dotenv_1.default.config();
/**
 * Service for interacting with the Twitter API
 */
var TwitterService = /** @class */ (function () {
    function TwitterService() {
        /** Flag to track initialization status */
        this.initialized = false;
    }
    TwitterService.prototype.if = function (options, forceMethod) {
        this.currentClient = options.forceMethod === 'api' ? this.apiClient : this.traditionalClient;
        console.log("\uD83D\uDD04 Forcing use of ".concat(options.forceMethod, " authentication method"));
    };
    // Check if we should switch clients due to rate limits
    TwitterService.prototype.if = function (, options, forceMethod) { };
    return TwitterService;
}());
exports.TwitterService = TwitterService;
 && this.shouldSwitchClient();
{
    var previousClient = this.currentClient === this.apiClient ? 'OAuth 1.0a API' : 'Traditional Login';
    this.currentClient = this.currentClient === this.apiClient ? this.traditionalClient : this.apiClient;
    var newClient = this.currentClient === this.apiClient ? 'OAuth 1.0a API' : 'Traditional Login';
    console.log("\uD83D\uDD04 Switching from ".concat(previousClient, " to ").concat(newClient, " due to rate limits or availability"));
}
// First try with the current client
try {
    if (!this.currentClient) {
        throw new Error('No Twitter client available');
    }
    var clientType = this.currentClient === this.apiClient ? 'API' : 'traditional';
    console.log("\uD83D\uDC26 Attempting to post tweet using ".concat(clientType, " client..."));
    // Log the message length and first few characters for debugging
    console.log("\uD83D\uDCDD Tweet length: ".concat(message.length, " characters, preview: \"").concat(message.substring(0, 30)).concat(message.length > 30 ? '...' : '', "\""));
    var method = this.currentClient === this.apiClient ? 'api' : 'traditional';
    var tweet = await this.currentClient.v2.tweet(message);
    console.log('✅ Tweet posted successfully:', tweet.data.id);
    // Update rate limits based on the method used
    this.updateRateLimits(method, tweet.rateLimit);
    return true;
}
catch (error) {
    console.error('❌ Error posting tweet with primary method:', error instanceof Error ? error.message : error);
    // Check if this was a rate limit error
    var isRateLimitError = this.handleRateLimitError(error, this.currentClient === this.apiClient ? 'api' : 'traditional');
    // If rate limited or other error, try the alternate method if available
    if ((isRateLimitError || error) &&
        ((this.apiClient && this.currentClient !== this.apiClient) ||
            (this.traditionalClient && this.currentClient !== this.traditionalClient))) {
        // Switch to alternate client
        var previousClient = this.currentClient;
        this.currentClient = this.currentClient === this.apiClient ?
            this.traditionalClient :
            this.apiClient;
        if (!this.currentClient) {
            console.error('❌ No alternate Twitter client available');
            return false;
        }
        // Try again with alternate client
        try {
            var clientType = this.currentClient === this.apiClient ? 'API' : 'traditional';
            console.log("\uD83D\uDD04 Retrying tweet with alternate ".concat(clientType, " client..."));
            var method = this.currentClient === this.apiClient ? 'api' : 'traditional';
            var tweet = await this.currentClient.v2.tweet(message);
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
                var retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                console.log("\uD83D\uDD04 Scheduling retry ".concat(retryCount + 1, "/").concat(maxRetries, " in ").concat(retryDelay / 1000, " seconds..."));
                return new Promise(function (resolve) {
                    setTimeout(function () { return __awaiter(void 0, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, this.postTweet(message, __assign(__assign({}, options), { retryCount: retryCount + 1 }))];
                                case 1:
                                    result = _a.sent();
                                    resolve(result);
                                    return [2 /*return*/];
                            }
                        });
                    }); }, retryDelay);
                });
            }
            return false;
        }
    }
    // If we couldn't switch clients or if both failed, attempt a retry
    if (retryCount < maxRetries) {
        var retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log("\uD83D\uDD04 Scheduling retry ".concat(retryCount + 1, "/").concat(maxRetries, " in ").concat(retryDelay / 1000, " seconds..."));
        return new Promise(function (resolve) {
            setTimeout(function () { return __awaiter(void 0, void 0, void 0, function () {
                var result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.postTweet(message, __assign(__assign({}, options), { retryCount: retryCount + 1 }))];
                        case 1:
                            result = _a.sent();
                            resolve(result);
                            return [2 /*return*/];
                    }
                });
            }); }, retryDelay);
        });
    }
    return false;
}
async;
initializeClients();
Promise < void  > {
    console: console,
    : .log('🔍 Twitter Service: Checking authentication settings...'),
    let: let,
    apiAuthAvailable: apiAuthAvailable,
    let: let,
    traditionalAuthAvailable: traditionalAuthAvailable,
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
        console.log("\u26A0\uFE0F Twitter Service: Using free API tier with conservative rate limits (".concat(this.rateLimits.postTweet.remaining, "/").concat(this.rateLimits.postTweet.limit, " tweets per hour)"));
    }
    // Log final authentication status
    var methods = [];
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
this.initializeClients().catch(function (err) {
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
    var now_1 = Date.now();
    var resetTime = new Date(this.rateLimits.postTweet.reset);
    // Calculate time until reset in a human-readable format
    var timeUntilReset = function () {
        var diff = _this.rateLimits.postTweet.reset - now_1;
        if (diff <= 0)
            return 'reset time reached';
        var minutes = Math.floor(diff / 60000);
        var seconds = Math.floor((diff % 60000) / 1000);
        return "".concat(minutes, "m ").concat(seconds, "s");
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
postTweet(message, string, options, (_a = {}, number = _a.retryCount, 'api' | 'traditional' = _a.forceMethod, number = _a.maxRetries, _a));
Promise < boolean > {
    : .initialized
};
{
    console.log('🔄 Waiting for Twitter service initialization...');
    try {
        await new Promise(function (resolve, reject) {
            var checkInterval = setInterval(function () {
                if (_this.initialized) {
                    clearInterval(checkInterval);
                    resolve(true);
                }
            }, 500);
            // Timeout after 10 seconds
            setTimeout(function () {
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
var retryCount = options.retryCount || 0;
var maxRetries = options.maxRetries || 3;
// If we've retried too many times, give up
if (retryCount >= maxRetries) {
    console.error("\u274C Failed to post tweet after ".concat(retryCount, " retries."));
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
    console.log("\uD83D\uDD04 Forcing use of ".concat(options.for)
    /**
     * Initialize the Twitter API client using OAuth 1.0a authentication
     */
    , 
    /**
     * Initialize the Twitter API client using OAuth 1.0a authentication
     */
    private, async, initializeApiClient(), Promise < void  > {
        // Secure credential validation - only show presence status, not actual values
        console: console,
        : .log('🔐 Validating Twitter OAuth 1.0a credentials:'),
        console: console,
        : .log('  - API Key:', process.env.TWITTER_API_KEY ? '✓ Present' : '✗ Missing'),
        console: console,
        : .log('  - API Secret:', process.env.TWITTER_API_SECRET ? '✓ Present' : '✗ Missing'),
        console: console,
        : .log('  - Access Token:', process.env.TWITTER_ACCESS_TOKEN ? '✓ Present' : '✗ Missing'),
        console: console,
        : .log('  - Access Token Secret:', process.env.TWITTER_ACCESS_TOKEN_SECRET ? '✓ Present' : '✗ Missing'),
        if: function (, process) { },
        : .env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET ||
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
        var verifyResponse = await this.apiClient.v2.me();
        console.log('✅ Twitter API credentials verified for user:', verifyResponse.data.username);
    }
    catch (error) {
        this.apiClient = undefined;
        throw new Error("Failed to verify Twitter API credentials: ".concat(error));
    }
}
async;
initializeTraditionalClient();
Promise < void  > {
    // Secure credential validation - only show presence status, not actual values
    console: console,
    : .log('🔐 Validating Twitter traditional login credentials:'),
    console: console,
    : .log('  - Username:', process.env.TWITTER_USERNAME ? '✓ Present' : '✗ Missing'),
    console: console,
    : .log('  - Password:', process.env.TWITTER_PASSWORD ? '✓ Present' : '✗ Missing'),
    console: console,
    : .log('  - API Key (still required):', process.env.TWITTER_API_KEY ? '✓ Present' : '✗ Missing'),
    console: console,
    : .log('  - API Secret (still required):', process.env.TWITTER_API_SECRET ? '✓ Present' : '✗ Missing'),
    if: function (, process) { },
    : .env.TWITTER_USERNAME || !process.env.TWITTER_PASSWORD
};
{
    throw new Error('Missing Twitter username/password credentials. Please check your .env file and ensure both TWITTER_USERNAME and TWITTER_PASSWORD are provided.');
}
if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET) {
    throw new Error('API Key and Secret are still required for traditional login. Please check your .env file.');
}
// Create a new client using application-only auth first
var appOnlyClient = new twitter_api_v2_1.TwitterApi({
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
    throw new Error("Failed to initialize Twitter traditional client: ".concat(error));
}
loadSession();
void {
    try: {
        if: function (fs) { },
        : .existsSync(this.sessionPath)
    }
};
{
    var data = fs_1.default.readFileSync(this.sessionPath, 'utf8');
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
    if: function (headers) {
        // Extract rate limit information from response headers if available
        var remaining = parseInt(headers['x-rate-limit-remaining'] || '-1', 10);
        var reset = parseInt(headers['x-rate-limit-reset'] || '-1', 10) * 1000; // Convert to ms
        var limit = parseInt(headers['x-rate-limit-limit'] || '-1', 10);
        if (remaining !== -1 && reset !== -1 && limit !== -1) {
            this.rateLimits.postTweet = {
                remaining: remaining,
                reset: reset,
                limit: limit,
                method: method
            };
            console.log("\uD83D\uDCCA Rate limits updated: ".concat(remaining, "/").concat(limit, " requests remaining, resets at ").concat(new Date(reset).toLocaleTimeString()));
        }
    },
    else: {
        // If no headers, decrement the remaining count as a precaution
        this: .rateLimits.postTweet.remaining = Math.max(0, this.rateLimits.postTweet.remaining - 1),
        this: .rateLimits.postTweet.method = method,
        console: console,
        : .log("\uD83D\uDCCA Rate limits estimated: ".concat(this.rateLimits.postTweet.remaining, "/").concat(this.rateLimits.postTweet.limit, " requests remaining"))
    }
};
