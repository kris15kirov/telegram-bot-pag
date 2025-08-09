const Web3Handler = require('../handlers/web3Handler');
const axios = require('axios');

// Mock axios to avoid real API calls during testing
jest.mock('axios');
const mockedAxios = axios;

// Mock logger to avoid file operations during testing
jest.mock('../utils/logger', () => ({
  loggers: {
    web3: {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    }
  },
  logAPICall: jest.fn(),
  createTimer: jest.fn(() => ({
    end: jest.fn(() => 100),
    log: jest.fn(() => 100)
  }))
}));

describe('Web3Handler', () => {
  let web3Handler;

  beforeEach(() => {
    web3Handler = new Web3Handler();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clear cache after each test
    web3Handler.clearCache();
  });

  describe('getCryptoPrice', () => {
    const mockPriceResponse = {
      data: {
        bitcoin: {
          usd: 43567.89,
          usd_24h_change: 2.45,
          usd_market_cap: 854200000000,
          usd_24h_vol: 23400000000
        }
      }
    };

    test('should fetch Bitcoin price successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockPriceResponse);

      const result = await web3Handler.getCryptoPrice('BTC');

      expect(result).toEqual({
        symbol: 'BTC',
        coinId: 'bitcoin',
        price: 43567.89,
        change24h: 2.45,
        marketCap: 854200000000,
        volume24h: 23400000000,
        timestamp: expect.any(Number)
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.coingecko.com/api/v3/simple/price',
        expect.objectContaining({
          params: {
            ids: 'bitcoin',
            vs_currencies: 'usd',
            include_24hr_change: true,
            include_market_cap: true,
            include_24hr_vol: true
          },
          timeout: 10000
        })
      );
    });

    test('should return cached result on second call', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockPriceResponse);

      // First call - should make API request
      const result1 = await web3Handler.getCryptoPrice('BTC');
      
      // Second call - should use cache
      const result2 = await web3Handler.getCryptoPrice('BTC');

      expect(result1).toEqual(result2);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    test('should handle unknown cryptocurrency', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: {} });

      await expect(web3Handler.getCryptoPrice('UNKNOWN'))
        .rejects
        .toThrow("Cryptocurrency 'UNKNOWN' not found");
    });

    test('should handle rate limit error', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 429 }
      });

      await expect(web3Handler.getCryptoPrice('BTC'))
        .rejects
        .toThrow('Rate limit exceeded. Please try again in a moment.');
    });

    test('should handle 404 error', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 404 }
      });

      await expect(web3Handler.getCryptoPrice('INVALID'))
        .rejects
        .toThrow("Cryptocurrency 'INVALID' not found. Try using symbols like BTC, ETH, ADA, SOL.");
    });

    test('should handle timeout error', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        code: 'ECONNABORTED'
      });

      await expect(web3Handler.getCryptoPrice('BTC'))
        .rejects
        .toThrow('Request timeout. Please try again.');
    });

    test('should handle general error', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(web3Handler.getCryptoPrice('BTC'))
        .rejects
        .toThrow('Unable to fetch cryptocurrency data at the moment.');
    });
  });

  describe('getMultiplePrices', () => {
    test('should fetch multiple prices successfully', async () => {
      const mockBtcResponse = {
        data: {
          bitcoin: {
            usd: 43567.89,
            usd_24h_change: 2.45,
            usd_market_cap: 854200000000,
            usd_24h_vol: 23400000000
          }
        }
      };

      const mockEthResponse = {
        data: {
          ethereum: {
            usd: 2456.78,
            usd_24h_change: -1.23,
            usd_market_cap: 295600000000,
            usd_24h_vol: 15200000000
          }
        }
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockBtcResponse)
        .mockResolvedValueOnce(mockEthResponse);

      const results = await web3Handler.getMultiplePrices(['BTC', 'ETH']);

      expect(results).toHaveLength(2);
      expect(results[0].symbol).toBe('BTC');
      expect(results[1].symbol).toBe('ETH');
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    test('should handle partial failures gracefully', async () => {
      const mockBtcResponse = {
        data: {
          bitcoin: {
            usd: 43567.89,
            usd_24h_change: 2.45,
            usd_market_cap: 854200000000,
            usd_24h_vol: 23400000000
          }
        }
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockBtcResponse)
        .mockRejectedValueOnce(new Error('API Error'));

      const results = await web3Handler.getMultiplePrices(['BTC', 'INVALID']);

      expect(results).toHaveLength(2);
      expect(results[0].symbol).toBe('BTC');
      expect(results[1].symbol).toBe('INVALID');
      expect(results[1].error).toBeDefined();
    });
  });

  describe('getTrendingCryptos', () => {
    const mockTrendingResponse = {
      data: {
        coins: [
          {
            item: {
              id: 'bitcoin',
              name: 'Bitcoin',
              symbol: 'BTC',
              market_cap_rank: 1
            }
          },
          {
            item: {
              id: 'ethereum',
              name: 'Ethereum',
              symbol: 'ETH',
              market_cap_rank: 2
            }
          }
        ]
      }
    };

    test('should fetch trending cryptocurrencies successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockTrendingResponse);

      const result = await web3Handler.getTrendingCryptos();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'Bitcoin',
        symbol: 'BTC',
        rank: 1,
        id: 'bitcoin'
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.coingecko.com/api/v3/search/trending',
        { timeout: 10000 }
      );
    });

    test('should return cached result on second call', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockTrendingResponse);

      // First call
      const result1 = await web3Handler.getTrendingCryptos();
      
      // Second call - should use cache
      const result2 = await web3Handler.getTrendingCryptos();

      expect(result1).toEqual(result2);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    test('should handle API error', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(web3Handler.getTrendingCryptos())
        .rejects
        .toThrow('Unable to fetch trending cryptocurrencies at the moment.');
    });
  });

  describe('getMarketData', () => {
    const mockMarketResponse = {
      data: {
        data: {
          total_market_cap: { usd: 1500000000000 },
          total_volume: { usd: 75000000000 },
          market_cap_change_percentage_24h_usd: 2.5,
          active_cryptocurrencies: 8500,
          market_cap_percentage: {
            btc: 42.5,
            eth: 18.3
          }
        }
      }
    };

    test('should fetch market data successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockMarketResponse);

      const result = await web3Handler.getMarketData();

      expect(result).toEqual({
        totalMarketCap: 1500000000000,
        total24hVolume: 75000000000,
        marketCapChange24h: 2.5,
        activeCryptocurrencies: 8500,
        btcDominance: 42.5,
        ethDominance: 18.3
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.coingecko.com/api/v3/global',
        { timeout: 10000 }
      );
    });

    test('should handle API error', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(web3Handler.getMarketData())
        .rejects
        .toThrow('Unable to fetch market data at the moment.');
    });
  });

  describe('isPriceQuery', () => {
    test('should detect various price query patterns', () => {
      const testCases = [
        { input: 'BTC', expected: true },
        { input: 'btc price', expected: true },
        { input: 'ETH', expected: true },
        { input: 'ethereum price', expected: true },
        { input: 'price BTC', expected: true },
        { input: '$BTC', expected: true },
        { input: '$eth', expected: true },
        { input: 'hello world', expected: false },
        { input: 'what is bitcoin', expected: false }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(web3Handler.isPriceQuery(input)).toBe(expected);
      });
    });
  });

  describe('extractSymbol', () => {
    test('should extract symbols from various query formats', () => {
      const testCases = [
        { input: 'price BTC', expected: 'btc' },
        { input: 'BTC price', expected: 'btc' },
        { input: '$ETH', expected: 'eth' },
        { input: 'ethereum', expected: 'ethereum' },
        { input: 'ADA price now', expected: 'ada' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(web3Handler.extractSymbol(input)).toBe(expected);
      });
    });
  });

  describe('formatPriceResponse', () => {
    test('should format price data correctly', () => {
      const priceData = {
        symbol: 'BTC',
        price: 43567.89,
        change24h: 2.45,
        marketCap: 854200000000,
        volume24h: 23400000000,
        timestamp: 1640995200000
      };

      const formatted = web3Handler.formatPriceResponse(priceData);

      expect(formatted).toContain('📈 **BTC Price**');
      expect(formatted).toContain('$43,567.89');
      expect(formatted).toContain('🟢 **24h Change:** +2.45%');
      expect(formatted).toContain('Data from CoinGecko');
    });

    test('should format negative change correctly', () => {
      const priceData = {
        symbol: 'ETH',
        price: 2456.78,
        change24h: -1.23,
        marketCap: 295600000000,
        volume24h: 15200000000,
        timestamp: 1640995200000
      };

      const formatted = web3Handler.formatPriceResponse(priceData);

      expect(formatted).toContain('📉 **ETH Price**');
      expect(formatted).toContain('🔴 **24h Change:** -1.23%');
    });

    test('should handle error data', () => {
      const errorData = {
        symbol: 'INVALID',
        error: 'Cryptocurrency not found'
      };

      const formatted = web3Handler.formatPriceResponse(errorData);

      expect(formatted).toBe('❌ Cryptocurrency not found');
    });
  });

  describe('formatLargeNumber', () => {
    test('should format large numbers correctly', () => {
      expect(web3Handler.formatLargeNumber(1500000000000)).toBe('1.50T');
      expect(web3Handler.formatLargeNumber(850000000000)).toBe('850.00B');
      expect(web3Handler.formatLargeNumber(25000000)).toBe('25.00M');
      expect(web3Handler.formatLargeNumber(5000)).toBe('5.00K');
      expect(web3Handler.formatLargeNumber(500)).toBe('500');
    });
  });

  describe('clearCache', () => {
    test('should clear both caches', () => {
      // Add something to cache first
      web3Handler.cache.set('test', 'value');
      web3Handler.priceCache.set('test', { data: 'value', timestamp: Date.now() });

      expect(web3Handler.cache.get('test')).toBe('value');
      expect(web3Handler.priceCache.get('test')).toBeDefined();

      web3Handler.clearCache();

      expect(web3Handler.cache.get('test')).toBeUndefined();
      expect(web3Handler.priceCache.get('test')).toBeUndefined();
    });
  });

  describe('getCacheStats', () => {
    test('should return cache statistics', () => {
      web3Handler.cache.set('test1', 'value1');
      web3Handler.cache.set('test2', 'value2');

      const stats = web3Handler.getCacheStats();

      expect(stats).toHaveProperty('keys');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats.keys).toBe(2);
    });
  });
});
