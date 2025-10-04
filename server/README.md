# Tablet Resource Manager - Server

Express API server that collects system metrics from the host machine and serves them via REST endpoints.

## 🚀 Features

- **System Metrics**: CPU, memory, disk, network statistics
- **Cross-Platform**: Windows, Linux, macOS support with platform-specific optimizations
- **Android Support**: Battery, thermal, and device info via Termux API
- **Performance**: Cached metrics with configurable TTL to minimize system impact
- **Security**: Optional token-based authentication
- **Error Handling**: Graceful degradation when metrics are unavailable

## 📋 Prerequisites

- **Node.js**: Version 14+ (tested with Node 14.16.1)
- **For Android/Termux**:
  - `pkg install nodejs`
  - `pkg install termux-api` (optional, for battery/thermal data)
  - Termux:API app from F-Droid or Google Play

## 🛠️ Installation

```bash
npm install
```

## ⚙️ Configuration

Copy the environment template:
```bash
cp .env.example .env
```

Available environment variables:

```bash
# Server Configuration
PORT=3001                    # Server port
HOST=0.0.0.0                # Listen interface (0.0.0.0 for all)
NODE_ENV=development         # Environment mode

# Optional Authentication
AUTH_TOKEN=your_secret_here  # Bearer token for API access

# Performance Tuning
METRICS_CACHE_TTL=1000      # Cache TTL in milliseconds

# Android/Termux Configuration
TERMUX_API_AVAILABLE=auto   # auto, true, false
```

## 🚀 Usage

### Development
```bash
npm run dev    # Start with nodemon (auto-reload)
```

### Production
```bash
npm start      # Start normally
```

## 📊 API Endpoints

### GET /health
Health check endpoint.

**Response:**
```json
{
  \"ok\": true,
  \"timestamp\": \"2024-01-01T00:00:00.000Z\",
  \"uptime\": 3600,
  \"version\": \"v14.16.1\"
}
```

### GET /api/metrics
Comprehensive system metrics.

**Headers (if AUTH_TOKEN is set):**
```
Authorization: Bearer your_token_here
```

**Response:** See main README for full response schema.

## 🏗️ Architecture

```
src/
├── index.js              # Main server file
└── collectors/           # Metric collection modules
    ├── host.js          # Host information
    ├── memory.js        # Memory statistics  
    ├── cpu.js           # CPU usage and load
    ├── disk.js          # Disk usage (df command)
    ├── network.js       # Network I/O statistics
    └── android.js       # Android/Termux specific data
```

## 🔧 Collector Details

### CPU Collector (`cpu.js`)
- **Linux**: Reads `/proc/stat` for accurate CPU usage
- **Other platforms**: Uses `os.loadavg()` as approximation
- **Caching**: Previous measurement stored for delta calculation

### Disk Collector (`disk.js`)
- **Windows**: Uses `wmic logicaldisk` command
- **Unix/Linux**: Uses `df -kP` (POSIX format)
- **Caching**: 30-second TTL to avoid frequent disk calls

### Network Collector (`network.js`)
- **Linux**: Parses `/proc/net/dev` for interface statistics
- **Windows**: Uses `netstat -e` (simplified)
- **Caching**: 2-second TTL for network stats

### Android Collector (`android.js`)
- **Battery**: `termux-battery-status` JSON parsing
- **Thermal**: `/sys/class/thermal` zone reading
- **Device Info**: Android system properties via `getprop`
- **Caching**: 5-second TTL for Android data

## 🎯 Performance Notes

- **Metrics Collection**: ~10-50ms depending on platform and available data
- **Memory Usage**: ~20-50MB for Node.js process
- **CPU Impact**: <1% on modern systems
- **Caching Strategy**: Different TTLs for different metric types

## 🔐 Security

When `AUTH_TOKEN` is set:
- All `/api/*` routes require `Authorization: Bearer <token>` header
- `/health` endpoint remains public
- CORS enabled in development mode only

## 🐛 Troubleshooting

### Common Issues

1. **High CPU usage on Windows**
   - Network stats collection can be expensive on Windows
   - Consider increasing `NETWORK_CACHE_TTL` in environment

2. **Android battery data not available**
   - Install `termux-api`: `pkg install termux-api`
   - Install Termux:API app and grant permissions
   - Run `termux-setup-storage` if permission errors

3. **Disk usage shows error**
   - On Linux: Ensure `df` command is available
   - On Windows: Check if `wmic` is accessible

### Debug Mode

Set `NODE_ENV=development` for detailed error logging.

## 📈 Monitoring

The server exposes its own metrics in the response:

```json
{
  \"meta\": {
    \"server\": {
      \"platform\": \"linux\",
      \"nodeVersion\": \"v14.16.1\",
      \"uptime\": 3600,
      \"memoryUsage\": { ... },
      \"pid\": 12345
    },
    \"warnings\": [...],
    \"status\": \"ok\"
  }
}
```

## 🔄 Process Management

For production deployment on Termux:

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start src/index.js --name tablet-monitor

# Auto-restart on boot
pm2 startup
pm2 save
```