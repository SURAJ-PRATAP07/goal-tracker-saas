const { query, getClient } = require('../config/database');

const UserModel = {
  create: async ({ employeeId, email, passwordHash, firstName, lastName, role, departmentId, managerId, jobTitle }) => {
    const result = await query(
      `INSERT INTO users 
        (employee_id, email, password_hash, first_name, last_name, role, department_id, manager_id, job_title)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, employee_id, email, first_name, last_name, role, status, department_id, manager_id, job_title, created_at`,
      [employeeId, email.toLowerCase(), passwordHash, firstName, lastName, role, departmentId, managerId, jobTitle]
    );
    return result.rows[0];
  },

  findAll: async ({ role, departmentId, managerId, status, search, limit, offset, sortField, sortOrder }) => {
    let conditions = ['1=1'];
    const params = [];
    let idx = 1;

    if (role) { conditions.push(`u.role = $${idx++}`); params.push(role); }
    if (departmentId) { conditions.push(`u.department_id = $${idx++}`); params.push(departmentId); }
    if (managerId) { conditions.push(`u.manager_id = $${idx++}`); params.push(managerId); }
    if (status) { conditions.push(`u.status = $${idx++}`); params.push(status); }
    if (search) {
      conditions.push(`(u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.employee_id ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }

    const where = conditions.join(' AND ');

    const countRes = await query(`SELECT COUNT(*) FROM users u WHERE ${where}`, params);

    const rows = await query(
      `SELECT u.id, u.employee_id, u.email, u.first_name, u.last_name, u.role, u.status,
              u.job_title, u.last_login_at, u.created_at, d.name AS department_name,
              m.first_name || ' ' || m.last_name AS manager_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN users m ON u.manager_id = m.id
       WHERE ${where}
       ORDER BY u.${sortField} ${sortOrder}
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    return { rows: rows.rows, total: parseInt(countRes.rows[0].count) };
  },

  findById: async (id) => {
    const result = await query(
      `SELECT u.id, u.employee_id, u.email, u.first_name, u.last_name, u.role, u.status,
              u.department_id, u.manager_id, u.job_title, u.avatar_url, u.last_login_at, u.created_at,
              d.name AS department_name,
              m.id AS manager_id, m.first_name || ' ' || m.last_name AS manager_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN users m ON u.manager_id = m.id
       WHERE u.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  update: async (id, updates) => {
    const fields = [];
    const values = [];
    let idx = 1;

    const allowed = ['first_name', 'last_name', 'job_title', 'department_id', 'manager_id', 'avatar_url'];
    for (const [key, val] of Object.entries(updates)) {
      const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowed.includes(col) && val !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(val);
      }
    }

    if (!fields.length) return null;
    values.push(id);

    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, email, first_name, last_name, role, job_title, status`,
      values
    );
    return result.rows[0];
  },

  updateStatus: async (id, status, updatedBy) => {
    const result = await query(
      'UPDATE users SET status = $1 WHERE id = $2 RETURNING id, email, status',
      [status, id]
    );
    return result.rows[0];
  },

  updateRole: async (id, role) => {
    const result = await query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, role',
      [role, id]
    );
    return result.rows[0];
  },

  getTeamMembers: async (managerId) => {
    const result = await query(
      `SELECT u.id, u.employee_id, u.first_name, u.last_name, u.email, u.job_title, u.status,
              d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.manager_id = $1 AND u.status = 'active'
       ORDER BY u.first_name`,
      [managerId]
    );
    return result.rows;
  },

  emailExists: async (email, excludeId = null) => {
    const params = [email.toLowerCase()];
    const condition = excludeId ? 'AND id != $2' : '';
    if (excludeId) params.push(excludeId);
    const result = await query(`SELECT id FROM users WHERE email = $1 ${condition}`, params);
    return result.rows.length > 0;
  },

  employeeIdExists: async (employeeId, excludeId = null) => {
    const params = [employeeId];
    const condition = excludeId ? 'AND id != $2' : '';
    if (excludeId) params.push(excludeId);
    const result = await query(`SELECT id FROM users WHERE employee_id = $1 ${condition}`, params);
    return result.rows.length > 0;
  },
};

module.exports = UserModel;
