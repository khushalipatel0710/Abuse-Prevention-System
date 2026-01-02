/**
 * Get client IP from request
 */
const getClientIp = (req) => {
  return (
    (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
    req.socket.remoteAddress ||
    'unknown'
  );
};

/**
 * Check if IP is in CIDR range
 */
const isIpInRange = (ip, cidr) => {
  if (!ip || !cidr || typeof ip !== 'string' || typeof cidr !== 'string') {
    return false;
  }
  
  const ipParts = ip.split('.');
  const [range, bits] = cidr.split('/');
  
  if (ipParts.length !== 4 || !bits || !range) return false;
  
  const [ip1, ip2, ip3, ip4] = ipParts.map(Number);
  const rangeParts = range.split('.');
  
  if (rangeParts.length !== 4) return false;
  
  const [r1, r2, r3, r4] = rangeParts.map(Number);
  const maskBits = parseInt(bits, 10);
  
  if (isNaN(maskBits) || maskBits < 0 || maskBits > 32) return false;
  
  const ipNum = (ip1 << 24) + (ip2 << 16) + (ip3 << 8) + ip4;
  const rangeNum = (r1 << 24) + (r2 << 16) + (r3 << 8) + r4;
  const mask = -1 << (32 - maskBits);
  
  return (ipNum & mask) === (rangeNum & mask);
};

/**
 * Check if IP is whitelisted
 */
const isIpWhitelisted = (ip, whitelist) => {
  if (!ip || !Array.isArray(whitelist)) {
    return false;
  }
  
  return whitelist.some((item) => {
    if (!item || typeof item !== 'string') {
      return false;
    }
    
    if (item.includes('/')) {
      return isIpInRange(ip, item);
    }
    return ip === item || ip === '::ffff:' + item;
  });
};

module.exports = {
  getClientIp,
  isIpInRange,
  isIpWhitelisted,
};
