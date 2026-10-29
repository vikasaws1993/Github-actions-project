import pg from 'pg';
import { config } from './environment.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

/**
 * PostgreSQL Connection Pool
 * Automatically detects local vs cloud database and applies SSL only for remote hosts.
 */
const isLocalDb = Boolean(
  (config.db.host && (config.db.host === 'localhost' || config.db.host === '127.0.0.1')) ||
  (config.db.url && (config.db.url.includes('localhost') || config.db.url.includes('127.0.0.1')))
);

let dbUrl = config.db.url;
if (dbUrl && dbUrl.includes('pooler.supabase.com') && dbUrl.includes(':5432')) {
  dbUrl = dbUrl.replace(':5432', ':6543');
}

export const pool = new Pool(
  dbUrl
    ? {
      connectionString: dbUrl,
      ssl: isLocalDb ? false : {
        rejectUnauthorized: false,
      },
      max: isLocalDb ? 25 : 20,
      min: isLocalDb ? 2 : 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: false,
    }
    : {
      host: config.db.host || 'localhost',
      port: config.db.port || 5432,
      database: config.db.database || 'postgres',
      user: config.db.user || 'postgres',
      password: config.db.password || 'postgres',
      ssl: isLocalDb ? false : {
        rejectUnauthorized: false,
      },
      max: isLocalDb ? 25 : 15,
      min: isLocalDb ? 2 : 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: false,
    }
);

pool.on('error', (err) => {
  logger.warn('Unexpected error on idle PostgreSQL client:', err.message);
});

/**
 * Connect to PostgreSQL Database and verify connection health
 */
export const connectDB = async () => {
  try {
    const dbTarget = isLocalDb ? 'Local PostgreSQL' : `Cloud PostgreSQL [${config.db.host || 'remote'}]`;
    logger.info(`Connecting to ${dbTarget}...`);

    const client = await pool.connect();
    const result = await client.query('SELECT NOW() AS current_time, current_database() AS db_name, version() AS version');
    client.release();

    logger.success(
      `✅ ${dbTarget} connected successfully! DB: "${result.rows[0].db_name}"`
    );
    logger.info(`Database Server Time: ${result.rows[0].current_time}`);
  } catch (error) {
    logger.error(`❌ Database connection failed:`, error.message);
    throw error;
  }
};

/**
 * Helper to execute parameterized queries
 * @param {string} text - SQL query text
 * @param {Array} [params] - Query parameters
 */
export const query = (text, params) => pool.query(text, params);

export default {
  pool,
  connectDB,
  query,
};
