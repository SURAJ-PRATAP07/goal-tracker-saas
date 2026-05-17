const { query } = require('../config/database');

const AuthModel = {
  findByEmail: async (email) => {
    const result = await query(
      `SELECT u.*, d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );
    return result.rows[0] || null;
  },

  findById: async (id) => {
    const result = await query(
      `SELECT u.id, u.employee_id, u.email, u.first_name, u.last_name, u.role, u.status,
              u.department_id, u.manager_id, u.job_title, u.avatar_url, u.last_login_at,
              u.created_at, d.name AS department_name,
              m.first_name || ' ' || m.last_name AS manager_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN users m ON u.manager_id = m.id
       WHERE u.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  updateLastLogin: async (id) => {
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [id]);
  },

  saveRefreshToken: async (id, token) => {
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [token, id]);
  },

  clearRefreshToken: async (id) => {
    await query('UPDATE users SET refresh_token = NULL WHERE id = $1', [id]);
  },

  findByRefreshToken: async (token) => {
    const result = await query(
      'SELECT id, email, role, status FROM users WHERE refresh_token = $1',
      [token]
    );
    return result.rows[0] || null;
  },

  updatePassword: async (id, passwordHash) => {
    await query(
      'UPDATE users SET password_hash = $1, password_changed_at = NOW(), refresh_token = NULL WHERE id = $2',
      [passwordHash, id]
    );
  },
};

module.exports = AuthModel;
