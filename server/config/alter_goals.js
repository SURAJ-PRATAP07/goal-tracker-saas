require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('./database');
const logger = require('../utils/logger');

const runMigration = async () => {
  const client = await pool.connect();
  try {
    logger.info('Adding shared goal columns...');
    await client.query(`
      ALTER TABLE goals 
      ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS parent_goal_id UUID REFERENCES goals(id) ON DELETE CASCADE;
      
      CREATE INDEX IF NOT EXISTS idx_goals_parent_goal_id ON goals(parent_goal_id);
    `);
    logger.info('✅ Shared goal columns added successfully');
  } catch (error) {
    logger.error('❌ Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
};

runMigration();
