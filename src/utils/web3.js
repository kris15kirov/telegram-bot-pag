const axios = require('axios');

class Web3Utils {
  constructor() {
    this.moralisApiKey = process.env.MORALIS_API_KEY;
    this.moralisBaseURL = 'https://deep-index.moralis.io/api/v2.2';
    this.etherscanApiKey = process.env.ETHERSCAN_API_KEY;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Get wallet balance using Moralis API
  async getWalletBalance(walletAddress, chain = 'eth') {
    try {
      if (!this.moralisApiKey) {
        throw new Error('Moralis API key not configured');
      }

      const cacheKey = `balance_${walletAddress}_${chain}`;
      
      // Check cache
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const response = await axios.get(
        `${this.moralisBaseURL}/${walletAddress}/balance`,
        {
          headers: {
            'X-API-Key': this.moralisApiKey
          },
          params: {
            chain: chain
          },
          timeout: 10000
        }
      );

      const balanceWei = response.data.balance;
      const balanceEth = parseFloat(balanceWei) / Math.pow(10, 18);

      const result = {
        address: walletAddress,
        chain: chain,
        balanceWei: balanceWei,
        balanceEth: balanceEth.toFixed(6),
        balanceFormatted: this.formatBalance(balanceEth),
        timestamp: Date.now()
      };

      // Cache result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error(`❌ Error fetching wallet balance:`, error.message);
      
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.response?.status === 401) {
        throw new Error('Invalid API key or unauthorized access.');
      } else if (error.response?.status === 400) {
        throw new Error('Invalid wallet address format.');
      } else {
        throw new Error('Unable to fetch wallet balance at the moment.');
      }
    }
  }

  // Get NFTs owned by wallet
  async getWalletNFTs(walletAddress, chain = 'eth', limit = 10) {
    try {
      if (!this.moralisApiKey) {
        throw new Error('Moralis API key not configured');
      }

      const cacheKey = `nfts_${walletAddress}_${chain}`;
      
      // Check cache
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const response = await axios.get(
        `${this.moralisBaseURL}/${walletAddress}/nft`,
        {
          headers: {
            'X-API-Key': this.moralisApiKey
          },
          params: {
            chain: chain,
            format: 'decimal',
            limit: limit
          },
          timeout: 15000
        }
      );

      const nfts = response.data.result.map(nft => ({
        tokenAddress: nft.token_address,
        tokenId: nft.token_id,
        name: nft.name || 'Unknown',
        symbol: nft.symbol || '',
        contractType: nft.contract_type,
        metadata: nft.metadata ? JSON.parse(nft.metadata) : null
      }));

      const result = {
        address: walletAddress,
        chain: chain,
        totalNFTs: response.data.total,
        nfts: nfts,
        timestamp: Date.now()
      };

      // Cache result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error(`❌ Error fetching NFTs:`, error.message);
      throw new Error('Unable to fetch NFT data at the moment.');
    }
  }

  // Get token balances for wallet
  async getTokenBalances(walletAddress, chain = 'eth') {
    try {
      if (!this.moralisApiKey) {
        throw new Error('Moralis API key not configured');
      }

      const response = await axios.get(
        `${this.moralisBaseURL}/${walletAddress}/erc20`,
        {
          headers: {
            'X-API-Key': this.moralisApiKey
          },
          params: {
            chain: chain
          },
          timeout: 15000
        }
      );

      const tokens = response.data.map(token => ({
        tokenAddress: token.token_address,
        name: token.name,
        symbol: token.symbol,
        balance: token.balance,
        decimals: token.decimals,
        balanceFormatted: (parseFloat(token.balance) / Math.pow(10, token.decimals)).toFixed(6)
      })).filter(token => parseFloat(token.balanceFormatted) > 0);

      return {
        address: walletAddress,
        chain: chain,
        tokens: tokens,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error(`❌ Error fetching token balances:`, error.message);
      throw new Error('Unable to fetch token balances at the moment.');
    }
  }

  // Validate Ethereum address
  isValidEthereumAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  // Format balance for display
  formatBalance(balance) {
    if (balance >= 1000) {
      return (balance / 1000).toFixed(2) + 'K';
    } else if (balance >= 1) {
      return balance.toFixed(4);
    } else {
      return balance.toFixed(6);
    }
  }

  // Format wallet response for Telegram
  formatWalletResponse(balanceData) {
    return `💰 **Wallet Balance**

🏦 **Address:** \`${balanceData.address.substring(0, 6)}...${balanceData.address.substring(38)}\`
⛓️ **Chain:** ${balanceData.chain.toUpperCase()}
💎 **Balance:** ${balanceData.balanceFormatted} ETH
📊 **Exact:** ${balanceData.balanceEth} ETH

_Data updated: ${new Date(balanceData.timestamp).toLocaleTimeString()}_`;
  }

  // Format NFT response for Telegram
  formatNFTResponse(nftData) {
    if (nftData.nfts.length === 0) {
      return `🖼️ **NFT Collection**

🏦 **Address:** \`${nftData.address.substring(0, 6)}...${nftData.address.substring(38)}\`
⛓️ **Chain:** ${nftData.chain.toUpperCase()}

No NFTs found in this wallet.`;
    }

    let response = `🖼️ **NFT Collection**

🏦 **Address:** \`${nftData.address.substring(0, 6)}...${nftData.address.substring(38)}\`
⛓️ **Chain:** ${nftData.chain.toUpperCase()}
📊 **Total NFTs:** ${nftData.totalNFTs}

**Recent NFTs:**
`;

    nftData.nfts.slice(0, 5).forEach((nft, index) => {
      response += `${index + 1}. **${nft.name}** (${nft.symbol})\n`;
      response += `   Token ID: ${nft.tokenId}\n`;
      if (nft.contractType) {
        response += `   Type: ${nft.contractType}\n`;
      }
      response += '\n';
    });

    if (nftData.totalNFTs > 5) {
      response += `_... and ${nftData.totalNFTs - 5} more NFTs_\n\n`;
    }

    response += `_Data updated: ${new Date(nftData.timestamp).toLocaleTimeString()}_`;
    return response;
  }

  // Get gas prices
  async getGasPrices(chain = 'eth') {
    try {
      // This would typically use an API like EtherGasStation or similar
      // For demo purposes, returning mock data
      return {
        chain: chain,
        slow: '15 gwei (5+ min)',
        standard: '25 gwei (2-3 min)',
        fast: '35 gwei (<1 min)',
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error('Unable to fetch gas prices at the moment.');
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('✅ Web3 cache cleared');
  }
}

module.exports = Web3Utils;