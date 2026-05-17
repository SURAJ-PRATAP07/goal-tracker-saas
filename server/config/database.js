const { Pool } = require('pg');
const logger = require('../utils/logger');

// Use the full connection string from DATABASE_URL (NeonDB / any cloud Postgres)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required for NeonDB
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client:', err);
});

const testConnection = async () => {
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    return true;
  } finally {
    client.release();
  }
};

/**
 * Execute a single query
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text: text.substring(0, 80), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Database query error:', { text: text.substring(0, 80), error: error.message });
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 */
const getClient = async () => {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);

  client.query = async (text, params) => {
    const start = Date.now();
    try {
      const res = await originalQuery(text, params);
      logger.debug('TX query', { text: text.substring(0, 80), duration: Date.now() - start });
      return res;
    } catch (error) {
      logger.error('TX query error:', { text: text.substring(0, 80), error: error.message });
      throw error;
    }
  };

  return client;
};

module.exports = { pool, query, getClient, testConnection };
