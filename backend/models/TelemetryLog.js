/**
 * TelemetryLog Model for IndraNav Adaptive Driving System
 * Stores real-time driving telemetry data including speed, GPS, and obstacle detection
 * This is the core data model for real-time driving analysis and alert generation
 */

const mongoose = require('mongoose');

/**
 * GPS Coordinate Sub-Schema
 * Represents geographical coordinates with validation
 */
const gpsSchema = new mongoose.Schema({
    // Latitude coordinate (North/South position)
    lat: {
        type: Number,
        required: [true, 'Latitude is required'],
        min: [-90, 'Latitude must be between -90 and 90 degrees'],
        max: [90, 'Latitude must be between -90 and 90 degrees'],
        validate: {
            validator: function(v) {
                return typeof v === 'number' && !isNaN(v);
            },
            message: 'Latitude must be a valid number'
        }
    },

    // Longitude coordinate (East/West position)
    lng: {
        type: Number,
        required: [true, 'Longitude is required'],
        min: [-180, 'Longitude must be between -180 and 180 degrees'],
        max: [180, 'Longitude must be between -180 and 180 degrees'],
        validate: {
            validator: function(v) {
                return typeof v === 'number' && !isNaN(v);
            },
            message: 'Longitude must be a valid number'
        }
    }
}, { _id: false }); // Don't create separate _id for GPS subdocument

/**
 * TelemetryLog Schema Definition
 * Captures real-time driving data for analysis and alert generation
 */
const telemetryLogSchema = new mongoose.Schema({
    // Reference to the driving session this telemetry belongs to
    // Links telemetry data to specific sessions for analysis
    sessionId: {
        type: String,
        required: [true, 'Session ID is required'],
        trim: true,
        index: true, // Index for fast session-based queries
        validate: {
            validator: function(v) {
                return /^[a-zA-Z0-9]{6,}$/.test(v);
            },
            message: 'Session ID must be alphanumeric and at least 6 characters long'
        }
    },

    // Timestamp when this telemetry data was recorded
    // Critical for time-series analysis and alert correlation
    timestamp: {
        type: Date,
        required: [true, 'Timestamp is required'],
        default: Date.now,
        index: true // Index for time-based queries and sorting
    },

    // Vehicle speed in kilometers per hour (km/h)
    // Used for speed-related alerts and driving behavior analysis
    speed: {
        type: Number,
        required: [true, 'Speed is required'],
        min: [0, 'Speed cannot be negative'],
        max: [300, 'Speed cannot exceed 300 km/h'], // Reasonable upper limit
        validate: {
            validator: function(v) {
                return typeof v === 'number' && !isNaN(v);
            },
            message: 'Speed must be a valid number'
        }
    },

    // GPS coordinates of the vehicle
    // Used for location-based analysis and route tracking
    gps: {
        type: gpsSchema,
        required: [true, 'GPS coordinates are required'],
        validate: {
            validator: function(v) {
                return v && typeof v.lat === 'number' && typeof v.lng === 'number';
            },
            message: 'GPS coordinates must contain valid latitude and longitude'
        }
    },

    // Distance to nearest obstacle in meters
    // Critical data for collision avoidance and safety alerts
    obstacleDistance: {
        type: Number,
        required: [true, 'Obstacle distance is required'],
        min: [0, 'Obstacle distance cannot be negative'],
        max: [1000, 'Obstacle distance cannot exceed 1000 meters'], // Reasonable sensor range
        validate: {
            validator: function(v) {
                return typeof v === 'number' && !isNaN(v);
            },
            message: 'Obstacle distance must be a valid number'
        }
    }
}, {
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true,
    
    // Optimize for time-series data
    collection: 'telemetrylogs',
    
    // Optimize JSON output
    toJSON: {
        transform: function(doc, ret) {
            delete ret.__v;
            return ret;
        }
    }
});

/**
 * Virtual property to calculate approximate stopping distance
 * Based on basic physics: stopping distance = (speed^2) / (2 * deceleration)
 * Assumes average deceleration of 7 m/s² (emergency braking)
 */
telemetryLogSchema.virtual('stoppingDistance').get(function() {
    const speedMs = this.speed * (1000/3600); // Convert km/h to m/s
    const deceleration = 7; // m/s² (emergency braking)
    return Math.round((speedMs * speedMs) / (2 * deceleration));
});

/**
 * Virtual property to assess collision risk
 * Returns risk level based on obstacle distance vs stopping distance
 */
telemetryLogSchema.virtual('collisionRisk').get(function() {
    const stoppingDist = this.stoppingDistance;
    
    if (this.obstacleDistance <= stoppingDist * 0.5) {
        return 'critical';
    } else if (this.obstacleDistance <= stoppingDist) {
        return 'high';
    } else if (this.obstacleDistance <= stoppingDist * 2) {
        return 'medium';
    } else {
        return 'low';
    }
});

/**
 * Instance method to check if telemetry indicates dangerous conditions
 * Returns true if any safety thresholds are exceeded
 */
telemetryLogSchema.methods.isDangerous = function() {
    const speedLimit = 120; // km/h - typical highway speed limit
    const safeDistance = 50; // meters - minimum safe following distance
    
    return this.speed > speedLimit || 
           this.obstacleDistance < safeDistance ||
           this.collisionRisk === 'critical';
};

/**
 * Static method to find telemetry data by session
 * Returns telemetry data sorted by timestamp (newest first)
 */
telemetryLogSchema.statics.findBySession = function(sessionId, limit = 100) {
    return this.find({ sessionId })
               .sort({ timestamp: -1 })
               .limit(limit);
};

/**
 * Static method to find recent telemetry data
 * Useful for real-time monitoring and alerts
 */
telemetryLogSchema.statics.findRecent = function(minutes = 5) {
    const timeThreshold = new Date(Date.now() - minutes * 60 * 1000);
    return this.find({ 
        timestamp: { $gte: timeThreshold } 
    }).sort({ timestamp: -1 });
};

/**
 * Static method to get telemetry statistics for a session
 * Returns aggregated data like average speed, max speed, etc.
 */
telemetryLogSchema.statics.getSessionStats = function(sessionId) {
    return this.aggregate([
        { $match: { sessionId } },
        {
            $group: {
                _id: '$sessionId',
                avgSpeed: { $avg: '$speed' },
                maxSpeed: { $max: '$speed' },
                minSpeed: { $min: '$speed' },
                avgObstacleDistance: { $avg: '$obstacleDistance' },
                minObstacleDistance: { $min: '$obstacleDistance' },
                dataPoints: { $sum: 1 },
                firstTimestamp: { $min: '$timestamp' },
                lastTimestamp: { $max: '$timestamp' }
            }
        }
    ]);
};

/**
 * Compound indexes for optimized queries
 * These indexes support common query patterns in the application
 */

// Index for session-based time-series queries
telemetryLogSchema.index({ sessionId: 1, timestamp: -1 });

// Index for real-time monitoring queries
telemetryLogSchema.index({ timestamp: -1, sessionId: 1 });

// Index for dangerous condition queries
telemetryLogSchema.index({ speed: -1, obstacleDistance: 1 });

/**
 * TTL (Time To Live) index for automatic data cleanup
 * Automatically delete telemetry data older than 30 days to manage storage
 * Comment out this line if you want to keep all historical data
 */
// telemetryLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Export the TelemetryLog model
module.exports = mongoose.model('TelemetryLog', telemetryLogSchema);
