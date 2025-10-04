# Tablet Resource Manager

A comprehensive resource monitoring application for Android tablets running Termux, with a modern React dashboard for real-time system metrics visualization.

## 🚀 Features

### Core Metrics
- **CPU Usage**: Real-time percentage with load averages
- **Memory**: Total, used, free RAM with usage percentages
- **System**: Uptime, hostname, OS information
- **Storage**: Disk usage across mounted filesystems
- **Network**: Interface statistics and I/O rates

### Android-Specific (Termux)
- **Battery**: Level, status, temperature, health
- **Thermal**: Temperature sensors and thermal zones
- **Power**: Charging state and power profile

### Dashboard Features
- **Real-time Updates**: Configurable polling intervals
- **Interactive Charts**: CPU and memory trends using MUI Charts
- **Responsive Design**: Tailwind CSS with mobile-first approach
- **Modern UI**: Material Design components with dark/light themes
- **Performance**: Lightweight polling with minimal resource usage

## 🏗️ Architecture

```
tablet-resource-manager/
├── server/          # Node.js + Express API
│   ├── src/
│   │   ├── collectors/  # System metric collectors
│   │   └── index.js     # Express server
│   └── package.json
├── web/             # React + Vite frontend
│   ├── src/
│   │   ├── components/  # Dashboard components
│   │   ├── hooks/       # Custom React hooks
│   │   └── App.jsx      # Main application
│   └── package.json
└── README.md
```

## 📋 Prerequisites

### For Development
- **Node.js**: Version 18+ (LTS recommended)
- **npm**: Comes with Node.js
- **Git**: For version control

### For Android/Termux Deployment
- **Termux**: Android terminal emulator
- **Node.js in Termux**: `pkg install nodejs`
- **Termux-API**: `pkg install termux-api` (for battery/thermal data)
- **Termux:API App**: Install from F-Droid or Google Play

## 🛠️ Setup

### 1. Clone Repository
```bash
git clone https://github.com/Grim-hue/tablet-resource-manager.git
cd tablet-resource-manager
```

### 2. Install Server Dependencies
```bash
cd server
npm install
cp .env.example .env  # Optional: configure AUTH_TOKEN
```

### 3. Install Web Dependencies
```bash
cd ../web
npm install
cp .env.example .env  # Optional: configure API endpoint
```

## 🚀 Development

### Start Backend Server
```bash
cd server
npm run dev  # Starts on http://localhost:3001
```

### Start Frontend Development Server
```bash
cd web
npm run dev  # Starts on http://localhost:5173
```

The frontend automatically proxies API requests to the backend during development.

## 📱 Android/Termux Deployment

### 1. Install Dependencies
```bash
# In Termux
pkg update && pkg upgrade
pkg install nodejs git termux-api
```

### 2. Clone and Setup
```bash
git clone https://github.com/Grim-hue/tablet-resource-manager.git
cd tablet-resource-manager/server
npm install --production
```

### 3. Install PM2 for Process Management
```bash
npm install -g pm2
```

### 4. Configure Environment
```bash
echo 'NODE_ENV=development' > .env
echo 'ENABLE_CORS=true' >> .env
```

### 5. Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
```

### 6. Set Up Auto-Boot (Optional)

**Option A: Termux:Boot App (Recommended)**
1. Install **Termux:Boot** from F-Droid or Google Play Store
2. Grant boot permissions in Android settings
3. Boot script is automatically created at `~/.termux/boot/start-tablet-manager.sh`
4. Server will start automatically on device reboot! 🎯

**Option B: Manual Start After Boot**
```bash
cd ~/tablet-resource-manager/server
./start-server.sh
```

### 7. Access Dashboard
Open browser to `http://[tablet-ip]:3001` from any device on your network.

## 🛠️ Server Management (Termux)

### PM2 Process Management

```bash
# Check server status
pm2 status

# View real-time logs
pm2 logs tablet-resource-manager

# Restart server
pm2 restart tablet-resource-manager

# Stop server
pm2 stop tablet-resource-manager

# Monitor server performance
pm2 monit
```

### Quick Management Scripts

```bash
# Start server (if stopped)
cd ~/tablet-resource-manager/server
./start-server.sh

# Stop server
./stop-server.sh
```

### Server Health Check

```bash
# Test from tablet
curl http://localhost:3001/health

# Test from network
curl http://[tablet-ip]:3001/health
```

## ⚙️ Configuration

### Environment Variables

#### Server (.env)
```bash
PORT=3001                    # Server port
HOST=0.0.0.0                # Listen on all interfaces
NODE_ENV=development         # Environment mode (enables CORS)
ENABLE_CORS=true            # Enable CORS for web dashboard
AUTH_TOKEN=your_secret_here  # Optional API authentication
```

#### Web (.env)
```bash
VITE_API_BASE=http://192.168.1.97:3001   # Backend URL for remote access
VITE_POLL_INTERVAL=5000                  # Metrics polling interval (ms)
```

## 📊 API Endpoints

### GET /api/metrics
Returns comprehensive system metrics:

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "host": {
    "hostname": "tablet",
    "platform": "linux",
    "arch": "arm64",
    "uptime": 86400
  },
  "cpu": {
    "usage": 15.5,
    "loadavg": [0.2, 0.1, 0.05],
    "cores": 8
  },
  "memory": {
    "total": 8589934592,
    "used": 4294967296,
    "free": 4294967296,
    "usage": 50.0
  },
  "disk": [
    {
      "filesystem": "/dev/root",
      "size": "64G",
      "used": "32G",
      "available": "30G",
      "usage": "52%",
      "mountpoint": "/"
    }
  ],
  "network": {
    "wlan0": {
      "rx_bytes": 1024000,
      "tx_bytes": 512000,
      "rx_packets": 1000,
      "tx_packets": 800
    }
  },
  "android": {
    "battery": {
      "level": 85,
      "status": "Charging",
      "health": "Good",
      "temperature": 28.5
    },
    "thermal": {
      "cpu": 45.2,
      "battery": 28.5
    }
  }
}
```

### GET /health
Health check endpoint returning `{ "ok": true }`.

## 🔧 Troubleshooting

### Common Issues

1. **Port already in use**: Change PORT in server/.env
2. **Permission denied on Termux**: Run `termux-setup-storage`
3. **Battery data missing**: Install Termux:API app and grant permissions
4. **High CPU usage**: Increase VITE_POLL_INTERVAL in web/.env
5. **CORS errors**: Ensure `ENABLE_CORS=true` in server/.env
6. **Server not starting on boot**: Check Termux:Boot app permissions

### Auto-Boot Troubleshooting

```bash
# Check if boot script exists
ls ~/.termux/boot/start-tablet-manager.sh

# Check boot script logs
cat ~/tablet-resource-manager/server/logs/boot.log

# Manual boot script test
~/.termux/boot/start-tablet-manager.sh

# Check PM2 saved processes
pm2 list
pm2 resurrect
```

### Server Connection Issues

```bash
# Check if server is running
pm2 status

# Check server logs
pm2 logs tablet-resource-manager --lines 50

# Test local connection
curl http://localhost:3001/health

# Restart server
pm2 restart tablet-resource-manager
```

### Performance Tips

- Use polling intervals ≥2000ms to reduce resource usage
- Enable AUTH_TOKEN for production deployments  
- Server automatically restarts on crashes via PM2
- Monitor memory usage with `pm2 monit`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🎯 Roadmap

- [ ] WebSocket support for real-time updates
- [ ] PWA support for offline usage
- [ ] Historical data storage with SQLite
- [ ] Alert system for threshold breaches
- [ ] Docker containerization
- [ ] Multi-device monitoring
- [ ] Custom dashboard layouts
- [ ] Export metrics to CSV/JSON
