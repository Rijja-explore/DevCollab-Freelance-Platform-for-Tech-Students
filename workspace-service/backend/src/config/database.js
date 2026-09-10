import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

/**
 * MongoDB Database Connection
 * 
 * Exports database connection functions that handle:
 * - Connection string validation
 * - Connection establishment
 * - Error handling
 * - Model registration
 * 
 * This connection is established once in server.js and reused throughout the app.
 * Do NOT create new connections in routes or services.
 */

let mongoConnection = null;

export const connectDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error('MONGODB_URI / MONGO_URI environment variable is not set');
    }

    // Configure Mongoose
    mongoose.set('strictQuery', false);

    // Connect to MongoDB
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000,
      retryWrites: true,
    });

    mongoConnection = mongoose.connection;

    // Connection event handlers
    mongoConnection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoConnection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    logger.info('✅ MongoDB connected successfully');
    logger.info(`📍 Database: ${mongoConnection.name}`);
    logger.info(`🔗 Host: ${mongoConnection.host}:${mongoConnection.port}`);

    return mongoConnection;

  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error.message);
    throw error;
  }
};

/**
 * Get the MongoDB connection instance
 * Use this to access the connection in services/models
 */
export const getDatabase = () => {
  if (!mongoConnection) {
    throw new Error('Database not connected. Call connectDatabase first.');
  }
  return mongoConnection;
};

/**
 * Connect to MongoDB (alias for connectDatabase)
 * Provides the connectMongo function as requested
 */
export const connectMongo = connectDatabase;
/**
 * Disconnect from MongoDB
 * Call this during graceful shutdown
 */
export const disconnectDatabase = async () => {
  try {
    if (mongoConnection) {
      await mongoose.disconnect();
      mongoConnection = null;
      logger.info('MongoDB disconnected');
    }
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
};
