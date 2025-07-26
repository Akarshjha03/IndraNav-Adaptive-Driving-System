/**
 * SessionAnalytics.jsx - Comprehensive Session Analytics Dashboard
 * 
 * Features:
 * - Fetch and display session analytics from REST API
 * - Interactive charts for performance metrics (Chart.js)
 * - Driving behavior analysis and safety insights
 * - Export functionality (PDF reports and CSV data)
 * - Responsive design with detailed breakdowns
 * - Performance recommendations and scoring
 */

import React, { useState, useEffect, useRef } from 'react';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  BarChart3,
  Download,
  FileText,
  FileSpreadsheet,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Clock,
  Gauge,
  Target,
  Award,
  Users,
  Calendar,
  Filter
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const SessionAnalytics = ({ 
  sessionId, 
  backendUrl = 'http://localhost:5000',
  refreshInterval = 30000 // 30 seconds
}) => {
  // ==============================================
  // STATE MANAGEMENT
  // ==============================================
  
  // Analytics data
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  
  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState(null); // 'pdf' | 'csv'
  
  // UI state
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [showAdvancedCharts, setShowAdvancedCharts] = useState(false);
  const [timeRange, setTimeRange] = useState('all'); // 'all' | 'last_hour' | 'recent'
  
  // Chart references for export
  const chartRefs = useRef({});
  const dashboardRef = useRef(null);
  
  // ==============================================
  // DATA FETCHING
  // ==============================================
  
  /**
   * Fetch session analytics from the API
   */
  const fetchAnalytics = async (showLoadingState = true) => {
    if (!sessionId) {
      setError('No session ID provided');
      return;
    }
    
    if (showLoadingState) {
      setIsLoading(true);
    }
    
    try {
      console.log(`📊 Fetching analytics for session: ${sessionId}`);
      
      const response = await axios.get(`${backendUrl}/api/sessions/${sessionId}/analytics`);
      const data = response.data.data;
      
      console.log('✅ Analytics data received:', data);
      
      setAnalyticsData(data);
      setLastUpdated(new Date());
      setError(null);
      
      if (showLoadingState) {
        toast.success('Analytics updated successfully');
      }
      
    } catch (error) {
      console.error('❌ Error fetching analytics:', error);
      
      const errorMessage = error.response?.data?.message || 'Failed to fetch analytics';
      setError(errorMessage);
      
      if (showLoadingState) {
        toast.error(`Error: ${errorMessage}`);
      }
      
    } finally {
      if (showLoadingState) {
        setIsLoading(false);
      }
    }
  };
  
  // ==============================================
  // LIFECYCLE EFFECTS
  // ==============================================
  
  // Initial data fetch
  useEffect(() => {
    if (sessionId) {
      fetchAnalytics();
    }
  }, [sessionId]);
  
  // Auto-refresh analytics data
  useEffect(() => {
    if (!sessionId || !refreshInterval) return;
    
    const interval = setInterval(() => {
      fetchAnalytics(false); // Silent refresh
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [sessionId, refreshInterval]);
  
  // ==============================================
  // EXPORT FUNCTIONALITY
  // ==============================================
  
  /**
   * Export analytics as PDF report
   */
  const exportToPDF = async () => {
    if (!analyticsData) {
      toast.error('No data available for export');
      return;
    }
    
    setIsExporting(true);
    setExportType('pdf');
    
    try {
      console.log('📄 Generating PDF report...');
      
      // Create PDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;
      
      // Header
      pdf.setFontSize(20);
      pdf.setTextColor(40, 40, 40);
      pdf.text('IndraNav Session Analytics Report', 20, yPosition);
      
      yPosition += 15;
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Session: ${analyticsData.session.sessionId}`, 20, yPosition);
      pdf.text(`Generated: ${format(new Date(), 'PPpp')}`, pageWidth - 80, yPosition);
      
      yPosition += 20;
      
      // Session Summary
      pdf.setFontSize(16);
      pdf.setTextColor(40, 40, 40);
      pdf.text('Session Summary', 20, yPosition);
      
      yPosition += 10;
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      
      const sessionInfo = [
        `Duration: ${formatDuration(analyticsData.session.duration)}`,
        `Weather: ${analyticsData.session.weather || 'N/A'}`,
        `Road Type: ${analyticsData.session.roadType || 'N/A'}`,
        `Status: ${analyticsData.session.status || 'N/A'}`,
        `Safety Score: ${analyticsData.insights.safetyScore || 'N/A'}/100`
      ];
      
      sessionInfo.forEach(info => {
        pdf.text(info, 25, yPosition);
        yPosition += 6;
      });
      
      yPosition += 10;
      
      // Performance Metrics
      pdf.setFontSize(16);
      pdf.setTextColor(40, 40, 40);
      pdf.text('Performance Metrics', 20, yPosition);
      
      yPosition += 10;
      pdf.setFontSize(10);
      
      const metrics = [
        `Average Speed: ${analyticsData.telemetry.avgSpeed?.toFixed(1) || 'N/A'} km/h`,
        `Maximum Speed: ${analyticsData.telemetry.maxSpeed?.toFixed(1) || 'N/A'} km/h`,
        `Total Alerts: ${analyticsData.alerts.totalAlerts || 0}`,
        `Critical Alerts: ${analyticsData.alerts.criticalAlerts || 0}`,
        `Average Reaction Time: ${analyticsData.driverPerformance.avgReactionTimeSeconds || 'N/A'}s`,
        `Appropriateness Rate: ${analyticsData.driverPerformance.appropriatenessRate?.toFixed(1) || 'N/A'}%`
      ];
      
      metrics.forEach(metric => {
        pdf.text(metric, 25, yPosition);
        yPosition += 6;
      });
      
      // Capture dashboard as image and add to PDF
      if (dashboardRef.current) {
        try {
          const canvas = await html2canvas(dashboardRef.current, {
            scale: 0.8,
            useCORS: true,
            allowTaint: true
          });
          
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pageWidth - 40;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // Add new page if needed
          if (yPosition + imgHeight > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          
          pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
        } catch (error) {
          console.warn('Could not capture dashboard image:', error);
        }
      }
      
      // Save PDF
      const fileName = `indranav-analytics-${analyticsData.session.sessionId}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdf.save(fileName);
      
      toast.success('PDF report generated successfully');
      
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      toast.error('Failed to generate PDF report');
      
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };
  
  /**
   * Export telemetry data as CSV
   */
  const exportToCSV = async () => {
    if (!analyticsData) {
      toast.error('No data available for export');
      return;
    }
    
    setIsExporting(true);
    setExportType('csv');
    
    try {
      console.log('📊 Generating CSV export...');
      
      // Fetch detailed telemetry data
      const response = await axios.get(`${backendUrl}/api/sessions/${sessionId}/logs`);
      const telemetryLogs = response.data.data.logs;
      
      if (!telemetryLogs || telemetryLogs.length === 0) {
        toast.error('No telemetry data available for export');
        return;
      }
      
      // Create CSV headers
      const headers = [
        'Timestamp',
        'Speed (km/h)',
        'Latitude',
        'Longitude',
        'Obstacle Distance (m)',
        'Session ID'
      ];
      
      // Convert data to CSV format
      const csvContent = [
        headers.join(','),
        ...telemetryLogs.map(log => [
          new Date(log.timestamp).toISOString(),
          log.speed,
          log.gps.lat,
          log.gps.lng,
          log.obstacleDistance,
          log.sessionId
        ].join(','))
      ].join('\n');
      
      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const fileName = `indranav-telemetry-${sessionId}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      
      saveAs(blob, fileName);
      
      toast.success(`CSV exported: ${telemetryLogs.length} data points`);
      
    } catch (error) {
      console.error('❌ Error generating CSV:', error);
      toast.error('Failed to export CSV data');
      
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };
  
  // ==============================================
  // CHART CONFIGURATIONS
  // ==============================================
  
  /**
   * Get speed analysis chart configuration
   */
  const getSpeedAnalysisChart = () => {
    if (!analyticsData?.telemetry) return null;
    
    const { telemetry } = analyticsData;
    
    return {
      data: {
        labels: ['Min Speed', 'Avg Speed', 'Max Speed'],
        datasets: [{
          label: 'Speed Analysis (km/h)',
          data: [
            telemetry.minSpeed || 0,
            telemetry.avgSpeed || 0,
            telemetry.maxSpeed || 0
          ],
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',   // Green for min
            'rgba(59, 130, 246, 0.8)',  // Blue for avg
            'rgba(239, 68, 68, 0.8)'    // Red for max
          ],
          borderColor: [
            'rgb(34, 197, 94)',
            'rgb(59, 130, 246)',
            'rgb(239, 68, 68)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Speed Analysis'
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Speed (km/h)'
            }
          }
        }
      }
    };
  };
  
  /**
   * Get safety score gauge chart
   */
  const getSafetyScoreChart = () => {
    const safetyScore = analyticsData?.insights?.safetyScore || 0;
    
    return {
      data: {
        datasets: [{
          data: [safetyScore, 100 - safetyScore],
          backgroundColor: [
            safetyScore >= 80 ? '#10b981' : 
            safetyScore >= 60 ? '#f59e0b' : '#ef4444',
            '#e5e7eb'
          ],
          borderWidth: 0,
          cutout: '80%'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }
    };
  };
  
  /**
   * Get alert distribution chart
   */
  const getAlertDistributionChart = () => {
    if (!analyticsData?.alerts?.alertsByType) return null;
    
    const alertsByType = analyticsData.alerts.alertsByType;
    const alertTypes = Object.keys(alertsByType);
    const alertCounts = Object.values(alertsByType);
    
    if (alertTypes.length === 0) return null;
    
    return {
      data: {
        labels: alertTypes.map(type => type.replace('_', ' ').toUpperCase()),
        datasets: [{
          data: alertCounts,
          backgroundColor: [
            '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
            '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Alert Distribution'
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    };
  };
  
  // ==============================================
  // UTILITY FUNCTIONS
  // ==============================================
  
  /**
   * Format duration in human-readable format
   */
  const formatDuration = (milliseconds) => {
    if (!milliseconds) return 'N/A';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };
  
  /**
   * Get performance grade based on score
   */
  const getPerformanceGrade = (score) => {
    if (score >= 90) return { grade: 'A+', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 80) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 70) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 60) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (score >= 50) return { grade: 'D', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { grade: 'F', color: 'text-red-600', bg: 'bg-red-100' };
  };
  
  // ==============================================
  // RENDER LOADING/ERROR STATES
  // ==============================================
  
  if (isLoading && !analyticsData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center justify-center space-x-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600">Loading analytics...</span>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <h3 className="text-lg font-semibold text-gray-800">Error Loading Analytics</h3>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => fetchAnalytics()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  if (!analyticsData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center space-y-4">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="text-lg font-semibold text-gray-800">No Analytics Available</h3>
          <p className="text-gray-600">
            {sessionId ? 'No data found for this session.' : 'Please select a session to view analytics.'}
          </p>
        </div>
      </div>
    );
  }
  
  // ==============================================
  // MAIN RENDER
  // ==============================================
  
  const speedChart = getSpeedAnalysisChart();
  const safetyChart = getSafetyScoreChart();
  const alertChart = getAlertDistributionChart();
  const performanceGrade = getPerformanceGrade(analyticsData.insights.safetyScore);
  
  return (
    <div ref={dashboardRef} className="w-full space-y-6">
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
            {/* Refresh Button */}
            <button
              onClick={() => fetchAnalytics()}
              disabled={isLoading}
              className="flex items-center px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            {/* Export Buttons */}
            <button
              onClick={exportToPDF}
              disabled={isExporting}
              className="flex items-center px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isExporting && exportType === 'pdf' ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              PDF
            </button>
            
            <button
              onClick={exportToCSV}
              disabled={isExporting}
              className="flex items-center px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isExporting && exportType === 'csv' ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 mr-2" />
              )}
              CSV
            </button>
          </div>
        </div>
        
        {lastUpdated && (
          <div className="mt-3 text-sm text-gray-500">
            Last updated: {formatDistanceToNow(lastUpdated, { addSuffix: true })}
          </div>
        )}
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
            {analyticsData.telemetry.avgSpeed?.toFixed(1) || 'N/A'}
            <span className="text-sm font-normal text-gray-500 ml-1">km/h</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Max: {analyticsData.telemetry.maxSpeed?.toFixed(1) || 'N/A'} km/h
          </p>
        </div>
        
        {/* Total Alerts */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Total Alerts</h3>
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {analyticsData.alerts.totalAlerts || 0}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {analyticsData.alerts.criticalAlerts || 0} critical
          </p>
        </div>
        
        {/* Reaction Time */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Avg Reaction</h3>
            <Clock className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {analyticsData.driverPerformance.avgReactionTimeSeconds || 'N/A'}
            <span className="text-sm font-normal text-gray-500 ml-1">sec</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {analyticsData.driverPerformance.appropriatenessRate?.toFixed(1) || 'N/A'}% appropriate
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
      
      {/* Session Details */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Session Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Session Information</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Duration:</span>
                <span className="ml-2 font-medium">{formatDuration(analyticsData.session.duration)}</span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span className="ml-2 font-medium capitalize">{analyticsData.session.status}</span>
              </div>
              <div>
                <span className="text-gray-600">Weather:</span>
                <span className="ml-2 font-medium capitalize">{analyticsData.session.weather || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Road Type:</span>
                <span className="ml-2 font-medium capitalize">{analyticsData.session.roadType || 'N/A'}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Performance Metrics</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Data Points:</span>
                <span className="ml-2 font-medium">{analyticsData.telemetry.dataPoints || 0}</span>
              </div>
              <div>
                <span className="text-gray-600">Min Distance:</span>
                <span className="ml-2 font-medium">{analyticsData.telemetry.minObstacleDistance?.toFixed(1) || 'N/A'}m</span>
              </div>
              <div>
                <span className="text-gray-600">Avg Distance:</span>
                <span className="ml-2 font-medium">{analyticsData.telemetry.avgObstacleDistance?.toFixed(1) || 'N/A'}m</span>
              </div>
              <div>
                <span className="text-gray-600">Total Responses:</span>
                <span className="ml-2 font-medium">{analyticsData.driverPerformance.totalResponses || 0}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
            <div className="space-y-1">
              {analyticsData.insights.recommendations?.slice(0, 3).map((rec, index) => (
                <div key={index} className="text-sm text-gray-600 flex items-start">
                  <TrendingUp className="w-3 h-3 mt-1 mr-2 text-blue-500 flex-shrink-0" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionAnalytics;
