const Store = require('./store');

/**
 * Rate limit middleware
 * @param {{limit: number, periodMs: number, message: string}} options limit is the max number of connection per period (in ms). Message is the message that will be sent as response when the limit has been reached
 * @returns Express middleware
 */
module.exports = (options) => {

  // set default values. Max 60 requests per minute
  // checking for presence of key as limit could possibly be set to 0 for forbidden routes
  const limit = 'limit' in options ? options.limit : 60;
  const periodMs = options.periodMs || 60 * 1000;
  const message = options.message || 'Connection limit exceeded. Please try again later';

  // instantiate store to store IP/counter pairs
  const store = new Store(periodMs);

  // middleware
  return (req, res, next) => {

    const currentMs = Date.now();

    // retrieve counter and/or reset/init if invalid
    const counter = store.has(req.ip) && store.get(req.ip).expiryMs < currentMs
      ? store.get(req.ip)
      : { connections: 0, expiryMs: currentMs + periodMs };

    // increment counter (even if > limit)
    counter.connections++;

    store.set(req.ip, counter);

    // set headers
    if (!res.headersSent) {
      res.set({
        'RateLimit-Limit': limit,
        'RateLimit-Remaining': Math.min(limit - counter.connections, 0),
        'RateLimit-Reset': Math.ceil((counter.expiryMs - currentMs) / 60)
      });
    }

    // send 429 if too many requests
    if (counter.connections > limit) return res.status(429).send(message);

    next();

  };
};