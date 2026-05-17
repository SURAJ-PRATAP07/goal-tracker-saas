require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { pool, query } = require('./database');
const logger = require('../utils/logger');

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Departments
    const deptRes = await client.query(`
      INSERT INTO departments (name, description) VALUES
        ('Engineering', 'Software Engineering Department'),
        ('Product', 'Product Management'),
        ('HR', 'Human Resources'),
        ('Sales', 'Sales & Business Development')
      ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
      RETURNING id, name
    `);

    const depts = Object.fromEntries(deptRes.rows.map(d => [d.name, d.id]));

    // Admin user
    const adminHash = await bcrypt.hash('Admin@123', 12);
    const adminRes = await client.query(`
      INSERT INTO users (employee_id, email, password_hash, first_name, last_name, role, department_id, job_title)
      VALUES ('EMP001', 'admin@company.com', $1, 'Super', 'Admin', 'admin', $2, 'System Administrator')
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
      RETURNING id
    `, [adminHash, depts['HR']]);
    const adminId = adminRes.rows[0].id;

    // Manager
    const mgHash = await bcrypt.hash('Manager@123', 12);
    const mgRes = await client.query(`
      INSERT INTO users (employee_id, email, password_hash, first_name, last_name, role, department_id, job_title, manager_id)
      VALUES ('EMP002', 'manager@company.com', $1, 'Jane', 'Smith', 'manager', $2, 'Engineering Manager', $3)
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
      RETURNING id
    `, [mgHash, depts['Engineering'], adminId]);
    const managerId = mgRes.rows[0].id;

    // Employee
    const empHash = await bcrypt.hash('Employee@123', 12);
    await client.query(`
      INSERT INTO users (employee_id, email, password_hash, first_name, last_name, role, department_id, job_title, manager_id)
      VALUES ('EMP003', 'employee@company.com', $1, 'John', 'Doe', 'employee', $2, 'Senior Developer', $3)
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    `, [empHash, depts['Engineering'], managerId]);

    // Active goal cycle
    await client.query(`
      INSERT INTO goal_cycles (name, year, quarter, start_date, end_date, is_active, created_by)
      VALUES ('Q2 2026', 2026, 2, '2026-04-01', '2026-06-30', true, $1)
      ON CONFLICT (year, quarter) DO UPDATE SET is_active = true
    `, [adminId]);

    await client.query('COMMIT');
    logger.info('✅ Seed data inserted successfully');
    logger.info('📧 Credentials:');
    logger.info('   Admin    → admin@company.com / Admin@123');
    logger.info('   Manager  → manager@company.com / Manager@123');
    logger.info('   Employee → employee@company.com / Employee@123');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
