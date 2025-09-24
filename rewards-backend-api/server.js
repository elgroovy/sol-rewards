const express = require('express');
const cors = require('cors');

const rewardRoutes = require('./routes/rewardRoutes');
const jackpotRoutes = require('./routes/jackpotRoutes');
const tokenMetricsRoutes = require('./routes/tokenMetricsRoutes');
const earningsRoutes = require('./routes/earningsRoutes');

const app = express();
const port = 3000;

// Middleware to parse JSON
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/rewards', rewardRoutes);
app.use('/api/jackpots', jackpotRoutes);
app.use('/api/metrics', tokenMetricsRoutes);
app.use('/api/earnings', earningsRoutes);


// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
