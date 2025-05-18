const logger = require('./logger');

class RateLimiter {
  constructor(maxRequests = 5, timeWindow = 5000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = new Map();
  }

  async checkLimit(key) {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    
    // Remove expired requests
    const validRequests = userRequests.filter(time => now - time < this.timeWindow);
    
    if (validRequests.length >= this.maxRequests) {
      const oldestRequest = validRequests[0];
      const waitTime = this.timeWindow - (now - oldestRequest);
      logger.debug(`Rate limit hit for ${key}, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }

  async executeWithRetry(key, operation, maxRetries = 3) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.checkLimit(key);
        return await operation();
      } catch (error) {
        lastError = error;
        logger.warn(`Attempt ${i + 1} failed for ${key}:`, error.message);
        
        if (i < maxRetries - 1) {
          const backoffTime = Math.pow(2, i) * 1000;
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }
    
    throw lastError;
  }
}

module.exports = RateLimiter; 