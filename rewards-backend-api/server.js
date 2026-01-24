import express from "express";
import cors from "cors";
import helmet from "helmet";
import fs from "fs";
import https from "https";
import http from "http";
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import middleware
import { publicLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Dynamic imports after dotenv loads.
// This ensures env variables are available when these files are imported
const { default: rewardRoutes } = await import("./routes/rewardRoutes.js");
const { default: jackpotRoutes } = await import("./routes/jackpotRoutes.js");
const { default: tokenMetricsRoutes } = await import("./routes/tokenMetricsRoutes.js");
const { default: earningsRoutes } = await import("./routes/earningsRoutes.js");

const app = express();
const port = process.env.PORT || 3000;
const useHttps = process.env.USE_HTTPS === 'true';

// Security headers
app.use(helmet());

// CORS configuration - whitelist allowed origins
const ALLOWED_ORIGINS = [
  'https://testrewardstoken.com',
  'https://www.testrewardstoken.com',
  process.env.NODE_ENV === 'development' && 'http://localhost:3000',
  process.env.NODE_ENV === 'development' && 'http://localhost:5173',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Rate limiting
app.use(publicLimiter);

// Body parsing with size limit
app.use(express.json({ limit: '10kb' }));

// Trust proxy if behind reverse proxy (for rate limiting)
app.set('trust proxy', 1);

// Routes
app.use("/rewards", rewardRoutes);
app.use("/jackpots", jackpotRoutes);
app.use("/metrics", tokenMetricsRoutes);
app.use("/earnings", earningsRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
if (useHttps) {
  const options = {
    key:  fs.readFileSync("/etc/letsencrypt/live/api.testrewardstoken.com/privkey.pem"),
    cert: fs.readFileSync("/etc/letsencrypt/live/api.testrewardstoken.com/fullchain.pem"), // leaf + intermediates
    // If your key is passphrase-protected:
    // passphrase: "your-passphrase"
  };
  
  https.createServer(options, app).listen(port, () => {
    console.log(`Server running at https://localhost:${port}`);
  });
} else {
  http.createServer(app).listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}