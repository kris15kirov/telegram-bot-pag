const axios = require('axios');
const NodeCache = require('node-cache');
const { loggers, logAPICall, createTimer } = require('../utils/logger');

class Web3Handler {
    constructor() {
        this.coinGeckoBaseURL = 'https://api.coingecko.com/api/v3';
        // Enhanced caching with node-cache
        this.cache = new NodeCache({ 
            stdTTL: 300, // 5 minutes default
            checkperiod: 60, // Check for expired keys every minute
            useClones: false
        });
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
        
        // Legacy cache for backward compatibility
        this.priceCache = new Map();
        
        loggers.web3.info('Web3Handler initialized', {
            coinGeckoBaseURL: this.coinGeckoBaseURL,
            cacheTimeout: this.cacheTimeout
        });
    }

    // Get cryptocurrency price
    async getCryptoPrice(symbol) {
        const timer = createTimer(`getCryptoPrice_${symbol}`);
        
        try {
            const normalizedSymbol = symbol.toLowerCase();
            const cacheKey = `price_${normalizedSymbol}`;

            // Check enhanced cache first
            const cached = this.cache.get(cacheKey);
            if (cached) {
                loggers.web3.debug('Price retrieved from cache', { symbol: normalizedSymbol, cacheKey });
                timer.log('web3');
                return cached;
            }

            // Map common symbols to CoinGecko IDs
            const symbolMap = {
                'btc': 'bitcoin',
                'eth': 'ethereum',
                'ada': 'cardano',
                'sol': 'solana',
                'dot': 'polkadot',
                'matic': 'polygon',
                'avax': 'avalanche-2',
                'link': 'chainlink',
                'uni': 'uniswap',
                'aave': 'aave',
                'comp': 'compound-governance-token',
                'mkr': 'maker',
                'snx': 'synthetix-network-token'
            };

            const coinId = symbolMap[normalizedSymbol] || normalizedSymbol;

            const endpoint = '/simple/price';
            const requestStart = Date.now();
            
            const response = await axios.get(
                `${this.coinGeckoBaseURL}${endpoint}`,
                {
                    params: {
                        ids: coinId,
                        vs_currencies: 'usd',
                        include_24hr_change: true,
                        include_market_cap: true,
                        include_24hr_vol: true
                    },
                    timeout: 10000
                }
            );
            
            const responseTime = Date.now() - requestStart;
            logAPICall('CoinGecko', endpoint, responseTime, true);

            const data = response.data[coinId];
            if (!data || Object.keys(response.data).length === 0) {
                throw new Error(`Cryptocurrency '${symbol}' not found`);
            }

            const result = {
                symbol: symbol.toUpperCase(),
                coinId,
                price: data.usd,
                change24h: data.usd_24h_change,
                marketCap: data.usd_market_cap,
                volume24h: data.usd_24h_vol,
                timestamp: Date.now()
            };

            // Cache with enhanced cache
            this.cache.set(cacheKey, result);
            
            // Also update legacy cache for backward compatibility
            this.priceCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
            
            loggers.web3.info('Price fetched successfully', {
                symbol: normalizedSymbol,
                price: result.price,
                change24h: result.change24h
            });
            
            timer.log('web3');
            return result;

        } catch (error) {
            const responseTime = Date.now() - (timer.end() - timer.end());
            logAPICall('CoinGecko', '/simple/price', responseTime, false, error);
            
            loggers.web3.error('Error fetching cryptocurrency price', {
                symbol,
                error: error.message,
                status: error.response?.status,
                code: error.code
            });

            // Re-throw specific errors we already handled
            if (error.message && error.message.includes('not found')) {
                throw error;
            } else if (error.response?.status === 429) {
                throw new Error('Rate limit exceeded. Please try again in a moment.');
            } else if (error.response?.status === 404) {
                throw new Error(`Cryptocurrency '${symbol}' not found. Try using symbols like BTC, ETH, ADA, SOL.`);
            } else if (error.code === 'ECONNABORTED') {
                throw new Error('Request timeout. Please try again.');
            } else {
                throw new Error('Unable to fetch cryptocurrency data at the moment.');
            }
        }
    }

    // Get multiple crypto prices
    async getMultiplePrices(symbols) {
        try {
            const promises = symbols.map(symbol =>
                this.getCryptoPrice(symbol).catch(error => ({
                    symbol: symbol.toUpperCase(),
                    error: error.message
                }))
            );

            return await Promise.all(promises);
        } catch (error) {
            console.error('❌ Error fetching multiple prices:', error.message);
            throw error;
        }
    }

    // Get trending cryptocurrencies
    async getTrendingCryptos() {
        const timer = createTimer('getTrendingCryptos');
        
        try {
            const cacheKey = 'trending';
            const cached = this.cache.get(cacheKey);

            if (cached) {
                loggers.web3.debug('Trending data retrieved from cache');
                timer.log('web3');
                return cached;
            }

            const response = await axios.get(
                `${this.coinGeckoBaseURL}/search/trending`,
                { timeout: 10000 }
            );

            const trending = response.data.coins.slice(0, 5).map(coin => ({
                name: coin.item.name,
                symbol: coin.item.symbol,
                rank: coin.item.market_cap_rank,
                id: coin.item.id
            }));

            // Cache with enhanced cache
            this.cache.set(cacheKey, trending);
            
            // Legacy cache for backward compatibility
            this.priceCache.set(cacheKey, {
                data: trending,
                timestamp: Date.now()
            });
            
            loggers.web3.info('Trending cryptocurrencies fetched', {
                count: trending.length,
                topCoin: trending[0]?.name
            });
            
            timer.log('web3');
            return trending;

        } catch (error) {
            logAPICall('CoinGecko', '/search/trending', timer.end(), false, error);
            loggers.web3.error('Error fetching trending cryptocurrencies', {
                error: error.message,
                status: error.response?.status
            });
            throw new Error('Unable to fetch trending cryptocurrencies at the moment.');
        }
    }

    // Get market data
    async getMarketData() {
        const timer = createTimer('getMarketData');
        
        try {
            const cacheKey = 'market_data';
            const cached = this.cache.get(cacheKey);

            if (cached) {
                loggers.web3.debug('Market data retrieved from cache');
                timer.log('web3');
                return cached;
            }

            const response = await axios.get(
                `${this.coinGeckoBaseURL}/global`,
                { timeout: 10000 }
            );

            const globalData = response.data.data;
            const result = {
                totalMarketCap: globalData.total_market_cap.usd,
                total24hVolume: globalData.total_volume.usd,
                marketCapChange24h: globalData.market_cap_change_percentage_24h_usd,
                activeCryptocurrencies: globalData.active_cryptocurrencies,
                btcDominance: globalData.market_cap_percentage.btc,
                ethDominance: globalData.market_cap_percentage.eth
            };

            // Cache with enhanced cache
            this.cache.set(cacheKey, result);
            
            // Legacy cache for backward compatibility
            this.priceCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
            
            loggers.web3.info('Market data fetched successfully', {
                totalMarketCap: result.totalMarketCap,
                btcDominance: result.btcDominance
            });
            
            timer.log('web3');
            return result;

        } catch (error) {
            logAPICall('CoinGecko', '/global', timer.end(), false, error);
            loggers.web3.error('Error fetching market data', {
                error: error.message,
                status: error.response?.status
            });
            throw new Error('Unable to fetch market data at the moment.');
        }
    }

    // Format price response
    formatPriceResponse(priceData) {
        if (priceData.error) {
            return `❌ ${priceData.error}`;
        }

        const changeEmoji = priceData.change24h >= 0 ? '📈' : '📉';
        const changeColor = priceData.change24h >= 0 ? '🟢' : '🔴';

        return `${changeEmoji} **${priceData.symbol} Price**

💰 **$${this.formatNumber(priceData.price)}**

${changeColor} **24h Change:** ${priceData.change24h >= 0 ? '+' : ''}${priceData.change24h.toFixed(2)}%

📊 **Market Cap:** $${this.formatLargeNumber(priceData.marketCap)}
📈 **24h Volume:** $${this.formatLargeNumber(priceData.volume24h)}

_Data from CoinGecko • Updated ${new Date(priceData.timestamp).toLocaleTimeString()}_`;
    }

    // Format trending cryptos response
    formatTrendingResponse(trending) {
        let response = '🔥 **Trending Cryptocurrencies**\n\n';

        trending.forEach((coin, index) => {
            response += `${index + 1}. **${coin.name} (${coin.symbol.toUpperCase()})**\n`;
            if (coin.rank) {
                response += `   📊 Market Cap Rank: #${coin.rank}\n`;
            }
            response += '\n';
        });

        response += '_Data from CoinGecko_';
        return response;
    }

    // Format market data response
    formatMarketResponse(marketData) {
        return `🌍 **Global Crypto Market**

💰 **Total Market Cap:** $${this.formatLargeNumber(marketData.totalMarketCap)}
📈 **24h Volume:** $${this.formatLargeNumber(marketData.total24hVolume)}
📊 **24h Change:** ${marketData.marketCapChange24h >= 0 ? '+' : ''}${marketData.marketCapChange24h.toFixed(2)}%

🪙 **Active Cryptocurrencies:** ${marketData.activeCryptocurrencies.toLocaleString()}

**Market Dominance:**
₿ Bitcoin: ${marketData.btcDominance.toFixed(1)}%
Ξ Ethereum: ${marketData.ethDominance.toFixed(1)}%

_Data from CoinGecko_`;
    }

    // Detect if message is a price query
    isPriceQuery(message) {
        const pricePatterns = [
            /^(btc|bitcoin)\s*(price)?$/i,
            /^(eth|ethereum)\s*(price)?$/i,
            /^(ada|cardano)\s*(price)?$/i,
            /^(sol|solana)\s*(price)?$/i,
            /^(dot|polkadot)\s*(price)?$/i,
            /^(matic|polygon)\s*(price)?$/i,
            /^(avax|avalanche)\s*(price)?$/i,
            /^(link|chainlink)\s*(price)?$/i,
            /^price\s+(\w+)$/i,
            /^(\w+)\s+price$/i,
            /^\$(\w+)$/i
        ];

        return pricePatterns.some(pattern => pattern.test(message.trim()));
    }

    // Extract symbol from price query
    extractSymbol(message) {
        const text = message.trim().toLowerCase();

        // Handle different patterns
        if (text.match(/^price\s+(\w+)$/)) {
            return text.split(' ')[1];
        } else if (text.match(/^(\w+)\s+price$/)) {
            return text.split(' ')[0];
        } else if (text.match(/^\$(\w+)$/)) {
            return text.substring(1);
        } else {
            // Extract first word (likely the symbol)
            return text.split(' ')[0];
        }
    }

    // Utility functions
    formatNumber(num) {
        if (num >= 1) {
            return num.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        } else {
            return num.toLocaleString('en-US', {
                minimumFractionDigits: 4,
                maximumFractionDigits: 8
            });
        }
    }

    formatLargeNumber(num) {
        if (num >= 1e12) {
            return (num / 1e12).toFixed(2) + 'T';
        } else if (num >= 1e9) {
            return (num / 1e9).toFixed(2) + 'B';
        } else if (num >= 1e6) {
            return (num / 1e6).toFixed(2) + 'M';
        } else if (num >= 1e3) {
            return (num / 1e3).toFixed(2) + 'K';
        }
        return num.toLocaleString();
    }

    // Clear cache (useful for testing or manual refresh)
    clearCache() {
        this.cache.flushAll();
        this.priceCache.clear();
        loggers.web3.info('Web3 cache cleared');
        console.log('✅ Web3 cache cleared');
    }
    
    // Get cache statistics
    getCacheStats() {
        const stats = this.cache.getStats();
        loggers.web3.info('Cache statistics', stats);
        return {
            keys: this.cache.keys().length,
            hits: stats.hits,
            misses: stats.misses,
            ksize: stats.ksize,
            vsize: stats.vsize
        };
    }
}

module.exports = Web3Handler;