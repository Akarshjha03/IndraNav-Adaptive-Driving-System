/**
 * IndraNav WebSocket Server
 * Handles real-time telemetry streaming and hazard alert broadcasting
 * Provides live data simulation and client communication for the adaptive driving system
 */

const WebSocket = require('ws');
const mongoose = require('mongoose');

// Import models for data operations
const TelemetryLog = mongoose.model('TelemetryLog');
const Alert = mongoose.model('Alert');
const Session = mongoose.model('Session');

// ==============================================
// WEBSOCKET SERVER CONFIGURATION
// ==============================================

/**
 * Initialize WebSocket server on the provided HTTP server
 * Creates WebSocket endpoint at /ws for real-time communication
 * 
 * @param {http.Server} server - HTTP server instance from Express
 */
function initializeWebSocketServer(server) {
    console.log('🌐 Initializing WebSocket server...');
    
    // Create WebSocket server instance
    const wss = new WebSocket.Server({ 
        server,
        path: '/ws',
        perMessageDeflate: false // Disable compression for real-time performance
    });
    
    // Store active connections and their associated sessions
    const activeConnections = new Map(); // connectionId -> { socket, sessionId, lastActivity }
    const activeSessions = new Map();    // sessionId -> { telemetryInterval, alertChecks, startTime }
    
    console.log('✅ WebSocket server initialized on /ws endpoint');
    
    // ==============================================
    // CLIENT CONNECTION HANDLING
    // ==============================================
    
    wss.on('connection', (socket, request) => {
        const connectionId = generateConnectionId();
        const clientIP = request.headers['x-forwarded-for'] || request.connection.remoteAddress;
        
        console.log(`🔗 New WebSocket connection: ${connectionId} from ${clientIP}`);
        
        // Store connection info
        activeConnections.set(connectionId, {
            socket,
            sessionId: null,
            lastActivity: Date.now(),
            clientIP,
            connectedAt: new Date()
        });
        
        // Send welcome message with connection info
        sendMessage(socket, {
            type: 'connection_established',
            data: {
                connectionId,
                timestamp: new Date().toISOString(),
                message: 'Welcome to IndraNav real-time telemetry stream'
            }
        });
        
        // ==============================================
        // MESSAGE HANDLING FROM CLIENTS
        // ==============================================
        
        socket.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log(`📨 Received message from ${connectionId}:`, message.type);
                
                // Update last activity
                const connection = activeConnections.get(connectionId);
                if (connection) {
                    connection.lastActivity = Date.now();
                }
                
                await handleClientMessage(connectionId, message);
                
            } catch (error) {
                console.error(`❌ Error processing message from ${connectionId}:`, error);
                sendMessage(socket, {
                    type: 'error',
                    data: {
                        message: 'Invalid message format',
                        timestamp: new Date().toISOString()
                    }
                });
            }
        });
        
        // ==============================================
        // CONNECTION LIFECYCLE EVENTS
        // ==============================================
        
        socket.on('close', (code, reason) => {
            console.log(`🔌 WebSocket connection closed: ${connectionId} (Code: ${code})`);
            handleClientDisconnect(connectionId);
        });
        
        socket.on('error', (error) => {
            console.error(`❌ WebSocket error for ${connectionId}:`, error);
            handleClientDisconnect(connectionId);
        });
        
        // Heartbeat to detect disconnected clients
        socket.on('pong', () => {
            const connection = activeConnections.get(connectionId);
            if (connection) {
                connection.lastActivity = Date.now();
            }
        });
    });
    
    // ==============================================
    // CLIENT MESSAGE HANDLERS
    // ==============================================
    
    /**
     * Handle different types of messages from WebSocket clients
     * Supports session management, telemetry requests, and real-time subscriptions
     */
    async function handleClientMessage(connectionId, message) {
        const connection = activeConnections.get(connectionId);
        if (!connection) return;
        
        const { socket } = connection;
        
        switch (message.type) {
            case 'start_session':
                await handleStartSession(connectionId, message.data);
                break;
                
            case 'stop_session':
                await handleStopSession(connectionId, message.data);
                break;
                
            case 'subscribe_telemetry':
                await handleSubscribeTelemetry(connectionId, message.data);
                break;
                
            case 'unsubscribe_telemetry':
                await handleUnsubscribeTelemetry(connectionId);
                break;
                
            case 'request_session_status':
                await handleSessionStatusRequest(connectionId, message.data);
                break;
                
            case 'ping':
                sendMessage(socket, {
                    type: 'pong',
                    data: { timestamp: new Date().toISOString() }
                });
                break;
                
            default:
                sendMessage(socket, {
                    type: 'error',
                    data: {
                        message: `Unknown message type: ${message.type}`,
                        supportedTypes: [
                            'start_session', 'stop_session', 'subscribe_telemetry',
                            'unsubscribe_telemetry', 'request_session_status', 'ping'
                        ]
                    }
                });
        }
    }
    
    // ==============================================
    // SESSION MANAGEMENT HANDLERS
    // ==============================================
    
    /**
     * Start a new driving session and begin telemetry simulation
     * Expected data: { sessionId, weather, roadType, simulationSpeed }
     */
    async function handleStartSession(connectionId, data) {
        const connection = activeConnections.get(connectionId);
        if (!connection) return;
        
        const { sessionId, weather = 'sunny', roadType = 'highway', simulationSpeed = 1000 } = data;
        
        try {
            console.log(`🚀 Starting session ${sessionId} for connection ${connectionId}`);
            
            // Verify session exists or create a new one
            let session = await Session.findOne({ sessionId });
            if (!session) {
                session = new Session({
                    sessionId: sessionId || `ws_session_${Date.now()}`,
                    weather,
                    roadType,
                    startTime: new Date()
                });
                await session.save();
                console.log(`✅ Created new session: ${session.sessionId}`);
            }
            
            // Update connection with session info
            connection.sessionId = session.sessionId;
            
            // Start telemetry simulation for this session
            startTelemetrySimulation(session.sessionId, simulationSpeed);
            
            sendMessage(connection.socket, {
                type: 'session_started',
                data: {
                    sessionId: session.sessionId,
                    weather: session.weather,
                    roadType: session.roadType,
                    startTime: session.startTime,
                    simulationSpeed,
                    message: 'Session started successfully. Telemetry streaming will begin shortly.'
                }
            });
            
        } catch (error) {
            console.error(`❌ Error starting session for ${connectionId}:`, error);
            sendMessage(connection.socket, {
                type: 'session_error',
                data: {
                    message: 'Failed to start session',
                    error: error.message
                }
            });
        }
    }
    
    /**
     * Stop an active driving session and end telemetry simulation
     */
    async function handleStopSession(connectionId, data) {
        const connection = activeConnections.get(connectionId);
        if (!connection || !connection.sessionId) return;
        
        try {
            console.log(`🏁 Stopping session ${connection.sessionId} for connection ${connectionId}`);
            
            // Stop telemetry simulation
            stopTelemetrySimulation(connection.sessionId);
            
            // End the session in database
            const session = await Session.findOne({ sessionId: connection.sessionId });
            if (session && !session.endTime) {
                await session.endSession();
            }
            
            sendMessage(connection.socket, {
                type: 'session_stopped',
                data: {
                    sessionId: connection.sessionId,
                    endTime: new Date().toISOString(),
                    duration: session ? session.duration : null,
                    message: 'Session ended successfully'
                }
            });
            
            // Clear session from connection
            connection.sessionId = null;
            
        } catch (error) {
            console.error(`❌ Error stopping session for ${connectionId}:`, error);
            sendMessage(connection.socket, {
                type: 'session_error',
                data: {
                    message: 'Failed to stop session',
                    error: error.message
                }
            });
        }
        }
    
    /**
     * Subscribe to telemetry data for a specific session
     */
    async function handleSubscribeTelemetry(connectionId, data) {
        const connection = activeConnections.get(connectionId);
        if (!connection) return;
        
        const { sessionId } = data;
        if (!sessionId) {
            sendMessage(connection.socket, {
                type: 'subscription_error',
                data: { message: 'sessionId required for telemetry subscription' }
            });
            return;
        }
        
        connection.sessionId = sessionId;
        sendMessage(connection.socket, {
            type: 'subscription_confirmed',
            data: { 
                sessionId,
                message: `Subscribed to telemetry for session ${sessionId}` 
            }
        });
    }
    
    /**
     * Unsubscribe from telemetry data
     */
    async function handleUnsubscribeTelemetry(connectionId) {
        const connection = activeConnections.get(connectionId);
        if (!connection) return;
        
        const previousSession = connection.sessionId;
        connection.sessionId = null;
        
        sendMessage(connection.socket, {
            type: 'unsubscription_confirmed',
            data: { 
                previousSession,
                message: 'Unsubscribed from telemetry stream' 
            }
        });
    }
    
    /**
     * Handle session status requests
     */
    async function handleSessionStatusRequest(connectionId, data) {
        const connection = activeConnections.get(connectionId);
        if (!connection) return;
        
        const { sessionId } = data;
        
        try {
            const session = await Session.findOne({ sessionId });
            const isSimulationActive = activeSessions.has(sessionId);
            
            if (!session) {
                sendMessage(connection.socket, {
                    type: 'session_status',
                    data: { 
                        sessionId,
                        exists: false,
                        message: 'Session not found' 
                    }
                });
                return;
            }
            
            sendMessage(connection.socket, {
                type: 'session_status',
                data: {
                    sessionId,
                    exists: true,
                    status: session.status,
                    startTime: session.startTime,
                    endTime: session.endTime,
                    simulationActive: isSimulationActive,
                    weather: session.weather,
                    roadType: session.roadType
                }
            });
            
        } catch (error) {
            sendMessage(connection.socket, {
                type: 'session_status_error',
                data: { 
                    sessionId,
                    message: 'Error retrieving session status',
                    error: error.message 
                }
            });
        }
    }
     
     // ==============================================
     // TELEMETRY SIMULATION ENGINE
     // ==============================================
    
    /**
     * Start real-time telemetry simulation for a session
     * Generates realistic driving data with hazard detection logic
     */
    function startTelemetrySimulation(sessionId, intervalMs = 1000) {
        console.log(`📡 Starting telemetry simulation for session: ${sessionId}`);
        
        // Check if simulation is already running
        if (activeSessions.has(sessionId)) {
            console.warn(`⚠️ Telemetry simulation already active for session: ${sessionId}`);
            return;
        }
        
        // Initialize simulation state
        const simulationState = {
            startTime: Date.now(),
            currentSpeed: 60 + Math.random() * 40, // Start between 60-100 km/h
            currentLat: 40.7128 + (Math.random() - 0.5) * 0.01, // NYC area
            currentLng: -74.0060 + (Math.random() - 0.5) * 0.01,
            currentObstacleDistance: 50 + Math.random() * 200, // Start between 50-250m
            lastAlertTime: 0,
            alertCooldown: 5000, // 5 seconds between alerts
            speedTrend: (Math.random() > 0.5) ? 1 : -1, // Speed increase/decrease trend
            routeProgress: 0 // Progress along simulated route
        };
        
        // Start telemetry generation interval
        const telemetryInterval = setInterval(() => {
            generateAndBroadcastTelemetry(sessionId, simulationState);
        }, intervalMs);
        
        // Store active session info
        activeSessions.set(sessionId, {
            telemetryInterval,
            simulationState,
            startTime: Date.now(),
            intervalMs
        });
    }
    
    /**
     * Generate realistic telemetry data and broadcast to connected clients
     * Implements driving simulation logic with hazard detection
     */
    async function generateAndBroadcastTelemetry(sessionId, state) {
        try {
            // Generate realistic telemetry variations
            updateSimulationState(state);
            
            // Create telemetry data point
            const telemetryData = {
                sessionId,
                timestamp: new Date(),
                speed: Math.round(state.currentSpeed * 100) / 100, // Round to 2 decimal places
                gps: {
                    lat: Math.round(state.currentLat * 1000000) / 1000000, // 6 decimal places
                    lng: Math.round(state.currentLng * 1000000) / 1000000
                },
                obstacleDistance: Math.round(state.currentObstacleDistance * 100) / 100
            };
            
            // Save telemetry to database (async, don't wait)
            saveTelemetryToDatabase(telemetryData).catch(err => {
                console.warn('Warning: Failed to save telemetry to database:', err.message);
            });
            
            // Check for hazard conditions and generate alerts
            const hazardAlert = await checkForHazards(telemetryData, state);
            
            // Broadcast telemetry to all connected clients for this session
            broadcastTelemetryData(sessionId, telemetryData, hazardAlert);
            
        } catch (error) {
            console.error(`❌ Error generating telemetry for session ${sessionId}:`, error);
        }
    }
    
    /**
     * Update simulation state with realistic driving patterns
     */
    function updateSimulationState(state) {
        const now = Date.now();
        const elapsed = (now - state.startTime) / 1000; // Seconds elapsed
        
        // Speed variations (realistic driving patterns)
        if (Math.random() < 0.1) { // 10% chance to change speed trend
            state.speedTrend *= -1;
        }
        
        // Apply speed changes
        const speedChange = state.speedTrend * (0.5 + Math.random() * 2); // 0.5-2.5 km/h change
        state.currentSpeed = Math.max(20, Math.min(140, state.currentSpeed + speedChange));
        
        // GPS movement simulation (simple linear movement)
        const speedMs = state.currentSpeed / 3.6; // Convert km/h to m/s
        const distanceM = speedMs * (state.intervalMs / 1000); // Distance in meters
        
        // Move along a rough bearing (simulate route following)
        const bearing = 45 + Math.sin(elapsed * 0.01) * 30; // Varying direction
        const latChange = (distanceM * Math.cos(bearing * Math.PI / 180)) / 111320; // Rough lat conversion
        const lngChange = (distanceM * Math.sin(bearing * Math.PI / 180)) / (111320 * Math.cos(state.currentLat * Math.PI / 180));
        
        state.currentLat += latChange;
        state.currentLng += lngChange;
        state.routeProgress += distanceM;
        
        // Obstacle distance simulation (realistic traffic patterns)
        if (Math.random() < 0.15) { // 15% chance for significant change
            // Simulate traffic situations
            if (state.currentObstacleDistance > 100 && Math.random() < 0.3) {
                // Sudden close obstacle (car cutting in, traffic jam)
                state.currentObstacleDistance = 10 + Math.random() * 30;
            } else if (state.currentObstacleDistance < 50 && Math.random() < 0.4) {
                // Clear road ahead
                state.currentObstacleDistance = 80 + Math.random() * 150;
            } else {
                // Normal variation
                const change = (Math.random() - 0.5) * 20; // ±10m variation
                state.currentObstacleDistance = Math.max(5, Math.min(300, state.currentObstacleDistance + change));
            }
        } else {
            // Small random variations
            const change = (Math.random() - 0.5) * 5; // ±2.5m variation
            state.currentObstacleDistance = Math.max(5, Math.min(300, state.currentObstacleDistance + change));
        }
    }
    
    /**
     * Check for hazardous driving conditions and generate alerts
     * Implements rule-based safety logic for the adaptive driving system
     */
    async function checkForHazards(telemetryData, state) {
        const now = Date.now();
        
        // Don't generate alerts too frequently
        if (now - state.lastAlertTime < state.alertCooldown) {
            return null;
        }
        
        const { speed, obstacleDistance } = telemetryData;
        
        // Calculate stopping distance (basic physics)
        const speedMs = speed / 3.6; // Convert to m/s
        const stoppingDistance = (speedMs * speedMs) / (2 * 7); // Assume 7 m/s² deceleration
        
        let alertType = null;
        let severity = 'medium';
        let message = '';
        
        // Hazard detection logic
        if (obstacleDistance <= 5) {
            // Critical: Obstacle extremely close
            alertType = 'emergency_brake';
            severity = 'critical';
            message = 'EMERGENCY: Immediate braking required!';
            
        } else if (obstacleDistance <= stoppingDistance * 0.7) {
            // High danger: Not enough distance to stop safely
            alertType = 'collision_warning';
            severity = 'high';
            message = `Collision risk: Obstacle ${obstacleDistance.toFixed(1)}m ahead, stopping distance ${stoppingDistance.toFixed(1)}m`;
            
        } else if (speed > 120) {
            // Speed warning
            alertType = 'speed_warning';
            severity = 'medium';
            message = `Speed warning: Current speed ${speed.toFixed(1)} km/h exceeds safe limits`;
            
        } else if (obstacleDistance < 30 && speed > 80) {
            // High speed with close obstacle
            alertType = 'collision_warning';
            severity = 'high';
            message = `Reduce speed: High speed with close obstacle at ${obstacleDistance.toFixed(1)}m`;
            
        } else if (obstacleDistance < 20) {
            // Close following distance
            alertType = 'collision_warning';
            severity = 'medium';
            message = `Maintain safe distance: Following too closely at ${obstacleDistance.toFixed(1)}m`;
        }
        
        // Generate and save alert if hazard detected
        if (alertType) {
            console.warn(`⚠️ Hazard detected in session ${telemetryData.sessionId}: ${alertType} (${severity})`);
            
            state.lastAlertTime = now;
            
            try {
                // Create and save alert to database
                const alert = new Alert({
                    sessionId: telemetryData.sessionId,
                    type: alertType,
                    severity,
                    triggered: true,
                    message,
                    triggerData: {
                        speed: telemetryData.speed,
                        obstacleDistance: telemetryData.obstacleDistance,
                        gps: telemetryData.gps
                    },
                    timestamp: telemetryData.timestamp
                });
                
                await alert.save();
                
                return {
                    alertId: alert._id,
                    type: alertType,
                    severity,
                    message,
                    timestamp: telemetryData.timestamp,
                    triggerData: alert.triggerData
                };
                
            } catch (error) {
                console.error('❌ Error saving hazard alert:', error);
                return {
                    type: alertType,
                    severity,
                    message,
                    timestamp: telemetryData.timestamp,
                    error: 'Failed to save alert to database'
                };
            }
        }
        
        return null;
    }
    
    /**
     * Save telemetry data to database (non-blocking)
     */
    async function saveTelemetryToDatabase(telemetryData) {
        try {
            const telemetryLog = new TelemetryLog(telemetryData);
            await telemetryLog.save();
        } catch (error) {
            // Log error but don't interrupt real-time streaming
            console.error('Database save error for telemetry:', error.message);
        }
    }
    
    /**
     * Broadcast telemetry data to all connected clients subscribed to the session
     */
    function broadcastTelemetryData(sessionId, telemetryData, hazardAlert) {
        const message = {
            type: 'telemetry_data',
            data: {
                telemetry: telemetryData,
                alert: hazardAlert,
                timestamp: new Date().toISOString()
            }
        };
        
        let broadcastCount = 0;
        
        // Send to all connections subscribed to this session
        activeConnections.forEach((connection, connectionId) => {
            if (connection.sessionId === sessionId && connection.socket.readyState === WebSocket.OPEN) {
                sendMessage(connection.socket, message);
                broadcastCount++;
            }
        });
        
        if (broadcastCount > 0) {
            console.log(`📡 Broadcasted telemetry for session ${sessionId} to ${broadcastCount} clients`);
        }
        
        // Also broadcast hazard alerts to all connected clients (global alerts)
        if (hazardAlert && hazardAlert.severity === 'critical') {
            broadcastGlobalAlert(hazardAlert, sessionId);
        }
    }
    
    /**
     * Broadcast critical alerts to all connected clients regardless of session
     */
    function broadcastGlobalAlert(alert, sessionId) {
        const message = {
            type: 'global_alert',
            data: {
                alert,
                sourceSession: sessionId,
                timestamp: new Date().toISOString(),
                message: 'Critical alert from another session'
            }
        };
        
        let alertCount = 0;
        activeConnections.forEach((connection, connectionId) => {
            if (connection.socket.readyState === WebSocket.OPEN) {
                sendMessage(connection.socket, message);
                alertCount++;
            }
        });
        
        console.warn(`🚨 Broadcasted critical alert to ${alertCount} clients`);
    }
    
    // ==============================================
    // UTILITY FUNCTIONS
    // ==============================================
    
    /**
     * Stop telemetry simulation for a session
     */
    function stopTelemetrySimulation(sessionId) {
        const activeSession = activeSessions.get(sessionId);
        if (activeSession) {
            clearInterval(activeSession.telemetryInterval);
            activeSessions.delete(sessionId);
            console.log(`🛑 Stopped telemetry simulation for session: ${sessionId}`);
        }
    }
    
    /**
     * Handle client disconnection cleanup
     */
    function handleClientDisconnect(connectionId) {
        const connection = activeConnections.get(connectionId);
        if (connection) {
            // Stop session simulation if this was the only client
            if (connection.sessionId) {
                const sessionConnections = Array.from(activeConnections.values())
                    .filter(conn => conn.sessionId === connection.sessionId);
                
                if (sessionConnections.length <= 1) {
                    stopTelemetrySimulation(connection.sessionId);
                }
            }
            
            activeConnections.delete(connectionId);
            console.log(`🗑️ Cleaned up connection: ${connectionId}`);
        }
    }
    
    /**
     * Send message to WebSocket client with error handling
     */
    function sendMessage(socket, message) {
        if (socket.readyState === WebSocket.OPEN) {
            try {
                socket.send(JSON.stringify(message));
            } catch (error) {
                console.error('❌ Error sending WebSocket message:', error);
            }
        }
    }
    
    /**
     * Generate unique connection ID
     */
    function generateConnectionId() {
        return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // ==============================================
    // HEALTH MONITORING & CLEANUP
    // ==============================================
    
    /**
     * Periodic cleanup of stale connections and sessions
     */
    setInterval(() => {
        const now = Date.now();
        const staleThreshold = 60000; // 1 minute
        
        // Check for stale connections
        activeConnections.forEach((connection, connectionId) => {
            if (now - connection.lastActivity > staleThreshold) {
                console.log(`🧹 Cleaning up stale connection: ${connectionId}`);
                connection.socket.terminate();
                handleClientDisconnect(connectionId);
            } else if (connection.socket.readyState === WebSocket.OPEN) {
                // Send ping to check connection health
                connection.socket.ping();
            }
        });
        
        console.log(`📊 Active connections: ${activeConnections.size}, Active sessions: ${activeSessions.size}`);
    }, 30000); // Run every 30 seconds
    
    // ==============================================
    // WEBSOCKET SERVER INTERFACE
    // ==============================================
    
    return {
        wss,
        activeConnections,
        activeSessions,
        broadcast: (message) => {
            activeConnections.forEach((connection) => {
                sendMessage(connection.socket, message);
            });
        },
        getStats: () => ({
            totalConnections: activeConnections.size,
            activeSessions: activeSessions.size,
            uptime: Date.now() - serverStartTime
        })
    };
}

// Track server start time for uptime calculation
const serverStartTime = Date.now();

// Export the initialization function
module.exports = initializeWebSocketServer;
