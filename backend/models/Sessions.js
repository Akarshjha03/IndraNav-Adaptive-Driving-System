/**
 * Session Model for IndraNav Adaptive Driving System
 * Represents a driving session with environmental conditions
 * Used to track individual driving sessions and their metadata
 */

const mongoose = require('mongoose');

/**
 * Session Schema Definition
 * Stores information about each driving session including:
 * - Unique session identifier
 * - Session timing (start/end)
 * - Environmental conditions (weather, road type)
 */
const sessionSchema = new mongoose.Schema({
    // Unique identifier for each driving session
    // This will be used to link telemetry data, alerts, and responses
    sessionId: {
        type: String,
        required: [true, 'Session ID is required'],
        unique: true,
        trim: true,
        index: true, // Index for faster queries
        validate: {
            validator: function(v) {
                // Session ID should be alphanumeric and at least 6 characters
                return /^[a-zA-Z0-9]{6,}$/.test(v);
            },
            message: 'Session ID must be alphanumeric and at least 6 characters long'
        }
    },

    // When the driving session started
    startTime: {
        type: Date,
        required: [true, 'Start time is required'],
        default: Date.now,
        index: true // Index for time-based queries
    },

    // When the driving session ended (null if session is ongoing)
    endTime: {
        type: Date,
        default: null,
        validate: {
            validator: function(v) {
                // End time should be after start time if provided
                return !v || v > this.startTime;
            },
            message: 'End time must be after start time'
        }
    },

    // Weather conditions during the session
    // Used for analytics and adaptive behavior analysis
    weather: {
        type: String,
        required: [true, 'Weather condition is required'],
        enum: {
            values: ['sunny', 'cloudy', 'rainy', 'foggy', 'snowy', 'stormy'],
            message: 'Weather must be one of: sunny, cloudy, rainy, foggy, snowy, stormy'
        },
        lowercase: true,
        trim: true
    },

    // Type of road/driving environment
    // Important for understanding driving context and alert patterns
    roadType: {
        type: String,
        required: [true, 'Road type is required'],
        enum: {
            values: ['highway', 'city', 'suburban', 'rural', 'mountain', 'coastal'],
            message: 'Road type must be one of: highway, city, suburban, rural, mountain, coastal'
        },
        lowercase: true,
        trim: true
    }
}, {
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true,
    
    // Optimize JSON output
    toJSON: {
        transform: function(doc, ret) {
            // Remove MongoDB-specific fields from JSON output
            delete ret.__v;
            return ret;
        }
    }
});

/**
 * Virtual property to calculate session duration
 * Returns duration in milliseconds, or null if session is ongoing
 */
sessionSchema.virtual('duration').get(function() {
    if (!this.endTime) {
        // Session is ongoing - calculate current duration
        return Date.now() - this.startTime.getTime();
    }
    return this.endTime.getTime() - this.startTime.getTime();
});

/**
 * Virtual property to get session status
 * Returns 'active' if session is ongoing, 'completed' if finished
 */
sessionSchema.virtual('status').get(function() {
    return this.endTime ? 'completed' : 'active';
});

/**
 * Instance method to end the session
 * Sets the endTime to current timestamp
 */
sessionSchema.methods.endSession = function() {
    this.endTime = new Date();
    return this.save();
};

/**
 * Static method to find active sessions
 * Returns sessions that haven't been ended yet
 */
sessionSchema.statics.findActiveSessions = function() {
    return this.find({ endTime: null });
};

/**
 * Static method to find sessions by date range
 * Useful for analytics and reporting
 */
sessionSchema.statics.findByDateRange = function(startDate, endDate) {
    return this.find({
        startTime: {
            $gte: startDate,
            $lte: endDate
        }
    });
};

/**
 * Pre-save middleware to validate session data
 * Ensures data consistency before saving to database
 */
sessionSchema.pre('save', function(next) {
    // Auto-generate sessionId if not provided
    if (!this.sessionId) {
        this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    next();
});

/**
 * Index for compound queries
 * Optimize queries that filter by weather and road type together
 */
sessionSchema.index({ weather: 1, roadType: 1 });

// Export the Session model
module.exports = mongoose.model('Session', sessionSchema);
