const os = require('os');

/**
 * Collect memory information
 * @returns {Object} Memory statistics
 */
function collectMemoryInfo() {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    return {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      usage: totalMem > 0 ? ((usedMem / totalMem) * 100).toFixed(2) : 0,
      // Convert to human readable formats
      totalMB: (totalMem / 1024 / 1024).toFixed(2),
      usedMB: (usedMem / 1024 / 1024).toFixed(2),
      freeMB: (freeMem / 1024 / 1024).toFixed(2),
      totalGB: (totalMem / 1024 / 1024 / 1024).toFixed(2),
      usedGB: (usedMem / 1024 / 1024 / 1024).toFixed(2),
      freeGB: (freeMem / 1024 / 1024 / 1024).toFixed(2)
    };
  } catch (error) {
    console.error('Error collecting memory info:', error);
    return {
      error: 'Failed to collect memory information',
      message: error.message
    };
  }
}

module.exports = collectMemoryInfo;