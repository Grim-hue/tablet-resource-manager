import React, { useState, useEffect } from 'react'

// Simple hook for polling metrics
function useMetrics(interval = 5000) {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        console.log('[useMetrics] Fetching metrics...')
        const response = await fetch('/api/metrics')
        console.log('[useMetrics] Response status:', response.status)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log('[useMetrics] Data received:', {
          timestamp: data.timestamp,
          cpu: data.cpu?.usage,
          memory: data.memory?.usage
        })
        
        setMetrics(data)
        setError(null)
        setLoading(false)
      } catch (err) {
        console.error('[useMetrics] Failed to fetch metrics:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    // Initial fetch
    fetchMetrics()

    // Set up polling
    const intervalId = setInterval(fetchMetrics, interval)
    
    return () => clearInterval(intervalId)
  }, [interval])

  return { metrics, loading, error }
}

// Utility function to get status color class
function getStatusColor(value, warningThreshold = 70, dangerThreshold = 90) {
  if (value >= dangerThreshold) return 'status-danger'
  if (value >= warningThreshold) return 'status-warning'
  return 'status-good'
}

// Utility function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Progress bar component
function ProgressBar({ value, max = 100, className = '' }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  
  // Get appropriate background color based on percentage
  let bgColor = 'bg-green-500' // Good
  if (percentage >= 90) {
    bgColor = 'bg-red-500' // Danger
  } else if (percentage >= 70) {
    bgColor = 'bg-yellow-500' // Warning
  }
  
  return (
    <div className={`progress-bar ${className}`}>
      <div
        className={`progress-bar-fill ${bgColor}`}
        style={{ 
          width: `${percentage}%`,
          transition: 'width 0.3s ease-in-out'
        }}
      />
    </div>
  )
}

// Metric card component
function MetricCard({ title, value, unit = '', progress, children }) {
  return (
    <div className="card">
      <div className="mb-2">
        <h3 className="metric-label">{title}</h3>
      </div>
      <div className="mb-4">
        <span className="metric-value">
          {value} {unit && <span className="text-lg text-gray-600">{unit}</span>}
        </span>
      </div>
      {progress && (
        <div className="mb-3">
          <ProgressBar value={progress.value} max={progress.max} />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span>
            <span>{progress.max}{progress.unit || ''}</span>
          </div>
        </div>
      )}
      {children}
    </div>
  )
}

// CPU Card Component
function CpuCard({ cpu }) {
  if (!cpu || cpu.error) {
    return (
      <MetricCard title="CPU" value="Error" unit="">
        <p className="text-red-600 text-sm">{cpu?.message || 'Failed to load'}</p>
      </MetricCard>
    )
  }

  // Calculate overall CPU usage from individual cores if main usage is 0
  let displayUsage = cpu.usage || 0
  
  if (displayUsage === 0 && cpu.coreUsage && cpu.coreUsage.length > 0) {
    // Calculate average from individual core usage
    const totalUsage = cpu.coreUsage.reduce((sum, core) => sum + (core.usage || 0), 0)
    displayUsage = totalUsage / cpu.coreUsage.length
  }
  
  // Fallback to load average if still 0
  if (displayUsage === 0 && cpu.loadavg && cpu.loadavg[0]) {
    displayUsage = Math.min(100, cpu.loadavg[0] * 10)
  }

  return (
    <MetricCard 
      title="CPU Usage" 
      value={Math.round(displayUsage * 100) / 100} 
      unit="%"
      progress={{ value: displayUsage, max: 100, unit: '%' }}
    >
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Cores:</span>
          <span>{cpu.cores || 0}</span>
        </div>
        {cpu.speed && (
          <div className="flex justify-between">
            <span className="text-gray-600">Speed:</span>
            <span>{(cpu.speed / 1000).toFixed(1)} GHz</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-600">Load Avg:</span>
          <span>{cpu.loadavg ? cpu.loadavg.slice(0, 2).join(', ') : 'N/A'}</span>
        </div>
        {cpu.coreUsage && cpu.coreUsage.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-gray-500 mb-2">Core Usage:</div>
            <div className="grid grid-cols-4 gap-1 text-xs">
              {cpu.coreUsage.slice(0, 8).map((core, index) => (
                <div key={index} className="flex justify-between bg-gray-50 px-1 py-0.5 rounded">
                  <span>C{core.core}:</span>
                  <span className={core.usage > 80 ? 'text-red-600' : core.usage > 50 ? 'text-yellow-600' : 'text-green-600'}>
                    {Math.round(core.usage)}%
                  </span>
                </div>
              ))}
            </div>
            {cpu.coreUsage.length > 8 && (
              <div className="text-xs text-gray-400 mt-1">...and {cpu.coreUsage.length - 8} more cores</div>
            )}
          </div>
        )}
        {cpu.model && (
          <div className="text-xs text-gray-500 truncate mt-2" title={cpu.model}>
            {cpu.model}
          </div>
        )}
      </div>
    </MetricCard>
  )
}

// Memory Card Component
function MemoryCard({ memory }) {
  if (!memory || memory.error) {
    return (
      <MetricCard title="Memory" value="Error" unit="">
        <p className="text-red-600 text-sm">{memory?.message || 'Failed to load'}</p>
      </MetricCard>
    )
  }

  const usagePercent = parseFloat(memory.usage || 0)
  
  return (
    <MetricCard 
      title="Memory Usage" 
      value={usagePercent} 
      unit="%"
      progress={{ value: usagePercent, max: 100, unit: '%' }}
    >
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Total:</span>
          <span>{memory.totalGB ? `${memory.totalGB} GB` : formatBytes(memory.total || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Used:</span>
          <span>{memory.usedGB ? `${memory.usedGB} GB` : formatBytes(memory.used || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Free:</span>
          <span>{memory.freeGB ? `${memory.freeGB} GB` : formatBytes(memory.free || 0)}</span>
        </div>
      </div>
    </MetricCard>
  )
}

// Disk Card Component
function DiskCard({ disk }) {
  if (!disk || disk.error || !Array.isArray(disk)) {
    return (
      <MetricCard title="Storage" value="Error" unit="">
        <p className="text-red-600 text-sm">{disk?.message || 'Failed to load'}</p>
      </MetricCard>
    )
  }

  // Show primary disk or first available disk
  const primaryDisk = disk.find(d => d.mountpoint === '/' || d.mountpoint === 'C:') || disk[0]
  
  if (!primaryDisk) {
    return (
      <MetricCard title="Storage" value="No Data" unit="">
        <p className="text-gray-500 text-sm">No disk information available</p>
      </MetricCard>
    )
  }

  return (
    <MetricCard 
      title="Storage Usage" 
      value={primaryDisk.usagePercent || 0} 
      unit="%"
      progress={{ value: primaryDisk.usagePercent || 0, max: 100, unit: '%' }}
    >
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Total:</span>
          <span>{primaryDisk.size}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Used:</span>
          <span>{primaryDisk.used}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Available:</span>
          <span>{primaryDisk.available}</span>
        </div>
        <div className="text-xs text-gray-500 truncate">
          {primaryDisk.mountpoint} ({primaryDisk.filesystem})
        </div>
      </div>
    </MetricCard>
  )
}

// System Info Card
function SystemCard({ host }) {
  if (!host || host.error) {
    return (
      <MetricCard title="System" value="Error" unit="">
        <p className="text-red-600 text-sm">{host?.message || 'Failed to load'}</p>
      </MetricCard>
    )
  }

  const uptimeHours = Math.floor((host.uptime || 0) / 3600)
  const uptimeDays = Math.floor(uptimeHours / 24)
  const remainingHours = uptimeHours % 24

  return (
    <MetricCard title="System Info" value={host.hostname || 'Unknown'} unit="">
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Platform:</span>
          <span className="capitalize">{host.platform || 'Unknown'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Architecture:</span>
          <span>{host.arch || 'Unknown'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Uptime:</span>
          <span>
            {uptimeDays > 0 ? `${uptimeDays}d ` : ''}
            {remainingHours}h
          </span>
        </div>
        {host.nodeVersion && (
          <div className="text-xs text-gray-500">
            Node.js {host.nodeVersion}
          </div>
        )}
      </div>
    </MetricCard>
  )
}

// Android Battery Card
function AndroidCard({ android }) {
  if (!android || !android.available) {
    return (
      <MetricCard title="Android Info" value="N/A" unit="">
        <p className="text-gray-500 text-sm">
          {android?.reason || 'Android features not available'}
        </p>
      </MetricCard>
    )
  }

  const battery = android.battery
  if (battery?.error) {
    return (
      <MetricCard title="Android Info" value="Error" unit="">
        <p className="text-red-600 text-sm">{battery.message}</p>
      </MetricCard>
    )
  }

  return (
    <MetricCard 
      title="Battery Status" 
      value={battery?.level || 0} 
      unit="%"
      progress={{ value: battery?.level || 0, max: 100, unit: '%' }}
    >
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Status:</span>
          <span>{battery?.status || 'Unknown'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Health:</span>
          <span>{battery?.health || 'Unknown'}</span>
        </div>
        {battery?.temperatureCelsius && (
          <div className="flex justify-between">
            <span className="text-gray-600">Temperature:</span>
            <span>{battery.temperatureCelsius}°C</span>
          </div>
        )}
        {android.termuxApi && (
          <div className="text-xs text-green-600">
            ✓ Termux API Available
          </div>
        )}
      </div>
    </MetricCard>
  )
}

// Network Card Component
function NetworkCard({ network }) {
  if (!network || network.error) {
    return (
      <MetricCard title="Network" value="Error" unit="">
        <p className="text-red-600 text-sm">{network?.message || 'Failed to load'}</p>
      </MetricCard>
    )
  }

  const interfaces = Object.entries(network).filter(([name, data]) => 
    !name.startsWith('lo') && data.rx && data.tx
  )

  if (interfaces.length === 0) {
    return (
      <MetricCard title="Network" value="No Data" unit="">
        <p className="text-gray-500 text-sm">No active network interfaces</p>
      </MetricCard>
    )
  }

  const [primaryInterface, stats] = interfaces[0]

  return (
    <MetricCard title="Network Traffic" value={primaryInterface} unit="">
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Downloaded:</span>
          <span>{stats.rx?.bytesFormatted || '0 B'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Uploaded:</span>
          <span>{stats.tx?.bytesFormatted || '0 B'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Total:</span>
          <span>{stats.total?.bytesFormatted || '0 B'}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>RX Packets: {stats.rx?.packets || 0}</span>
          <span>TX Packets: {stats.tx?.packets || 0}</span>
        </div>
      </div>
    </MetricCard>
  )
}

// Main App Component
function App() {
  const { metrics, loading, error } = useMetrics(5000) // Poll every 5 seconds

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Loading Dashboard...</h2>
          <p className="text-gray-600">Fetching system metrics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                📱 Tablet Resource Manager
              </h1>
              <p className="text-gray-600">Real-time system monitoring dashboard</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">
                Last updated: {metrics?.timestamp ? new Date(metrics.timestamp).toLocaleTimeString() : 'Never'}
              </div>
              <div className="text-xs text-gray-400">
                Collection: {metrics?.collectionTimeMs}ms | Status: {loading ? '🔄' : error ? '❌' : '✅'}
              </div>
              {error && (
                <div className="text-red-600 text-sm mt-1">
                  ⚠️ {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && !metrics ? (
          <div className="card text-center py-12">
            <div className="text-red-600 text-xl mb-4">⚠️ Connection Error</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-gray-500 text-sm">
              Make sure the server is running on port 3001
            </p>
          </div>
        ) : (
          <>
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <CpuCard cpu={metrics?.cpu} />
              <MemoryCard memory={metrics?.memory} />
              <DiskCard disk={metrics?.disk} />
              <SystemCard host={metrics?.host} />
              <NetworkCard network={metrics?.network} />
              <AndroidCard android={metrics?.android} />
            </div>

            {/* Status Footer */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'}`}></div>
                  <span className="text-sm text-gray-600">
                    System Status: {error ? 'Error' : 'Online'}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  Collection time: {metrics?.collectionTimeMs}ms | 
                  Server: {metrics?.meta?.server?.platform} | 
                  Warnings: {metrics?.meta?.warnings?.length || 0}
                </div>
              </div>
              {metrics?.meta?.warnings && metrics.meta.warnings.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <h4 className="font-medium text-yellow-800 mb-2">Warnings:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {metrics.meta.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default App