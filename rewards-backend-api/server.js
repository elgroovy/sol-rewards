import express from "express";
import cors from "cors";

import rewardRoutes from "./routes/rewardRoutes.js";
import jackpotRoutes from "./routes/jackpotRoutes.js";
import tokenMetricsRoutes from "./routes/tokenMetricsRoutes.js";
import earningsRoutes from "./routes/earningsRoutes.js";

const app = express();
const port = 3000;

// Middleware to parse JSON
app.use(express.json());
app.use(cors());

// Routes
app.use("/api/rewards", rewardRoutes);
app.use("/api/jackpots", jackpotRoutes);
app.use("/api/metrics", tokenMetricsRoutes);
app.use("/api/earnings", earningsRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
