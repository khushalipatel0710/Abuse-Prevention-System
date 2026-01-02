const express = require('express');
const dotenv = require('dotenv');
const { connectDB } = require('./config/database');
const { initRedis, isRedisConnected } = require('./config/redis');
const { swaggerUi, swaggerSpec } = require('./swagger');

dotenv.config();

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✓ MongoDB connected');

    // Initialize Redis
    await initRedis();
    if (isRedisConnected()) {
      console.log('✓ Redis connection established');
    } else {
      console.warn('⚠ Redis not available, continuing without cache');
    }

    const app = express();

    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Swagger documentation
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // API Routes
    const routes = require('./routes/index');
    
    app.use('/api', routes);

    // Health check
    app.get('/health', (req, res) => {
      const PORT = process.env.PORT || 3000;
      res.json({
        status: 'OK',
        message: 'Server is running',
        redis: isRedisConnected() ? 'connected' : 'disconnected',
        docs: `http://localhost:${PORT}/api-docs`,
      });
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        statusCode: 404,
      });
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error('Server error:', {
        error: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        statusCode: err.status || 500,
      });
    });

    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Swagger docs available at http://localhost:${PORT}/api-docs`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => process.exit(0));
    });
  } catch (error) {
    console.error('Failed to initialize application:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV
    });
    process.exit(1);
  }
};

startServer();