import express from "express";
import cors from "cors";
import fs from "fs";
import https from "https";
import 'dotenv/config';

import rewardRoutes from "./routes/rewardRoutes.js";
import jackpotRoutes from "./routes/jackpotRoutes.js";
import tokenMetricsRoutes from "./routes/tokenMetricsRoutes.js";
import earningsRoutes from "./routes/earningsRoutes.js";

const app = express();
const port = 8443;

// Middleware to parse JSON
app.use(express.json());
app.use(cors());

// Routes
app.use("/api/rewards", rewardRoutes);
app.use("/api/jackpots", jackpotRoutes);
app.use("/api/metrics", tokenMetricsRoutes);
app.use("/api/earnings", earningsRoutes);

const options = {
  key:  fs.readFileSync("/home/ec2-user/sol-rewards/rewards-backend-api/pkey.pem"),
  cert: fs.readFileSync("/home/ec2-user/sol-rewards/rewards-backend-api/fullchain.pem"), // leaf + intermediates
  // If your key is passphrase-protected:
  // passphrase: "your-passphrase"
};

// Start server
https.createServer(options, app).listen(port, () => {
  console.log(`Server running at https://localhost:${port}`);
});

