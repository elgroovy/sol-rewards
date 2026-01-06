import express from "express";
import cors from "cors";
import fs from "fs";
import https from "https";
import http from "http";
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Dynamic imports after dotenv loads.
// This ensures env variables are available when these files are imported
const { default: rewardRoutes } = await import("./routes/rewardRoutes.js");
const { default: jackpotRoutes } = await import("./routes/jackpotRoutes.js");
const { default: tokenMetricsRoutes } = await import("./routes/tokenMetricsRoutes.js");
const { default: earningsRoutes } = await import("./routes/earningsRoutes.js");

const app = express();
const port = process.env.PORT || 3000;
const useHttps = process.env.USE_HTTPS === 'true';

// Middleware to parse JSON
app.use(express.json());
app.use(cors());

// Routes
app.use("/rewards", rewardRoutes);
app.use("/jackpots", jackpotRoutes);
app.use("/metrics", tokenMetricsRoutes);
app.use("/earnings", earningsRoutes);

// Start server
if (useHttps) {
  const options = {
    key:  fs.readFileSync("./pkey.pem"),
    cert: fs.readFileSync("./fullchain.pem"), // leaf + intermediates
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