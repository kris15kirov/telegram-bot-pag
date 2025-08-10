const Web3Handler = require('../handlers/web3Handler');
const axios = require('axios');

// Mock axios
jest.mock('axios');

// Mock logger
jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    add: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    simple: jest.fn(),
    colorize: jest.fn(),
    printf: jest.fn()
  },
  transports: {
    File: jest.fn(),
    Console: jest.fn()
  }
}));

// Mock config to prevent process.exit
jest.mock('../config/config', () => ({
  telegram: {
    botToken: 'test-token',
    actionGroupChatId: 'test-group',
    adminUserIds: [123456789],
    webhookUrl: 'https://test.com',
    port: 3000
  },
  bot: {
    name: 'Test Bot',
    responseDelay: 1000,
    description: 'Test description'
  },
  web3: {
    moralisApiKey: 'test-moralis-key',
    etherscanApiKey: 'test-etherscan-key',
    coingeckoBaseUrl: 'https://api.coingecko.com/api/v3',
    cacheTtl: 300
  },
  keywords: {
    urgent: ['urgent'],
    media: ['media'],
    audit: ['audit']
  },
  auditedProjects: {
    dex: ['Uniswap', 'Sushi'],
    lending: ['Aave'],
    stablecoin: ['Ethena'],
    others: ['LayerZero', 'Ambire']
  },
  database: {
    path: 'test.db',
    logsPath: 'test.log'
  }
}));

// Mock NodeCache
jest.mock('node-cache', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    flushAll: jest.fn()
  }));
});

describe('Web3Handler', () => {
  let web3Handler;
  let mockCache;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock cache instance
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      flushAll: jest.fn()
    };

    // Mock NodeCache constructor
    const NodeCache = require('node-cache');
    NodeCache.mockImplementation(() => mockCache);

    web3Handler = new Web3Handler();
    
    // Ensure the handler is properly initialized
    expect(web3Handler).toBeDefined();
  });

  describe('getCryptoPrice', () => {
    it('should return cached price if available', async () => {
      const cachedPrice = {
        symbol: 'ETH',
        price: 2500,
        change24h: 2.5,
        formatted: 'ETH: $2,500.00 (+2.50%)'
      };

      mockCache.get.mockReturnValue(cachedPrice);

      const result = await web3Handler.getCryptoPrice('ETH');

      expect(result).toEqual(cachedPrice);
      expect(mockCache.get).toHaveBeenCalledWith('price_eth');
    });

    it('should fetch and cache new price', async () => {
      mockCache.get.mockReturnValue(null);

      const mockResponse = {
        data: {
          ethereum: {
            usd: 2500,
            usd_24h_change: 2.5,
            usd_market_cap: 300000000000
          }
        }
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await web3Handler.getCryptoPrice('ethereum');

      expect(result.symbol).toBe('ETHEREUM');
      expect(result.price).toBe(2500);
      expect(result.change24h).toBe(2.5);
      expect(result.formatted).toContain('ETHEREUM: $2,500.00 (+2.50%)');
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockCache.get.mockReturnValue(null);
      axios.get.mockRejectedValue(new Error('API Error'));

      await expect(web3Handler.getCryptoPrice('INVALID')).rejects.toThrow('Unable to fetch price for INVALID');
    });

    it('should handle token not found', async () => {
      mockCache.get.mockReturnValue(null);

      const mockResponse = {
        data: {}
      };

      axios.get.mockResolvedValue(mockResponse);

      await expect(web3Handler.getCryptoPrice('INVALID')).rejects.toThrow('Unable to fetch price for INVALID');
    });
  });

  describe('getTrendingTokens', () => {
    it('should return cached trending data if available', async () => {
      const cachedTrending = {
        tokens: [
          { name: 'Bitcoin', symbol: 'BTC', marketCap: 1 }
        ],
        formatted: '1. Bitcoin (BTC) - Rank #1',
        reference: 'Data sourced from CoinGecko'
      };

      mockCache.get.mockReturnValue(cachedTrending);

      const result = await web3Handler.getTrendingTokens();

      expect(result).toEqual(cachedTrending);
      expect(mockCache.get).toHaveBeenCalledWith('trending_tokens');
    });

    it('should fetch and cache new trending data', async () => {
      mockCache.get.mockReturnValue(null);

      const mockResponse = {
        data: {
          coins: [
            {
              item: {
                name: 'Bitcoin',
                symbol: 'btc',
                price_btc: 1,
                market_cap_rank: 1
              }
            },
            {
              item: {
                name: 'Ethereum',
                symbol: 'eth',
                price_btc: 0.05,
                market_cap_rank: 2
              }
            }
          ]
        }
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await web3Handler.getTrendingTokens();

      expect(result.tokens).toHaveLength(2);
      expect(result.tokens[0].name).toBe('Bitcoin');
      expect(result.tokens[0].symbol).toBe('BTC');
      expect(result.formatted).toContain('Bitcoin (BTC)');
      expect(result.reference).toContain('Uniswap');
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      mockCache.get.mockReturnValue(null);
      axios.get.mockRejectedValue(new Error('API Error'));

      await expect(web3Handler.getTrendingTokens()).rejects.toThrow('Unable to fetch trending tokens');
    });
  });

  describe('getGasPrice', () => {
    it('should return cached gas prices if available', async () => {
      const cachedGas = {
        safe: 20,
        standard: 25,
        fast: 30,
        fastest: 35,
        formatted: 'Ethereum Gas Prices (Gwei)'
      };

      mockCache.get.mockReturnValue(cachedGas);

      const result = await web3Handler.getGasPrice();

      expect(result).toEqual(cachedGas);
      expect(mockCache.get).toHaveBeenCalledWith('gas_price');
    });

    it('should fetch and cache new gas prices', async () => {
      mockCache.get.mockReturnValue(null);

      const mockResponse = {
        data: {
          status: '1',
          result: {
            SafeLow: '20',
            ProposeGasPrice: '25',
            FastGasPrice: '30',
            suggestBaseFee: '35'
          }
        }
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await web3Handler.getGasPrice();

      expect(result.safe).toBe(20);
      expect(result.standard).toBe(25);
      expect(result.fast).toBe(30);
      expect(result.fastest).toBe(35);
      expect(result.formatted).toContain('Ethereum Gas Prices (Gwei)');
      expect(result.formatted).toContain('Pashov Audit Group');
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should handle missing API key', async () => {
      web3Handler.etherscanApiKey = null;

      await expect(web3Handler.getGasPrice()).rejects.toThrow('Unable to fetch gas prices');
    });

    it('should handle API errors', async () => {
      mockCache.get.mockReturnValue(null);
      axios.get.mockRejectedValue(new Error('API Error'));

      await expect(web3Handler.getGasPrice()).rejects.toThrow('Unable to fetch gas prices');
    });
  });

  describe('getWalletBalance', () => {
    it('should return cached balance if available', async () => {
      const cachedBalance = {
        address: '0x123',
        balance: '1.5',
        formatted: 'ETH Balance: 1.5 ETH'
      };

      mockCache.get.mockReturnValue(cachedBalance);

      const result = await web3Handler.getWalletBalance('0x123');

      expect(result).toEqual(cachedBalance);
      expect(mockCache.get).toHaveBeenCalledWith('balance_0x123');
    });

    it('should fetch and cache new balance', async () => {
      mockCache.get.mockReturnValue(null);

      const mockResponse = {
        data: {
          balance: '1500000000000000000' // 1.5 ETH in wei
        }
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await web3Handler.getWalletBalance('0x123');

      expect(result.address).toBe('0x123');
      expect(result.balance).toBe('1.5000');
      expect(result.formatted).toContain('ETH Balance: 1.5000 ETH');
      expect(result.formatted).toContain('Ambire');
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should handle missing API key', async () => {
      web3Handler.moralisApiKey = null;

      await expect(web3Handler.getWalletBalance('0x123')).rejects.toThrow('Unable to fetch wallet balance');
    });

    it('should handle API errors', async () => {
      mockCache.get.mockReturnValue(null);
      axios.get.mockRejectedValue(new Error('API Error'));

      await expect(web3Handler.getWalletBalance('0x123')).rejects.toThrow('Unable to fetch wallet balance');
    });
  });

  describe('getNFTs', () => {
    it('should return cached NFTs if available', async () => {
      const cachedNFTs = {
        address: '0x123',
        count: 2,
        formatted: 'NFT Holdings: 2 NFTs'
      };

      mockCache.get.mockReturnValue(cachedNFTs);

      const result = await web3Handler.getNFTs('0x123');

      expect(result).toEqual(cachedNFTs);
      expect(mockCache.get).toHaveBeenCalledWith('nfts_0x123');
    });

    it('should fetch and cache new NFTs', async () => {
      mockCache.get.mockReturnValue(null);

      const mockResponse = {
        data: {
          result: [
            {
              name: 'Test NFT',
              token_id: '123',
              token_address: '0x456'
            }
          ]
        }
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await web3Handler.getNFTs('0x123');

      expect(result.address).toBe('0x123');
      expect(result.count).toBe(1);
      expect(result.nfts).toHaveLength(1);
      expect(result.nfts[0].name).toBe('Test NFT');
      expect(result.formatted).toContain('NFT Holdings: 1 NFTs');
      expect(result.formatted).toContain('Pashov Audit Group');
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should handle missing API key', async () => {
      web3Handler.moralisApiKey = null;

      await expect(web3Handler.getNFTs('0x123')).rejects.toThrow('Unable to fetch NFT holdings');
    });
  });

  describe('getProjectInfo', () => {
    it('should return Uniswap project info', () => {
      const result = web3Handler.getProjectInfo('uniswap');

      expect(result.name).toBe('Uniswap');
      expect(result.description).toContain('decentralized exchange');
      expect(result.audit).toContain('Pashov Audit Group');
      expect(result.features).toContain('Automated market making');
      expect(result.tvl).toBe('$3.5B+');
      expect(result.formatted).toContain('Uniswap');
    });

    it('should return Aave project info', () => {
      const result = web3Handler.getProjectInfo('aave');

      expect(result.name).toBe('Aave');
      expect(result.description).toContain('lending and borrowing');
      expect(result.audit).toContain('Pashov Audit Group');
      expect(result.features).toContain('Lending pools');
      expect(result.tvl).toBe('$5B+');
    });

    it('should return LayerZero project info', () => {
      const result = web3Handler.getProjectInfo('layerzero');

      expect(result.name).toBe('LayerZero');
      expect(result.description).toContain('Cross-chain messaging infrastructure');
      expect(result.audit).toContain('Six audits by Pashov Audit Group');
      expect(result.features).toContain('Omnichain applications');
    });

    it('should return Ethena project info', () => {
      const result = web3Handler.getProjectInfo('ethena');

      expect(result.name).toBe('Ethena');
      expect(result.description).toContain('Synthetic dollar protocol');
      expect(result.audit).toContain('Long-term partnership');
      expect(result.features).toContain('Synthetic USD');
    });

    it('should return Sushi project info', () => {
      const result = web3Handler.getProjectInfo('sushi');

      expect(result.name).toBe('Sushi');
      expect(result.description).toContain('Decentralized exchange and DeFi ecosystem');
      expect(result.audit).toContain('RouteProcessor V6');
      expect(result.features).toContain('DEX');
    });

    it('should throw error for unknown project', () => {
      expect(() => web3Handler.getProjectInfo('unknown')).toThrow('Project not found in our audited portfolio');
    });
  });

  describe('getProjectReference', () => {
    it('should return reference for ETH', () => {
      const result = web3Handler.getProjectReference('eth');
      expect(result).toBe('Trusted by Ethena');
    });

    it('should return reference for BTC', () => {
      const result = web3Handler.getProjectReference('btc');
      expect(result).toBe('Referenced by major DeFi protocols');
    });

    it('should return reference for USDC', () => {
      const result = web3Handler.getProjectReference('usdc');
      expect(result).toBe('Stablecoin audited by Pashov Audit Group');
    });

    it('should return reference for AAVE', () => {
      const result = web3Handler.getProjectReference('aave');
      expect(result).toBe('Audited by Pashov Audit Group');
    });

    it('should return null for unknown symbol', () => {
      const result = web3Handler.getProjectReference('unknown');
      expect(result).toBeNull();
    });
  });

  describe('handleWeb3Command', () => {
    it('should handle price command', async () => {
      mockCache.get.mockReturnValue(null);
      const mockResponse = {
        data: {
          ethereum: {
            usd: 2500,
            usd_24h_change: 2.5,
            usd_market_cap: 300000000000
          }
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await web3Handler.handleWeb3Command('price', ['ethereum']);

      expect(result.symbol).toBe('ETHEREUM');
      expect(result.price).toBe(2500);
    });

    it('should handle trending command', async () => {
      mockCache.get.mockReturnValue(null);
      const mockResponse = {
        data: {
          coins: []
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await web3Handler.handleWeb3Command('trending', []);

      expect(result.tokens).toBeDefined();
      expect(result.formatted).toBeDefined();
    });

    it('should handle gas command', async () => {
      mockCache.get.mockReturnValue(null);
      const mockResponse = {
        data: {
          status: '1',
          result: {
            SafeLow: '20',
            ProposeGasPrice: '25',
            FastGasPrice: '30',
            suggestBaseFee: '35'
          }
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await web3Handler.handleWeb3Command('gas', []);

      expect(result.safe).toBe(20);
      expect(result.standard).toBe(25);
    });

    it('should handle checkbalance command', async () => {
      mockCache.get.mockReturnValue(null);
      const mockResponse = {
        data: {
          balance: '1500000000000000000'
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await web3Handler.handleWeb3Command('checkbalance', ['0x123']);

      expect(result.address).toBe('0x123');
      expect(result.balance).toBe('1.5000');
    });

    it('should handle nfts command', async () => {
      mockCache.get.mockReturnValue(null);
      const mockResponse = {
        data: {
          result: []
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await web3Handler.handleWeb3Command('nfts', ['0x123']);

      expect(result.address).toBe('0x123');
      expect(result.count).toBe(0);
    });

    it('should handle project info commands', () => {
      // Test getProjectInfo directly first
      const projectInfo = web3Handler.getProjectInfo('uniswap');
      expect(projectInfo.name).toBe('Uniswap');
      expect(projectInfo.description).toContain('decentralized exchange');
      expect(projectInfo.audit).toContain('Pashov Audit Group');

      // Test through handleWeb3Command
      const result = web3Handler.handleWeb3Command('uniswap', []);
      expect(result.name).toBe('Uniswap');
      expect(result.description).toContain('decentralized exchange');
      expect(result.audit).toContain('Pashov Audit Group');
    });

    it('should throw error for unknown command', async () => {
      await expect(web3Handler.handleWeb3Command('unknown', [])).rejects.toThrow('Unknown Web3 command');
    });

    it('should require symbol for price command', async () => {
      await expect(web3Handler.handleWeb3Command('price', [])).rejects.toThrow('Please provide a token symbol');
    });

    it('should require address for checkbalance command', async () => {
      await expect(web3Handler.handleWeb3Command('checkbalance', [])).rejects.toThrow('Please provide a wallet address');
    });

    it('should require address for nfts command', async () => {
      await expect(web3Handler.handleWeb3Command('nfts', [])).rejects.toThrow('Please provide a wallet address');
    });
  });
});
