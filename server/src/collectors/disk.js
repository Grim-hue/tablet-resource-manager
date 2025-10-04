const { execSync } = require('child_process');

// Cache for disk usage (avoid calling df too frequently)
let diskCache = null;
let diskCacheTime = 0;
const DISK_CACHE_TTL = 30000; // 30 seconds

/**
 * Parse df output into structured data
 * @param {string} output - df command output
 * @returns {Array} Parsed disk usage data
 */
function parseDfOutput(output) {
  const lines = output.trim().split('\n').slice(1); // Skip header
  const disks = [];
  
  for (const line of lines) {
    // Handle lines that might be split (filesystem name on separate line)
    const parts = line.trim().split(/\s+/);
    
    if (parts.length >= 6) {
      const [filesystem, size, used, available, usage, mountpoint] = parts;
      
      // Skip special filesystems
      if (filesystem.startsWith('tmpfs') || 
          filesystem.startsWith('udev') || 
          filesystem.startsWith('/dev/loop') ||
          mountpoint.startsWith('/snap/') ||
          mountpoint.startsWith('/sys') ||
          mountpoint.startsWith('/proc') ||
          mountpoint.startsWith('/run')) {
        continue;
      }
      
      disks.push({
        filesystem,
        size: formatSize(parseInt(size) * 1024), // df -k returns in KB
        used: formatSize(parseInt(used) * 1024),
        available: formatSize(parseInt(available) * 1024),
        usage: usage,
        usagePercent: parseInt(usage.replace('%', '')),
        mountpoint,
        sizeBytes: parseInt(size) * 1024,
        usedBytes: parseInt(used) * 1024,
        availableBytes: parseInt(available) * 1024
      });
    }
  }
  
  return disks;
}

/**
 * Format size in bytes to human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)}${units[unitIndex]}`;
}

/**
 * Collect disk usage information
 * @returns {Promise<Array>} Disk usage data
 */
async function collectDiskInfo() {
  try {
    const now = Date.now();
    
    // Return cached data if still valid
    if (diskCache && (now - diskCacheTime) < DISK_CACHE_TTL) {
      return diskCache;
    }
    
    let command;
    if (process.platform === 'win32') {
      // Windows: use wmic to get disk info
      try {
        const output = execSync('wmic logicaldisk get size,freespace,caption', { 
          encoding: 'utf8', 
          timeout: 5000 
        });
        
        const lines = output.trim().split('\n').slice(1);
        const disks = [];
        
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
            const [caption, freespace, size] = parts;
            const used = parseInt(size) - parseInt(freespace);
            const usagePercent = size > 0 ? Math.round((used / parseInt(size)) * 100) : 0;
            
            disks.push({
              filesystem: caption,
              size: formatSize(parseInt(size)),
              used: formatSize(used),
              available: formatSize(parseInt(freespace)),
              usage: `${usagePercent}%`,
              usagePercent: usagePercent,
              mountpoint: caption,
              sizeBytes: parseInt(size),
              usedBytes: used,
              availableBytes: parseInt(freespace)
            });
          }
        }
        
        diskCache = disks;
        diskCacheTime = now;
        return disks;
      } catch (error) {
        console.error('Error getting Windows disk info:', error);
        return [{
          error: 'Failed to collect Windows disk information',
          message: error.message
        }];
      }
    } else {
      // Unix-like systems: use df
      command = 'df -kP'; // POSIX format, sizes in KB
      const output = execSync(command, { 
        encoding: 'utf8', 
        timeout: 5000 
      });
      
      diskCache = parseDfOutput(output);
      diskCacheTime = now;
      return diskCache;
    }
  } catch (error) {
    console.error('Error collecting disk info:', error);
    return [{
      error: 'Failed to collect disk information',
      message: error.message
    }];
  }
}

module.exports = collectDiskInfo;