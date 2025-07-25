/**
 * Telemetry Router for IndraNav Adaptive Driving System
 * Handles real-time telemetry data ingestion
 * Processes speed, GPS, and obstacle distance data
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Import models
const TelemetryLog = mongoose.model('TelemetryLog');
const Session = mongoose.model('Session');

// ==============================================
// TELEMETRY DATA INGESTION ENDPOINTS
// ==============================================

/**
 * POST /api/telemetry
 * Saves new telemetry data for real-time driving analysis
 * 
 * Expected body:
 * {
 *   "sessionId": "session_123",           // Required: Session identifier
 *   "speed": 75.5,                        // Required: Speed in km/h (0-300)
 *   "gps": {                              // Required: GPS coordinates
 *     "lat": 40.7128,                     // Required: Latitude (-90 to 90)
 *     "lng": -74.0060                     // Required: Longitude (-180 to 180)
 *   },
 *   "obstacleDistance": 150.3,            // Required: Distance in meters (0-1000)
 *   "timestamp": "2024-01-01T12:00:00Z"   // Optional: Auto-generated if not provided
 * }
 */
router.post('/', async (req, res) => {
    try {
        console.log('📡 Receiving telemetry data...');
        
        const { sessionId, speed, gps, obstacleDistance, timestamp } = req.body;
        
        // Validate required fields
        if (!sessionId) {
            return res.status(400).json({
                status: 'error',
                message: 'sessionId is required',
                field: 'sessionId'
            });
        }
        
        if (typeof speed !== 'number') {
            return res.status(400).json({
                status: 'error',
                message: 'speed must be a number (km/h)',
                field: 'speed',
                received: typeof speed
            });
        }
        
        if (!gps || typeof gps.lat !== 'number' || typeof gps.lng !== 'number') {
            return res.status(400).json({
                status: 'error',
                message: 'gps must contain valid lat and lng coordinates',
                field: 'gps',
                required: { lat: 'number', lng: 'number' },
                received: gps
            });
        }
        
        if (typeof obstacleDistance !== 'number') {
            return res.status(400).json({
                status: 'error',
                message: 'obstacleDistance must be a number (meters)',
                field: 'obstacleDistance',
                received: typeof obstacleDistance
            });
        }
        
        // Verify session exists (optional - can be disabled for performance)
        if (process.env.VERIFY_SESSION !== 'false') {
            const sessionExists = await Session.findOne({ sessionId });
            if (!sessionExists) {
                return res.status(404).json({
                    status: 'error',
                    message: `Session '${sessionId}' not found`,
                    hint: 'Make sure to start a session before sending telemetry data'
                });
            }
        }
        
        // Create telemetry log entry
        const telemetryData = {
            sessionId,
            speed,
            gps: {
                lat: gps.lat,
                lng: gps.lng
            },
            obstacleDistance
        };
        
        // Add custom timestamp if provided
        if (timestamp) {
            telemetryData.timestamp = new Date(timestamp);
        }
        
        const telemetryLog = new TelemetryLog(telemetryData);
        const savedLog = await telemetryLog.save();
        
        // Calculate derived safety metrics
        const safetyMetrics = {
            stoppingDistance: savedLog.stoppingDistance,
            collisionRisk: savedLog.collisionRisk,
            isDangerous: savedLog.isDangerous()
        };
        
        console.log(`✅ Telemetry saved for session: ${sessionId} | Risk: ${safetyMetrics.collisionRisk}`);
        
        // Return success response with safety analysis
        res.status(201).json({
            status: 'success',
            message: 'Telemetry data saved successfully',
            data: {
                telemetryLog: savedLog,
                safetyMetrics,
                analysisTimestamp: new Date().toISOString()
            }
        });
        
        // Optional: Trigger real-time safety alerts (could be done in background)
        if (safetyMetrics.isDangerous) {
            console.warn(`⚠️ Dangerous conditions detected for session: ${sessionId}`);
            // TODO: Could trigger WebSocket alert or add to alert queue
        }
        
    } catch (error) {
        console.error('❌ Error saving telemetry data:', error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message,
                value: err.value
            }));
            
            return res.status(400).json({
                status: 'error',
                message: 'Telemetry data validation failed',
                errors: validationErrors
            });
        }
        
        // Handle cast errors (invalid data types)
        if (error.name === 'CastError') {
            return res.status(400).json({
                status: 'error',
                message: `Invalid data type for field '${error.path}'`,
                field: error.path,
                expectedType: error.kind,
                receivedValue: error.value
            });
        }
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to save telemetry data',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// ==============================================
// BULK TELEMETRY ENDPOINTS (for high-frequency data)
// ==============================================

/**
 * POST /api/telemetry/batch
 * Saves multiple telemetry entries in a single request
 * Useful for bulk data uploads or when connectivity is intermittent
 * 
 * Expected body:
 * {
 *   "sessionId": "session_123",
 *   "telemetryBatch": [
 *     {
 *       "speed": 75.5,
 *       "gps": { "lat": 40.7128, "lng": -74.0060 },
 *       "obstacleDistance": 150.3,
 *       "timestamp": "2024-01-01T12:00:00Z"
 *     },
 *     // ... more telemetry entries
 *   ]
 * }
 */
router.post('/batch', async (req, res) => {
    try {
        console.log('📡 Receiving batch telemetry data...');
        
        const { sessionId, telemetryBatch } = req.body;
        
        // Validate required fields
        if (!sessionId) {
            return res.status(400).json({
                status: 'error',
                message: 'sessionId is required'
            });
        }
        
        if (!Array.isArray(telemetryBatch) || telemetryBatch.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'telemetryBatch must be a non-empty array'
            });
        }
        
        if (telemetryBatch.length > 1000) {
            return res.status(400).json({
                status: 'error',
                message: 'Batch size cannot exceed 1000 entries',
                maxBatchSize: 1000,
                receivedSize: telemetryBatch.length
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
        
        // Prepare batch data with validation
        const telemetryDocs = telemetryBatch.map((entry, index) => {
            if (!entry.speed || !entry.gps || !entry.obstacleDistance) {
                throw new Error(`Entry at index ${index} is missing required fields`);
            }
            
            return {
                sessionId,
                speed: entry.speed,
                gps: entry.gps,
                obstacleDistance: entry.obstacleDistance,
                timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date()
            };
        });
        
        // Use insertMany for better performance with large batches
        const savedLogs = await TelemetryLog.insertMany(telemetryDocs, { 
            ordered: false // Continue even if some entries fail
        });
        
        // Analyze batch for safety patterns
        const dangerousCount = savedLogs.filter(log => {
            const tempLog = new TelemetryLog(log);
            return tempLog.isDangerous();
        }).length;
        
        console.log(`✅ Batch telemetry saved: ${savedLogs.length} entries for session: ${sessionId}`);
        
        res.status(201).json({
            status: 'success',
            message: 'Batch telemetry data saved successfully',
            data: {
                sessionId,
                entriesProcessed: savedLogs.length,
                totalRequested: telemetryBatch.length,
                dangerousConditions: dangerousCount,
                processingTimestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ Error saving batch telemetry data:', error);
        
        // Handle bulk write errors
        if (error.name === 'BulkWriteError') {
            const successCount = error.result.insertedCount || 0;
            const failedCount = telemetryBatch.length - successCount;
            
            return res.status(207).json({ // 207 Multi-Status
                status: 'partial_success',
                message: 'Some telemetry entries failed to save',
                data: {
                    successCount,
                    failedCount,
                    errors: error.writeErrors?.map(err => ({
                        index: err.index,
                        message: err.errmsg
                    })) || []
                }
            });
        }
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to save batch telemetry data',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// ==============================================
// TELEMETRY UTILITY ENDPOINTS
// ==============================================

/**
 * GET /api/telemetry/latest/:sessionId
 * Retrieves the most recent telemetry entry for a session
 * Useful for real-time dashboard updates
 */
router.get('/latest/:sessionId', async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        
        console.log(`📡 Retrieving latest telemetry for session: ${sessionId}`);
        
        const latestTelemetry = await TelemetryLog.findOne({ sessionId })
                                                 .sort({ timestamp: -1 })
                                                 .lean();
        
        if (!latestTelemetry) {
            return res.status(404).json({
                status: 'error',
                message: `No telemetry data found for session '${sessionId}'`
            });
        }
        
        // Add safety analysis
        const tempLog = new TelemetryLog(latestTelemetry);
        const safetyMetrics = {
            stoppingDistance: tempLog.stoppingDistance,
            collisionRisk: tempLog.collisionRisk,
            isDangerous: tempLog.isDangerous()
        };
        
        res.status(200).json({
            status: 'success',
            message: 'Latest telemetry retrieved successfully',
            data: {
                telemetry: latestTelemetry,
                safetyMetrics,
                retrievalTimestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ Error retrieving latest telemetry:', error);
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve latest telemetry',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Export the router
module.exports = router;
