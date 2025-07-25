/**
 * Driver Response Router for IndraNav Adaptive Driving System
 * Handles driver response data for behavior analysis
 * Tracks reaction times and response appropriateness
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Import models
const DriverResponse = mongoose.model('DriverResponse');
const Alert = mongoose.model('Alert');
const Session = mongoose.model('Session');
const TelemetryLog = mongoose.model('TelemetryLog');

// ==============================================
// DRIVER RESPONSE CREATION ENDPOINTS
// ==============================================

/**
 * POST /api/response
 * Records a driver's response to a safety alert
 * 
 * Expected body:
 * {
 *   "sessionId": "session_123",              // Required: Session identifier
 *   "alertId": "65f1234567890abcdef12345",   // Required: ObjectId of the alert being responded to
 *   "actionTaken": "brake_applied",          // Required: Type of action taken
 *   "reactionTime": 1250,                    // Required: Time in milliseconds to respond
 *   "effectiveness": "good",                 // Optional: Auto-calculated if not provided
 *   "appropriate": true,                     // Optional: Auto-evaluated if not provided
 *   "notes": "Driver responded quickly",     // Optional: Additional context
 *   "responseContext": {                     // Optional: Telemetry at time of response
 *     "speed": 85.5,
 *     "obstacleDistance": 45.0,
 *     "gps": { "lat": 40.7128, "lng": -74.0060 }
 *   },
 *   "timestamp": "2024-01-01T12:00:05Z"     // Optional: Auto-generated if not provided
 * }
 */
router.post('/', async (req, res) => {
    try {
        console.log('🎯 Recording driver response...');
        
        const {
            sessionId,
            alertId,
            actionTaken,
            reactionTime,
            effectiveness,
            appropriate,
            notes,
            responseContext,
            timestamp
        } = req.body;
        
        // Validate required fields
        if (!sessionId) {
            return res.status(400).json({
                status: 'error',
                message: 'sessionId is required',
                field: 'sessionId'
            });
        }
        
        if (!alertId) {
            return res.status(400).json({
                status: 'error',
                message: 'alertId is required',
                field: 'alertId'
            });
        }
        
        if (!actionTaken) {
            return res.status(400).json({
                status: 'error',
                message: 'actionTaken is required',
                field: 'actionTaken',
                validActions: [
                    'brake_applied', 'speed_reduced', 'lane_change', 'steering_corrected',
                    'hazards_activated', 'stopped_vehicle', 'acknowledged_only', 'no_action',
                    'accelerated', 'ignored_alert', 'manual_override', 'emergency_maneuver'
                ]
            });
        }
        
        if (typeof reactionTime !== 'number' || reactionTime < 0) {
            return res.status(400).json({
                status: 'error',
                message: 'reactionTime must be a positive number in milliseconds',
                field: 'reactionTime',
                received: reactionTime
            });
        }
        
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(alertId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid alertId format',
                field: 'alertId'
            });
        }
        
        // Verify session exists
        const sessionExists = await Session.findOne({ sessionId });
        if (!sessionExists) {
            return res.status(404).json({
                status: 'error',
                message: `Session '${sessionId}' not found`
            });
        }
        
        // Verify alert exists and belongs to the session
        const alert = await Alert.findById(alertId);
        if (!alert) {
            return res.status(404).json({
                status: 'error',
                message: `Alert with ID '${alertId}' not found`
            });
        }
        
        if (alert.sessionId !== sessionId) {
            return res.status(400).json({
                status: 'error',
                message: 'Alert does not belong to the specified session',
                alertSession: alert.sessionId,
                requestedSession: sessionId
            });
        }
        
        // Check if response already exists for this alert
        const existingResponse = await DriverResponse.findOne({ alertId });
        if (existingResponse) {
            return res.status(409).json({
                status: 'error',
                message: 'Response already recorded for this alert',
                data: {
                    existingResponse: existingResponse._id,
                    originalAction: existingResponse.actionTaken,
                    originalReactionTime: existingResponse.reactionTime
                }
            });
        }
        
        // Create response data
        const responseData = {
            sessionId,
            alertId,
            actionTaken: actionTaken.toLowerCase().trim(),
            reactionTime
        };
        
        // Add optional fields if provided
        if (effectiveness) {
            responseData.effectiveness = effectiveness.toLowerCase().trim();
        }
        
        if (typeof appropriate === 'boolean') {
            responseData.appropriate = appropriate;
        }
        
        if (notes) {
            responseData.notes = notes.trim();
        }
        
        if (responseContext) {
            responseData.responseContext = responseContext;
        }
        
        if (timestamp) {
            responseData.timestamp = new Date(timestamp);
        }
        
        // Create new driver response
        const newResponse = new DriverResponse(responseData);
        await newResponse.save();
        
        // Auto-evaluate appropriateness if not provided
        if (typeof appropriate !== 'boolean') {
            try {
                await newResponse.evaluateAppropriate();
            } catch (error) {
                console.warn('Warning: Could not auto-evaluate appropriateness:', error.message);
            }
        }
        
        // Get performance insights
        const performanceInsights = {
            reactionTimeCategory: newResponse.reactionTimeCategory,
            reactionTimeSeconds: newResponse.reactionTimeSeconds,
            effectiveness: newResponse.effectiveness,
            appropriate: newResponse.appropriate
        };
        
        // Fetch related context for additional insights
        let contextualData = {};
        try {
            const [alertContext, recentResponses] = await Promise.all([
                Alert.findById(alertId).select('type severity timestamp message'),
                DriverResponse.find({ sessionId })
                              .sort({ timestamp: -1 })
                              .limit(5)
                              .select('actionTaken reactionTime effectiveness')
            ]);
            
            contextualData = {
                alertContext,
                recentPerformance: {
                    averageReactionTime: recentResponses.length > 0 
                        ? recentResponses.reduce((sum, r) => sum + r.reactionTime, 0) / recentResponses.length 
                        : null,
                    responseCount: recentResponses.length
                }
            };
        } catch (error) {
            console.warn('Warning: Could not fetch contextual data:', error.message);
        }
        
        console.log(`✅ Driver response recorded: ${actionTaken} for alert ${alertId} | Reaction: ${reactionTime}ms`);
        
        res.status(201).json({
            status: 'success',
            message: 'Driver response recorded successfully',
            data: {
                response: newResponse,
                performanceInsights,
                contextualData,
                recordingTimestamp: new Date().toISOString()
            }
        });
        
        // Log performance insights for monitoring
        if (reactionTime > 5000) {
            console.warn(`⚠️ Slow reaction time detected: ${reactionTime}ms for session ${sessionId}`);
        }
        
        if (!newResponse.appropriate) {
            console.warn(`⚠️ Inappropriate response detected: ${actionTaken} for alert type ${alert.type}`);
        }
        
    } catch (error) {
        console.error('❌ Error recording driver response:', error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message,
                value: err.value
            }));
            
            return res.status(400).json({
                status: 'error',
                message: 'Driver response validation failed',
                errors: validationErrors
            });
        }
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to record driver response',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// ==============================================
// DRIVER RESPONSE ANALYSIS ENDPOINTS
// ==============================================

/**
 * GET /api/response/session/:sessionId/performance
 * Analyzes driver performance for a specific session
 * Returns detailed performance metrics and insights
 */
router.get('/session/:sessionId/performance', async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        
        console.log(`📊 Analyzing driver performance for session: ${sessionId}`);
        
        // Verify session exists
        const session = await Session.findOne({ sessionId });
        if (!session) {
            return res.status(404).json({
                status: 'error',
                message: `Session '${sessionId}' not found`
            });
        }
        
        // Get comprehensive performance data using static methods
        const [
            responses,
            performanceSummary,
            reactionTimeStats
        ] = await Promise.all([
            DriverResponse.findBySession(sessionId),
            DriverResponse.getPerformanceSummary(sessionId),
            DriverResponse.getReactionTimeStats(sessionId)
        ]);
        
        if (responses.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: `No driver responses found for session '${sessionId}'`
            });
        }
        
        // Calculate additional performance metrics
        const performanceMetrics = calculateDetailedPerformanceMetrics(responses);
        
        // Generate performance insights and recommendations
        const insights = generatePerformanceInsights(performanceSummary[0], performanceMetrics);
        
        console.log(`✅ Performance analysis completed for session: ${sessionId}`);
        
        res.status(200).json({
            status: 'success',
            message: `Driver performance analysis for session ${sessionId}`,
            data: {
                sessionId,
                session: {
                    startTime: session.startTime,
                    endTime: session.endTime,
                    duration: session.duration,
                    weather: session.weather,
                    roadType: session.roadType
                },
                performanceSummary: performanceSummary[0] || {},
                detailedMetrics: performanceMetrics,
                reactionTimeByAction: reactionTimeStats,
                insights,
                totalResponses: responses.length,
                analysisTimestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ Error analyzing driver performance:', error);
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to analyze driver performance',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

/**
 * GET /api/response/analytics/reaction-times
 * Global reaction time analytics across all sessions
 * Useful for benchmarking and system-wide insights
 */
router.get('/analytics/reaction-times', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7; // Default to last 7 days
        const minResponses = parseInt(req.query.minResponses) || 5; // Minimum responses for inclusion
        
        console.log(`📈 Computing global reaction time analytics for last ${days} days...`);
        
        const dateThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        // Global reaction time statistics
        const globalStats = await DriverResponse.aggregate([
            {
                $match: {
                    timestamp: { $gte: dateThreshold }
                }
            },
            {
                $group: {
                    _id: null,
                    totalResponses: { $sum: 1 },
                    avgReactionTime: { $avg: '$reactionTime' },
                    medianReactionTime: { $median: '$reactionTime' },
                    minReactionTime: { $min: '$reactionTime' },
                    maxReactionTime: { $max: '$reactionTime' },
                    excellentResponses: {
                        $sum: { $cond: [{ $lte: ['$reactionTime', 1000] }, 1, 0] }
                    },
                    goodResponses: {
                        $sum: { $cond: [{ $and: [{ $gt: ['$reactionTime', 1000] }, { $lte: ['$reactionTime', 2000] }] }, 1, 0] }
                    },
                    adequateResponses: {
                        $sum: { $cond: [{ $and: [{ $gt: ['$reactionTime', 2000] }, { $lte: ['$reactionTime', 5000] }] }, 1, 0] }
                    },
                    poorResponses: {
                        $sum: { $cond: [{ $gt: ['$reactionTime', 5000] }, 1, 0] }
                    }
                }
            }
        ]);
        
        // Reaction time distribution by action type
        const actionTypeStats = await DriverResponse.getReactionTimeStats();
        
        // Performance trends over time
        const performanceTrends = await DriverResponse.aggregate([
            {
                $match: {
                    timestamp: { $gte: dateThreshold }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
                    },
                    avgReactionTime: { $avg: '$reactionTime' },
                    responseCount: { $sum: 1 },
                    excellentRate: {
                        $avg: { $cond: [{ $lte: ['$reactionTime', 1000] }, 100, 0] }
                    }
                }
            },
            { $sort: { '_id.date': 1 } }
        ]);
        
        console.log(`✅ Global reaction time analytics computed`);
        
        res.status(200).json({
            status: 'success',
            message: 'Global reaction time analytics',
            data: {
                analysisParameters: {
                    periodDays: days,
                    minimumResponses: minResponses,
                    dateRange: {
                        from: dateThreshold,
                        to: new Date()
                    }
                },
                globalStatistics: globalStats[0] || {},
                actionTypeBreakdown: actionTypeStats,
                performanceTrends,
                benchmarks: {
                    excellent: '< 1 second',
                    good: '1-2 seconds',
                    adequate: '2-5 seconds',
                    poor: '> 5 seconds'
                },
                analysisTimestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ Error computing reaction time analytics:', error);
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to compute reaction time analytics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Calculate detailed performance metrics from driver responses
 */
function calculateDetailedPerformanceMetrics(responses) {
    if (responses.length === 0) return {};
    
    const reactionTimes = responses.map(r => r.reactionTime);
    const sortedTimes = reactionTimes.sort((a, b) => a - b);
    
    return {
        reactionTimeStats: {
            mean: reactionTimes.reduce((sum, time) => sum + time, 0) / reactionTimes.length,
            median: sortedTimes[Math.floor(sortedTimes.length / 2)],
            standardDeviation: calculateStandardDeviation(reactionTimes),
            percentile95: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
            range: sortedTimes[sortedTimes.length - 1] - sortedTimes[0]
        },
        responseCategories: {
            excellent: responses.filter(r => r.reactionTime <= 1000).length,
            good: responses.filter(r => r.reactionTime > 1000 && r.reactionTime <= 2000).length,
            adequate: responses.filter(r => r.reactionTime > 2000 && r.reactionTime <= 5000).length,
            poor: responses.filter(r => r.reactionTime > 5000).length
        },
        actionDistribution: responses.reduce((acc, response) => {
            acc[response.actionTaken] = (acc[response.actionTaken] || 0) + 1;
            return acc;
        }, {}),
        effectivenessDistribution: responses.reduce((acc, response) => {
            acc[response.effectiveness] = (acc[response.effectiveness] || 0) + 1;
            return acc;
        }, {})
    };
}

/**
 * Generate performance insights and recommendations
 */
function generatePerformanceInsights(summary, metrics) {
    const insights = {
        strengths: [],
        improvements: [],
        recommendations: [],
        overallGrade: 'C' // Default grade
    };
    
    if (!summary) return insights;
    
    try {
        // Analyze reaction time performance
        if (summary.avgReactionTime <= 1500) {
            insights.strengths.push('Excellent reaction times to alerts');
            insights.overallGrade = 'A';
        } else if (summary.avgReactionTime <= 3000) {
            insights.strengths.push('Good reaction times to alerts');
            insights.overallGrade = 'B';
        } else {
            insights.improvements.push('Reaction times could be improved');
            insights.recommendations.push('Practice emergency response scenarios to improve reaction speed');
        }
        
        // Analyze appropriateness rate
        if (summary.appropriatenessRate >= 90) {
            insights.strengths.push('Consistently appropriate responses to alerts');
        } else if (summary.appropriatenessRate < 70) {
            insights.improvements.push('Some responses may not be appropriate for alert types');
            insights.recommendations.push('Review proper responses for different alert types');
        }
        
        // Analyze consistency
        if (metrics.reactionTimeStats && metrics.reactionTimeStats.standardDeviation < 1000) {
            insights.strengths.push('Consistent response performance');
        } else if (metrics.reactionTimeStats && metrics.reactionTimeStats.standardDeviation > 2000) {
            insights.improvements.push('Response times vary significantly');
            insights.recommendations.push('Focus on maintaining consistent attention levels');
        }
        
        // Overall recommendations
        if (insights.improvements.length === 0) {
            insights.recommendations.push('Excellent driving performance! Continue maintaining high safety standards');
        }
        
    } catch (error) {
        console.warn('Warning: Error generating performance insights:', error);
        insights.recommendations.push('Unable to generate detailed insights at this time');
    }
    
    return insights;
}

/**
 * Calculate standard deviation for reaction times
 */
function calculateStandardDeviation(values) {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / squaredDiffs.length;
    return Math.sqrt(avgSquaredDiff);
}

// Export the router
module.exports = router;
