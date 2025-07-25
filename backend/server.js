/**
 * IndraNav Backend Server
 * Main Express.js server for the Adaptive Driving System
 * Handles API routes, WebSocket connections, and real-time telemetry processing
 */

// Import required dependencies
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Import database connection
const connectDB = require('./db');

// Import Mongoose models (registers them with Mongoose)
require('./models/Sessions');
require('./models/TelemetryLog');
require('./models/Alert');
require('./models/DriverResponse');

// Load environment variables from .env file
// This allows us to store sensitive configuration like MongoDB URI, port numbers, etc.
dotenv.config();

// Create Express application instance
const app = express();

// Get port from environment variables or default to 5000
const PORT = process.env.PORT || 5000;

// ==============================================
// MIDDLEWARE CONFIGURATION
// ==============================================

// Enable CORS (Cross-Origin Resource Sharing)
// This allows our React frontend to communicate with the backend
// when they're running on different ports during development
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Vite's default port
    credentials: true // Allow cookies and authentication headers
}));

// Parse incoming JSON requests
// This middleware automatically parses JSON payloads in request bodies
// and makes them available in req.body
app.use(express.json({ limit: '10mb' })); // Set limit for large telemetry data

// Parse URL-encoded requests (for form submissions)
app.use(express.urlencoded({ extended: true }));

// ==============================================
// ROUTES CONFIGURATION
// ==============================================

// Health check endpoint
// This route allows monitoring systems and the frontend to verify
// that the backend server is running and responsive
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'IndraNav Backend Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Import API route modules
const sessionsRouter = require('./routes/sessions');
const telemetryRouter = require('./routes/telemetry');
const alertsRouter = require('./routes/alerts');
const responseRouter = require('./routes/response');

// Use API routes with proper prefixes
app.use('/api/sessions', sessionsRouter);     // Session management and analytics
app.use('/api/telemetry', telemetryRouter);   // Real-time telemetry data
app.use('/api/alerts', alertsRouter);         // Safety alerts and hazard detection
app.use('/api/response', responseRouter);     // Driver response tracking

// ==============================================
// ERROR HANDLING MIDDLEWARE
// ==============================================

// Handle 404 errors for undefined routes
app.all('*', (req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Route ${req.originalUrl} not found`
    });
});

// Global error handler
// This catches any unhandled errors in the application
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ==============================================
// SERVER STARTUP
// ==============================================

// Start the server
const startServer = async () => {
    try {
        // Connect to MongoDB database
        await connectDB();
        console.log('✅ Database connected successfully');
        
        // Start the HTTP server
        const server = app.listen(PORT, () => {
            console.log(`🚀 IndraNav Backend Server running on port ${PORT}`);
            console.log(`📊 Health check available at: http://localhost:${PORT}/api/health`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
        
        // Initialize WebSocket server for real-time telemetry streaming
        const initWebSocket = require('./ws/websocketServer');
        const wsServer = initWebSocket(server);
        console.log('🌐 WebSocket server initialized for real-time communication');
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1); // Exit process with failure code
    }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM. Shutting down gracefully...');
    process.exit(0);
});

// Start the server
startServer();

// Export app for testing purposes
module.exports = app;
