```javascript
/**
 * @file index.js
 * @description Main entry point for the IntelliSuggest API Gateway.
 * This service acts as a single entry point for all client requests, routing them
 * to the appropriate backend microservices (e.g., Recommendation Engine).
 * It handles cross-cutting concerns such as authentication, rate limiting,
 * logging, and CORS.
 *
 * @requires express - Fast, unopinionated, minimalist web framework for Node.js.
 * @requires cors - Middleware for enabling Cross-Origin Resource Sharing.
 * @requires helmet - Middleware for securing Express apps by setting various HTTP headers.
 * @requires morgan - HTTP request logger middleware.
 * @requires express-rate-limit - Basic rate-limiting middleware.
 * @requires http-proxy-middleware - Proxy middleware for Express.
 * @requires dotenv - Module to load environment variables from a .env file.
 */

// --- Imports ---
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = 'morgan';
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const dotenv = require('dotenv');

// --- Configuration ---
// Load environment variables from .env file into process.env
dotenv.config();

const {
  PORT = 8080,
  NODE_ENV = 'development',
  CORS_ORIGIN = 'http://localhost:3000',
  RECOMMENDATION_SERVICE_URL = 'http://recommendation-engine:5000',
  ANALYTICS_SERVICE_URL = 'http://recommendation-engine:5000', // Can be a separate service
  RATE_LIMIT_WINDOW_MIN = 15,
  RATE_LIMIT_MAX_REQUESTS = 100,
} = process.env;

// --- Application Initialization ---
const app = express();

// --- Core Middleware ---

// Set security-related HTTP response headers
app.use(helmet());

// Enable Cross-Origin Resource Sharing (CORS)
const corsOptions = {
  origin: CORS_ORIGIN,
  optionsSuccessStatus: 200, // For legacy browser support
};
app.use(cors(corsOptions));

// Parse incoming JSON and URL-encoded payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log HTTP requests. Use 'combined' for production and 'dev' for development.
app.use(require(morgan)(NODE_ENV === 'production' ? 'combined' : 'dev'));

// Apply rate limiting to all API routes to prevent abuse
const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MIN * 60 * 1000, // e.g., 15 minutes
  max: parseInt(RATE_LIMIT_MAX_REQUESTS, 10), // Max requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: `Too many requests from this IP, please try again after ${RATE_LIMIT_WINDOW_MIN} minutes.`,
});
app.use('/api', apiLimiter);

// --- Health Check Endpoint ---
// Provides a simple endpoint to verify that the API Gateway is running.
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
  });
});

// --- Service Proxying ---
// Define proxy middleware options
const proxyOptions = (target, pathRewrite) => ({
  target,
  changeOrigin: true,
  pathRewrite,
  onProxyReq: (proxyReq, req, res) => {
    // Add custom headers to the proxied request, e.g., for tracing or user identification
    proxyReq.setHeader('X-Request-ID', require('crypto').randomUUID());
    proxyReq.setHeader('X-Forwarded-For', req.ip);
  },
  onError: (err, req, res) => {
    console.error(`Proxy Error: ${err.message}`, { service: target });
    res.status(502).json({ message: 'Bad Gateway', error: `Could not connect to the downstream service.` });
  },
});

// All API routes are versioned under /api/v1
const apiRouter = express.Router();

// Proxy requests for recommendations to the Python Recommendation Engine
apiRouter.use(
  '/recommendations',
  createProxyMiddleware(proxyOptions(RECOMMENDATION_SERVICE_URL, {
    '^/api/v1/recommendations': '/', // Rewrite /api/v1/recommendations/user/123 -> /user/123
  }))
);

// Proxy requests for analytics to the designated analytics service
apiRouter.use(
  '/analytics',
  createProxyMiddleware(proxyOptions(ANALYTICS_SERVICE_URL, {
    '^/api/v1/analytics': '/analytics', // Rewrite /api/v1/analytics/trends -> /analytics/trends
  }))
);

// Mount the API router
app.use('/api/v1', apiRouter);

// --- Error Handling Middleware ---

// Handle 404 Not Found for any unhandled routes
app.use((req, res, next) => {
  res.status(404).json({ message: 'Not Found: The requested resource does not exist.' });
});

// Global error handler to catch any unhandled errors
// This ensures that no stack traces are leaked to the client in production.
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

// --- Server Startup ---
const server = app.listen(PORT, () => {
  console.log(`✅ API Gateway is running in ${NODE_ENV} mode on http://localhost:${PORT}`);
  console.log(`➡️  Proxying '/api/v1/recommendations' to ${RECOMMENDATION_SERVICE_URL}`);
  console.log(`➡️  Proxying '/api/v1/analytics' to ${ANALYTICS_SERVICE_URL}`);
});

// --- Graceful Shutdown ---
// Listen for termination signals to ensure a clean shutdown process,
// which is crucial in containerized environments (e.g., Docker, Kubernetes).
const gracefulShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('✅ HTTP server closed.');
    // In a real application, you would also close database connections, etc.
    process.exit(0);
  });

  // Force shutdown if the server fails to close within a timeout period
  setTimeout(() => {
    console.error('Could not close connections in time, forcing shutdown.');
    process.exit(1);
  }, 10000); // 10-second timeout
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```