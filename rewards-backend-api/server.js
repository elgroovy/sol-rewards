import express from "express";
import cors from "cors";
import fs from "fs";
import https from "https";
import http from "http";
import 'dotenv/config';

import rewardRoutes from "./routes/rewardRoutes.js";
import jackpotRoutes from "./routes/jackpotRoutes.js";
import tokenMetricsRoutes from "./routes/tokenMetricsRoutes.js";
import earningsRoutes from "./routes/earningsRoutes.js";

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