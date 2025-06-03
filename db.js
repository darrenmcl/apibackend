const { Pool } = require('pg');
const pool = new Pool(); // Uses environment variables

module.exports = { pool };
