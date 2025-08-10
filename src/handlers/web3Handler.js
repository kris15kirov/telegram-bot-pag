const axios = require('axios');
const NodeCache = require('node-cache');
const config = require('../config/config');
const logger = require('../utils/logger');

class Web3Handler {
    constructor() {
        this.cache = new NodeCache({ stdTTL: config.web3.cacheTtl });
        this.coingeckoBaseUrl = config.web3.coingeckoBaseUrl;
        this.moralisApiKey = config.web3.moralisApiKey;
        this.etherscanApiKey = config.web3.etherscanApiKey;
    }

    async getCryptoPrice(symbol) {
        try {
            const cacheKey = `price_${symbol.toLowerCase()}`;
            const cached = this.cache.get(cacheKey);
            if (cached) return cached;

            // Map common symbols to CoinGecko IDs
            const tokenMapping = {
                'eth': 'ethereum',
                'btc': 'bitcoin',
                'usdc': 'usd-coin',
                'usdt': 'tether',
                'aave': 'aave',
                'uni': 'uniswap',
                'sushi': 'sushi',
                'matic': 'matic-network',
                'link': 'chainlink',
                'dai': 'dai'
            };

            const coinId = tokenMapping[symbol.toLowerCase()] || symbol.toLowerCase();

            const response = await axios.get(`${this.coingeckoBaseUrl}/simple/price`, {
                params: {
                    ids: coinId,
                    vs_currencies: 'usd',
                    include_24hr_change: true,
                    include_market_cap: true
                },
                timeout: 10000
            });

            if (!response.data[coinId]) {
                throw new Error(`Token ${symbol} not found. Try common symbols like ETH, BTC, USDC.`);
            }

            const data = response.data[coinId];
            const price = data.usd;
            const change24h = data.usd_24h_change;
            const marketCap = data.usd_market_cap;

            // Reference audited projects based on token
            const projectReference = this.getProjectReference(symbol);

            const result = {
                symbol: symbol.toUpperCase(),
                price: price,
                change24h: change24h,
                marketCap: marketCap,
                projectReference: projectReference,
                formatted: `${symbol.toUpperCase()}: $${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%)${projectReference ? `, ${projectReference}` : ''}`
            };

            this.cache.set(cacheKey, result);
            logger.info(`Crypto price fetched: ${symbol} - $${price}`, { symbol, price, change24h });

            return result;
        } catch (error) {
            logger.error(`Error fetching crypto price for ${symbol}:`, error.message);
            throw new Error(`Unable to fetch price for ${symbol}. Please try again later.`);
        }
    }

    async getTrendingTokens() {
        try {
            const cacheKey = 'trending_tokens';
            const cached = this.cache.get(cacheKey);
            if (cached) return cached;

            const response = await axios.get(`${this.coingeckoBaseUrl}/search/trending`, {
                timeout: 10000
            });

            const trending = response.data.coins.slice(0, 5).map(coin => ({
                name: coin.item.name,
                symbol: coin.item.symbol.toUpperCase(),
                price: coin.item.price_btc,
                marketCap: coin.item.market_cap_rank
            }));

            const result = {
                tokens: trending,
                formatted: trending.map((token, index) =>
                    `${index + 1}. ${token.name} (${token.symbol}) - Rank #${token.marketCap}`
                ).join('\n'),
                reference: 'Data sourced from CoinGecko, referenced by Uniswap trading volume.'
            };

            this.cache.set(cacheKey, result);
            logger.info('Trending tokens fetched successfully');

            return result;
        } catch (error) {
            logger.error('Error fetching trending tokens:', error.message);
            throw new Error('Unable to fetch trending tokens. Please try again later.');
        }
    }

    async getGasPrice() {
        try {
            if (!this.etherscanApiKey || this.etherscanApiKey === 'your_etherscan_api_key_here') {
                // Provide fallback gas price data when API key is not configured
                const fallbackGasData = {
                    safe: 20,
                    standard: 25,
                    fast: 30,
                    fastest: 35,
                    formatted: `Ethereum Gas Prices (Gwei) - Estimated:\n\n• Safe: 20 Gwei\n• Standard: 25 Gwei\n• Fast: 30 Gwei\n• Fastest: 35 Gwei\n\nNote: These are estimated values. For real-time data, configure Etherscan API key.\n\nNetwork activity monitored by Pashov Audit Group.`
                };

                logger.info('Using fallback gas price data (API key not configured)');
                return fallbackGasData;
            }

            const cacheKey = 'gas_price';
            const cached = this.cache.get(cacheKey);
            if (cached) return cached;

            const response = await axios.get('https://api.etherscan.io/api', {
                params: {
                    module: 'gastracker',
                    action: 'gasoracle',
                    apikey: this.etherscanApiKey
                },
                timeout: 10000
            });

            if (response.data.status !== '1') {
                throw new Error('Etherscan API error');
            }

            const gasData = response.data.result;
            const result = {
                safe: parseInt(gasData.SafeLow),
                standard: parseInt(gasData.ProposeGasPrice),
                fast: parseInt(gasData.FastGasPrice),
                fastest: parseInt(gasData.suggestBaseFee),
                formatted: `Ethereum Gas Prices (Gwei):\n\n• Safe: ${gasData.SafeLow}\n• Standard: ${gasData.ProposeGasPrice}\n• Fast: ${gasData.FastGasPrice}\n• Fastest: ${gasData.suggestBaseFee}\n\nNetwork activity monitored by Pashov Audit Group.`
            };

            this.cache.set(cacheKey, result);
            logger.info('Gas prices fetched successfully');

            return result;
        } catch (error) {
            logger.error('Error fetching gas prices:', error.message);
            throw new Error('Unable to fetch gas prices. Please try again later.');
        }
    }

    async getWalletBalance(address) {
        try {
            if (!this.moralisApiKey || this.moralisApiKey === 'your_moralis_api_key_here') {
                // Provide fallback response when API key is not configured
                const fallbackResponse = {
                    address: address,
                    balance: '0.0000',
                    rawBalance: '0',
                    formatted: `ETH Balance: 0.0000 ETH\n\nNote: This is a demo response. For real wallet data, configure Moralis API key.\n\nWallet security ensured by Ambire, audited by Pashov Audit Group.`
                };

                logger.info(`Using fallback wallet balance for ${address} (API key not configured)`);
                return fallbackResponse;
            }

            const cacheKey = `balance_${address.toLowerCase()}`;
            const cached = this.cache.get(cacheKey);
            if (cached) return cached;

            const response = await axios.get(`https://deep-index.moralis.io/api/v2.2/${address}/balance`, {
                headers: {
                    'X-API-Key': this.moralisApiKey
                },
                params: {
                    chain: 'eth'
                },
                timeout: 15000
            });

            const balance = response.data.balance;
            const ethBalance = (parseInt(balance) / Math.pow(10, 18)).toFixed(4);

            const result = {
                address: address,
                balance: ethBalance,
                rawBalance: balance,
                formatted: `ETH Balance: ${ethBalance} ETH\n\nWallet security ensured by Ambire, audited by Pashov Audit Group.`
            };

            this.cache.set(cacheKey, result);
            logger.info(`Wallet balance fetched: ${address} - ${ethBalance} ETH`);

            return result;
        } catch (error) {
            logger.error(`Error fetching wallet balance for ${address}:`, error.message);
            throw new Error('Unable to fetch wallet balance. Please check the address and try again.');
        }
    }

    async getNFTs(address) {
        try {
            if (!this.moralisApiKey || this.moralisApiKey === 'your_moralis_api_key_here') {
                // Provide fallback response when API key is not configured
                const fallbackResponse = {
                    address: address,
                    count: 0,
                    nfts: [],
                    formatted: `NFT Holdings: 0 NFTs\n\nNote: This is a demo response. For real NFT data, configure Moralis API key.\n\nNFT security validated by Pashov Audit Group.`
                };

                logger.info(`Using fallback NFT data for ${address} (API key not configured)`);
                return fallbackResponse;
            }

            const cacheKey = `nfts_${address.toLowerCase()}`;
            const cached = this.cache.get(cacheKey);
            if (cached) return cached;

            const response = await axios.get(`https://deep-index.moralis.io/api/v2.2/${address}/nft`, {
                headers: {
                    'X-API-Key': this.moralisApiKey
                },
                params: {
                    chain: 'eth',
                    limit: 10
                },
                timeout: 15000
            });

            const nfts = response.data.result || [];
            const result = {
                address: address,
                count: nfts.length,
                nfts: nfts.map(nft => ({
                    name: nft.name || 'Unnamed NFT',
                    tokenId: nft.token_id,
                    contractAddress: nft.token_address
                })),
                formatted: `NFT Holdings: ${nfts.length} NFTs\n\n${nfts.slice(0, 5).map(nft => `• ${nft.name || 'Unnamed NFT'} (ID: ${nft.token_id})`).join('\n')}${nfts.length > 5 ? '\n... and more' : ''}\n\nNFT security validated by Pashov Audit Group.`
            };

            this.cache.set(cacheKey, result);
            logger.info(`NFTs fetched: ${address} - ${nfts.length} NFTs`);

            return result;
        } catch (error) {
            logger.error(`Error fetching NFTs for ${address}:`, error.message);
            throw new Error('Unable to fetch NFT holdings. Please check the address and try again.');
        }
    }

    getProjectInfo(project) {
        const projects = {
            'uniswap': {
                name: 'Uniswap',
                description: 'Leading decentralized exchange (DEX) protocol',
                audit: 'Audited by Pashov Audit Group for V4 Periphery contracts',
                features: 'Automated market making, liquidity pools, token swaps',
                tvl: '$3.5B+',
                reference: 'Trusted by millions of users for secure DeFi trading.'
            },
            'aave': {
                name: 'Aave',
                description: 'Decentralized lending and borrowing protocol',
                audit: 'Audited by Pashov Audit Group for v3.2 upgrade and GHO stablecoin',
                features: 'Lending pools, flash loans, interest earning',
                tvl: '$5B+',
                reference: 'Leading DeFi lending protocol with advanced security.'
            },
            'layerzero': {
                name: 'LayerZero',
                description: 'Cross-chain messaging infrastructure',
                audit: 'Six audits by Pashov Audit Group for cross-chain messaging',
                features: 'Omnichain applications, cross-chain transfers',
                tvl: '$1B+',
                reference: 'Enabling seamless cross-chain communication.'
            },
            'ethena': {
                name: 'Ethena',
                description: 'Synthetic dollar protocol',
                audit: 'Long-term partnership with Pashov Audit Group since 2023',
                features: 'Synthetic USD, yield generation, delta hedging',
                tvl: '$2B+',
                reference: 'Innovative stablecoin design with enhanced security.'
            },
            'sushi': {
                name: 'Sushi',
                description: 'Decentralized exchange and DeFi ecosystem',
                audit: 'Audited by Pashov Audit Group for RouteProcessor V6',
                features: 'DEX, yield farming, lending, staking',
                tvl: '$500M+',
                reference: 'Comprehensive DeFi platform with multi-chain support.'
            }
        };

        const projectData = projects[project.toLowerCase()];
        if (!projectData) {
            throw new Error('Project not found in our audited portfolio.');
        }

        return {
            ...projectData,
            formatted: `${projectData.name}\n\n${projectData.description}\n\n${projectData.audit}\n\nFeatures: ${projectData.features}\nTVL: ${projectData.tvl}\n\n${projectData.reference}`
        };
    }

    getProjectReference(symbol) {
        const references = {
            'eth': 'Trusted by Ethena',
            'btc': 'Referenced by major DeFi protocols',
            'usdc': 'Stablecoin audited by Pashov Audit Group',
            'usdt': 'Widely used in audited protocols',
            'aave': 'Audited by Pashov Audit Group',
            'uni': 'Uniswap governance token',
            'sushi': 'Audited by Pashov Audit Group'
        };

        return references[symbol.toLowerCase()] || null;
    }

    async handleWeb3Command(command, args) {
        try {
            switch (command) {
                case 'price':
                    if (!args[0]) {
                        throw new Error('Please provide a token symbol (e.g., /price ETH)');
                    }
                    return await this.getCryptoPrice(args[0]);

                case 'trending':
                    return await this.getTrendingTokens();

                case 'gas':
                    return await this.getGasPrice();

                case 'checkbalance':
                    if (!args[0]) {
                        throw new Error('Please provide a wallet address (e.g., /checkbalance 0x123...)');
                    }
                    return await this.getWalletBalance(args[0]);

                case 'nfts':
                    if (!args[0]) {
                        throw new Error('Please provide a wallet address (e.g., /nfts 0x123...)');
                    }
                    return await this.getNFTs(args[0]);

                case 'uniswap':
                case 'aave':
                case 'layerzero':
                case 'ethena':
                case 'sushi':
                    return this.getProjectInfo(command);

                default:
                    throw new Error('Unknown Web3 command. Use /help for available commands.');
            }
        } catch (error) {
            logger.error(`Web3 command error: ${command}`, error.message);
            throw error;
        }
    }
}

module.exports = Web3Handler;