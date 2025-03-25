const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'solrewards.cricseaskpns.eu-central-1.rds.amazonaws.com',
    user: 'admin',
    password: 'SolRewards123$',
    database: 'solrewards'
});

module.exports = pool.promise();

/*
CREATE TABLE eligible_holders (
    wallet_address VARCHAR(255) UNIQUE
);
*/