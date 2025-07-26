/**
 * TelemetryDashboard.jsx - Real-Time Driving Telemetry Dashboard
 * 
 * Features:
 * - WebSocket connection for real-time telemetry streaming
 * - Live speedometer gauge using Chart.js
 * - Interactive GPS map with Leaflet showing vehicle position
 * - Real-time hazard alert banners with severity-based styling
 * - Connection status monitoring and error handling
 * - Responsive design with Tailwind CSS
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Doughnut, Line } from 'react-chartjs-2';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { toast } from 'react-hot-toast';
import { useDebounce } from 'use-debounce';
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Activity,
  Navigation,
  Gauge,
  MapPin
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Component to update map center when GPS coordinates change
function MapUpdater({ center }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && center.lat && center.lng) {
      map.setView([center.lat, center.lng], map.getZoom());
    }
  }, [center, map]);
  
  return null;
}

const TelemetryDashboard = ({ 
  sessionId, 
  isSessionActive, 
  onSessionEnd,
  backendUrl = 'ws://localhost:5000' 
}) => {
  // ==============================================
  // STATE MANAGEMENT
  // ==============================================
  
  // WebSocket connection state
  const [wsConnection, setWsConnection] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connected', 'connecting', 'disconnected', 'error'
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  // Real-time telemetry data
  const [telemetryData, setTelemetryData] = useState({
    speed: 0,
    gps: { lat: 40.7128, lng: -74.0060 }, // Default to NYC
    obstacleDistance: 100,
    timestamp: new Date()
  });
  
  // Debounced telemetry for smooth animations
  const [debouncedTelemetry] = useDebounce(telemetryData, 100);
  
  // Alert management
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [alertHistory, setAlertHistory] = useState([]);
  
  // Historical data for mini-charts
  const [speedHistory, setSpeedHistory] = useState([]);
  const [distanceHistory, setDistanceHistory] = useState([]);
  const maxHistoryPoints = 20;
  
  // UI state
  const [showMap, setShowMap] = useState(true);
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.0060 });
  
  // ==============================================
  // WEBSOCKET CONNECTION MANAGEMENT
  // ==============================================
  
  /**
   * Initialize WebSocket connection with retry logic
   */
  const initializeWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('⚠️ WebSocket already connected');
      return;
    }
    
    console.log('🔗 Initializing WebSocket connection...');
    setConnectionStatus('connecting');
    
    try {
      // Create WebSocket connection
      const ws = new WebSocket(`${backendUrl}/ws`);
      wsRef.current = ws;
      
      // Connection opened
      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setConnectionStatus('connected');
        setReconnectAttempts(0);
        setWsConnection(ws);
        
        // Subscribe to telemetry if session is active
        if (sessionId && isSessionActive) {
          subscribeTelemetry(ws, sessionId);
        }
        
        toast.success('Connected to real-time telemetry stream');
      };
      
      // Handle incoming messages
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };
      
      // Connection closed
      ws.onclose = (event) => {
        console.log('🔌 WebSocket connection closed:', event.code, event.reason);
        setConnectionStatus('disconnected');
        setWsConnection(null);
        
        // Attempt reconnection if not intentional
        if (event.code !== 1000 && isSessionActive) {
          attemptReconnection();
        }
      };
      
      // Connection error
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('error');
        toast.error('Connection error: Check if backend server is running');
      };
      
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
      toast.error('Failed to connect to telemetry server');
    }
  }, [backendUrl, sessionId, isSessionActive]);
  
  /**
   * Subscribe to telemetry data for the current session
   */
  const subscribeTelemetry = (ws, currentSessionId) => {
    if (ws.readyState === WebSocket.OPEN) {
      console.log(`📡 Subscribing to telemetry for session: ${currentSessionId}`);
      ws.send(JSON.stringify({
        type: 'subscribe_telemetry',
        data: { sessionId: currentSessionId }
      }));
    }
  };
  
  /**
   * Attempt to reconnect with exponential backoff
   */
  const attemptReconnection = useCallback(() => {
    if (reconnectAttempts >= 5) {
      console.log('❌ Max reconnection attempts reached');
      toast.error('Unable to reconnect. Please refresh the page.');
      return;
    }
    
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000); // Max 10 seconds
    console.log(`🔄 Attempting reconnection in ${delay}ms (attempt ${reconnectAttempts + 1})`);
    
    setReconnectAttempts(prev => prev + 1);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      initializeWebSocket();
    }, delay);
  }, [reconnectAttempts, initializeWebSocket]);
  
  // ==============================================
  // WEBSOCKET MESSAGE HANDLING
  // ==============================================
  
  /**
   * Handle incoming WebSocket messages
   */
  const handleWebSocketMessage = (message) => {
    console.log('📨 Received WebSocket message:', message.type);
    
    switch (message.type) {
      case 'connection_established':
        console.log('🎉 Connection established:', message.data.connectionId);
        break;
        
      case 'telemetry_data':
        handleTelemetryData(message.data);
        break;
        
      case 'global_alert':
        handleGlobalAlert(message.data);
        break;
        
      case 'subscription_confirmed':
        console.log('✅ Telemetry subscription confirmed');
        toast.success(`Subscribed to real-time data for session ${message.data.sessionId}`);
        break;
        
      case 'session_stopped':
        console.log('🏁 Session stopped via WebSocket');
        onSessionEnd?.();
        break;
        
      case 'error':
        console.error('❌ WebSocket error message:', message.data);
        toast.error(message.data.message || 'Unknown error occurred');
        break;
        
      default:
        console.log('ℹ️ Unknown message type:', message.type);
    }
  };
  
  /**
   * Process incoming telemetry data and update dashboard
   */
  const handleTelemetryData = (data) => {
    const { telemetry, alert } = data;
    
    if (telemetry) {
      // Update telemetry state
      setTelemetryData({
        speed: telemetry.speed || 0,
        gps: telemetry.gps || { lat: 40.7128, lng: -74.0060 },
        obstacleDistance: telemetry.obstacleDistance || 0,
        timestamp: new Date(telemetry.timestamp)
      });
      
      // Update map center
      if (telemetry.gps) {
        setMapCenter(telemetry.gps);
      }
      
      // Update historical data for mini-charts
      const timestamp = new Date(telemetry.timestamp);
      
      setSpeedHistory(prev => {
        const newHistory = [...prev, { x: timestamp, y: telemetry.speed }];
        return newHistory.slice(-maxHistoryPoints);
      });
      
      setDistanceHistory(prev => {
        const newHistory = [...prev, { x: timestamp, y: telemetry.obstacleDistance }];
        return newHistory.slice(-maxHistoryPoints);
      });
    }
    
    // Handle alerts
    if (alert) {
      handleNewAlert(alert);
    }
  };
  
  /**
   * Process new safety alerts
   */
  const handleNewAlert = (alert) => {
    console.warn(`🚨 New ${alert.severity} alert: ${alert.type}`);
    
    const alertWithId = {
      ...alert,
      id: alert.alertId || `alert_${Date.now()}`,
      timestamp: new Date(alert.timestamp),
      acknowledged: false
    };
    
    // Add to active alerts
    setActiveAlerts(prev => {
      const filtered = prev.filter(a => a.id !== alertWithId.id);
      return [alertWithId, ...filtered].slice(0, 5); // Keep max 5 active alerts
    });
    
    // Add to history
    setAlertHistory(prev => [alertWithId, ...prev].slice(0, 50)); // Keep max 50 in history
    
    // Show toast notification based on severity
    const toastMessage = `${alert.type.replace('_', ' ').toUpperCase()}: ${alert.message}`;
    
    switch (alert.severity) {
      case 'critical':
        toast.error(toastMessage, { duration: 10000 });
        break;
      case 'high':
        toast.error(toastMessage, { duration: 6000 });
        break;
      case 'medium':
        toast((t) => (
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
            <span>{toastMessage}</span>
          </div>
        ), { duration: 4000 });
        break;
      default:
        toast(toastMessage, { duration: 3000 });
    }
  };
  
  /**
   * Handle global alerts from other sessions
   */
  const handleGlobalAlert = (data) => {
    console.log('🌐 Global alert received:', data.alert);
    toast((t) => (
      <div className="flex items-center">
        <AlertCircle className="w-5 h-5 text-blue-500 mr-2" />
        <div>
          <div className="font-medium">Global Alert</div>
          <div className="text-sm text-gray-600">{data.alert.message}</div>
        </div>
      </div>
    ), { duration: 5000 });
  };
  
  /**
   * Acknowledge an alert
   */
  const acknowledgeAlert = (alertId) => {
    setActiveAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true }
          : alert
      )
    );
    
    // Remove acknowledged alert after a delay
    setTimeout(() => {
      setActiveAlerts(prev => prev.filter(alert => alert.id !== alertId));
    }, 2000);
  };
  
  // ==============================================
  // LIFECYCLE EFFECTS
  // ==============================================
  
  // Initialize WebSocket when component mounts or session becomes active
  useEffect(() => {
    if (isSessionActive && sessionId) {
      initializeWebSocket();
    }
    
    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [isSessionActive, sessionId, initializeWebSocket]);
  
  // Subscribe to telemetry when connection is established and session is active
  useEffect(() => {
    if (wsConnection && sessionId && isSessionActive) {
      subscribeTelemetry(wsConnection, sessionId);
    }
  }, [wsConnection, sessionId, isSessionActive]);
  
  // ==============================================
  // CHART CONFIGURATIONS
  // ==============================================
  
  /**
   * Speedometer gauge configuration
   */
  const speedometerData = {
    datasets: [{
      data: [debouncedTelemetry.speed, 200 - debouncedTelemetry.speed], // Max speed 200 km/h
      backgroundColor: [
        debouncedTelemetry.speed > 120 ? '#ef4444' : 
        debouncedTelemetry.speed > 80 ? '#f59e0b' : '#10b981',
        '#e5e7eb'
      ],
      borderWidth: 0,
      cutout: '70%'
    }]
  };
  
  const speedometerOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    },
    rotation: -90,
    circumference: 180
  };
  
  /**
   * Speed history mini-chart configuration
   */
  const speedHistoryData = {
    datasets: [{
      label: 'Speed (km/h)',
      data: speedHistory,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4
    }]
  };
  
  const miniChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    },
    scales: {
      x: { display: false },
      y: { display: false }
    },
    elements: {
      point: { radius: 0 }
    }
  };
  
  // ==============================================
  // RENDER COMPONENT
  // ==============================================
  
  return (
    <div className="w-full space-y-6">
      {/* Header with Connection Status */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Activity className="w-6 h-6 mr-2 text-blue-600" />
            Real-Time Telemetry Dashboard
          </h2>
          
          <div className="flex items-center space-x-4">
            {/* Connection Status Indicator */}
            <div className="flex items-center space-x-2">
              {connectionStatus === 'connected' ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
              <span className={`text-sm font-medium ${
                connectionStatus === 'connected' ? 'text-green-600' : 
                connectionStatus === 'connecting' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
              </span>
            </div>
            
            {/* Session Info */}
            {sessionId && (
              <div className="text-sm text-gray-600">
                Session: <span className="font-mono">{sessionId}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Reconnection Status */}
        {connectionStatus === 'connecting' && reconnectAttempts > 0 && (
          <div className="mt-2 text-sm text-yellow-600">
            Reconnecting... (Attempt {reconnectAttempts}/5)
          </div>
        )}
      </div>
      
      {/* Active Alerts Banner */}
      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          {activeAlerts.slice(0, 3).map((alert) => (
            <div
              key={alert.id}
              className={`rounded-lg p-4 border-l-4 ${
                alert.severity === 'critical' ? 'bg-red-50 border-red-500' :
                alert.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                'bg-blue-50 border-blue-500'
              } ${alert.acknowledged ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertTriangle className={`w-5 h-5 mr-3 ${
                    alert.severity === 'critical' ? 'text-red-500' :
                    alert.severity === 'high' ? 'text-orange-500' :
                    alert.severity === 'medium' ? 'text-yellow-500' :
                    'text-blue-500'
                  }`} />
                  <div>
                    <div className="font-semibold text-gray-800">
                      {alert.type.replace('_', ' ').toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-600">{alert.message}</div>
                  </div>
                </div>
                
                {!alert.acknowledged && (
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium transition-colors"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Speedometer */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <Gauge className="w-5 h-5 mr-2 text-blue-600" />
              Speed
            </h3>
            <div className="text-sm text-gray-600">
              {debouncedTelemetry.timestamp.toLocaleTimeString()}
            </div>
          </div>
          
          <div className="relative h-40">
            <Doughnut data={speedometerData} options={speedometerOptions} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-800">
                  {Math.round(debouncedTelemetry.speed)}
                </div>
                <div className="text-sm text-gray-600">km/h</div>
              </div>
            </div>
          </div>
          
          {/* Speed History Mini Chart */}
          <div className="mt-4 h-16">
            <Line data={speedHistoryData} options={miniChartOptions} />
          </div>
        </div>
        
        {/* Obstacle Distance */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Obstacle Distance</h3>
          
          <div className="text-center">
            <div className={`text-4xl font-bold mb-2 ${
              debouncedTelemetry.obstacleDistance < 20 ? 'text-red-500' :
              debouncedTelemetry.obstacleDistance < 50 ? 'text-yellow-500' :
              'text-green-500'
            }`}>
              {Math.round(debouncedTelemetry.obstacleDistance)}
            </div>
            <div className="text-sm text-gray-600">meters</div>
          </div>
          
          {/* Distance Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  debouncedTelemetry.obstacleDistance < 20 ? 'bg-red-500' :
                  debouncedTelemetry.obstacleDistance < 50 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{
                  width: `${Math.min((debouncedTelemetry.obstacleDistance / 200) * 100, 100)}%`
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0m</span>
              <span>200m</span>
            </div>
          </div>
          
          {/* Distance History Mini Chart */}
          <div className="mt-4 h-16">
            <Line 
              data={{
                datasets: [{
                  label: 'Distance (m)',
                  data: distanceHistory,
                  borderColor: '#ef4444',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderWidth: 2,
                  fill: true,
                  tension: 0.4
                }]
              }} 
              options={miniChartOptions} 
            />
          </div>
        </div>
        
        {/* GPS Position */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-blue-600" />
              GPS Position
            </h3>
            <button
              onClick={() => setShowMap(!showMap)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showMap ? 'Hide Map' : 'Show Map'}
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Lat:</span>{' '}
              <span className="font-mono">{debouncedTelemetry.gps.lat?.toFixed(6) || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600">Lng:</span>{' '}
              <span className="font-mono">{debouncedTelemetry.gps.lng?.toFixed(6) || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Interactive Map */}
      {showMap && debouncedTelemetry.gps.lat && debouncedTelemetry.gps.lng && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Navigation className="w-5 h-5 mr-2 text-blue-600" />
            Vehicle Location
          </h3>
          
          <div className="h-96 rounded-lg overflow-hidden">
            <MapContainer
              center={[mapCenter.lat, mapCenter.lng]}
              zoom={15}
              className="w-full h-full"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Marker position={[debouncedTelemetry.gps.lat, debouncedTelemetry.gps.lng]}>
                <Popup>
                  <div className="text-center">
                    <div className="font-semibold">Vehicle Position</div>
                    <div className="text-sm text-gray-600">
                      Speed: {Math.round(debouncedTelemetry.speed)} km/h
                    </div>
                    <div className="text-sm text-gray-600">
                      Distance: {Math.round(debouncedTelemetry.obstacleDistance)}m
                    </div>
                    <div className="text-xs text-gray-500">
                      {debouncedTelemetry.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </Popup>
              </Marker>
              <MapUpdater center={mapCenter} />
            </MapContainer>
          </div>
        </div>
      )}
      
      {/* Connection Issues Help */}
      {connectionStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <div>
              <div className="font-semibold text-red-800">Connection Issues</div>
              <div className="text-sm text-red-600 mt-1">
                Unable to connect to the telemetry server. Please ensure:
              </div>
              <ul className="text-sm text-red-600 mt-2 ml-4 list-disc">
                <li>Backend server is running on port 5000</li>
                <li>WebSocket endpoint is available at /ws</li>
                <li>No firewall blocking the connection</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TelemetryDashboard;
