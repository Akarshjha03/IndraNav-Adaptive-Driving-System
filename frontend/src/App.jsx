/**
 * App.jsx - Main IndraNav Application Component
 */

import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import {
  Car,
  BarChart3,
  Settings,
  Info,
  Play,
  Square,
  RotateCcw,
  Gauge,
  MapPin,
  AlertTriangle,
  Wifi,
  WifiOff,
  Activity,
  Download,
  FileText,
  FileSpreadsheet,
  Award,
  Clock,
  Target,
  TrendingUp,
  Users,
  Calendar,
  RefreshCw
} from 'lucide-react';

// Chart.js imports
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
import { Doughnut, Bar, Line, Pie } from 'react-chartjs-2';

// Leaflet imports
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

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

// Session Analytics Component
const SessionAnalytics = ({ sessionData, sessionHistory }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('current'); // 'current' | 'week' | 'month'
  
  // Generate mock analytics data based on session
  const generateAnalyticsData = (session) => {
    if (!session) return null;
    
    const duration = session.endTime ? 
      new Date(session.endTime) - new Date(session.startTime) : 
      Date.now() - new Date(session.startTime);
    
    const durationMinutes = Math.round(duration / (1000 * 60));
    
    return {
      session: {
        ...session,
        duration: durationMinutes,
        status: session.endTime ? 'completed' : 'active'
      },
      telemetry: {
        avgSpeed: 65 + Math.random() * 20,
        maxSpeed: 85 + Math.random() * 35,
        minSpeed: 15 + Math.random() * 25,
        dataPoints: Math.floor(durationMinutes * 60), // 1 per second
        avgObstacleDistance: 45 + Math.random() * 30,
        minObstacleDistance: 8 + Math.random() * 12
      },
      alerts: {
        totalAlerts: Math.floor(Math.random() * 8) + 2,
        criticalAlerts: Math.floor(Math.random() * 3),
        alertsByType: {
          speed_warning: Math.floor(Math.random() * 4) + 1,
          collision_warning: Math.floor(Math.random() * 3) + 1,
          emergency_brake: Math.floor(Math.random() * 2)
        }
      },
      driverPerformance: {
        avgReactionTimeSeconds: (1.2 + Math.random() * 1.8).toFixed(1),
        totalResponses: Math.floor(Math.random() * 6) + 3,
        appropriatenessRate: 75 + Math.random() * 20
      },
      insights: {
        safetyScore: Math.floor(70 + Math.random() * 25),
        recommendations: [
          "Maintain consistent speed to improve fuel efficiency",
          "Increase following distance in high-traffic areas",
          "Practice smoother braking to reduce alert frequency"
        ]
      }
    };
  };
  
  const analyticsData = generateAnalyticsData(sessionData);
  
  // Export functions
  const exportToPDF = async () => {
    setIsExporting(true);
    setExportType('pdf');
    
    try {
      // Simulate PDF generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const fileName = `indranav-analytics-${analyticsData?.session?.sessionId || 'session'}-${new Date().toISOString().split('T')[0]}.pdf`;
      
      toast.success(`PDF report generated: ${fileName}`);
      
      // In a real implementation, this would use jsPDF to generate the actual PDF
      console.log('PDF would be generated with data:', analyticsData);
      
    } catch (error) {
      toast.error('Failed to generate PDF report');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };
  
  const exportToCSV = async () => {
    setIsExporting(true);
    setExportType('csv');
    
    try {
      // Simulate CSV generation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const csvData = [
        ['Metric', 'Value', 'Unit'],
        ['Session ID', analyticsData?.session?.sessionId || 'N/A', ''],
        ['Duration', analyticsData?.session?.duration || 0, 'minutes'],
        ['Average Speed', analyticsData?.telemetry?.avgSpeed?.toFixed(1) || 'N/A', 'km/h'],
        ['Maximum Speed', analyticsData?.telemetry?.maxSpeed?.toFixed(1) || 'N/A', 'km/h'],
        ['Total Alerts', analyticsData?.alerts?.totalAlerts || 0, 'count'],
        ['Safety Score', analyticsData?.insights?.safetyScore || 0, 'points'],
        ['Reaction Time', analyticsData?.driverPerformance?.avgReactionTimeSeconds || 'N/A', 'seconds']
      ];
      
      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const fileName = `indranav-data-${analyticsData?.session?.sessionId || 'session'}-${new Date().toISOString().split('T')[0]}.csv`;
      
      // In a real implementation, this would trigger an actual file download
      console.log('CSV Content:', csvContent);
      
      toast.success(`CSV exported: ${fileName}`);
      
    } catch (error) {
      toast.error('Failed to export CSV data');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };
  
  // Chart configurations
  const getSpeedAnalysisChart = () => {
    if (!analyticsData) return null;
    
    return {
      data: {
        labels: ['Min Speed', 'Avg Speed', 'Max Speed'],
        datasets: [{
          label: 'Speed Analysis (km/h)',
          data: [
            analyticsData.telemetry.minSpeed,
            analyticsData.telemetry.avgSpeed,
            analyticsData.telemetry.maxSpeed
          ],
          backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(239, 68, 68, 0.8)'],
          borderColor: ['rgb(34, 197, 94)', 'rgb(59, 130, 246)', 'rgb(239, 68, 68)'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: 'Speed Analysis' },
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Speed (km/h)' } }
        }
      }
    };
  };
  
  const getSafetyScoreChart = () => {
    const safetyScore = analyticsData?.insights?.safetyScore || 0;
    
    return {
      data: {
        datasets: [{
          data: [safetyScore, 100 - safetyScore],
          backgroundColor: [
            safetyScore >= 80 ? '#10b981' : safetyScore >= 60 ? '#f59e0b' : '#ef4444',
            '#e5e7eb'
          ],
          borderWidth: 0,
          cutout: '80%'
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { enabled: false } }
      }
    };
  };
  
  const getAlertDistributionChart = () => {
    if (!analyticsData?.alerts?.alertsByType) return null;
    
    const alertsByType = analyticsData.alerts.alertsByType;
    const alertTypes = Object.keys(alertsByType);
    const alertCounts = Object.values(alertsByType);
    
    return {
      data: {
        labels: alertTypes.map(type => type.replace('_', ' ').toUpperCase()),
        datasets: [{
          data: alertCounts,
          backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: 'Alert Distribution' },
          legend: { position: 'bottom' }
        }
      }
    };
  };
  
  const getPerformanceGrade = (score) => {
    if (score >= 90) return { grade: 'A+', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 80) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 70) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 60) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (score >= 50) return { grade: 'D', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { grade: 'F', color: 'text-red-600', bg: 'bg-red-100' };
  };
  
  if (!sessionData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2 text-gray-600">No Session Data</h3>
        <p className="text-gray-500">Complete a session to view detailed analytics</p>
        
        {sessionHistory && sessionHistory.length > 0 && (
          <div className="mt-6">
            <h4 className="text-lg font-semibold text-gray-700 mb-3">Recent Sessions</h4>
            <div className="space-y-2">
              {sessionHistory.slice(0, 3).map((session, index) => (
                <div key={session.sessionId} className="bg-gray-50 p-3 rounded-lg text-left">
                  <div className="font-mono text-sm text-blue-600">{session.sessionId}</div>
                  <div className="text-sm text-gray-600">
                    {session.weather} • {session.roadType} • 
                    {session.endTime ? ' Completed' : ' Active'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  const speedChart = getSpeedAnalysisChart();
  const safetyChart = getSafetyScoreChart();
  const alertChart = getAlertDistributionChart();
  const performanceGrade = getPerformanceGrade(analyticsData.insights.safetyScore);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2 text-blue-600" />
              Session Analytics
            </h2>
            <p className="text-gray-600 mt-1">
              Comprehensive analysis for session {analyticsData.session.sessionId}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={exportToPDF}
              disabled={isExporting}
              className="flex items-center px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isExporting && exportType === 'pdf' ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Export PDF
            </button>
            
            <button
              onClick={exportToCSV}
              disabled={isExporting}
              className="flex items-center px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isExporting && exportType === 'csv' ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 mr-2" />
              )}
              Export CSV
            </button>
          </div>
        </div>
      </div>
      
      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Safety Score */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Safety Score</h3>
            <Award className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-center">
            <div className="relative w-24 h-24 mx-auto mb-2">
              {safetyChart && <Doughnut data={safetyChart.data} options={safetyChart.options} />}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold">{analyticsData.insights.safetyScore}</span>
              </div>
            </div>
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${performanceGrade.bg} ${performanceGrade.color}`}>
              Grade {performanceGrade.grade}
            </div>
          </div>
        </div>
        
        {/* Average Speed */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Average Speed</h3>
            <Gauge className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {analyticsData.telemetry.avgSpeed.toFixed(1)}
            <span className="text-sm font-normal text-gray-500 ml-1">km/h</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Max: {analyticsData.telemetry.maxSpeed.toFixed(1)} km/h
          </p>
        </div>
        
        {/* Total Alerts */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Total Alerts</h3>
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {analyticsData.alerts.totalAlerts}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {analyticsData.alerts.criticalAlerts} critical
          </p>
        </div>
        
        {/* Reaction Time */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Avg Reaction</h3>
            <Clock className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {analyticsData.driverPerformance.avgReactionTimeSeconds}
            <span className="text-sm font-normal text-gray-500 ml-1">sec</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {analyticsData.driverPerformance.appropriatenessRate.toFixed(1)}% appropriate
          </p>
        </div>
      </div>
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Speed Analysis Chart */}
        {speedChart && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Speed Analysis</h3>
            <div className="h-64">
              <Bar data={speedChart.data} options={speedChart.options} />
            </div>
          </div>
        )}
        
        {/* Alert Distribution Chart */}
        {alertChart && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Alert Distribution</h3>
            <div className="h-64">
              <Pie data={alertChart.data} options={alertChart.options} />
            </div>
          </div>
        )}
      </div>
      
      {/* Detailed Session Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Session Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Session Information</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Duration:</span>
                <span className="ml-2 font-medium">{analyticsData.session.duration} minutes</span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span className="ml-2 font-medium capitalize">{analyticsData.session.status}</span>
              </div>
              <div>
                <span className="text-gray-600">Weather:</span>
                <span className="ml-2 font-medium capitalize">{analyticsData.session.weather}</span>
              </div>
              <div>
                <span className="text-gray-600">Road Type:</span>
                <span className="ml-2 font-medium capitalize">{analyticsData.session.roadType}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Performance Metrics</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Data Points:</span>
                <span className="ml-2 font-medium">{analyticsData.telemetry.dataPoints}</span>
              </div>
              <div>
                <span className="text-gray-600">Min Distance:</span>
                <span className="ml-2 font-medium">{analyticsData.telemetry.minObstacleDistance.toFixed(1)}m</span>
              </div>
              <div>
                <span className="text-gray-600">Avg Distance:</span>
                <span className="ml-2 font-medium">{analyticsData.telemetry.avgObstacleDistance.toFixed(1)}m</span>
              </div>
              <div>
                <span className="text-gray-600">Total Responses:</span>
                <span className="ml-2 font-medium">{analyticsData.driverPerformance.totalResponses}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
            <div className="space-y-1">
              {analyticsData.insights.recommendations.map((rec, index) => (
                <div key={index} className="text-sm text-gray-600 flex items-start">
                  <TrendingUp className="w-3 h-3 mt-1 mr-2 text-blue-500 flex-shrink-0" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Performance Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Target className="w-5 h-5 mr-2 text-blue-600" />
          Performance Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {analyticsData.insights.safetyScore}%
            </div>
            <div className="text-sm text-gray-600">Overall Safety Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {(analyticsData.alerts.totalAlerts / analyticsData.session.duration * 60).toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">Alerts per Hour</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {analyticsData.driverPerformance.appropriatenessRate.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600">Response Quality</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Live Dashboard Component
const TelemetryDashboard = ({ sessionId, isSessionActive }) => {
  // Simulated telemetry data
  const [telemetryData, setTelemetryData] = useState({
    speed: 0,
    gps: { lat: 40.7128, lng: -74.0060 }, // NYC coordinates
    obstacleDistance: 100,
    timestamp: new Date()
  });
  
  const [alerts, setAlerts] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  
  // Simulate real-time data updates
  useEffect(() => {
    if (!isSessionActive) return;
    
    const interval = setInterval(() => {
      // Simulate realistic driving data
      const newSpeed = Math.max(0, Math.min(120, 
        telemetryData.speed + (Math.random() - 0.5) * 10
      ));
      
      const newDistance = Math.max(5, Math.min(200,
        telemetryData.obstacleDistance + (Math.random() - 0.5) * 20
      ));
      
      // Simulate GPS movement (very small changes)
      const newGps = {
        lat: telemetryData.gps.lat + (Math.random() - 0.5) * 0.001,
        lng: telemetryData.gps.lng + (Math.random() - 0.5) * 0.001
      };
      
      setTelemetryData({
        speed: newSpeed,
        gps: newGps,
        obstacleDistance: newDistance,
        timestamp: new Date()
      });
      
      // Generate alerts based on conditions
      if (newSpeed > 100) {
        addAlert('speed_warning', 'Speed limit exceeded!', 'high');
      }
      if (newDistance < 20) {
        addAlert('collision_warning', 'Obstacle detected nearby!', 'critical');
      }
      
    }, 1000); // Update every second
    
    return () => clearInterval(interval);
  }, [isSessionActive, telemetryData]);
  
  const addAlert = (type, message, severity) => {
    const newAlert = {
      id: Date.now(),
      type,
      message,
      severity,
      timestamp: new Date(),
      acknowledged: false
    };
    
    setAlerts(prev => [newAlert, ...prev.slice(0, 4)]); // Keep max 5 alerts
    
    // Show toast notification
    if (severity === 'critical') {
      toast.error(message);
    } else if (severity === 'high') {
      toast.error(message, { duration: 4000 });
    } else {
      toast(message, { duration: 3000 });
    }
  };
  
  const acknowledgeAlert = (alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };
  
  // Speedometer configuration
  const speedometerData = {
    datasets: [{
      data: [telemetryData.speed, 200 - telemetryData.speed],
      backgroundColor: [
        telemetryData.speed > 100 ? '#ef4444' : 
        telemetryData.speed > 70 ? '#f59e0b' : '#10b981',
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
  
  if (!isSessionActive) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2 text-gray-600">Dashboard Inactive</h3>
        <p className="text-gray-500">Start a session to view live telemetry data</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Activity className="w-6 h-6 mr-2 text-blue-600" />
            Live Telemetry Dashboard
          </h2>
          <div className="flex items-center space-x-2">
            <Wifi className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-green-600">Connected</span>
          </div>
        </div>
      </div>
      
      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-lg p-4 border-l-4 ${
                alert.severity === 'critical' ? 'bg-red-50 border-red-500' :
                alert.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                'bg-yellow-50 border-yellow-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertTriangle className={`w-5 h-5 mr-3 ${
                    alert.severity === 'critical' ? 'text-red-500' :
                    alert.severity === 'high' ? 'text-orange-500' : 'text-yellow-500'
                  }`} />
                  <div>
                    <div className="font-semibold text-gray-800">{alert.type.replace('_', ' ').toUpperCase()}</div>
                    <div className="text-sm text-gray-600">{alert.message}</div>
                  </div>
                </div>
                <button
                  onClick={() => acknowledgeAlert(alert.id)}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium transition-colors"
                >
                  Acknowledge
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Main Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Speedometer */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <Gauge className="w-5 h-5 mr-2 text-blue-600" />
              Speed
            </h3>
            <div className="text-sm text-gray-600">
              {telemetryData.timestamp.toLocaleTimeString()}
            </div>
          </div>
          
          <div className="relative h-40">
            <Doughnut data={speedometerData} options={speedometerOptions} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-800">
                  {Math.round(telemetryData.speed)}
                </div>
                <div className="text-sm text-gray-600">km/h</div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              telemetryData.speed > 100 ? 'bg-red-100 text-red-800' :
              telemetryData.speed > 70 ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {telemetryData.speed > 100 ? 'Speeding' :
               telemetryData.speed > 70 ? 'Fast' : 'Normal'}
            </div>
          </div>
        </div>
        
        {/* Obstacle Distance */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Obstacle Detection</h3>
          
          <div className="text-center">
            <div className={`text-4xl font-bold mb-2 ${
              telemetryData.obstacleDistance < 20 ? 'text-red-500' :
              telemetryData.obstacleDistance < 50 ? 'text-yellow-500' :
              'text-green-500'
            }`}>
              {Math.round(telemetryData.obstacleDistance)}
            </div>
            <div className="text-sm text-gray-600">meters</div>
          </div>
          
          {/* Distance Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  telemetryData.obstacleDistance < 20 ? 'bg-red-500' :
                  telemetryData.obstacleDistance < 50 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{
                  width: `${Math.min((telemetryData.obstacleDistance / 200) * 100, 100)}%`
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Danger</span>
              <span>Safe</span>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              telemetryData.obstacleDistance < 20 ? 'bg-red-100 text-red-800' :
              telemetryData.obstacleDistance < 50 ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {telemetryData.obstacleDistance < 20 ? 'Critical' :
               telemetryData.obstacleDistance < 50 ? 'Warning' : 'Safe'}
            </div>
          </div>
        </div>
        
        {/* GPS Position */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-blue-600" />
            GPS Position
          </h3>
          
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Latitude:</span>
              <span className="ml-2 font-mono">{telemetryData.gps.lat.toFixed(6)}</span>
            </div>
            <div>
              <span className="text-gray-600">Longitude:</span>
              <span className="ml-2 font-mono">{telemetryData.gps.lng.toFixed(6)}</span>
            </div>
            <div>
              <span className="text-gray-600">Updated:</span>
              <span className="ml-2">{telemetryData.timestamp.toLocaleTimeString()}</span>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm">
              <div className="font-medium">Location Status</div>
              <div>GPS Signal: Strong</div>
              <div>Accuracy: ±3 meters</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Interactive Map */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Vehicle Location</h3>
        
        <div className="h-96 rounded-lg overflow-hidden">
          <MapContainer
            center={[telemetryData.gps.lat, telemetryData.gps.lng]}
            zoom={15}
            className="w-full h-full"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Marker position={[telemetryData.gps.lat, telemetryData.gps.lng]}>
              <Popup>
                <div className="text-center">
                  <div className="font-semibold">Vehicle Position</div>
                  <div className="text-sm text-gray-600">
                    Speed: {Math.round(telemetryData.speed)} km/h
                  </div>
                  <div className="text-sm text-gray-600">
                    Distance: {Math.round(telemetryData.obstacleDistance)}m
                  </div>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

// Simple Controls component placeholder
const SimpleControls = ({ onSessionStart, onSessionEnd, onSessionReset, isSessionActive, sessionId }) => {
  const [weather, setWeather] = useState('sunny');
  const [roadType, setRoadType] = useState('highway');
  
  const handleStart = () => {
    const sessionData = {
      sessionId: `session_${Date.now()}`,
      weather,
      roadType,
      startTime: new Date()
    };
    onSessionStart(sessionData);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center">
        <Settings className="w-6 h-6 mr-2 text-blue-600" />
        Session Controls
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Weather</label>
          <select 
            value={weather} 
            onChange={(e) => setWeather(e.target.value)}
            disabled={isSessionActive}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="sunny">☀️ Sunny</option>
            <option value="rainy">🌧️ Rainy</option>
            <option value="cloudy">☁️ Cloudy</option>
            <option value="foggy">🌫️ Foggy</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Road Type</label>
          <select 
            value={roadType} 
            onChange={(e) => setRoadType(e.target.value)}
            disabled={isSessionActive}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="highway">🛣️ Highway</option>
            <option value="city">🏙️ City</option>
            <option value="suburban">🏘️ Suburban</option>
            <option value="rural">🌾 Rural</option>
          </select>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleStart}
          disabled={isSessionActive}
          className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
            isSessionActive
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
          }`}
        >
          <Play className="w-5 h-5 mr-2" />
          Start Session
        </button>
        
        <button
          onClick={() => onSessionEnd({ sessionId, endTime: new Date() })}
          disabled={!isSessionActive}
          className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
            !isSessionActive
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg'
          }`}
        >
          <Square className="w-5 h-5 mr-2" />
          Stop Session
        </button>
        
        <button
          onClick={onSessionReset}
          disabled={isSessionActive}
          className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
            isSessionActive
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
          }`}
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          Reset
        </button>
      </div>
      
      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
        <div className="font-medium text-blue-800 mb-1">💡 How to use:</div>
        <ul className="space-y-1 ml-4 list-disc text-blue-700">
          <li>Configure weather and road conditions</li>
          <li>Click "Start Session" to begin simulation</li>
          <li>Use "Stop Session" to end and save data</li>
          <li>Click "Reset" to clear and start over</li>
        </ul>
      </div>
    </div>
  );
};

const App = () => {
  const [activeTab, setActiveTab] = useState('controls');
  
  // Session state for Controls component
  const [currentSession, setCurrentSession] = useState(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionHistory, setSessionHistory] = useState([]);
  
  // Backend URL configuration
  const backendUrl = 'http://localhost:5000';
  
  // Session management handlers
  const handleSessionStart = (sessionData) => {
    console.log('🚀 Session started:', sessionData);
    setCurrentSession(sessionData);
    setIsSessionActive(true);
    // Auto-switch to dashboard
    setActiveTab('dashboard');
  };
  
  const handleSessionEnd = (sessionData) => {
    console.log('🏁 Session ended:', sessionData);
    setIsSessionActive(false);
    if (sessionData) {
      const endedSession = { ...currentSession, ...sessionData };
      setCurrentSession(endedSession);
      
      // Add to session history
      setSessionHistory(prev => {
        const updated = [endedSession, ...prev];
        return updated.slice(0, 10); // Keep last 10 sessions
      });
      
      // Auto-switch to analytics
      setActiveTab('analytics');
    }
  };
  
  const handleSessionReset = () => {
    console.log('🔄 Session reset');
    setCurrentSession(null);
    setIsSessionActive(false);
    setActiveTab('controls');
  };
  
  // Render the active component
  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'controls':
        return (
          <SimpleControls
            sessionId={currentSession?.sessionId}
            isSessionActive={isSessionActive}
            onSessionStart={handleSessionStart}
            onSessionEnd={handleSessionEnd}
            onSessionReset={handleSessionReset}
            backendUrl={backendUrl}
          />
        );
        
      case 'dashboard':
        return (
          <TelemetryDashboard
            sessionId={currentSession?.sessionId}
            isSessionActive={isSessionActive}
          />
        );
        
      case 'analytics':
        return (
          <SessionAnalytics
            sessionData={currentSession}
            sessionHistory={sessionHistory}
          />
        );
        
      default:
        return (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Info className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Welcome to IndraNav</h3>
            <p className="text-gray-600">Select a tab to get started.</p>
          </div>
        );
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notifications */}
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">IndraNav</h1>
                <p className="text-xs text-gray-500">Adaptive Driving System</p>
              </div>
            </div>
            
            {/* Session Status */}
            {currentSession && (
              <div className="text-sm">
                <span className="text-gray-600">Session:</span>
                <span className="ml-2 font-mono text-blue-600">{currentSession.sessionId}</span>
                <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${
                  isSessionActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {isSessionActive ? 'Active' : 'Completed'}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8 text-center">
          <div className="inline-flex space-x-4">
            <button 
              onClick={() => setActiveTab('controls')}
              className={`px-6 py-3 rounded-lg transition-colors ${
                activeTab === 'controls' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Session Controls
            </button>
            <button 
              onClick={() => setActiveTab('dashboard')}
              disabled={!isSessionActive}
              className={`px-6 py-3 rounded-lg transition-colors ${
                activeTab === 'dashboard' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : isSessionActive
                  ? 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Car className="w-4 h-4 inline mr-2" />
              Live Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              disabled={!currentSession}
              className={`px-6 py-3 rounded-lg transition-colors ${
                activeTab === 'analytics' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : currentSession
                  ? 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Analytics
            </button>
          </div>
        </div>
        
        {/* Component Content */}
        <div className="space-y-6">
          {renderActiveComponent()}
        </div>
        
        {/* Development Status */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <div className="text-sm text-green-800">
              <strong>Status:</strong> Full IndraNav System Active! 
              {isSessionActive && <span className="ml-2">• Live Data Streaming</span>}
              {currentSession && !isSessionActive && <span className="ml-2">• Analytics Available</span>}
              {sessionHistory.length > 0 && <span className="ml-2">• {sessionHistory.length} Sessions in History</span>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
