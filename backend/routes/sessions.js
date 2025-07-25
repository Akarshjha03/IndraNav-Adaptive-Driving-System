/**
 * Sessions Router for IndraNav Adaptive Driving System
 * Handles driving session management and analytics
 * Provides endpoints for session lifecycle and data retrieval
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Import models
const Session = mongoose.model('Session');
const TelemetryLog = mongoose.model('TelemetryLog');
const Alert = mongoose.model('Alert');
const DriverResponse = mongoose.model('DriverResponse');

// ==============================================
// SESSION LIFECYCLE ENDPOINTS
// ==============================================

/**
 * POST /api/sessions/start
 * Creates a new driving session
 * 
 * Expected body:
 * {
 *   "sessionId": "session_123", // Optional - auto-generated if not provided
 *   "weather": "sunny",         // Required: sunny, cloudy, rainy, foggy, snowy, stormy
 *   "roadType": "highway"       // Required: highway, city, suburban, rural, mountain, coastal
 * }
 */
router.post('/start', async (req, res) => {
    try {
        console.log('🚀 Starting new driving session...');
        
        const { sessionId, weather, roadType } = req.body;
        
        // Validate required fields
        if (!weather || !roadType) {
            return res.status(400).json({
                status: 'error',
                message: 'Weather and roadType are required fields',
                requiredFields: {
                    weather: ['sunny', 'cloudy', 'rainy', 'foggy', 'snowy', 'stormy'],
                    roadType: ['highway', 'city', 'suburban', 'rural', 'mountain', 'coastal']
                }
            });
        }
        
        // Create new session
        const sessionData = {
            weather: weather.toLowerCase().trim(),
            roadType: roadType.toLowerCase().trim(),
            startTime: new Date()
        };
        
        // Add sessionId if provided, otherwise let the model generate one
        if (sessionId) {
            sessionData.sessionId = sessionId;
        }
        
        const newSession = new Session(sessionData);
        const savedSession = await newSession.save();
        
        console.log(`✅ Session created: ${savedSession.sessionId}`);
        
        res.status(201).json({
            status: 'success',
            message: 'Driving session started successfully',
            data: {
                session: savedSession,
                sessionDuration: savedSession.duration,
                sessionStatus: savedSession.status
            }
        });
        
    } catch (error) {
        console.error('❌ Error starting session:', error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }
        
        // Handle duplicate sessionId error
        if (error.code === 11000) {
            return res.status(409).json({
                status: 'error',
                message: 'Session ID already exists',
                hint: 'Please use a different sessionId or let the system generate one'
            });
        }
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to start session',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

/**
 * POST /api/sessions/end
 * Marks the end time for an active session
 * 
 * Expected body:
 * {
 *   "sessionId": "session_123"  // Required: ID of session to end
 * }
 */
router.post('/end', async (req, res) => {
    try {
        console.log('🏁 Ending driving session...');
        
        const { sessionId } = req.body;
        
        // Validate required fields
        if (!sessionId) {
            return res.status(400).json({
                status: 'error',
                message: 'sessionId is required'
            });
        }
        
        // Find the session
        const session = await Session.findOne({ sessionId });
        
        if (!session) {
            return res.status(404).json({
                status: 'error',
                message: `Session with ID '${sessionId}' not found`
            });
        }
        
        // Check if session is already ended
        if (session.endTime) {
            return res.status(400).json({
                status: 'error',
                message: 'Session has already been ended',
                data: {
                    sessionId: session.sessionId,
                    endTime: session.endTime,
                    duration: session.duration
                }
            });
        }
        
        // End the session using the instance method
        await session.endSession();
        
        console.log(`✅ Session ended: ${sessionId}`);
        
        res.status(200).json({
            status: 'success',
            message: 'Driving session ended successfully',
            data: {
                session: session,
                sessionDuration: session.duration,
                sessionStatus: session.status
            }
        });
        
    } catch (error) {
        console.error('❌ Error ending session:', error);
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to end session',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// ==============================================
// SESSION DATA RETRIEVAL ENDPOINTS
// ==============================================

/**
 * GET /api/sessions/:id/logs
 * Retrieves all telemetry logs for a specific session
 * 
 * Query parameters:
 * - limit: Number of logs to return (default: 100, max: 1000)
 * - page: Page number for pagination (default: 1)
 * - sort: Sort order - 'newest' or 'oldest' (default: 'newest')
 */
router.get('/:id/logs', async (req, res) => {
    try {
        const sessionId = req.params.id;
        const limit = Math.min(parseInt(req.query.limit) || 100, 1000); // Max 1000 logs
        const page = Math.max(parseInt(req.query.page) || 1, 1); // Min page 1
        const sort = req.query.sort === 'oldest' ? 1 : -1; // Default to newest first
        const skip = (page - 1) * limit;
        
        console.log(`📊 Retrieving logs for session: ${sessionId}`);
        
        // Verify session exists
        const session = await Session.findOne({ sessionId });
        if (!session) {
            return res.status(404).json({
                status: 'error',
                message: `Session with ID '${sessionId}' not found`
            });
        }
        
        // Get telemetry logs with pagination
        const [logs, totalCount] = await Promise.all([
            TelemetryLog.find({ sessionId })
                        .sort({ timestamp: sort })
                        .skip(skip)
                        .limit(limit)
                        .lean(), // Use lean() for better performance
            TelemetryLog.countDocuments({ sessionId })
        ]);
        
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        
        console.log(`✅ Retrieved ${logs.length} logs for session ${sessionId}`);
        
        res.status(200).json({
            status: 'success',
            message: `Retrieved telemetry logs for session ${sessionId}`,
            data: {
                sessionId,
                logs,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalLogs: totalCount,
                    logsPerPage: limit,
                    hasNextPage,
                    hasPrevPage
                },
                session: {
                    sessionId: session.sessionId,
                    startTime: session.startTime,
                    endTime: session.endTime,
                    status: session.status,
                    weather: session.weather,
                    roadType: session.roadType
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error retrieving session logs:', error);
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve session logs',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

/**
 * GET /api/sessions/:id/analytics
 * Returns computed analytics and statistics for a specific session
 * 
 * Computes:
 * - Average speed, max speed, min speed
 * - Total alerts by type and severity
 * - Average reaction time and response analysis
 * - Session duration and driving patterns
 */
router.get('/:id/analytics', async (req, res) => {
    try {
        const sessionId = req.params.id;
        
        console.log(`📈 Computing analytics for session: ${sessionId}`);
        
        // Verify session exists
        const session = await Session.findOne({ sessionId });
        if (!session) {
            return res.status(404).json({
                status: 'error',
                message: `Session with ID '${sessionId}' not found`
            });
        }
        
        // Parallel execution of analytics queries for better performance
        const [
            telemetryStats,
            alertStats,
            responseStats,
            recentTelemetry
        ] = await Promise.all([
            // Telemetry statistics
            TelemetryLog.getSessionStats(sessionId),
            
            // Alert statistics
            Alert.getSessionAlertStats(sessionId),
            
            // Driver response statistics
            DriverResponse.getPerformanceSummary(sessionId),
            
            // Recent telemetry for additional insights
            TelemetryLog.findBySession(sessionId, 10)
        ]);
        
        // Process analytics data
        const analytics = {
            session: {
                sessionId: session.sessionId,
                startTime: session.startTime,
                endTime: session.endTime,
                duration: session.duration,
                durationHours: session.duration ? (session.duration / (1000 * 60 * 60)).toFixed(2) : null,
                status: session.status,
                weather: session.weather,
                roadType: session.roadType
            },
            
            telemetry: telemetryStats[0] || {
                avgSpeed: 0,
                maxSpeed: 0,
                minSpeed: 0,
                avgObstacleDistance: 0,
                minObstacleDistance: 0,
                dataPoints: 0
            },
            
            alerts: alertStats[0] || {
                totalAlerts: 0,
                criticalAlerts: 0,
                acknowledgedAlerts: 0,
                alertsByType: []
            },
            
            driverPerformance: responseStats[0] || {
                totalResponses: 0,
                avgReactionTime: 0,
                appropriatenessRate: 0,
                excellenceRate: 0
            },
            
            insights: {
                safetyScore: calculateSafetyScore(telemetryStats[0], alertStats[0], responseStats[0]),
                drivingPattern: analyzeDrivingPattern(recentTelemetry),
                recommendations: generateRecommendations(telemetryStats[0], alertStats[0], responseStats[0])
            }
        };
        
        // Add reaction time in seconds for better readability
        if (analytics.driverPerformance.avgReactionTime) {
            analytics.driverPerformance.avgReactionTimeSeconds = 
                (analytics.driverPerformance.avgReactionTime / 1000).toFixed(2);
        }
        
        console.log(`✅ Analytics computed for session ${sessionId}`);
        
        res.status(200).json({
            status: 'success',
            message: `Analytics computed for session ${sessionId}`,
            data: analytics
        });
        
    } catch (error) {
        console.error('❌ Error computing session analytics:', error);
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to compute session analytics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// ==============================================
// ANALYTICS HELPER FUNCTIONS
// ==============================================

/**
 * Calculate overall safety score based on session data
 * Returns a score from 0-100 (higher is better)
 */
function calculateSafetyScore(telemetry, alerts, responses) {
    try {
        let score = 100; // Start with perfect score
        
        if (!telemetry || !telemetry.dataPoints) return 0;
        
        // Deduct points for high average speed (assuming 80 km/h is safe limit)
        if (telemetry.avgSpeed > 80) {
            score -= Math.min((telemetry.avgSpeed - 80) * 2, 30);
        }
        
        // Deduct points for alerts
        if (alerts) {
            score -= Math.min(alerts.totalAlerts * 5, 40);
            score -= Math.min(alerts.criticalAlerts * 10, 30);
        }
        
        // Add points for good response performance
        if (responses && responses.totalResponses > 0) {
            score += Math.min(responses.appropriatenessRate * 0.2, 20);
            score -= Math.min(responses.avgReactionTime / 100, 20);
        }
        
        return Math.max(Math.round(score), 0);
    } catch (error) {
        console.warn('Warning: Error calculating safety score:', error);
        return 0;
    }
}

/**
 * Analyze driving patterns from recent telemetry
 */
function analyzeDrivingPattern(recentTelemetry) {
    try {
        if (!recentTelemetry || recentTelemetry.length === 0) {
            return 'insufficient_data';
        }
        
        const avgSpeed = recentTelemetry.reduce((sum, log) => sum + log.speed, 0) / recentTelemetry.length;
        const avgDistance = recentTelemetry.reduce((sum, log) => sum + log.obstacleDistance, 0) / recentTelemetry.length;
        
        if (avgSpeed > 100 && avgDistance < 50) {
            return 'aggressive';
        } else if (avgSpeed < 40 && avgDistance > 100) {
            return 'cautious';
        } else if (avgSpeed > 80 && avgDistance > 80) {
            return 'confident';
        } else {
            return 'moderate';
        }
    } catch (error) {
        console.warn('Warning: Error analyzing driving pattern:', error);
        return 'unknown';
    }
}

/**
 * Generate driving recommendations based on session data
 */
function generateRecommendations(telemetry, alerts, responses) {
    const recommendations = [];
    
    try {
        if (telemetry && telemetry.avgSpeed > 90) {
            recommendations.push('Consider maintaining lower average speeds for improved safety');
        }
        
        if (alerts && alerts.criticalAlerts > 0) {
            recommendations.push('Focus on maintaining safer following distances to reduce critical alerts');
        }
        
        if (responses && responses.avgReactionTime > 3000) {
            recommendations.push('Work on improving reaction times to safety alerts');
        }
        
        if (responses && responses.appropriatenessRate < 80) {
            recommendations.push('Review appropriate responses to different types of safety alerts');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('Great driving! Keep maintaining safe driving practices');
        }
    } catch (error) {
        console.warn('Warning: Error generating recommendations:', error);
        recommendations.push('Unable to generate recommendations at this time');
    }
    
    return recommendations;
}

// Export the router
module.exports = router;
