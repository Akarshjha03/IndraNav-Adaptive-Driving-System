/**
 * IndraNav Database Connection
 * Handles MongoDB connection using Mongoose ODM
 * Provides connection management for the Adaptive Driving System
 */

const mongoose = require('mongoose');

/**
 * Connect to MongoDB database
 * Uses connection string from environment variables for security
 * Implements connection pooling and proper error handling
 */
const connectDB = async () => {
    try {
        // Get MongoDB connection string from environment variables
        // This should be set in your .env file as: MONGO_URI=mongodb://localhost:27017/indranav
        // or for MongoDB Atlas: MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/indranav
        const mongoURI = process.env.MONGO_URI;
        
        // Check if MongoDB URI is provided
        if (!mongoURI) {
            throw new Error('MONGO_URI environment variable is not defined');
        }
        
        // Mongoose connection options for MongoDB Atlas (cloud)
        const options = {
            // Connection pool settings
            maxPoolSize: 10, // Maximum number of connections in the pool
            minPoolSize: 2,  // Minimum number of connections in the pool
            
            // Timeout settings
            serverSelectionTimeoutMS: 10000, // Increased timeout for Atlas
            socketTimeoutMS: 45000, // How long to wait for a response
            connectTimeoutMS: 15000, // Increased timeout for initial connection
            
            // TLS/SSL settings for Atlas compatibility (Windows fix)
            tls: true, // Enable TLS
            tlsInsecure: false, // Keep secure connections
            tlsAllowInvalidCertificates: false, // Don't allow invalid certs
            tlsAllowInvalidHostnames: false, // Don't allow invalid hostnames
            
            // Other settings
            maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
            
            // Atlas-specific settings
            retryWrites: true, // Enable retryable writes
            w: 'majority' // Write concern for data safety
        };
        
        // Establish connection to MongoDB
        const connection = await mongoose.connect(mongoURI, options);
        
        console.log(`🟢 MongoDB Connected: ${connection.connection.host}:${connection.connection.port}`);
        console.log(`📂 Database Name: ${connection.connection.name}`);
        
        // Return the connection for any additional setup if needed
        return connection;
        
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        
        // In production, you might want to implement retry logic here
        // For now, we'll exit the process as the app cannot function without DB
        throw error;
    }
};

/**
 * Handle MongoDB connection events
 * These listeners help monitor the database connection status
 */

// Connection successful
mongoose.connection.on('connected', () => {
    console.log('✅ Mongoose connected to MongoDB');
});

// Connection error
mongoose.connection.on('error', (error) => {
    console.error('❌ Mongoose connection error:', error);
});

// Connection disconnected
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ Mongoose disconnected from MongoDB');
});

// Connection reconnected
mongoose.connection.on('reconnected', () => {
    console.log('🔄 Mongoose reconnected to MongoDB');
});

// Handle application termination
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('🛑 MongoDB connection closed through app termination');
    } catch (error) {
        console.error('❌ Error closing MongoDB connection:', error);
    }
});

// Export the connection function
module.exports = connectDB;
