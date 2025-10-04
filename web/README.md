# Tablet Resource Manager - Web Dashboard

Modern React dashboard for monitoring system resources with real-time updates and responsive design.

## 🚀 Features

- **Real-time Monitoring**: Auto-refreshing metrics with configurable intervals
- **Responsive Design**: Works on desktop, tablet, and mobile devices  
- **Modern UI**: Clean interface built with Tailwind CSS
- **Status Indicators**: Color-coded progress bars and status indicators
- **Error Handling**: Graceful error states and retry mechanisms
- **Performance**: Optimized polling and minimal re-renders

## 📋 Prerequisites

- **Node.js**: Version 14+ (tested with Node 14.16.1)
- **Server**: The backend API server must be running

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
# API Configuration
# For development (using proxy)
VITE_API_BASE=

# For production or remote access
# VITE_API_BASE=http://192.168.1.100:3001

# Polling interval in milliseconds
VITE_POLL_INTERVAL=5000

# Enable debug mode
VITE_DEBUG=false
```

## 🚀 Usage

### Development
```bash
npm run dev     # Start dev server on http://localhost:5173
```

### Production Build
```bash
npm run build   # Build for production
npm run preview # Preview production build
```

## 🏗️ Architecture

```
src/
├── main.jsx           # React entry point
├── App.jsx            # Main dashboard component
├── index.css          # Global styles and Tailwind
└── components/        # (Future: Component library)
```

### Key Components

- **App**: Main dashboard with metrics grid and polling logic
- **useMetrics**: Custom hook for API polling and state management
- **MetricCard**: Reusable card component for displaying metrics
- **ProgressBar**: Visual progress indicator with color coding
- **Individual Cards**: CPU, Memory, Disk, System, Network, Android cards

## 📊 Dashboard Layout

The dashboard displays metrics in a responsive grid:

```
┌─────────────┬─────────────┬─────────────┐
│   CPU       │   Memory    │   Storage   │
│   Usage     │   Usage     │   Usage     │
├─────────────┼─────────────┼─────────────┤
│   System    │   Network   │   Android   │
│   Info      │   Traffic   │   Battery   │
└─────────────┴─────────────┴─────────────┘
```

### Metric Cards

Each card displays:
- **Primary Metric**: Large value with unit
- **Progress Bar**: Visual representation (where applicable)
- **Details**: Additional related information
- **Status Colors**: Green (good), yellow (warning), red (danger)

## 🎨 Styling

Built with Tailwind CSS utility classes:

- **Colors**: Primary blue theme with status colors
- **Typography**: System font stack for cross-platform consistency
- **Responsive**: Mobile-first responsive breakpoints
- **Components**: Custom utility classes for cards and metrics

### Custom CSS Classes

```css
.card                # Base card styling
.metric-value        # Large metric display
.metric-label        # Small uppercase labels
.status-good         # Green status color
.status-warning      # Yellow status color  
.status-danger       # Red status color
.progress-bar        # Progress bar container
.progress-bar-fill   # Progress bar fill
```

## 📡 API Integration

The dashboard communicates with the backend via REST API:

### Development Mode
- Uses Vite proxy to forward `/api/*` to `http://localhost:3001`
- No CORS issues during development

### Production Mode
- Direct API calls to configured `VITE_API_BASE`
- Requires backend to have CORS enabled for remote access

### Polling Strategy
- Configurable interval (default: 5000ms)
- Automatic retry on errors
- Graceful degradation when server is unavailable

## 🔧 Customization

### Polling Interval
Adjust the refresh rate based on your needs:

```javascript
// In .env
VITE_POLL_INTERVAL=2000  # 2 seconds (higher CPU usage)
VITE_POLL_INTERVAL=10000 # 10 seconds (lower CPU usage)
```

### Status Thresholds
Modify warning/danger thresholds in `App.jsx`:

```javascript
function getStatusColor(value, warningThreshold = 70, dangerThreshold = 90) {
  // Customize these values
}
```

### UI Theme
Update colors in `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        // Customize primary colors
      }
    }
  }
}
```

## 🎯 Performance

### Optimization Techniques
- **React.memo**: Prevent unnecessary re-renders
- **Efficient Polling**: Only updates changed data  
- **Progressive Loading**: Shows data as it becomes available
- **Error Boundaries**: Isolated error handling per card

### Bundle Size
- **Development**: ~2MB (includes dev tools)
- **Production**: ~200KB gzipped
- **Runtime**: ~10-30MB memory usage

## 📱 Mobile Support

The dashboard is fully responsive:
- **Desktop**: 3-column grid layout
- **Tablet**: 2-column grid layout  
- **Mobile**: Single-column stacked layout
- **Touch-friendly**: Appropriate tap targets and spacing

## 🐛 Troubleshooting

### Common Issues

1. **Dashboard shows \"Connection Error\"**
   - Ensure backend server is running on expected port
   - Check network connectivity between frontend and backend
   - Verify API base URL configuration

2. **Metrics not updating**
   - Check browser console for JavaScript errors
   - Verify polling interval is set correctly
   - Check if backend is responding to requests

3. **Styling issues**
   - Ensure Tailwind CSS is building correctly
   - Check for conflicting CSS rules
   - Verify PostCSS configuration

### Debug Mode

Enable debugging with:
```bash
VITE_DEBUG=true
```

This will log API requests and responses to browser console.

## 🔄 Development

### Hot Reload
Changes to source files automatically reload the browser during development.

### Build Process
1. **Vite**: Fast build tool with esbuild
2. **PostCSS**: Processes Tailwind CSS
3. **React Refresh**: Preserves component state during updates

### Browser Support
- **Modern browsers**: Chrome 61+, Firefox 60+, Safari 12+
- **Mobile browsers**: iOS Safari 12+, Chrome Mobile 61+
- **No IE support**: Uses modern JavaScript features

## 🚀 Deployment

### Static Hosting
After building, the `dist/` folder can be deployed to any static host:
- Vercel, Netlify, GitHub Pages
- AWS S3 + CloudFront
- Traditional web servers (Apache, Nginx)

### Backend Integration
For production, the backend can serve the built frontend:
- Copy `dist/` contents to backend's static folder
- Configure backend to serve `index.html` for SPA routing