require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(express.json());

// CORS - enable in development or when explicitly set
if (process.env.NODE_ENV === 'development' || process.env.ENABLE_CORS === 'true') {
  app.use(cors({
    origin: true,
    credentials: true
  }));
}

// Optional authentication middleware
const authenticateToken = (req, res, next) => {
  const authToken = process.env.AUTH_TOKEN;
  
  if (!authToken) {
    return next(); // No auth required
  }
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer token
  
  if (!token || token !== authToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    ok: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.version
  });
});

// Protected API routes
app.use('/api', authenticateToken);

// Import collectors
const collectHostInfo = require('./collectors/host');
const collectMemoryInfo = require('./collectors/memory');
const collectCpuInfo = require('./collectors/cpu');
const collectDiskInfo = require('./collectors/disk');
const collectNetworkInfo = require('./collectors/network');
const collectAndroidInfo = require('./collectors/android');

// Comprehensive metrics endpoint
app.get('/api/metrics', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Collect all metrics in parallel with error handling
    const [host, memory, cpu, disk, network, android] = await Promise.allSettled([
      Promise.resolve(collectHostInfo()),
      Promise.resolve(collectMemoryInfo()),
      collectCpuInfo(),
      collectDiskInfo(),
      collectNetworkInfo(),
      collectAndroidInfo()
    ]);
    
    const collectTime = Date.now() - startTime;
    const warnings = [];
    
    // Build response with error handling
    const metrics = {
      timestamp: new Date().toISOString(),
      collectionTimeMs: collectTime,
      host: host.status === 'fulfilled' ? host.value : {
        error: 'Failed to collect host info',
        message: host.reason?.message || 'Unknown error'
      },
      memory: memory.status === 'fulfilled' ? memory.value : {
        error: 'Failed to collect memory info', 
        message: memory.reason?.message || 'Unknown error'
      },
      cpu: cpu.status === 'fulfilled' ? cpu.value : {
        error: 'Failed to collect CPU info',
        message: cpu.reason?.message || 'Unknown error'
      },
      disk: disk.status === 'fulfilled' ? disk.value : {
        error: 'Failed to collect disk info',
        message: disk.reason?.message || 'Unknown error'
      },
      network: network.status === 'fulfilled' ? network.value : {
        error: 'Failed to collect network info',
        message: network.reason?.message || 'Unknown error'
      },
      android: android.status === 'fulfilled' ? android.value : {
        error: 'Failed to collect Android info',
        message: android.reason?.message || 'Unknown error'
      }
    };
    
    // Check for errors and add warnings
    Object.keys(metrics).forEach(key => {
      if (key !== 'timestamp' && key !== 'collectionTimeMs' && metrics[key]?.error) {
        warnings.push(`${key}: ${metrics[key].error}`);
      }
    });
    
    // Add metadata
    metrics.meta = {
      server: {
        platform: process.platform,
        nodeVersion: process.version,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        pid: process.pid
      },
      warnings: warnings.length > 0 ? warnings : undefined,
      status: warnings.length === 0 ? 'ok' : 'partial'
    };
    
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch metrics',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const webBuildPath = path.join(__dirname, '../../web/dist');
  app.use(express.static(webBuildPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(webBuildPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
  console.log(`📈 Metrics API: http://${HOST}:${PORT}/api/metrics`);
  console.log(`🔒 Auth: ${process.env.AUTH_TOKEN ? 'Enabled' : 'Disabled'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});