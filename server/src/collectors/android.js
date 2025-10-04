const { execSync } = require('child_process');
const fs = require('fs');

// Cache for Android data
let androidCache = null;
let androidCacheTime = 0;
const ANDROID_CACHE_TTL = 5000; // 5 seconds

/**
 * Check if Termux API is available
 * @returns {boolean} True if Termux API is available
 */
function isTermuxApiAvailable() {
  try {
    // Check if termux-api command exists
    execSync('which termux-battery-status', { 
      encoding: 'utf8', 
      timeout: 1000,
      stdio: 'ignore'
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get battery information using Termux API
 * @returns {Promise<Object>} Battery information
 */
async function getBatteryInfo() {
  try {
    if (!isTermuxApiAvailable()) {
      return {
        error: 'Termux API not available',
        message: 'Install termux-api package and Termux:API app'
      };
    }

    const output = execSync('termux-battery-status', { 
      encoding: 'utf8',
      timeout: 5000 
    });
    
    const batteryData = JSON.parse(output);
    
    return {
      level: batteryData.percentage,
      status: batteryData.status,
      health: batteryData.health,
      plugged: batteryData.plugged,
      temperature: batteryData.temperature,
      voltage: batteryData.voltage,
      current: batteryData.current || 0,
      // Add human-readable values
      temperatureCelsius: batteryData.temperature ? (batteryData.temperature / 10).toFixed(1) : null,
      voltageVolts: batteryData.voltage ? (batteryData.voltage / 1000).toFixed(2) : null
    };
  } catch (error) {
    console.error('Error getting battery info:', error);
    return {
      error: 'Failed to get battery information',
      message: error.message
    };
  }
}

/**
 * Get thermal information
 * @returns {Promise<Object>} Thermal information
 */
async function getThermalInfo() {
  try {
    const thermalData = {};
    
    // Try to read thermal zones on Linux/Android
    if (fs.existsSync('/sys/class/thermal')) {
      const thermalZones = fs.readdirSync('/sys/class/thermal');
      
      for (const zone of thermalZones) {
        if (zone.startsWith('thermal_zone')) {
          try {
            const tempPath = `/sys/class/thermal/${zone}/temp`;
            const typePath = `/sys/class/thermal/${zone}/type`;
            
            if (fs.existsSync(tempPath) && fs.existsSync(typePath)) {
              const temp = parseInt(fs.readFileSync(tempPath, 'utf8').trim());
              const type = fs.readFileSync(typePath, 'utf8').trim();
              
              // Temperature is usually in millidegrees Celsius
              const tempCelsius = (temp / 1000).toFixed(1);
              
              thermalData[type] = {
                zone: zone,
                temperature: temp,
                temperatureCelsius: tempCelsius,
                temperatureFahrenheit: ((temp / 1000) * 9/5 + 32).toFixed(1)
              };
            }
          } catch (error) {
            console.error(`Error reading thermal zone ${zone}:`, error);
          }
        }
      }
    }
    
    // If no thermal zones found, try Termux API for thermal info
    if (Object.keys(thermalData).length === 0 && isTermuxApiAvailable()) {
      try {
        // Some Termux API versions might have thermal sensor access
        // This is a placeholder for potential future Termux API thermal support
        return {
          message: 'Thermal sensors not accessible via standard methods',
          availableZones: 0
        };
      } catch (error) {
        // Ignore Termux API thermal errors
      }
    }
    
    return {
      zones: thermalData,
      count: Object.keys(thermalData).length
    };
  } catch (error) {
    console.error('Error getting thermal info:', error);
    return {
      error: 'Failed to get thermal information',
      message: error.message,
      zones: {},
      count: 0
    };
  }
}

/**
 * Get device information specific to Android
 * @returns {Promise<Object>} Device information
 */
async function getDeviceInfo() {
  try {
    const deviceInfo = {};
    
    // Try to get Android system properties
    if (isTermuxApiAvailable()) {
      try {
        // Some device info might be available through termux commands
        const androidVersion = execSync('getprop ro.build.version.release', { 
          encoding: 'utf8',
          timeout: 2000 
        }).trim();
        
        const deviceModel = execSync('getprop ro.product.model', { 
          encoding: 'utf8',
          timeout: 2000 
        }).trim();
        
        const deviceBrand = execSync('getprop ro.product.brand', { 
          encoding: 'utf8',
          timeout: 2000 
        }).trim();
        
        deviceInfo.androidVersion = androidVersion;
        deviceInfo.model = deviceModel;
        deviceInfo.brand = deviceBrand;
      } catch (error) {
        console.error('Error getting device properties:', error);
      }
    }
    
    // Try to read some system files
    try {
      if (fs.existsSync('/proc/version')) {
        deviceInfo.kernelVersion = fs.readFileSync('/proc/version', 'utf8').trim();
      }
    } catch (error) {
      console.error('Error reading kernel version:', error);
    }
    
    return deviceInfo;
  } catch (error) {
    console.error('Error getting device info:', error);
    return {
      error: 'Failed to get device information',
      message: error.message
    };
  }
}

/**
 * Collect Android-specific information
 * @returns {Promise<Object>} Android system information
 */
async function collectAndroidInfo() {
  try {
    const now = Date.now();
    
    // Return cached data if still valid
    if (androidCache && (now - androidCacheTime) < ANDROID_CACHE_TTL) {
      return androidCache;
    }
    
    // Skip Android collection on non-Linux platforms
    if (process.platform !== 'linux') {
      return {
        available: false,
        reason: `Android features not available on ${process.platform}`
      };
    }
    
    const [battery, thermal, device] = await Promise.allSettled([
      getBatteryInfo(),
      getThermalInfo(),
      getDeviceInfo()
    ]);
    
    const result = {
      available: true,
      termuxApi: isTermuxApiAvailable(),
      battery: battery.status === 'fulfilled' ? battery.value : { error: battery.reason },
      thermal: thermal.status === 'fulfilled' ? thermal.value : { error: thermal.reason },
      device: device.status === 'fulfilled' ? device.value : { error: device.reason },
      timestamp: new Date().toISOString()
    };
    
    androidCache = result;
    androidCacheTime = now;
    
    return result;
  } catch (error) {
    console.error('Error collecting Android info:', error);
    return {
      available: false,
      error: 'Failed to collect Android information',
      message: error.message
    };
  }
}

module.exports = collectAndroidInfo;