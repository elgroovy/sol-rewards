const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'SolRewards123$',
    database: 'solrewards'
});

module.exports = pool.promise();

/*
CREATE TABLE eligible_holders (
    wallet_address VARCHAR(255) UNIQUE
);
*/