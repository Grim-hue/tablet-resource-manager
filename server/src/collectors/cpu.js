const os = require('os');
const fs = require('fs');

// Cache for CPU usage calculation
let lastCpuUsage = null;
let lastMeasureTime = null;

/**
 * Calculate CPU usage percentage from /proc/stat on Linux
 * @returns {Promise<number>} CPU usage percentage
 */
async function calculateCpuUsage() {
  if (os.platform() !== 'linux') {
    // For non-Linux systems, return load average as approximation
    const loadavg = os.loadavg();
    return loadavg[0] * 10; // Rough approximation
  }
  
  try {
    const cpuInfo = fs.readFileSync('/proc/stat', 'utf8');
    const lines = cpuInfo.trim().split('\n');
    const cpuLine = lines[0].split(/\s+/);
    
    // Parse CPU times
    const idle = parseInt(cpuLine[4]);
    const iowait = parseInt(cpuLine[5]) || 0;
    const total = cpuLine.slice(1, 8).reduce((sum, time) => sum + parseInt(time), 0);
    
    const currentTime = Date.now();
    
    if (lastCpuUsage && lastMeasureTime) {
      const totalDiff = total - lastCpuUsage.total;
      const idleDiff = (idle + iowait) - (lastCpuUsage.idle + lastCpuUsage.iowait);
      
      const usage = totalDiff > 0 ? ((totalDiff - idleDiff) / totalDiff) * 100 : 0;
      
      lastCpuUsage = { total, idle, iowait };
      lastMeasureTime = currentTime;
      
      return Math.max(0, Math.min(100, usage));
    }
    
    // First measurement, store baseline
    lastCpuUsage = { total, idle, iowait };
    lastMeasureTime = currentTime;
    
    // Return load average for first call
    const loadavg = os.loadavg();
    return Math.min(100, loadavg[0] * 10);
  } catch (error) {
    console.error('Error calculating CPU usage:', error);
    // Fallback to load average
    const loadavg = os.loadavg();
    return Math.min(100, loadavg[0] * 10);
  }
}

/**
 * Collect CPU information and usage
 * @returns {Promise<Object>} CPU information
 */
async function collectCpuInfo() {
  try {
    const cpus = os.cpus();
    const loadavg = os.loadavg();
    let usage = await calculateCpuUsage();
    
    // Individual core usage calculation
    const coreUsage = cpus.map((cpu, index) => {
      const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
      const idle = cpu.times.idle;
      const coreUsagePercent = total > 0 ? ((total - idle) / total) * 100 : 0;
      return {
        core: index,
        usage: parseFloat(Math.min(100, coreUsagePercent).toFixed(2))
      };
    });
    
    // If overall usage is 0 but we have core data, calculate average
    if (usage === 0 && coreUsage.length > 0) {
      const totalCoreUsage = coreUsage.reduce((sum, core) => sum + core.usage, 0);
      usage = totalCoreUsage / coreUsage.length;
    }
    
    return {
      usage: parseFloat(usage.toFixed(2)),
      loadavg: loadavg.map(load => parseFloat(load.toFixed(3))),
      cores: cpus.length,
      model: cpus[0] ? cpus[0].model : 'Unknown',
      speed: cpus[0] ? cpus[0].speed : 0,
      coreUsage: coreUsage
    };
  } catch (error) {
    console.error('Error collecting CPU info:', error);
    return {
      error: 'Failed to collect CPU information',
      message: error.message,
      usage: 0,
      loadavg: [0, 0, 0],
      cores: 0
    };
  }
}

module.exports = collectCpuInfo;