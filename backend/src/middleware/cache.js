import NodeCache from 'node-cache';

// Create cache instance
// stdTTL: standard time to live in seconds (5 minutes)
// checkperiod: automatic delete check interval (10 minutes)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 600 });

// Middleware to cache GET requests
export const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Create cache key from URL and query params
    const key = `${req.originalUrl || req.url}`;
    
    // Check if data is in cache
    const cachedData = cache.get(key);
    
    if (cachedData) {
      // Return cached data
      return res.json(cachedData);
    }
    
    // Store original res.json function
    const originalJson = res.json.bind(res);
    
    // Override res.json to cache the response
    res.json = (data) => {
      // Cache the data with specified duration
      cache.set(key, data, duration);
      
      // Call original json function
      return originalJson(data);
    };
    
    next();
  };
};

// Clear cache for specific pattern or all
export const clearCache = (pattern = null) => {
  if (pattern) {
    const keys = cache.keys();
    keys.forEach(key => {
      if (key.includes(pattern)) {
        cache.del(key);
      }
    });
  } else {
    cache.flushAll();
  }
};

// Middleware to clear cache after data modifications
export const clearCacheMiddleware = (req, res, next) => {
  // Store original methods
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  
  // Override response methods to clear cache on success
  const clearOnSuccess = (data) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Clear recipe-related cache
      clearCache('/api/recipes');
    }
    return data;
  };
  
  res.json = (data) => {
    clearOnSuccess(data);
    return originalJson(data);
  };
  
  res.send = (data) => {
    clearOnSuccess(data);
    return originalSend(data);
  };
  
  next();
};

export default cache;