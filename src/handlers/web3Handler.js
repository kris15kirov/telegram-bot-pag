const axios = require('axios');

class Web3Handler {
    constructor() {
        this.coinGeckoBaseURL = 'https://api.coingecko.com/api/v3';
        this.priceCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    }

    // Get cryptocurrency price
    async getCryptoPrice(symbol) {
        try {
            const normalizedSymbol = symbol.toLowerCase();
            const cacheKey = `price_${normalizedSymbol}`;

            // Check cache first
            const cached = this.priceCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
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

            const response = await axios.get(
                `${this.coinGeckoBaseURL}/simple/price`,
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

            const data = response.data[coinId];
            if (!data) {
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

            // Cache the result
            this.priceCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

            return result;

        } catch (error) {
            console.error(`❌ Error fetching price for ${symbol}:`, error.message);

            if (error.response?.status === 429) {
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
        try {
            const cacheKey = 'trending';
            const cached = this.priceCache.get(cacheKey);

            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
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

            // Cache result
            this.priceCache.set(cacheKey, {
                data: trending,
                timestamp: Date.now()
            });

            return trending;

        } catch (error) {
            console.error('❌ Error fetching trending cryptos:', error.message);
            throw new Error('Unable to fetch trending cryptocurrencies at the moment.');
        }
    }

    // Get market data
    async getMarketData() {
        try {
            const cacheKey = 'market_data';
            const cached = this.priceCache.get(cacheKey);

            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
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

            // Cache result
            this.priceCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

            return result;

        } catch (error) {
            console.error('❌ Error fetching market data:', error.message);
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
        this.priceCache.clear();
        console.log('✅ Web3 cache cleared');
    }
}

module.exports = Web3Handler;