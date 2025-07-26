/**
 * App.jsx - Main IndraNav Application Component
 * 
 * Features:
 * - Responsive layout combining all dashboard components
 * - Global state management for session data
 * - Toast notifications setup
 * - Navigation and component switching
 * - Error boundaries and loading states
 * - Clean, modern UI with Tailwind CSS
 */

import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import {
  Car,
  BarChart3,
  Settings,
  Info,
  Github,
  ExternalLink,
  Menu,
  X
} from 'lucide-react';

// Import custom components
import TelemetryDashboard from './components/TelemetryDashboard';
import Controls from './components/Controls';
import SessionAnalytics from './components/SessionAnalytics';

const App = () => {
  // ==============================================
  // GLOBAL STATE MANAGEMENT
  // ==============================================
  
  // Session state
  const [currentSession, setCurrentSession] = useState(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionHistory, setSessionHistory] = useState([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'controls' | 'analytics'
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [appVersion] = useState('1.0.0');
  
  // Configuration
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
  
  // ==============================================
  // SESSION MANAGEMENT HANDLERS
  // ==============================================
  
  /**
   * Handle session start
   */
  const handleSessionStart = (sessionData) => {
    console.log('🚀 Session started:', sessionData);
    
    setCurrentSession(sessionData);
    setIsSessionActive(true);
    
    // Switch to dashboard view
    setActiveTab('dashboard');
    
    // Add to session history
    setSessionHistory(prev => {
      const newHistory = [sessionData, ...prev];
      return newHistory.slice(0, 10); // Keep last 10 sessions
    });
  };
  
  /**
   * Handle session end
   */
  const handleSessionEnd = (sessionData) => {
    console.log('🏁 Session ended:', sessionData);
    
    setIsSessionActive(false);
    
    // Update current session with end data
    if (sessionData) {
      setCurrentSession(sessionData);
      
      // Update session history
      setSessionHistory(prev => 
        prev.map(session => 
          session.sessionId === sessionData.sessionId 
            ? { ...session, ...sessionData }
            : session
        )
      );
    }
    
    // Switch to analytics view to show results
    setActiveTab('analytics');
  };
  
  /**
   * Handle session reset
   */
  const handleSessionReset = () => {
    console.log('🔄 Session reset');
    
    setCurrentSession(null);
    setIsSessionActive(false);
    setActiveTab('controls');
  };
  
  // ==============================================
  // NAVIGATION CONFIGURATION
  // ==============================================
  
  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Live Dashboard',
      icon: Car,
      description: 'Real-time telemetry and alerts',
      disabled: !isSessionActive
    },
    {
      id: 'controls',
      label: 'Session Controls',
      icon: Settings,
      description: 'Start, stop, and configure sessions'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      description: 'Performance analysis and insights',
      disabled: !currentSession
    }
  ];
  
  // ==============================================
  // COMPONENT RENDERING HELPERS
  // ==============================================
  
  /**
   * Render the active component based on current tab
   */
  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <TelemetryDashboard
            sessionId={currentSession?.sessionId}
            isSessionActive={isSessionActive}
            onSessionEnd={handleSessionEnd}
            backendUrl={wsUrl}
          />
        );
        
      case 'controls':
        return (
          <Controls
            sessionId={currentSession?.sessionId}
            isSessionActive={isSessionActive}
            onSessionStart={handleSessionStart}
            onSessionEnd={handleSessionEnd}
            onSessionReset={handleSessionReset}
            backendUrl={backendUrl}
          />
        );
        
      case 'analytics':
        return (
          <SessionAnalytics
            sessionId={currentSession?.sessionId}
            backendUrl={backendUrl}
          />
        );
        
      default:
        return (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Info className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Welcome to IndraNav</h3>
            <p className="text-gray-600">
              Select a tab from the navigation menu to get started.
            </p>
          </div>
        );
    }
  };
  
  // ==============================================
  // LIFECYCLE EFFECTS
  // ==============================================
  
  // Load session history from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('indranav-session-history');
      if (savedHistory) {
        setSessionHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.warn('Could not load session history:', error);
    }
  }, []);
  
  // Save session history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('indranav-session-history', JSON.stringify(sessionHistory));
    } catch (error) {
      console.warn('Could not save session history:', error);
    }
  }, [sessionHistory]);
  
  // ==============================================
  // MAIN RENDER
  // ==============================================
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Car className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">IndraNav</h1>
                  <p className="text-xs text-gray-500">Adaptive Driving System</p>
                </div>
              </div>
            </div>
            
            {/* Session Status */}
            <div className="hidden md:flex items-center space-x-4">
              {currentSession && (
                <div className="text-sm">
                  <span className="text-gray-600">Session:</span>
                  <span className="ml-2 font-mono text-blue-600">{currentSession.sessionId}</span>
                  <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${
                    isSessionActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {isSessionActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              )}
              
              {/* Version Info */}
              <div className="text-xs text-gray-500">
                v{appVersion}
              </div>
            </div>
            
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </header>
      
      <div className="flex">
        {/* Sidebar Navigation */}
        <nav className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg border-r border-gray-200 transition-transform duration-300 ease-in-out`}>
          
          {/* Navigation Header */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Navigation</h2>
            <p className="text-sm text-gray-600 mt-1">
              {isSessionActive ? 'Session Active' : 'No Active Session'}
            </p>
          </div>
          
          {/* Navigation Items */}
          <div className="p-4">
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                const isDisabled = item.disabled;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => !isDisabled && setActiveTab(item.id)}
                    disabled={isDisabled}
                    className={`w-full flex items-center px-3 py-3 rounded-lg text-left transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : isDisabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <IconComponent className={`w-5 h-5 mr-3 ${
                      isActive ? 'text-blue-600' : isDisabled ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-gray-500">{item.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Session History */}
          {sessionHistory.length > 0 && (
            <div className="p-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-800 mb-3">Recent Sessions</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {sessionHistory.slice(0, 5).map((session, index) => (
                  <button
                    key={session.sessionId}
                    onClick={() => {
                      setCurrentSession(session);
                      setActiveTab('analytics');
                    }}
                    className="w-full text-left p-2 rounded text-xs hover:bg-gray-100 transition-colors"
                  >
                    <div className="font-mono text-blue-600">{session.sessionId}</div>
                    <div className="text-gray-500">
                      {session.weather} • {session.roadType}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>B.Tech Project</span>
              <a
                href="https://github.com/indranav/adaptive-driving-system"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center hover:text-gray-700 transition-colors"
              >
                <Github className="w-4 h-4 mr-1" />
                GitHub
              </a>
            </div>
          </div>
        </nav>
        
        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Main Content */}
        <main className="flex-1 md:ml-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Page Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {navigationItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
                  </h1>
                  <p className="text-gray-600 mt-1">
                    {navigationItems.find(item => item.id === activeTab)?.description || 'Welcome to IndraNav'}
                  </p>
                </div>
                
                {/* Quick Actions */}
                <div className="hidden sm:flex items-center space-x-3">
                  {!isSessionActive && activeTab !== 'controls' && (
                    <button
                      onClick={() => setActiveTab('controls')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Start Session
                    </button>
                  )}
                  
                  {isSessionActive && activeTab !== 'dashboard' && (
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      View Live Data
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Component Content */}
            <div className="space-y-6">
              {renderActiveComponent()}
            </div>
            
            {/* Help Section */}
            {activeTab === 'controls' && !currentSession && (
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start">
                  <Info className="w-6 h-6 text-blue-600 mr-3 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Getting Started</h3>
                    <div className="text-blue-800 space-y-1">
                      <p>1. Configure your session settings (weather and road type)</p>
                      <p>2. Click "Start Session" to begin real-time telemetry simulation</p>
                      <p>3. Switch to "Live Dashboard" to monitor real-time data and alerts</p>
                      <p>4. Use "Stop Session" when finished to view analytics</p>
                    </div>
                    <div className="mt-3 text-sm text-blue-700">
                      <strong>Note:</strong> Make sure your backend server is running on port 5000 before starting a session.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
