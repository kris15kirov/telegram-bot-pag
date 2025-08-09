const axios = require('axios');
const NodeCache = require('node-cache');
const { loggers, logAPICall, createTimer } = require('./logger');

class EtherscanAPI {
  constructor() {
    this.apiKey = process.env.ETHERSCAN_API_KEY;
    this.baseURL = 'https://api.etherscan.io/api';
    this.cache = new NodeCache({ 
      stdTTL: 60, // 1 minute cache for gas prices
      checkperiod: 30
    });
    
    loggers.web3.info('EtherscanAPI initialized', {
      hasApiKey: !!this.apiKey,
      baseURL: this.baseURL
    });
  }

  // Get current gas prices
  async getGasPrices() {
    const timer = createTimer('getGasPrices');
    
    try {
      const cacheKey = 'gas_prices';
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        loggers.web3.debug('Gas prices retrieved from cache');
        timer.log('web3');
        return cached;
      }

      if (!this.apiKey) {
        throw new Error('Etherscan API key not configured');
      }

      const endpoint = '';
      const requestStart = Date.now();
      
      const response = await axios.get(this.baseURL, {
        params: {
          module: 'gastracker',
          action: 'gasoracle',
          apikey: this.apiKey
        },
        timeout: 10000
      });

      const responseTime = Date.now() - requestStart;
      logAPICall('Etherscan', endpoint, responseTime, true);

      if (response.data.status !== '1') {
        throw new Error(response.data.message || 'Etherscan API error');
      }

      const gasData = response.data.result;
      const result = {
        slow: {
          gasPrice: parseInt(gasData.SafeGasPrice),
          waitTime: '5+ minutes'
        },
        standard: {
          gasPrice: parseInt(gasData.StandardGasPrice),
          waitTime: '2-5 minutes'
        },
        fast: {
          gasPrice: parseInt(gasData.FastGasPrice),
          waitTime: '< 2 minutes'
        },
        timestamp: Date.now()
      };

      // Cache the result
      this.cache.set(cacheKey, result);
      
      loggers.web3.info('Gas prices fetched successfully', {
        slow: result.slow.gasPrice,
        standard: result.standard.gasPrice,
        fast: result.fast.gasPrice
      });
      
      timer.log('web3');
      return result;

    } catch (error) {
      const responseTime = timer.end();
      logAPICall('Etherscan', '/gastracker', responseTime, false, error);
      
      loggers.web3.error('Error fetching gas prices', {
        error: error.message,
        hasApiKey: !!this.apiKey
      });

      if (error.message.includes('API key')) {
        throw new Error('Gas price service requires API key configuration.');
      } else if (error.response?.status === 429) {
        throw new Error('Gas price API rate limit exceeded. Please try again later.');
      } else {
        throw new Error('Unable to fetch gas prices at the moment.');
      }
    }
  }

  // Get account balance (ETH)
  async getAccountBalance(address) {
    const timer = createTimer('getAccountBalance');
    
    try {
      if (!this.apiKey) {
        throw new Error('Etherscan API key not configured');
      }

      if (!this.isValidAddress(address)) {
        throw new Error('Invalid Ethereum address format');
      }

      const cacheKey = `balance_${address}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        loggers.web3.debug('Account balance retrieved from cache', { address });
        timer.log('web3');
        return cached;
      }

      const endpoint = '/account/balance';
      const requestStart = Date.now();
      
      const response = await axios.get(this.baseURL, {
        params: {
          module: 'account',
          action: 'balance',
          address: address,
          tag: 'latest',
          apikey: this.apiKey
        },
        timeout: 10000
      });

      const responseTime = Date.now() - requestStart;
      logAPICall('Etherscan', endpoint, responseTime, true);

      if (response.data.status !== '1') {
        throw new Error(response.data.message || 'Etherscan API error');
      }

      const balanceWei = response.data.result;
      const balanceEth = parseFloat(balanceWei) / Math.pow(10, 18);
      
      const result = {
        address: address,
        balanceWei: balanceWei,
        balanceEth: balanceEth,
        timestamp: Date.now()
      };

      // Cache for 2 minutes
      this.cache.set(cacheKey, result, 120);
      
      loggers.web3.info('Account balance fetched successfully', {
        address,
        balanceEth
      });
      
      timer.log('web3');
      return result;

    } catch (error) {
      const responseTime = timer.end();
      logAPICall('Etherscan', '/account/balance', responseTime, false, error);
      
      loggers.web3.error('Error fetching account balance', {
        address,
        error: error.message
      });

      if (error.message.includes('API key')) {
        throw new Error('Balance query requires API key configuration.');
      } else if (error.message.includes('Invalid')) {
        throw error;
      } else {
        throw new Error('Unable to fetch account balance at the moment.');
      }
    }
  }

  // Get transaction count for an address
  async getTransactionCount(address) {
    const timer = createTimer('getTransactionCount');
    
    try {
      if (!this.apiKey) {
        throw new Error('Etherscan API key not configured');
      }

      if (!this.isValidAddress(address)) {
        throw new Error('Invalid Ethereum address format');
      }

      const response = await axios.get(this.baseURL, {
        params: {
          module: 'proxy',
          action: 'eth_getTransactionCount',
          address: address,
          tag: 'latest',
          apikey: this.apiKey
        },
        timeout: 10000
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      const txCount = parseInt(response.data.result, 16);
      
      loggers.web3.info('Transaction count fetched', {
        address,
        txCount
      });
      
      timer.log('web3');
      return {
        address,
        transactionCount: txCount,
        timestamp: Date.now()
      };

    } catch (error) {
      loggers.web3.error('Error fetching transaction count', {
        address,
        error: error.message
      });
      throw error;
    }
  }

  // Format gas prices response
  formatGasResponse(gasData) {
    return `⛽ **Current Ethereum Gas Prices**

🐌 **Slow:** ${gasData.slow.gasPrice} gwei
   ⏱️ Wait time: ${gasData.slow.waitTime}

🚀 **Standard:** ${gasData.standard.gasPrice} gwei
   ⏱️ Wait time: ${gasData.standard.waitTime}

⚡ **Fast:** ${gasData.fast.gasPrice} gwei
   ⏱️ Wait time: ${gasData.fast.waitTime}

_Gas prices from Etherscan • Updated ${new Date(gasData.timestamp).toLocaleTimeString()}_`;
  }

  // Format balance response
  formatBalanceResponse(balanceData) {
    return `💰 **Ethereum Address Balance**

📍 **Address:** \`${this.shortenAddress(balanceData.address)}\`

💎 **Balance:** ${balanceData.balanceEth.toFixed(6)} ETH
💵 **Value:** ~$${(balanceData.balanceEth * 2500).toFixed(2)} USD*

_*USD value estimated at $2,500/ETH_
_Data from Etherscan • Updated ${new Date(balanceData.timestamp).toLocaleTimeString()}_`;
  }

  // Utility functions
  isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  shortenAddress(address) {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // Clear cache
  clearCache() {
    this.cache.flushAll();
    loggers.web3.info('Etherscan cache cleared');
  }

  // Get cache statistics
  getCacheStats() {
    const stats = this.cache.getStats();
    return {
      keys: this.cache.keys().length,
      hits: stats.hits,
      misses: stats.misses
    };
  }
}

module.exports = EtherscanAPI;
