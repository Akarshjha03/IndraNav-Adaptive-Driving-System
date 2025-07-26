/**
 * Controls.jsx - Session Management Control Panel
 * 
 * Features:
 * - Start/Stop/Reset session functionality
 * - REST API integration for session management
 * - Session configuration options (weather, road type)
 * - Real-time session status monitoring
 * - Error handling and user feedback
 * - Responsive design with Tailwind CSS
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  Play,
  Square,
  RotateCcw,
  Settings,
  Clock,
  Cloud,
  Road,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

const Controls = ({ 
  sessionId,
  isSessionActive,
  onSessionStart,
  onSessionEnd,
  onSessionReset,
  backendUrl = 'http://localhost:5000'
}) => {
  // ==============================================
  // STATE MANAGEMENT
  // ==============================================
  
  // Session configuration
  const [sessionConfig, setSessionConfig] = useState({
    weather: 'sunny',
    roadType: 'highway'
  });
  
  // Session status and timing
  const [sessionStatus, setSessionStatus] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // UI state
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [lastOperation, setLastOperation] = useState(null);
  
  // Available configuration options
  const weatherOptions = [
    { value: 'sunny', label: 'Sunny', icon: '☀️' },
    { value: 'cloudy', label: 'Cloudy', icon: '☁️' },
    { value: 'rainy', label: 'Rainy', icon: '🌧️' },
    { value: 'foggy', label: 'Foggy', icon: '🌫️' },
    { value: 'snowy', label: 'Snowy', icon: '❄️' },
    { value: 'stormy', label: 'Stormy', icon: '⛈️' }
  ];
  
  const roadTypeOptions = [
    { value: 'highway', label: 'Highway', icon: '🛣️' },
    { value: 'city', label: 'City', icon: '🏙️' },
    { value: 'suburban', label: 'Suburban', icon: '🏘️' },
    { value: 'rural', label: 'Rural', icon: '🌾' },
    { value: 'mountain', label: 'Mountain', icon: '⛰️' },
    { value: 'coastal', label: 'Coastal', icon: '🌊' }
  ];
  
  // ==============================================
  // SESSION MANAGEMENT FUNCTIONS
  // ==============================================
  
  /**
   * Start a new driving session
   */
  const handleStartSession = async () => {
    if (isSessionActive) {
      toast.error('Session is already active');
      return;
    }
    
    setIsLoading(true);
    setLastOperation('start');
    
    try {
      console.log('🚀 Starting new session with config:', sessionConfig);
      
      // Generate session ID if not provided
      const newSessionId = sessionId || `session_${Date.now()}`;
      
      // Make API call to start session
      const response = await axios.post(`${backendUrl}/api/sessions/start`, {
        sessionId: newSessionId,
        weather: sessionConfig.weather,
        roadType: sessionConfig.roadType
      });
      
      console.log('✅ Session started successfully:', response.data);
      
      // Update session status
      setSessionStatus(response.data.data.session);
      
      // Notify parent component
      onSessionStart?.(response.data.data.session);
      
      toast.success(
        `Session started successfully!\nWeather: ${sessionConfig.weather}\nRoad: ${sessionConfig.roadType}`,
        { duration: 4000 }
      );
      
    } catch (error) {
      console.error('❌ Error starting session:', error);
      
      const errorMessage = error.response?.data?.message || 'Failed to start session';
      toast.error(`Error: ${errorMessage}`);
      
      // Show additional error details in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Full error details:', error.response?.data);
      }
      
    } finally {
      setIsLoading(false);
      setLastOperation(null);
    }
  };
  
  /**
   * Stop the current driving session
   */
  const handleStopSession = async () => {
    if (!isSessionActive || !sessionId) {
      toast.error('No active session to stop');
      return;
    }
    
    setIsLoading(true);
    setLastOperation('stop');
    
    try {
      console.log('🏁 Stopping session:', sessionId);
      
      // Make API call to end session
      const response = await axios.post(`${backendUrl}/api/sessions/end`, {
        sessionId: sessionId
      });
      
      console.log('✅ Session stopped successfully:', response.data);
      
      // Update session status
      setSessionStatus(response.data.data.session);
      
      // Calculate final duration
      if (response.data.data.session.duration) {
        setSessionDuration(response.data.data.session.duration);
      }
      
      // Notify parent component
      onSessionEnd?.(response.data.data.session);
      
      const durationMinutes = Math.round(response.data.data.session.duration / (1000 * 60));
      toast.success(
        `Session ended successfully!\nDuration: ${durationMinutes} minutes`,
        { duration: 4000 }
      );
      
    } catch (error) {
      console.error('❌ Error stopping session:', error);
      
      const errorMessage = error.response?.data?.message || 'Failed to stop session';
      toast.error(`Error: ${errorMessage}`);
      
    } finally {
      setIsLoading(false);
      setLastOperation(null);
    }
  };
  
  /**
   * Reset session data and prepare for new session
   */
  const handleResetSession = () => {
    if (isSessionActive) {
      toast.error('Cannot reset while session is active. Stop the session first.');
      return;
    }
    
    console.log('🔄 Resetting session data');
    
    // Reset all state
    setSessionStatus(null);
    setSessionDuration(0);
    setLastOperation('reset');
    
    // Reset to default configuration
    setSessionConfig({
      weather: 'sunny',
      roadType: 'highway'
    });
    
    // Notify parent component
    onSessionReset?.();
    
    toast.success('Session data reset successfully');
    
    // Clear the reset operation indicator after a delay
    setTimeout(() => setLastOperation(null), 1000);
  };
  
  /**
   * Fetch current session status from API
   */
  const fetchSessionStatus = async () => {
    if (!sessionId) return;
    
    try {
      const response = await axios.get(`${backendUrl}/api/sessions/${sessionId}/analytics`);
      setSessionStatus(response.data.data.session);
    } catch (error) {
      console.warn('Could not fetch session status:', error.message);
    }
  };
  
  // ==============================================
  // LIFECYCLE EFFECTS
  // ==============================================
  
  // Update session duration timer
  useEffect(() => {
    let interval;
    
    if (isSessionActive && sessionStatus?.startTime) {
      interval = setInterval(() => {
        const start = new Date(sessionStatus.startTime);
        const duration = Date.now() - start.getTime();
        setSessionDuration(duration);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSessionActive, sessionStatus]);
  
  // Fetch session status periodically
  useEffect(() => {
    if (sessionId && isSessionActive) {
      fetchSessionStatus();
      
      const interval = setInterval(fetchSessionStatus, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [sessionId, isSessionActive]);
  
  // ==============================================
  // UTILITY FUNCTIONS
  // ==============================================
  
  /**
   * Format duration in human-readable format
   */
  const formatDuration = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
  };
  
  // ==============================================
  // RENDER COMPONENT
  // ==============================================
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Settings className="w-6 h-6 mr-2 text-blue-600" />
          Session Controls
        </h2>
        
        {/* Session Status Indicator */}
        <div className="flex items-center space-x-2">
          {isSessionActive ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-gray-400" />
          )}
          <span className={`text-sm font-medium ${
            isSessionActive ? 'text-green-600' : 'text-gray-500'
          }`}>
            {isSessionActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      
      {/* Session Information */}
      {sessionStatus && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Session ID:</span>
              <span className="ml-2 font-mono text-blue-600">{sessionStatus.sessionId}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Status:</span>
              <span className="ml-2 capitalize">{sessionStatus.status}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Started:</span>
              <span className="ml-2">{format(new Date(sessionStatus.startTime), 'HH:mm:ss')}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Duration:</span>
              <span className="ml-2 font-mono">{formatDuration(sessionDuration)}</span>
            </div>
          </div>
          
          {sessionStatus.endTime && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Ended:</span>
              <span className="ml-2">{format(new Date(sessionStatus.endTime), 'HH:mm:ss')}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Session Configuration */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Session Configuration</h3>
          <button
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            {showAdvancedSettings ? 'Hide' : 'Show'} Advanced
          </button>
        </div>
        
        {/* Basic Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Weather Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Cloud className="w-4 h-4 mr-1" />
              Weather Conditions
            </label>
            <select
              value={sessionConfig.weather}
              onChange={(e) => setSessionConfig(prev => ({ ...prev, weather: e.target.value }))}
              disabled={isSessionActive}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              {weatherOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Road Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Road className="w-4 h-4 mr-1" />
              Road Type
            </label>
            <select
              value={sessionConfig.roadType}
              onChange={(e) => setSessionConfig(prev => ({ ...prev, roadType: e.target.value }))}
              disabled={isSessionActive}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              {roadTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Advanced Settings */}
        {showAdvancedSettings && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-gray-800">Advanced Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">WebSocket Endpoint:</span>
                <span className="ml-2 font-mono text-blue-600">ws://localhost:5000/ws</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">API Endpoint:</span>
                <span className="ml-2 font-mono text-blue-600">{backendUrl}/api</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Auto-save:</span>
                <span className="ml-2 text-green-600">Enabled</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Real-time Updates:</span>
                <span className="ml-2 text-green-600">1Hz</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Control Buttons */}
      <div className="flex flex-wrap gap-3">
        {/* Start Session Button */}
        <button
          onClick={handleStartSession}
          disabled={isSessionActive || isLoading}
          className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
            isSessionActive || isLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
          }`}
        >
          {isLoading && lastOperation === 'start' ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Play className="w-5 h-5 mr-2" />
          )}
          Start Session
        </button>
        
        {/* Stop Session Button */}
        <button
          onClick={handleStopSession}
          disabled={!isSessionActive || isLoading}
          className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
            !isSessionActive || isLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg'
          }`}
        >
          {isLoading && lastOperation === 'stop' ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Square className="w-5 h-5 mr-2" />
          )}
          Stop Session
        </button>
        
        {/* Reset Button */}
        <button
          onClick={handleResetSession}
          disabled={isSessionActive || isLoading}
          className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
            isSessionActive || isLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
          }`}
        >
          {lastOperation === 'reset' ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <RotateCcw className="w-5 h-5 mr-2" />
          )}
          Reset
        </button>
      </div>
      
      {/* Help Text */}
      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
        <div className="font-medium text-blue-800 mb-1">💡 How to use:</div>
        <ul className="space-y-1 ml-4 list-disc text-blue-700">
          <li>Configure weather and road conditions before starting</li>
          <li>Click "Start Session" to begin real-time telemetry simulation</li>
          <li>Monitor the dashboard for live data and safety alerts</li>
          <li>Use "Stop Session" to end and save the session data</li>
          <li>Click "Reset" to clear data and prepare for a new session</li>
        </ul>
      </div>
      
      {/* Error State Help */}
      {isLoading && (
        <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg flex items-center">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processing your request...
        </div>
      )}
    </div>
  );
};

export default Controls;
