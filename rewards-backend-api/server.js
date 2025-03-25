const express = require('express');

const rewardRoutes = require('./routes/rewardRoutes');
const jackpotRoutes = require('./routes/jackpotRoutes');

const app = express();
const port = 3000;

// Middleware to parse JSON
app.use(express.json());

// Routes
app.use('/api/rewards', rewardRoutes);
app.use('/api/jackpots', jackpotRoutes);


// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
