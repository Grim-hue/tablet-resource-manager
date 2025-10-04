const fs = require('fs');
const { execSync } = require('child_process');

// Cache for network stats
let networkCache = null;
let networkCacheTime = 0;
const NETWORK_CACHE_TTL = 2000; // 2 seconds

/**
 * Parse /proc/net/dev on Linux
 * @returns {Object} Network interface statistics
 */
function parseLinuxNetworkStats() {
  try {
    const data = fs.readFileSync('/proc/net/dev', 'utf8');
    const lines = data.trim().split('\n').slice(2); // Skip headers
    const interfaces = {};
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 17) {
        const interfaceName = parts[0].replace(':', '');
        
        // Skip loopback and inactive interfaces
        if (interfaceName === 'lo' || parts[1] === '0') {
          continue;
        }
        
        interfaces[interfaceName] = {
          rx: {
            bytes: parseInt(parts[1]),
            packets: parseInt(parts[2]),
            errors: parseInt(parts[3]),
            dropped: parseInt(parts[4])
          },
          tx: {
            bytes: parseInt(parts[9]),
            packets: parseInt(parts[10]),
            errors: parseInt(parts[11]),
            dropped: parseInt(parts[12])
          }
        };
      }
    }
    
    return interfaces;
  } catch (error) {
    console.error('Error parsing Linux network stats:', error);
    return {};
  }
}

/**
 * Get Windows network statistics using netstat
 * @returns {Object} Network interface statistics
 */
function parseWindowsNetworkStats() {
  try {
    // This is a simplified version for Windows
    const output = execSync('netstat -e', { encoding: 'utf8', timeout: 3000 });
    const lines = output.trim().split('\n');
    
    // Parse basic stats - this is simplified
    const stats = {
      'default': {
        rx: { bytes: 0, packets: 0, errors: 0, dropped: 0 },
        tx: { bytes: 0, packets: 0, errors: 0, dropped: 0 }
      }
    };
    
    // Try to extract basic numbers from netstat output
    for (const line of lines) {
      if (line.includes('Bytes')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          const bytes = parseInt(parts[1]) || 0;
          stats.default.rx.bytes += bytes;
        }
      }
    }
    
    return stats;
  } catch (error) {
    console.error('Error getting Windows network stats:', error);
    return {
      'default': {
        rx: { bytes: 0, packets: 0, errors: 0, dropped: 0 },
        tx: { bytes: 0, packets: 0, errors: 0, dropped: 0 }
      }
    };
  }
}

/**
 * Format bytes to human readable format
 * @param {number} bytes - Bytes count
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Collect network interface statistics
 * @returns {Promise<Object>} Network statistics
 */
async function collectNetworkInfo() {
  try {
    const now = Date.now();
    
    // Return cached data if still valid
    if (networkCache && (now - networkCacheTime) < NETWORK_CACHE_TTL) {
      return networkCache;
    }
    
    let interfaces = {};
    
    if (process.platform === 'linux') {
      interfaces = parseLinuxNetworkStats();
    } else if (process.platform === 'win32') {
      interfaces = parseWindowsNetworkStats();
    } else {
      // For other platforms, return empty data
      interfaces = {};
    }
    
    // Format the data for better readability
    const formattedInterfaces = {};
    
    for (const [name, stats] of Object.entries(interfaces)) {
      formattedInterfaces[name] = {
        rx: {
          bytes: stats.rx.bytes,
          bytesFormatted: formatBytes(stats.rx.bytes),
          packets: stats.rx.packets,
          errors: stats.rx.errors,
          dropped: stats.rx.dropped
        },
        tx: {
          bytes: stats.tx.bytes,
          bytesFormatted: formatBytes(stats.tx.bytes),
          packets: stats.tx.packets,
          errors: stats.tx.errors,
          dropped: stats.tx.dropped
        },
        total: {
          bytes: stats.rx.bytes + stats.tx.bytes,
          bytesFormatted: formatBytes(stats.rx.bytes + stats.tx.bytes),
          packets: stats.rx.packets + stats.tx.packets
        }
      };
    }
    
    networkCache = formattedInterfaces;
    networkCacheTime = now;
    
    return formattedInterfaces;
  } catch (error) {
    console.error('Error collecting network info:', error);
    return {
      error: 'Failed to collect network information',
      message: error.message
    };
  }
}

module.exports = collectNetworkInfo;
