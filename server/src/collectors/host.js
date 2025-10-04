const os = require('os');

/**
 * Collect host system information
 * @returns {Object} Host information
 */
function collectHostInfo() {
  try {
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      type: os.type(),
      uptime: Math.floor(os.uptime()),
      nodeVersion: process.version,
      cpuCount: os.cpus().length
    };
  } catch (error) {
    console.error('Error collecting host info:', error);
    return {
      error: 'Failed to collect host information',
      message: error.message
    };
  }
}

module.exports = collectHostInfo;